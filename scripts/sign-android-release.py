"""Sign a verified CI candidate locally. Never send the upload key to CI.

Usage: python scripts/sign-android-release.py CANDIDATE_DIR PRIVATE_KEY_DIR OUTPUT_DIR
PRIVATE_KEY_DIR contains zekapark-upload.p12 and upload-key.json (alias/password/storeType).
"""
from pathlib import Path
import hashlib
import json
import os
import re
import ssl
import subprocess
import sys


def sign_release(candidate, private_dir, output):
    candidate, private_dir, output = map(lambda p: Path(p).resolve(), (candidate, private_dir, output))
    output.mkdir(parents=True, exist_ok=True)
    checks = json.loads((candidate / 'release-check.json').read_text())
    if checks != {'packageName': 'com.zekapark.app', 'versionCode': 19, 'versionName': '1.0.18', 'debuggable': False, 'testOnly': False, 'cleartext': False, 'backup': False}:
        raise ValueError('Compiled release checks did not pass')
    dependency_audit = json.loads((candidate / 'release-maven-osv.json').read_text())
    if dependency_audit.get('ecosystem') != 'Maven' or not dependency_audit.get('count') or dependency_audit.get('findings') != []:
        raise ValueError('Release dependency audit did not pass')
    # Hashes tie unsigned binaries and the official SDK signer to the verified CI artifact.
    for line in (candidate / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        name = name.lstrip('*')
        if Path(name).name != name or hashlib.sha256((candidate / name).read_bytes()).hexdigest() != digest:
            raise ValueError('CI artifact integrity check failed')
    credentials = json.loads((private_dir / 'upload-key.json').read_text())
    env = dict(os.environ, ZEKAPARK_UPLOAD_PASSWORD=credentials['password'])
    key = str(private_dir / 'zekapark-upload.p12')
    alias = credentials['alias']

    def run(args):
        result = subprocess.run(args, env=env, capture_output=True, text=True)
        if result.returncode:
            # Do not echo commands, key locations or credential-bearing diagnostics.
            raise RuntimeError('Signing or signature verification failed')
        return result.stdout + result.stderr

    certificate = output / 'upload-certificate.pem'
    run(['keytool', '-exportcert', '-rfc', '-keystore', key, '-storetype', 'PKCS12', '-alias', alias,
         '-storepass:env', 'ZEKAPARK_UPLOAD_PASSWORD', '-file', str(certificate)])
    expected = hashlib.sha256(ssl.PEM_cert_to_DER_cert(certificate.read_text())).hexdigest()
    aab = output / 'Bilsem-Junior-1.0.11.aab'
    apk = output / 'Bilsem-Junior-1.0.11.apk'
    if aab.exists() or apk.exists():
        raise ValueError('Refusing to overwrite a signed release')
    signer = ['java', '-Duser.language=en', '-Duser.country=US', '--module', 'jdk.jartool/sun.security.tools.jarsigner.Main']
    run(signer + ['-keystore', key, '-storetype', 'PKCS12', '-storepass:env', 'ZEKAPARK_UPLOAD_PASSWORD',
                  '-keypass:env', 'ZEKAPARK_UPLOAD_PASSWORD', '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256',
                  '-signedjar', str(aab), str(candidate / 'Bilsem-Junior-1.0.11-unsigned.aab'), alias])
    verified = run(signer + ['-verify', '-verbose', '-certs', str(aab)])
    if 'jar verified.' not in verified or 'unsigned entries' in verified or 'jar is unsigned' in verified:
        raise RuntimeError('AAB is not fully signed')
    public = run(['keytool', '-printcert', '-jarfile', str(aab), '-rfc'])
    pem = re.search(r'-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----', public)
    if not pem or hashlib.sha256(ssl.PEM_cert_to_DER_cert(pem[0])).hexdigest() != expected:
        raise RuntimeError('Unexpected AAB signer')
    apk_signer = ['java', '-jar', str(candidate / 'apksigner.jar')]
    run(apk_signer + ['sign', '--ks', key, '--ks-type', 'PKCS12', '--ks-key-alias', alias,
                     '--ks-pass', 'env:ZEKAPARK_UPLOAD_PASSWORD', '--key-pass', 'env:ZEKAPARK_UPLOAD_PASSWORD',
                     '--out', str(apk), str(candidate / 'Bilsem-Junior-1.0.11-aligned-unsigned.apk')])
    apk_verified = run(apk_signer + ['verify', '--verbose', '--print-certs', str(apk)])
    if f'Signer #1 certificate SHA-256 digest: {expected}' not in apk_verified:
        raise RuntimeError('Unexpected APK signer')
    result = {**checks, 'uploadCertificateSha256': expected,
              'aabSignatureVerified': True, 'apkSignatureVerified': True,
              'nativeDependencyPairs': dependency_audit['count'],
              'files': {path.name: {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in (aab, apk)}}
    (output / 'release-verification.json').write_text(json.dumps(result, indent=2))
    (output / 'apk-signature.txt').write_text(apk_verified)
    (output / 'aab-signature.txt').write_text(verified)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit('Pass candidate, private key and output directories')
    sign_release(*sys.argv[1:])
