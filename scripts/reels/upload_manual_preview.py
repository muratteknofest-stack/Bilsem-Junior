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


def write_summary(message: str) -> None:
    print(message)
    summary_path = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary_path:
        try:
            with open(summary_path, 'a', encoding='utf-8') as handle:
                handle.write(message + '\n')
        except OSError:
            pass


def main() -> None:
    base = (
        os.environ.get('REELS_SUPABASE_URL')
        or os.environ.get('SUPABASE_URL')
        or ''
    ).strip().rstrip('/')
    key = (
        os.environ.get('REELS_SUPABASE_SERVICE_ROLE_KEY')
        or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        or ''
    ).strip()
    bucket = (os.environ.get('IG_REELS_BUCKET') or 'instagram-reels').strip()
    run_id = (os.environ.get('GITHUB_RUN_ID') or '').strip()

    if not re.fullmatch(r'[a-z0-9_-]{3,64}', bucket):
        raise RuntimeError('Invalid Reels storage bucket')
    if not re.fullmatch(r'[0-9]{1,20}', run_id):
        raise RuntimeError('Expected a GitHub Actions run ID')

    question_path = Path('reels-out/question.json')
    video_path = Path('reels-out/reel.mp4')
    if not question_path.is_file():
        raise RuntimeError('Verified question manifest file is missing')
    if not video_path.is_file():
        raise RuntimeError('MP4 preview file is missing')

    question = json.loads(question_path.read_text(encoding='utf-8'))
    if len(question.get('question', {}).get('options', [])) != 4:
        raise RuntimeError('Verified question manifest is missing 4 options')

    video = video_path.read_bytes()
    if len(video) < 50_000 or len(video) > 25 * 1024 * 1024 or b'ftyp' not in video[:48]:
        raise RuntimeError('MP4 preview is missing or invalid')

    # If optional Supabase Storage credentials are not configured in GitHub Secrets,
    # succeed cleanly with the GitHub Actions artifact instead of failing the workflow run.
    if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co', base) or not key:
        write_summary(
            'Manual Reels preview verified in GitHub Actions artifact (bilsem-junior-reel). '
            'Optional Supabase Storage secret is not configured; artifact is ready for download.'
        )
        return

    obj = 'manual/' + run_id + '.mp4'
    path = '/storage/v1/object/' + urllib.parse.quote(bucket, safe='') + '/' + obj
    req = urllib.request.Request(
        base + path,
        data=video,
        method='POST',
        headers={
            'Authorization': 'Bearer ' + key,
            'apikey': key,
            'Content-Type': 'video/mp4',
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            if res.status not in (200, 201):
                write_summary('Storage upload returned non-200 status; artifact preserved in GitHub Actions.')
                return
            response = json.loads(res.read().decode('utf-8'))
            if not response.get('Key') and not response.get('id'):
                write_summary('Storage upload acknowledgement missing; artifact preserved in GitHub Actions.')
                return
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        write_summary('Optional Storage upload skipped (' + type(exc).__name__ + '); artifact preserved in GitHub Actions.')
        return

    public_url = base + '/storage/v1/object/public/' + urllib.parse.quote(bucket, safe='') + '/' + obj
    try:
        with urllib.request.urlopen(urllib.request.Request(public_url, method='HEAD'), timeout=30) as res:
            if res.status == 200:
                write_summary('Manual Reels preview ready in Storage: manual/' + run_id + '.mp4')
                return
    except (urllib.error.HTTPError, urllib.error.URLError):
        pass

    write_summary('Manual Reels preview archived in GitHub Actions artifact (run ' + run_id + ').')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Manual Reels preview error: ' + str(exc)[:160], file=sys.stderr)
        sys.exit(1)
