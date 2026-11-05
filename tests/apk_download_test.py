import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
import zipfile

MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'verify-apk-download.py'
spec = importlib.util.spec_from_file_location('verify_apk_download', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ApkDownloadVerificationTests(unittest.TestCase):
    def make_apk(self, target, *, include_manifest=True, duplicate=False, corrupt_index=False):
        with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_STORED) as archive:
            if include_manifest:
                archive.writestr('AndroidManifest.xml', b'compiled manifest')
            archive.writestr('classes.dex', b'dex')
            archive.writestr('resources.arsc', b'resources')
            archive.writestr('assets/public/index.html', b'not html' if corrupt_index else b'<!doctype html><html><body>Bilsem Junior</body></html>')
            archive.writestr('assets/public/assets/app.bin', os.urandom(module.MIN_BYTES + 1))
            if duplicate:
                archive.writestr('classes.dex', b'duplicate')

    def test_real_shape_is_accepted_with_stable_sha(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'app.apk'
            self.make_apk(path)
            result = module.check_file(path)
            self.assertTrue(result['verified'])
            self.assertGreater(result['sizeBytes'], module.MIN_BYTES)
            self.assertEqual(len(result['sha256']), 64)
            self.assertEqual(result, module.check_file(path))

    def test_empty_html_and_missing_file_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'app.apk'
            for data in (b'', b'<html>Access denied</html>', b'PK\x03\x04'):
                path.write_bytes(data)
                with self.assertRaises(ValueError):
                    module.check_file(path)
            path.unlink()
            with self.assertRaises(ValueError):
                module.check_file(path)

    def test_missing_entries_duplicate_files_and_invalid_index_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'app.apk'
            for args in ({'include_manifest': False}, {'duplicate': True}, {'corrupt_index': True}):
                self.make_apk(path, **args)
                with self.assertRaises(ValueError):
                    module.check_file(path)

    def test_only_https_direct_downloads_are_allowed(self):
        for url in ('http://example.com/a.apk', 'file:///tmp/app.apk',
                    'https://user:pass@example.com/app.apk', 'https://example.com/a.apk#fragment',
                    'https://', ''):
            with self.assertRaises(ValueError):
                module.check_url(url)
        self.assertEqual(module.check_url('https://downloads.example.com/bilsem.apk'), 'https://downloads.example.com/bilsem.apk')


if __name__ == '__main__':
    unittest.main()
