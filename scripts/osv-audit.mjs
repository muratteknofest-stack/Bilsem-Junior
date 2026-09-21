import { readFile } from 'node:fs/promises';

const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
const queries = [];
const includeDev = process.env.OSV_INCLUDE_DEV?.trim().toLowerCase() === 'true';

for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
  if (!packagePath.startsWith('node_modules/') || !metadata?.version) continue;
  // The production gate mirrors `npm ci --omit=dev` in the runtime image.
  // Operators can still inspect the entire toolchain with
  // `OSV_INCLUDE_DEV=true npm run security:audit`.
  if (!includeDev && metadata.dev === true) continue;
  queries.push({
    package: { ecosystem: 'npm', name: packagePath.slice('node_modules/'.length) },
    version: metadata.version,
  });
}

const results = [];
const batchSize = 500;
for (let offset = 0; offset < queries.length; offset += batchSize) {
  const batch = queries.slice(offset, offset + batchSize);
  const response = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries: batch }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
    throw new Error(`OSV sorgusu başarısız: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.results) || payload.results.length !== batch.length) {
    throw new Error('OSV sorgusu eksik veya beklenmeyen sayıda sonuç döndürdü.');
  }
  results.push(...payload.results);
}

const findings = [];
for (const [index, result] of results.entries()) {
  if (!result.vulns?.length) continue;
  findings.push({
    package: queries[index].package.name,
    version: queries[index].version,
    advisories: result.vulns.map((item) => item.id),
  });
}

if (findings.length) {
  console.error(JSON.stringify(findings, null, 2));
  process.exitCode = 1;
} else {
  console.log(`OSV: ${queries.length} ${includeDev ? 'toplam' : 'üretim'} npm paketi tarandı; bilinen güvenlik açığı bulunmadı.`);
}
