#!/usr/bin/env python3
"""Build a verified local *test* APK when GitHub Actions runners cannot start.

Never creates or uses Play release signing keys, uploads APKs, or changes access.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_APP_ID = 'com.quantumtech.bilsemjunior'
REQUIRED_PUBLIC = ('VITE_API_BASE_URL', 'VITE_PUBLIC_SITE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY')


def executable(name):
    return shutil.which(name)


def android_sdk_path(env=None):
    env = os.environ if env is None else env
    root = env.get('ANDROID_HOME') or env.get('ANDROID_SDK_ROOT')
    return Path(root).expanduser() if root else None


def build_tool(sdk, name, windows=False):
    suffix = '.exe' if windows and name == 'aapt' else '.bat' if windows else ''
    return sdk / 'build-tools' / '36.0.0' / (name + suffix)


def public_env_present(root=ROOT, env=None):
    env = os.environ if env is None else env
    found = {key for key in REQUIRED_PUBLIC if env.get(key)}
    # Vite loads these files in android mode; inspect names only, never values.
    for name in ('.env', '.env.local', '.env.android', '.env.android.local'):
        file = root / name
        if file.is_file():
            source = file.read_text(encoding='utf-8')
            for key in REQUIRED_PUBLIC:
                if re.search(r'^\s*' + re.escape(key) + r'\s*=\s*[^\s#]+', source, re.M):
                    found.add(key)
    return sorted(set(REQUIRED_PUBLIC) - found)


def release_version(root=ROOT):
    source = (root / 'mobile/android/play-billing.gradle').read_text(encoding='utf-8')
    code = re.search(r'\bversionCode\s+(\d+)', source)
    name = re.search(r'\bversionName\s+"(\d+\.\d+\.\d+)"', source)
    if not code or not name:
        raise ValueError('Android version cannot be determined from tracked Play Billing overlay')
    return int(code.group(1)), name.group(1)


def doctor(root=ROOT, env=None):
    env = os.environ if env is None else env
    sdk = android_sdk_path(env)
    windows = os.name == 'nt'
    requirements = {
        'node': bool(executable('node')),
        'npm': bool(executable('npm')),
        'java': bool(executable('java')),
        'androidSdk': bool(sdk and sdk.is_dir()),
        'androidPlatform36': bool(sdk and (sdk / 'platforms/android-36/android.jar').is_file()),
        'androidBuildTools36': bool(sdk and build_tool(sdk, 'aapt', windows).is_file()),
        'androidApkSigner': bool(sdk and build_tool(sdk, 'apksigner', windows).is_file()),
        'androidPublicSettings': not public_env_present(root, env),
    }
    if requirements['node']:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=8)
        match = re.match(r'^v(\d+)\.', result.stdout.strip())
        requirements['node22Plus'] = bool(result.returncode == 0 and match and int(match.group(1)) >= 22)
    if requirements['java']:
        result = subprocess.run(['java', '-version'], capture_output=True, text=True, timeout=8)
        match = re.search(r'version\s+"(\d+)', (result.stderr or result.stdout))
        requirements['jdk21Plus'] = bool(result.returncode == 0 and match and int(match.group(1)) >= 21)
    return {'ready': all(requirements.values()), 'requirements': requirements, 'missingPublicSettingNames': public_env_present(root, env)}


def run(command, cwd=ROOT):
    print('Executing:', ' '.join(str(x) for x in command), flush=True)
    subprocess.run([str(x) for x in command], cwd=cwd, check=True)


def verify_android_badging(aapt, apk, code, name):
    result = subprocess.run([str(aapt), 'dump', 'badging', str(apk)], capture_output=True, text=True, check=True, timeout=30)
    match = re.search(r"^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", result.stdout, re.M)
    if not match or match.groups() != (EXPECTED_APP_ID, str(code), name):
        raise ValueError('Compiled test APK does not match the expected applicationId or version')


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build(root=ROOT, output_dir=None):
    if not doctor(root)['ready']:
        raise ValueError('Build prerequisites missing. Run --doctor; install tools and configure the Android public build values.')
    sdk = android_sdk_path()
    code, name = release_version(root)
    destination = Path(output_dir or root / 'test-artifacts/android-local').resolve()
    target = destination / f'Bilsem-Junior-{name}-local-test.apk'
    if target.exists():
        raise ValueError('Test APK already exists; choose a new --output-dir rather than overwriting verified bytes')
    npm = executable('npm')
    run([npm, 'ci'], root)
    run([npm, 'run', 'lint'], root)
    run([npm, 'run', 'test:google-play'], root)
    run([npm, 'run', 'android:sync'], root)
    gradlew = root / 'android' / ('gradlew.bat' if os.name == 'nt' else 'gradlew')
    if not gradlew.is_file():
        raise ValueError('Capacitor did not generate the Android Gradle wrapper')
    run([gradlew, '--no-daemon', ':app:assembleDebug'], root / 'android')
    source = root / 'android/app/build/outputs/apk/debug/app-debug.apk'
    verifier = load_module(root / 'scripts/verify-apk-download.py', 'bilsem_apk_verifier')
    details = verifier.check_file(source)
    packager = load_module(root / 'scripts/package-android-candidate.py', 'bilsem_android_packager')
    asset_count = packager.verify_assets(source, root / 'dist-android', 'assets/public/', root / 'android/app/src/main/assets/public')
    verify_android_badging(build_tool(sdk, 'aapt', os.name == 'nt'), source, code, name)
    run([build_tool(sdk, 'apksigner', os.name == 'nt'), 'verify', '--verbose', source], root)
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    if verifier.check_file(target) != details:
        target.unlink(missing_ok=True)
        raise ValueError('APK copy changed the verified bytes')
    (destination / 'SHA256SUMS').write_text(f"{details['sha256']}  {target.name}\n", encoding='utf-8')
    info = {
        'apk': str(target), 'versionCode': code, 'versionName': name,
        'type': 'local-test-debug-signed', 'notPlayRelease': True,
        'webAssetsVerified': asset_count, **details,
    }
    (destination / 'verification.json').write_text(json.dumps(info, indent=2), encoding='utf-8')
    return info


def main():
    parser = argparse.ArgumentParser(description='Build Bilsem Junior Android without GitHub Actions')
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--doctor', action='store_true', help='Check tools and public build setting names without building')
    choice.add_argument('--build', action='store_true', help='Build a locally signed test APK; not a Google Play release')
    parser.add_argument('--output-dir', type=Path, help='Fresh output directory for APK and checksums')
    args = parser.parse_args()
    try:
        result = doctor() if args.doctor else build(output_dir=args.output_dir)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result.get('ready', True) else 2
    except (OSError, ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        print('Android local build failed:', str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
