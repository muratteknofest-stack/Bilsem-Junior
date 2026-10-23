import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export function prepareAndroid(root) {
  if (!existsSync(resolve(root, 'capacitor.config.ts'))) throw new Error('Android proje ayarı bulunamadı.');
  const appId = readFileSync(resolve(root, 'capacitor.config.ts'), 'utf8').match(/appId:\s*'([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,})'/)?.[1];
  if (!appId) throw new Error('Android paket kimliği okunamadı.');
  const packagePath = appId.replaceAll('.', '/');
  if (!existsSync(resolve(root, 'android/app/build.gradle'))) {
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'add', 'android'], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Android projesi oluşturulamadı.');
  }
  // These versioned overlays are authoritative; edit mobile/android, not generated files.
  for (const [source, target] of [
    ['AndroidManifest.xml', 'AndroidManifest.xml'],
    ['strings.xml', 'res/values/strings.xml'],
    ['data_extraction_rules.xml', 'res/xml/data_extraction_rules.xml'],
    ['launcher.xml', 'res/drawable/zekapark_launcher.xml'],
    ['MainActivity.java', `java/${packagePath}/MainActivity.java`],
    ['PlayBillingPlugin.java', `java/${packagePath}/PlayBillingPlugin.java`],
  ]) {
    const destination = resolve(root, 'android/app/src/main', target);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(root, 'mobile/android', source), destination);
  }
  const smokeSource = resolve(root, 'mobile/android/NativeAppSmokeTest.java');
  const smokeTarget = resolve(root, `android/app/src/androidTest/java/${packagePath}/NativeAppSmokeTest.java`);
  mkdirSync(dirname(smokeTarget), { recursive: true });
  copyFileSync(smokeSource, smokeTarget);
  const gradlePath = resolve(root, 'android/app/build.gradle');
  let gradle = readFileSync(gradlePath, 'utf8');
  // cap sync does not migrate an existing generated project's applicationId or namespace.
  for (const field of ['namespace', 'applicationId']) {
    const pattern = new RegExp(`\\b${field}\\s*(?:=\\s*)?(['"])[^'"]+\\1`, 'g');
    if ([...gradle.matchAll(pattern)].length !== 1) throw new Error(`Android ${field} ayarı tekil değil.`);
    gradle = gradle.replace(pattern, `${field} = "${appId}"`);
  }
  for (const overlay of ['play-billing.gradle', 'release.gradle']) {
    const statement = `apply from: '../../mobile/android/${overlay}'`;
    if (!gradle.includes(statement)) gradle += '\n' + statement + '\n';
  }
  writeFileSync(gradlePath, gradle);
  // Remove only our obsolete generated Java classes; leave other project files intact.
  if (appId !== 'com.zekapark.app') {
    for (const path of ['main/java/com/zekapark/app/MainActivity.java', 'main/java/com/zekapark/app/PlayBillingPlugin.java', 'androidTest/java/com/zekapark/app/NativeAppSmokeTest.java']) {
      rmSync(resolve(root, 'android/app/src', path), { force: true });
    }
  }
  console.log('Android projesi hazırlandı. Üretim anahtarı veya imzalama parolası oluşturulmadı.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepareAndroid(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
}
