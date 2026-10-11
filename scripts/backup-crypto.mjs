import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
const magic = Buffer.from('ZPBACKUP1');
export function backupKey(value) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value || '')) throw Error('BACKUP_ENCRYPTION_KEY, Base64 biçiminde 32 rastgele bayt olmalıdır.');
  const key = Buffer.from(value, 'base64'); if (key.length !== 32) throw Error('Geçersiz yedek şifreleme anahtarı.'); return key;
}
export function encryptBackup(content, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  const body = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), body]);
}
export function decryptBackup(content, key) {
  if (content.length < 37 || !content.subarray(0, 9).equals(magic)) throw Error('Geçersiz yedek dosyası.');
  const decipher = createDecipheriv('aes-256-gcm', key, content.subarray(9, 21));
  decipher.setAAD(magic); decipher.setAuthTag(content.subarray(21, 37));
  return Buffer.concat([decipher.update(content.subarray(37)), decipher.final()]);
}
