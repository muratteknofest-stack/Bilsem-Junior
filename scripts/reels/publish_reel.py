#!/usr/bin/env python3
"""Publish a generated, checked Reel through Meta Graph API Resumable Upload (with optional Supabase Storage mirror).

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


def required(name: str, fallback_name: str = '') -> str:
    result = (os.environ.get(name) or (os.environ.get(fallback_name) if fallback_name else '') or '').strip()
    if not result:
        raise RuntimeError('Required repository secret is missing: ' + name)
    return result


def request_json(method: str, url: str, *, headers=None, data=None, attempts: int = 3):
    for n in range(attempts):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
            with urllib.request.urlopen(req, timeout=120) as response:
                raw = response.read().decode('utf-8')
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            if n + 1 == attempts or (400 <= exc.code < 500 and exc.code != 429):
                raise RuntimeError('Remote publishing API returned HTTP ' + str(exc.code)) from None
            time.sleep(4 * (n + 1))
        except (OSError, TimeoutError) as exc:
            if n + 1 == attempts:
                raise RuntimeError('Remote publishing API connection failed') from exc
            time.sleep(4 * (n + 1))
    raise RuntimeError('Remote request unsuccessful')


def graph_version() -> str:
    version = (os.environ.get('META_GRAPH_VERSION') or 'v21.0').strip()
    if not re.fullmatch(r'v\d+\.\d+', version):
        return 'v21.0'
    return version


def graph_url(endpoint: str) -> str:
    return 'https://graph.facebook.com/' + graph_version() + '/' + endpoint.lstrip('/')


def graph_post_json(endpoint: str, payload: dict, access_token: str):
    body = dict(payload)
    body['access_token'] = access_token
    return request_json(
        'POST',
        graph_url(endpoint),
        headers={'Content-Type': 'application/json'},
        data=json.dumps(body).encode('utf-8'),
    )


def graph_get(endpoint: str, fields: str, access_token: str):
    query = urllib.parse.urlencode({'fields': fields, 'access_token': access_token})
    return request_json('GET', graph_url(endpoint) + '?' + query)


def await_publish_window(day: str) -> None:
    if os.environ.get('REEL_IMMEDIATE_PUBLISH') == 'true':
        return
    target = datetime.fromisoformat(day + 'T19:00:00').replace(tzinfo=TURKEY)
    now = datetime.now(TURKEY)
    if now.date() != target.date():
        raise RuntimeError('Reel date does not match today in Türkiye')
    if now > target + timedelta(minutes=25):
        raise RuntimeError('19:00 publishing window missed by more than 25 minutes')
    seconds = (target - now).total_seconds()
    if seconds > 0:
        print('Reel is ready. Awaiting the 19:00 Türkiye publishing window.')
        time.sleep(seconds)


def optional_supabase_upload(day: str, video: bytes) -> str | None:
    supabase_url = (os.environ.get('SUPABASE_URL') or os.environ.get('REELS_SUPABASE_URL') or '').strip().rstrip('/')
    service_key = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('REELS_SUPABASE_SERVICE_ROLE_KEY') or '').strip()
    bucket = (os.environ.get('IG_REELS_BUCKET') or 'instagram-reels').strip()
    if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co', supabase_url) or not service_key:
        return None
    if not re.fullmatch(r'[a-z0-9_-]{3,64}', bucket):
        return None
    object_path = 'daily/' + day + '.mp4'
    safe_bucket = urllib.parse.quote(bucket, safe='')
    safe_object = urllib.parse.quote(object_path, safe='/')
    storage_path = '/storage/v1/object/' + safe_bucket + '/' + safe_object
    try:
        upload = request_json(
            'POST',
            supabase_url + storage_path,
            headers={
                'Authorization': 'Bearer ' + service_key,
                'apikey': service_key,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true',
            },
            data=video,
            attempts=2,
        )
        if isinstance(upload, dict) and (upload.get('Key') or upload.get('id')):
            public_url = supabase_url + '/storage/v1/object/public/' + safe_bucket + '/' + safe_object
            with urllib.request.urlopen(urllib.request.Request(public_url, method='HEAD'), timeout=30) as resp:
                if resp.status == 200:
                    return public_url
    except Exception:
        pass
    return None


def main() -> None:
    if os.environ.get('REELS_ENABLED') != 'true' or os.environ.get('REELS_SCHEDULED') != 'true':
        print('Instagram publication disabled: manual runs are preview-only.')
        return

    instagram_id = required('INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_BUSINESS_ACCOUNT_ID')
    access_token = required('INSTAGRAM_ACCESS_TOKEN')
    if not instagram_id.isdigit():
        raise ValueError('INSTAGRAM_ACCOUNT_ID must be numeric')

    payload = json.loads(
        Path(os.environ.get('REEL_QUESTION_PATH') or 'reels-out/question.json').read_text(encoding='utf-8')
    )
    day = payload['day']
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', day):
        raise ValueError('Invalid Reel date')
    if datetime.fromisoformat(day).date() != datetime.now(TURKEY).date():
        raise RuntimeError("Scheduled Reel is not for today's Türkiye calendar date")

    video = Path(os.environ.get('REEL_VIDEO_PATH') or 'reels-out/reel.mp4').read_bytes()
    if len(video) < 50_000 or b'ftyp' not in video[:48]:
        raise RuntimeError('Generated MP4 is missing or invalid')

    # Mirror to Supabase Storage if configured (optional)
    optional_supabase_upload(day, video)

    topic = {
        'analogy-grid': 'Görsel analoji',
        'paired-analogy': 'Şekil ilişkileri',
        'matrix-attributes': 'Raven tarzı matris',
        'feature-classification': 'Sınıflandırma',
        'attribute-sequence': 'Görsel örüntü',
        'interleaved-sequence': 'Karma örüntü',
    }.get(payload.get('mechanic', ''), 'Görsel zeka')

    caption = (
        '🦊 BİLSEM Junior Günün Zeka Sorusu! (' + str(payload['grade']) + '. Sınıf • ' + topic + ')\n'
        '⏱️ Süre bitmeden soru işaretli yere hangi şeklin geleceğini bulabilir misin?\n'
        '👇 Cevabını yorumlara yaz (A, B, C veya D)! Bakalım kimler doğru bilecek? 🧠✨\n\n'
        '#bilsem #bilsemjunior #zekasorusu #ilkokul #' + str(payload['grade']) + 'sınıf #mantıksorusu #bilsemsınavı #keşfet #reels'
    )

    # 1. Initialize Resumable Upload session on Meta Graph API
    init_res = graph_post_json(
        instagram_id + '/media',
        {
            'media_type': 'REELS',
            'upload_type': 'resumable',
            'caption': caption,
            'share_to_feed': True,
        },
        access_token,
    )
    container_id = str(init_res.get('id') or '')
    upload_uri = str(init_res.get('uri') or '')
    if not container_id.isdigit() or not upload_uri.startswith('https://rupload.facebook.com/ig-api-upload/'):
        raise RuntimeError('Meta failed to initialize Resumable Reel container')

    # 2. Upload MP4 bytes directly to rupload.facebook.com
    up_req = urllib.request.Request(
        upload_uri,
        data=video,
        method='POST',
        headers={
            'Authorization': 'OAuth ' + access_token,
            'offset': '0',
            'file_size': str(len(video)),
            'Content-Type': 'application/octet-stream',
        },
    )
    with urllib.request.urlopen(up_req, timeout=180) as up_resp:
        if up_resp.status not in (200, 206):
            raise RuntimeError('Resumable binary upload rejected with HTTP ' + str(up_resp.status))

    # 3. Poll container status until FINISHED
    for _ in range(36):
        time.sleep(8)
        status_data = graph_get(container_id, 'status_code,status', access_token)
        status = status_data.get('status_code')
        if status == 'FINISHED':
            break
        if status in ('ERROR', 'EXPIRED'):
            raise RuntimeError('Meta rejected media container: ' + str(status))
    else:
        raise RuntimeError('Media transcoding did not finish before timeout')

    await_publish_window(day)

    published = graph_post_json(
        instagram_id + '/media_publish',
        {'creation_id': container_id},
        access_token,
    )
    media_id = published.get('id')
    if not media_id:
        raise RuntimeError('Instagram did not confirm Reel publication')
    print('Published daily Instagram Reel successfully. Media ID:', str(media_id))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Reel publication failed: ' + str(exc)[:180], file=sys.stderr)
        sys.exit(1)
