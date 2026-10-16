import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(resolve(root, 'capacitor.config.ts'))) throw new Error('Android proje ayarı bulunamadı.');
if (!existsSync(resolve(root, 'android/app/build.gradle'))) {
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'add', 'android'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
// These versioned overlays are authoritative; edit mobile/android, not generated files.
for (const [source, target] of [
  ['AndroidManifest.xml', 'AndroidManifest.xml'],
  ['data_extraction_rules.xml', 'res/xml/data_extraction_rules.xml'],
  ['launcher.xml', 'res/drawable/zekapark_launcher.xml'],
]) {
  const destination = resolve(root, 'android/app/src/main', target);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(root, 'mobile/android', source), destination);
}
console.log('Android projesi hazırlandı. Üretim anahtarı veya imzalama parolası oluşturulmadı.');
