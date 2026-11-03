#!/usr/bin/env python3
"""Publish a generated, checked Reel through Supabase Storage and Meta Graph API.
This is exclusively server-side. Never print or expose access tokens.
Scheduled GitHub job prepares early and publishes no earlier than 19:00 Türkiye.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TURKEY = ZoneInfo('Europe/Istanbul')


def required(name: str) -> str:
    result = (os.environ.get(name) or '').strip()
    if not result:
        raise RuntimeError('Required repository secret is missing: ' + name)
    return result


def request(method, url, *, headers=None, data=None, attempts=2):
    for n in range(attempts):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
            with urllib.request.urlopen(req, timeout=120) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            # No request URLs or API response bodies in public CI logs.
            if n + 1 == attempts or 400 <= exc.code < 500:
                raise RuntimeError('Remote publishing API returned HTTP ' + str(exc.code)) from None
            time.sleep(5 * (n + 1))
        except (OSError, TimeoutError) as exc:
            if n + 1 == attempts:
                raise RuntimeError('Remote publishing API connection failed') from exc
            time.sleep(5 * (n + 1))
    raise RuntimeError('Remote request unsuccessful')


def graph_url(endpoint):
    version = os.environ.get('META_GRAPH_VERSION') or 'v25.0'
    if not re.fullmatch(r'v\d+\.\d+', version):
        raise ValueError('Invalid META_GRAPH_VERSION')
    return 'https://graph.facebook.com/' + version + '/' + endpoint


def graph_post(endpoint, data, access_token):
    return request(
        'POST', graph_url(endpoint),
        headers={'Authorization': 'Bearer ' + access_token,
                 'Content-Type': 'application/x-www-form-urlencoded'},
        data=urllib.parse.urlencode(data).encode('utf-8'),
    )


def graph_get(endpoint, fields, access_token):
    return request(
        'GET', graph_url(endpoint) + '?' + urllib.parse.urlencode({'fields': fields}),
        headers={'Authorization': 'Bearer ' + access_token},
    )


def await_publish_window(day: str):
    target = datetime.fromisoformat(day + 'T19:00:00').replace(tzinfo=TURKEY)
    now = datetime.now(TURKEY)
    # Reject unexpected dates and never silently post a previous day's question.
    if now.date() != target.date():
        raise RuntimeError('Reel date does not match today in Türkiye')
    if now > target + timedelta(minutes=15):
        raise RuntimeError('19:00 publishing window missed by more than 15 minutes')
    seconds = (target - now).total_seconds()
    if seconds > 0:
        print('Reel is ready. Awaiting the 19:00 Türkiye publishing window.')
        time.sleep(seconds)
    # 19:00 is the earliest publication; network latency may delay visible posting.


def main():
    if os.environ.get('REELS_ENABLED') != 'true' or os.environ.get('REELS_SCHEDULED') != 'true':
        print('Instagram publication disabled: manual runs are preview-only.')
        return
    supabase_url = required('SUPABASE_URL').rstrip('/')
    service_key = required('SUPABASE_SERVICE_ROLE_KEY')
    instagram_id = required('INSTAGRAM_ACCOUNT_ID')
    access_token = required('INSTAGRAM_ACCESS_TOKEN')
    if not instagram_id.isdigit():
        raise ValueError('INSTAGRAM_ACCOUNT_ID must be numeric')
    bucket = os.environ.get('IG_REELS_BUCKET') or 'instagram-reels'
    if not re.fullmatch(r'[a-z0-9_-]{3,64}', bucket):
        raise ValueError('Invalid IG_REELS_BUCKET')

    payload = json.loads(Path(os.environ.get('REEL_QUESTION_PATH') or
                              'reels-out/question.json').read_text(encoding='utf-8'))
    day = payload['day']
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', day):
        raise ValueError('Invalid Reel date')
    if datetime.fromisoformat(day).date() != datetime.now(TURKEY).date():
        raise RuntimeError('Scheduled Reel is not for today's Türkiye calendar date')
    video = Path(os.environ.get('REEL_VIDEO_PATH') or 'reels-out/reel.mp4').read_bytes()
    if not video.startswith(b'\x00\x00') or len(video) < 100_000:
        raise RuntimeError('Generated MP4 is missing or too small')
    object_path = 'daily/' + day + '.mp4'
    safe_bucket = urllib.parse.quote(bucket, safe='')
    safe_object = urllib.parse.quote(object_path, safe='/')
    storage_path = '/storage/v1/object/' + safe_bucket + '/' + safe_object
    upload = request(
        'POST', supabase_url + storage_path,
        headers={'Authorization': 'Bearer ' + service_key,
                 'apikey': service_key, 'Content-Type': 'video/mp4',
                 'x-upsert': 'false'},
        data=video,
    )
    if not isinstance(upload, dict) or not (upload.get('Key') or upload.get('id')):
        raise RuntimeError('Supabase Storage did not confirm the upload')
    public_url = supabase_url + '/storage/v1/object/public/' + safe_bucket + '/' + safe_object
    try:
        with urllib.request.urlopen(
            urllib.request.Request(public_url, method='HEAD'), timeout=45
        ) as resp:
            if resp.status != 200:
                raise RuntimeError('Video URL is not publicly accessible')
    except urllib.error.HTTPError as exc:
        raise RuntimeError('Make the dedicated Instagram Reels bucket public') from exc

    topic = {
        'analogy-grid': 'Görsel analoji',
        'paired-analogy': 'Şekil ilişkileri',
        'matrix-attributes': 'Raven tarzı matris',
        'feature-classification': 'Sınıflandırma',
        'attribute-sequence': 'Görsel örüntü',
        'interleaved-sequence': 'Karma örüntü',
    }[payload['mechanic']]
    caption = (
        '🧠 Günün Bilsem Junior sorusu! (' + str(payload['grade']) + '. sınıf)\n'
        '🔎 Konu: ' + topic + '\n'
        '⏳ Süre dolmadan cevap ver! Doğrusunu videonun sonunda gör.\n'
        '✅ Doğru bildin mi? Yorumlara yaz.\n'
        '#BilsemJunior #BİLSEM #ZekaSorusu #GörselZeka #Reels'
    )

    container = graph_post(instagram_id + '/media', {
        'media_type': 'REELS',
        'video_url': public_url,
        'caption': caption,
        'share_to_feed': 'true',
    }, access_token)
    container_id = container.get('id')
    if not container_id or not str(container_id).isdigit():
        raise RuntimeError('Meta failed to create Reel media container')
    for _ in range(36):
        time.sleep(10)
        status = graph_get(str(container_id), 'status_code', access_token).get('status_code')
        if status == 'FINISHED':
            break
        if status in ('ERROR', 'EXPIRED'):
            raise RuntimeError('Meta rejected media container: ' + status)
    else:
        raise RuntimeError('Media transcoding did not finish before timeout')

    await_publish_window(day)
    published = graph_post(instagram_id + '/media_publish',
                           {'creation_id': container_id}, access_token)
    media_id = published.get('id')
    if not media_id:
        raise RuntimeError('Instagram did not confirm Reel publication')
    print('Published daily Instagram Reel successfully. Media ID:', str(media_id))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Exception messages contain no tokens, response bodies, or URLs.
        print('Reel publication failed: ' + str(exc)[:180], file=sys.stderr)
        sys.exit(1)
