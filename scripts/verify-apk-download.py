#!/usr/bin/env python3
"""Reject missing, empty, HTML or broken Android APKs before sharing a URL.

Uses only Python's standard library. Does not sign, upload or publish an APK.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import zipfile

MIN_BYTES = 1_000_000
MAX_BYTES = 100_000_000
REQUIRED = {'AndroidManifest.xml', 'classes.dex', 'resources.arsc', 'assets/public/index.html'}


class StrictHttpsRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def check_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError('APK download address must be a direct HTTPS URL without credentials or fragments')
    return url


def check_file(path):
    path = Path(path)
    if not path.is_file():
        raise ValueError('APK file does not exist')
    size = path.stat().st_size
    if not MIN_BYTES <= size <= MAX_BYTES:
        raise ValueError('APK is empty, truncated or larger than the accepted package limit')
    if not zipfile.is_zipfile(path):
        raise ValueError('APK is not a ZIP-based Android package (possible HTML/error page)')
    try:
        with zipfile.ZipFile(path) as apk:
            names = apk.namelist()
            if len(names) != len(set(names)):
                raise ValueError('APK contains duplicate archive entries')
            missing = REQUIRED.difference(names)
            if missing:
                raise ValueError('APK is missing required Android or Capacitor entries: ' + ', '.join(sorted(missing)))
            if b'<html' not in apk.read('assets/public/index.html').lower():
                raise ValueError('APK does not contain the expected bundled web entry')
            if apk.testzip() is not None:
                raise ValueError('APK has damaged ZIP entries')
    except (zipfile.BadZipFile, OSError, RuntimeError) as exc:
        raise ValueError('APK archive cannot be read or is damaged') from exc
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return {'verified': True, 'sizeBytes': size, 'sha256': digest.hexdigest()}


def check_remote(url, expected):
    check_url(url)
    opener = build_opener(StrictHttpsRedirect())
    request = Request(url, headers={'User-Agent': 'Bilsem-Junior-APK-Download-Verification/1.0', 'Accept': 'application/octet-stream,application/vnd.android.package-archive'})
    with tempfile.TemporaryDirectory(prefix='bilsem-apk-verify-') as directory:
        destination = Path(directory) / 'download.apk'
        with opener.open(request, timeout=30) as response, destination.open('wb') as output:
            check_url(response.geturl())
            content_type = response.headers.get('Content-Type', '').split(';', 1)[0].strip().lower()
            if content_type in {'text/html', 'application/json', 'text/plain'}:
                raise ValueError('APK URL serves a web page or error response, not an APK')
            length = response.headers.get('Content-Length')
            if length is not None:
                try:
                    declared = int(length)
                except ValueError as exc:
                    raise ValueError('APK response has invalid Content-Length') from exc
                if not MIN_BYTES <= declared <= MAX_BYTES:
                    raise ValueError('APK response is empty, truncated or too large')
            total = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_BYTES:
                    raise ValueError('APK response exceeded the accepted size limit')
                output.write(chunk)
            if length is not None and total != declared:
                raise ValueError('APK response length did not match the downloaded bytes')
        remote = check_file(destination)
        if remote['sizeBytes'] != expected['sizeBytes'] or remote['sha256'] != expected['sha256']:
            raise ValueError('Hosted APK does not match the verified local file')
        return {'urlVerified': True, 'downloadUrl': url, 'finalUrl': response.geturl()}


def main():
    parser = argparse.ArgumentParser(description='Check a real APK and optionally confirm a hosted HTTPS download')
    parser.add_argument('apk', help='Path to signed test APK (not an AAB/ZIP wrapper)')
    parser.add_argument('--url', help='Public direct HTTPS address to check byte-for-byte against the local APK')
    args = parser.parse_args()
    try:
        result = check_file(args.apk)
        result['fileName'] = Path(args.apk).name
        if args.url:
            result.update(check_remote(args.url, result))
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    except (ValueError, OSError, TimeoutError) as exc:
        print('APK doğrulanamadı: ' + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
