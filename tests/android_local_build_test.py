import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/build-android-without-actions.py'
spec = importlib.util.spec_from_file_location('bilsem_local_android', SCRIPT)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class LocalAndroidBuildTests(unittest.TestCase):
    def test_doctor_rejects_missing_sdk_and_reports_only_setting_names(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = build.doctor(root, {'ANDROID_HOME': str(root / 'missing')})
            self.assertFalse(result['ready'])
            self.assertFalse(result['requirements']['androidSdk'])
            self.assertIn('VITE_SUPABASE_PUBLISHABLE_KEY', result['missingPublicSettingNames'])
            self.assertNotIn('sb_publishable_', json.dumps(result))

    def test_env_reading_supports_vite_android_mode_but_never_returns_values(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.env.android.local').write_text('\n'.join(f'{name}=https://example.test' for name in build.REQUIRED_PUBLIC))
            self.assertEqual(build.public_env_present(root, {}), [])
            (root / '.env.android.local').write_text('VITE_API_BASE_URL=https://example.test')
            self.assertEqual(len(build.public_env_present(root, {})), len(build.REQUIRED_PUBLIC) - 1)

    def test_version_matches_overlay_and_rejects_missing_version(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'mobile/android'
            path.mkdir(parents=True)
            (path / 'play-billing.gradle').write_text('android { defaultConfig { versionCode 49\nversionName "1.0.48" } }')
            self.assertEqual(build.release_version(Path(directory)), (49, '1.0.48'))
            (path / 'play-billing.gradle').write_text('android { defaultConfig { versionCode 49 } }')
            with self.assertRaises(ValueError):
                build.release_version(Path(directory))

    def test_badging_fails_on_wrong_package_version(self):
        class Result:
            stdout = "package: name='com.fake.app' versionCode='49' versionName='1.0.48'"
        with patch.object(build.subprocess, 'run', return_value=Result()):
            with self.assertRaises(ValueError):
                build.verify_android_badging(Path('/fake-aapt'), Path('/fake.apk'), 49, '1.0.48')

    def test_build_fails_before_installation_when_prerequisites_missing(self):
        with patch.object(build, 'doctor', return_value={'ready': False}), patch.object(build, 'run') as run:
            with self.assertRaises(ValueError):
                build.build(Path('/missing/source'))
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
