import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { auditQueries } from './osv-audit.mjs';

export function mavenQueries(inventory) {
  if (!Array.isArray(inventory) || !inventory.length) throw Error('Resolved Android dependency inventory is missing');
  const pairs = new Map();
  for (const item of inventory) {
    if (!item || !['group', 'name', 'version'].every(key => typeof item[key] === 'string' && /^[A-Za-z0-9_.+\-]+$/.test(item[key])))
      throw Error('Invalid resolved Android dependency');
    const name = `${item.group}:${item.name}`;
    pairs.set(`${name}@${item.version}`, { package: { ecosystem: 'Maven', name }, version: item.version });
  }
  if (![...pairs.values()].some(q => q.package.name === 'com.android.billingclient:billing')) throw Error('Billing dependency is missing');
  return [...pairs.values()].sort((a, b) => a.package.name.localeCompare(b.package.name));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw Error('Pass resolved inventory and report paths');
    const report = { ecosystem: 'Maven', ...await auditQueries(mavenQueries(JSON.parse(await readFile(process.argv[2], 'utf8')))) };
    await writeFile(process.argv[3], JSON.stringify(report, null, 2) + '\n');
    console.log(`Android dependency audit: ${report.count} resolved pairs; ${report.findings.length} findings.`);
    if (report.findings.length) process.exitCode = 1;
  } catch { console.error('Android dependency audit incomplete; candidate release blocked.'); process.exitCode = 1; }
}
