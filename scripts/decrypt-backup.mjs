import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { backupKey, decryptBackup } from './backup-crypto.mjs';
import {verifyBackupManifest} from './backup-manifest.mjs';
process.umask(0o077);
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Kullanım: node scripts/decrypt-backup.mjs arşiv.enc özel-hedef-klasörü');
const archive = JSON.parse(decryptBackup(await readFile(input), backupKey(process.env.BACKUP_ENCRYPTION_KEY)).toString('utf8'));
const files=verifyBackupManifest(archive);
await mkdir(output, { recursive: false, mode: 0o700 });
for (const name of files) await writeFile(path.join(output, name), archive.files[name], { flag: 'wx', mode: 0o600 });
console.log('Yedek özel klasöre çözüldü. Geri yükleme yapılmadı. Storage dosyaları bu arşivde değildir.');

