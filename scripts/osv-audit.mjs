import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** Nested paths and npm aliases are install locations, not ecosystem package names. */
export function osvQueries(lock) {
  const unique = new Map();
  for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
    if (!packagePath.startsWith('node_modules/') || !metadata?.version || metadata.link) continue;
    const name = metadata.name || packagePath.split('node_modules/').at(-1);
    if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)) throw Error('Invalid npm inventory entry');
    unique.set(JSON.stringify([name, metadata.version]), { package: { ecosystem: 'npm', name }, version: metadata.version });
  }
  if (!unique.size) throw Error('No npm package inventory was found; audit incomplete');
  return [...unique.values()];
}

export async function auditQueries(queries, fetcher = fetch) {
  if (!queries.length) throw Error('No package inventory was found; audit incomplete');
  const response = await fetcher('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OSV query failed: HTTP ${response.status}`);
  const payload = await response.json();
  // Partial results must never be reported as a clean scan.
  if (!Array.isArray(payload?.results) || payload.results.length !== queries.length || payload.results.some(result =>
    !result || typeof result !== 'object' || Array.isArray(result) || result.next_page_token ||
    (result.vulns !== undefined && (!Array.isArray(result.vulns) || result.vulns.some(item => typeof item?.id !== 'string' || !item.id.trim()))))) {
    throw Error('OSV returned an incomplete or invalid result; audit incomplete');
  }
  const findings = [];
  for (const [index, result] of payload.results.entries()) {
    if (!result.vulns?.length) continue;
    findings.push({
      package: queries[index].package.name,
      version: queries[index].version,
      advisories: result.vulns.map(item => item.id),
    });
  }
  return { count: queries.length, findings };
}

export function auditLockfile(lock, fetcher = fetch) {
  return auditQueries(osvQueries(lock), fetcher);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
    const { count, findings } = await auditLockfile(lock);
    if (findings.length) {
      console.error(JSON.stringify(findings, null, 2));
      process.exitCode = 1;
    } else {
      console.log(`OSV: ${count} benzersiz npm paket/sürüm çifti tarandı; bilinen güvenlik açığı bulunmadı.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'OSV audit incomplete');
    process.exitCode = 1;
  }
}
