import { readFile } from 'node:fs/promises';

const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
const queries = [];

for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
  if (!packagePath.startsWith('node_modules/') || !metadata?.version) continue;
  queries.push({
    package: { ecosystem: 'npm', name: packagePath.slice('node_modules/'.length) },
    version: metadata.version,
  });
}

const response = await fetch('https://api.osv.dev/v1/querybatch', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ queries }),
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(`OSV sorgusu başarısız: HTTP ${response.status}`);
}

const payload = await response.json();
const findings = [];
for (const [index, result] of (payload.results || []).entries()) {
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
  console.log(`OSV: ${queries.length} npm paketi tarandı; bilinen güvenlik açığı bulunmadı.`);
}
