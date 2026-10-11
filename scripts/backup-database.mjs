import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { backupKey, encryptBackup, decryptBackup } from './backup-crypto.mjs';

process.umask(0o077);
const key = backupKey(process.env.BACKUP_ENCRYPTION_KEY), dbUrl = process.env.SUPABASE_DB_URL;
const url = new URL(dbUrl || 'missing:');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.supabase.com') && !url.hostname.endsWith('.supabase.co') || !url.password) throw Error('Supabase veritabanı bağlantısı güvenli ortamda yapılandırılmalıdır.');
url.searchParams.set('sslmode', 'verify-full');
const secureUrl = url.toString();
const dir = await mkdtemp(path.join(tmpdir(), 'zekapark-backup-'));
try {
  const files = {};
  for (const [name, flags] of [['roles.sql', ['--role-only']], ['schema.sql', []], ['data.sql', ['--data-only', '--use-copy']]]) {
    const file = path.join(dir, name);
    await new Promise((resolve, reject) => {
      const child = spawn('npx', ['--yes', 'supabase@2.81.3', 'db', 'dump', '--db-url', secureUrl, '--file', file, ...flags], { stdio: 'ignore', timeout: 15 * 60_000 });
      child.on('error', () => reject(Error('Yedekleme aracı başlatılamadı.')));
      child.on('exit', code => code === 0 ? resolve() : reject(Error('Veritabanı yedeği oluşturulamadı. Bağlantı ve Docker hazırlığını kontrol edin.')));
    });
    files[name] = await readFile(file, 'utf8');
    if (!files[name].trim()) throw Error('Boş yedek kabul edilmedi.');
  }
  const archive = Buffer.from(JSON.stringify({ format: 'zekapark-db-v1', createdAt: new Date().toISOString(), storageObjectsIncluded: false, files }));
  const encrypted = encryptBackup(archive, key);
  if (!decryptBackup(encrypted, key).equals(archive)) throw Error('Yedek şifreleme doğrulaması başarısız.');
  await writeFile('zekapark-database.enc', encrypted, { mode: 0o600 });
  console.log('Veritabanı yedeği şifrelendi ve bütünlüğü doğrulandı. Storage dosyaları ayrıca yedeklenmelidir.');
} finally { await rm(dir, { recursive: true, force: true }); }
