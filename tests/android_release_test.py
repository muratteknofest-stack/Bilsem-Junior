import hashlib
import importlib.util
import json
import re
from pathlib import Path
import tempfile
import unittest
import zipfile


def module(name):
    path = Path(__file__).resolve().parents[1] / 'scripts' / name
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


signer = module('sign-android-release.py')
packager = module('package-android-candidate.py')
ROOT = Path(__file__).resolve().parents[1]


class AndroidReleaseTests(unittest.TestCase):
    def fixture(self, root):
        for name in signer.REQUIRED_FILES:
            (root / name).write_bytes(b'isolated artifact')
        (root / 'asset-verification.json').write_text(json.dumps(dict(aabVerified=True, releaseApkVerified=True, exactWebAssets=2)))
        self.hashes(root)

    def hashes(self, root):
        (root / 'SHA256SUMS').write_text(''.join(f'{hashlib.sha256((root / name).read_bytes()).hexdigest()}  {name}\n' for name in sorted(signer.REQUIRED_FILES)))

    def test_complete_artifact_and_missing_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            signer.verify_candidate(root)
            for value in ['', '\n'.join((root / 'SHA256SUMS').read_text().splitlines()[1:])]:
                (root / 'SHA256SUMS').write_text(value)
                with self.assertRaises(ValueError):
                    signer.verify_candidate(root)

    def test_modified_binary_duplicate_and_unsafe_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            (root / 'apksigner.jar').write_bytes(b'tampered signer')
            with self.assertRaises(ValueError):
                signer.verify_candidate(root)
            self.hashes(root)
            data = (root / 'SHA256SUMS').read_text()
            for value in [data + data.splitlines()[0], data + 'a' * 64 + '  ../outside']:
                (root / 'SHA256SUMS').write_text(value)
                with self.assertRaises(ValueError):
                    signer.verify_candidate(root)

    def test_archive_asset_mismatch_and_duplicate_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            assets = root / 'assets'
            assets.mkdir()
            (assets / 'index.html').write_text('<html>current app</html>')
            archive = root / 'app.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.write(assets / 'index.html', 'assets/public/index.html')
                z.writestr('assets/public/capacitor.js', 'bridge')
            bridge = root / 'bridge'
            bridge.mkdir()
            (bridge / 'capacitor.js').write_text('bridge')
            self.assertEqual(packager.verify_assets(archive, assets, 'assets/public/', bridge), 2)
            (assets / 'index.html').write_text('<html>different app</html>')
            with self.assertRaises(ValueError):
                packager.verify_assets(archive, assets, 'assets/public/', bridge)
            (assets / 'index.html').write_text('<html>current app</html>')
            with zipfile.ZipFile(archive, 'a') as z:
                z.writestr('assets/public/unexpected.js', 'stale asset')
            with self.assertRaises(ValueError):
                packager.verify_assets(archive, assets, 'assets/public/', bridge)


class AndroidReleaseDocumentationTests(unittest.TestCase):
    def test_release_notes_cover_the_current_candidate(self):
        gradle = (ROOT / 'mobile/android/play-billing.gradle').read_text()
        code = re.search(r'versionCode\s+(\d+)', gradle).group(1)
        name = re.search(r'versionName\s+"([^"]+)"', gradle).group(1)
        notes = (ROOT / 'docs/ANDROID_RELEASE.md').read_text()
        headings = re.findall(r'^## (\d+\.\d+\.\d+)', notes, re.MULTILINE)
        self.assertTrue(headings, 'Sürüm notu başlığı bulunmalı')
        self.assertEqual(headings[0], name, 'En yeni sürüm notu güncel sürüm adıyla eşleşmeli')
        first = notes.split('## ', 2)[1]
        self.assertIn(code, first, 'En yeni sürüm notu sürüm kodunu yazmalı')
        self.assertIn('package-android-candidate.py', first, 'Sürüm notu gerçek doğrulama komutunu yazmalı')
        self.assertIn('ticari yayın kabulü', first, 'Sürüm notu ticari yayın kabulü iddiası taşımamalı')


if __name__ == '__main__':
    unittest.main()
