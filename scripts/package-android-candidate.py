"""Package compiled Android outputs and evidence for the existing offline signer.

No upload key is generated, read, or included. SDK tools must already be installed.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'Bilsem-Junior-1.0.30'


def run(args):
    result = subprocess.run(list(map(str, args)), cwd=ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise ValueError('Android candidate verification failed: ' + str(args[0]))
    return result.stdout


def verify_assets(archive, directory, prefix, bridge_directory=None):
    expected = {p.relative_to(directory).as_posix(): p.read_bytes() for p in directory.rglob('*') if p.is_file()}
    if not expected or 'index.html' not in expected:
        raise ValueError('Android web assets are missing')
    # cap sync creates SDK bridge files outside the Vite output. Check their bytes too.
    if bridge_directory:
        for name in ['capacitor.js', 'capacitor_plugins.js', 'cordova.js', 'cordova_plugins.js']:
            source = bridge_directory / name
            if name not in expected and source.is_file():
                expected[name] = source.read_bytes()
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate archive entries')
        packaged = {name[len(prefix):]: bundle.read(name) for name in names if name.startswith(prefix) and not name.endswith('/')}
    if packaged != expected:
        raise ValueError('Compiled Android assets do not match the current web build')
    return len(expected)


def package(output):
    output = Path(output).resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError('Candidate output must be empty; previous evidence will not be overwritten')
    sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if not sdk:
        raise ValueError('ANDROID_HOME must point to the installed Android SDK')
    tools = Path(sdk) / 'build-tools' / '36.0.0'
    for name in ['aapt', 'zipalign', 'lib/apksigner.jar']:
        if not (tools / name).is_file():
            raise ValueError('Android Build Tools 36.0.0 are required')
    run(['node', 'scripts/check-public-assets.mjs', 'dist-android'])
    run(['node', 'scripts/check-public-assets.mjs', 'android/app/src/main/assets/public'])
    app = ROOT / 'android/app/build/outputs'
    aab = app / 'bundle/release/app-release.aab'
    apk = app / 'apk/release/app-release-unsigned.apk'
    debug = app / 'apk/debug/app-debug.apk'
    bridge = ROOT / 'android/app/src/main/assets/public'
    asset_count = verify_assets(aab, ROOT / 'dist-android', 'base/assets/public/', bridge)
    verify_assets(apk, ROOT / 'dist-android', 'assets/public/', bridge)
    output.mkdir(parents=True, exist_ok=True)
    manifest = run([tools / 'aapt', 'dump', 'xmltree', apk, 'AndroidManifest.xml'])
    badging = run([tools / 'aapt', 'dump', 'badging', apk])
    (output / 'manifest.txt').write_text(manifest)
    (output / 'package.txt').write_text(badging)
    checks = run(['node', 'scripts/verify-android-release.mjs', output / 'manifest.txt', output / 'package.txt'])
    (output / 'release-check.json').write_text(checks)
    run(['node', 'scripts/audit-android-dependencies.mjs', 'android/app/build/reports/release-dependencies.json', output / 'release-maven-osv.json'])
    shutil.copyfile(aab, output / f'{PREFIX}-unsigned.aab')
    shutil.copyfile(debug, output / f'{PREFIX}-test.apk')
    aligned = output / f'{PREFIX}-aligned-unsigned.apk'
    run([tools / 'zipalign', '-P', '16', '-f', '4', apk, aligned])
    run([tools / 'zipalign', '-c', '-P', '16', '4', aligned])
    shutil.copyfile(tools / 'lib/apksigner.jar', output / 'apksigner.jar')
    shutil.copyfile(ROOT / 'android/app/build/reports/release-dependencies.json', output / 'release-dependencies.json')
    (output / 'asset-verification.json').write_text(json.dumps({'exactWebAssets': asset_count, 'aabVerified': True, 'releaseApkVerified': True}, indent=2))
    files = sorted(p for p in output.iterdir() if p.is_file())
    (output / 'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in files))
    print(json.dumps({'candidatePackaged': True, 'signedForPlay': False, 'webAssetCount': asset_count, 'output': str(output)}, indent=2))


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Pass an empty candidate output directory')
        package(sys.argv[1])
    except (ValueError, OSError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
        print(str(error) if isinstance(error, ValueError) else 'Android candidate could not be verified.', file=sys.stderr)
        sys.exit(1)

