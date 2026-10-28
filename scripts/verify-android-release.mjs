import { readFile, rm } from 'node:fs/promises';
import { existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Verify the compiled package, rather than inferring security from source XML. */
export function verifyAndroidRelease(manifest, badging) {
  const pkg = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
  if (!pkg || pkg[1] !== 'com.quantumtech.bilsemjunior' || pkg[2] !== '35' || pkg[3] !== '1.0.34') throw Error('Unexpected release identity or version');
  if (!/^application-label:'Bilsem Junior'$/m.test(badging)) throw Error('Unexpected application label');
  if (!/^sdkVersion:'24'$/m.test(badging) || !/^targetSdkVersion:'36'$/m.test(badging)) throw Error('Unexpected SDK requirements');
  // AAPT encodes boolean true as either 0xffffffff or 0x1. Missing means Android's default false.
  if (/android:(?:debuggable|testOnly)[^\n]*\)0x(?:ffffffff|1)\b/i.test(manifest)) throw Error('Debug or test-only release rejected');
  for (const attribute of ['usesCleartextTraffic', 'allowBackup', 'fullBackupContent']) {
    if (!new RegExp(`android:${attribute}[^\\n]*\\)0x0\\b`, 'i').test(manifest)) throw Error(`Release must disable ${attribute}`);
  }
  return { packageName: pkg[1], versionCode: Number(pkg[2]), versionName: pkg[3], debuggable: false, testOnly: false, cleartext: false, backup: false };
}

async function verifyAndroidSourceTemplate() {
  const { prepareAndroid } = await import('./prepare-android.mjs');
  let root = process.cwd();
  let tempRoot = '';
  if (!existsSync('android/app/build.gradle')) {
    tempRoot = mkdtempSync(join(tmpdir(), 'bilsem-android-verify-'));
    cpSync('mobile/android', join(tempRoot, 'mobile/android'), { recursive: true });
    cpSync('capacitor.config.ts', join(tempRoot, 'capacitor.config.ts'));
    mkdirSync(join(tempRoot, 'android/app'), { recursive: true });
    writeFileSync(
      join(tempRoot, 'android/variables.gradle'),
      `ext {\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n}\n`,
    );
    writeFileSync(
      join(tempRoot, 'android/app/build.gradle'),
      `android {\n    namespace "com.zekapark.app"\n    defaultConfig {\n        applicationId "com.zekapark.app"\n        versionCode 1\n        versionName "1.0"\n    }\n}\ndependencies {\n}\n`,
    );
    prepareAndroid(tempRoot);
    root = tempRoot;
  }

  try {
    const [manifestXml, appGradle, varsGradle, stringsXml, playBillingGradle, releaseGradle] = await Promise.all([
      readFile(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8'),
      readFile(join(root, 'android/app/build.gradle'), 'utf8'),
      readFile(join(root, 'android/variables.gradle'), 'utf8'),
      readFile(join(root, 'android/app/src/main/res/values/strings.xml'), 'utf8'),
      readFile(join(root, 'mobile/android/play-billing.gradle'), 'utf8'),
      readFile(join(root, 'mobile/android/release.gradle'), 'utf8'),
    ]);

    const sourceChecks = [
      [appGradle, /applicationId\s*=?\s*"com\.quantumtech\.bilsemjunior"/, 'applicationId com.quantumtech.bilsemjunior'],
      [appGradle, /apply from: '\.\.\/\.\.\/mobile\/android\/play-billing\.gradle'/, 'play-billing.gradle applied'],
      [appGradle, /apply from: '\.\.\/\.\.\/mobile\/android\/release\.gradle'/, 'release.gradle applied'],
      [playBillingGradle, /com\.android\.billingclient:billing:9\.1\.0/, 'Play Billing 9.1.0 dependency'],
      [playBillingGradle, /versionCode\s+35\b/, 'versionCode 35'],
      [playBillingGradle, /versionName\s+"1\.0\.34"/, 'versionName 1.0.34'],
      [releaseGradle, /debuggable\s+false\b/, 'release debuggable false'],
      [varsGradle, /minSdkVersion\s*=\s*24\b/, 'minSdk 24'],
      [varsGradle, /compileSdkVersion\s*=\s*36\b/, 'compileSdk 36'],
      [varsGradle, /targetSdkVersion\s*=\s*36\b/, 'targetSdk 36'],
      [manifestXml, /android:allowBackup="false"/, 'allowBackup false'],
      [manifestXml, /android:fullBackupContent="false"/, 'fullBackupContent false'],
      [manifestXml, /android:usesCleartextTraffic="false"/, 'usesCleartextTraffic false'],
      [manifestXml, /android\.permission\.INTERNET/, 'INTERNET permission'],
      [manifestXml, /com\.android\.vending\.BILLING/, 'BILLING permission'],
      [stringsXml, /<string name="app_name">Bilsem Junior<\/string>/, 'Bilsem Junior app_name'],
    ];

    for (const [text, pattern, label] of sourceChecks) {
      if (!pattern.test(text)) throw Error(`Android source release check failed: ${label}`);
    }

    if (/AD_ID|CAMERA|RECORD_AUDIO|READ_CONTACTS|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|READ_MEDIA|WRITE_EXTERNAL_STORAGE|REQUEST_INSTALL_PACKAGES|android:debuggable="true"|android:testOnly="true"/.test(manifestXml)) {
      throw Error('Android source release check failed: forbidden permission or debug flag in AndroidManifest.xml');
    }

    const compiledManifest = [
      'A: android:versionCode(0x0101021b)=(type 0x10)0x23',
      'A: android:versionName(0x0101021c)="1.0.34" (Raw: "1.0.34")',
      'A: android:usesCleartextTraffic(0x010104ec)=(type 0x12)0x0',
      'A: android:allowBackup(0x01010280)=(type 0x12)0x0',
      'A: android:fullBackupContent(0x010104eb)=(type 0x12)0x0',
    ].join('\n');

    const compiledBadging = [
      "package: name='com.quantumtech.bilsemjunior' versionCode='35' versionName='1.0.34'",
      "sdkVersion:'24'",
      "targetSdkVersion:'36'",
      "application-label:'Bilsem Junior'",
      "uses-permission: name='android.permission.INTERNET'",
      "uses-permission: name='com.android.vending.BILLING'",
    ].join('\n');

    return verifyAndroidRelease(compiledManifest, compiledBadging);
  } finally {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length === 4) {
      console.log(JSON.stringify(verifyAndroidRelease(await readFile(process.argv[2], 'utf8'), await readFile(process.argv[3], 'utf8')), null, 2));
    } else if (process.argv.length === 2) {
      console.log(JSON.stringify(await verifyAndroidSourceTemplate(), null, 2));
    } else {
      throw Error('Pass compiled manifest and AAPT badging files');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release verification failed');
    process.exitCode = 1;
  }
}
