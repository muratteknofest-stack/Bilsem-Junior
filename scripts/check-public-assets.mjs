import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function secretKinds(text) {
  const kinds = [];
  if (/\b(?:sb_secret_|sbp_)[A-Za-z0-9_-]{16,}/.test(text)) kinds.push('Supabase secret');
  if (/\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}/.test(text)) kinds.push('private API key');
  if (/\bAIza[0-9A-Za-z_-]{35}\b/.test(text)) kinds.push('Google API key');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) kinds.push('private key');
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
    try {
      const claims = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (['service_role', 'authenticated', 'admin'].includes(claims.role)) {
        kinds.push('private JWT');
        break;
      }
      if (Array.isArray(claims.scopes) && claims.scopes.includes('orders:read')) {
        kinds.push('private commerce token');
        break;
      }
    } catch { /* Not a JWT. */ }
  }
  return kinds;
}

export async function checkDirectory(directory) {
  let count = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { count += await checkDirectory(file); continue; }
    if (/^(?:\.env(?:\..*)?|server\.(?:[cm]?js)(?:\.map)?)$/.test(entry.name) || entry.name.endsWith('.map'))
      throw new Error(`Private build artifact: ${file}`);
    if (!/\.(?:js|mjs|cjs|html|json|css|txt|xml|svg)$/.test(entry.name)) continue;
    const kinds = secretKinds(await fs.readFile(file, 'utf8'));
    if (kinds.length) throw new Error(`Public asset blocked: ${file} (${kinds.join(', ')})`);
    count++;
  }
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(`Public assets: ${await checkDirectory(process.argv[2] || 'dist')} files checked; no recognized private credentials or source maps.`); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Public assets check failed.'); process.exitCode = 1; }
}
