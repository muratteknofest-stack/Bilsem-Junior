import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** Verify the compiled package, rather than inferring security from source XML. */
export function verifyAndroidRelease(manifest, badging) {
  const pkg = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
  if (!pkg || pkg[1] !== 'com.zekapark.app' || pkg[2] !== '10' || pkg[3] !== '1.0.9') throw Error('Unexpected release identity or version');
  if (!/^sdkVersion:'24'$/m.test(badging) || !/^targetSdkVersion:'36'$/m.test(badging)) throw Error('Unexpected SDK requirements');
  // AAPT encodes boolean true as either 0xffffffff or 0x1. Missing means Android's default false.
  if (/android:(?:debuggable|testOnly)[^\n]*\)0x(?:ffffffff|1)\b/i.test(manifest)) throw Error('Debug or test-only release rejected');
  for (const attribute of ['usesCleartextTraffic', 'allowBackup', 'fullBackupContent']) {
    if (!new RegExp(`android:${attribute}[^\\n]*\\)0x0\\b`, 'i').test(manifest)) throw Error(`Release must disable ${attribute}`);
  }
  return { packageName: pkg[1], versionCode: Number(pkg[2]), versionName: pkg[3], debuggable: false, testOnly: false, cleartext: false, backup: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw Error('Pass compiled manifest and AAPT badging files');
    console.log(JSON.stringify(verifyAndroidRelease(await readFile(process.argv[2], 'utf8'), await readFile(process.argv[3], 'utf8')), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release verification failed');
    process.exitCode = 1;
  }
}
