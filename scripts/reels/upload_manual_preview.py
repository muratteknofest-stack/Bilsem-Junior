#!/usr/bin/env python3
"""Upload a manually requested Reel preview. Does NOT publish to Instagram."""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

def main():
    base = (os.environ.get('REELS_SUPABASE_URL') or '').rstrip('/')
    key = os.environ.get('REELS_SUPABASE_SERVICE_ROLE_KEY') or ''
    bucket = os.environ.get('IG_REELS_BUCKET') or 'instagram-reels'
    run_id = os.environ.get('GITHUB_RUN_ID', '')
    if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\\.co', base):
        raise RuntimeError('Reels Supabase project URL secret is missing or invalid')
    if not key:
        raise RuntimeError('Reels Supabase storage key is not configured')
    if not re.fullmatch(r'[a-z0-9_-]{3,64}', bucket):
        raise RuntimeError('Invalid Reels storage bucket')
    if not re.fullmatch(r'[0-9]{1,20}', run_id):
        raise RuntimeError('Expected a GitHub Actions run ID')
    question = json.loads(Path('reels-out/question.json').read_text(encoding='utf-8'))
    if len(question.get('question', {}).get('options', [])) != 4:
        raise RuntimeError('Verified question manifest is missing')
    video = Path('reels-out/reel.mp4').read_bytes()
    if len(video) < 100_000 or len(video) > 25 * 1024 * 1024 or b'ftyp' not in video[:48]:
        raise RuntimeError('MP4 preview is missing or invalid')
    obj = 'manual/' + run_id + '.mp4'
    path = '/storage/v1/object/' + urllib.parse.quote(bucket, safe='') + '/' + obj
    req = urllib.request.Request(base + path, data=video, method='POST', headers={
        'Authorization': 'Bearer ' + key,
        'apikey': key,
        'Content-Type': 'video/mp4',
        'x-upsert': 'false',
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            if res.status not in (200, 201):
                raise RuntimeError('Storage upload not confirmed')
            response = json.loads(res.read().decode('utf-8'))
            if not response.get('Key') and not response.get('id'):
                raise RuntimeError('Storage upload acknowledgement missing')
    except urllib.error.HTTPError as exc:
        raise RuntimeError('Storage upload failed (HTTP ' + str(exc.code) + ')') from None
    public_url = base + '/storage/v1/object/public/' + urllib.parse.quote(bucket, safe='') + '/' + obj
    try:
        with urllib.request.urlopen(urllib.request.Request(public_url, method='HEAD'), timeout=30) as res:
            if res.status != 200:
                raise RuntimeError('Public video URL inaccessible')
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        raise RuntimeError('Verify public video bucket visibility') from exc
    print('Manual Reels preview ready in Storage: manual/' + run_id + '.mp4')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Manual Reels preview error: ' + str(exc)[:160], file=sys.stderr)
        sys.exit(1)
