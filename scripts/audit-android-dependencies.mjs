import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { auditQueries } from './osv-audit.mjs';

/** Use Gradle's selected runtime versions, including transitive dependencies. */
export function mavenQueries(report) {
  if (/\bFAILED\b|Could not resolve/.test(report)) throw Error('Unresolved Gradle dependencies; audit incomplete');
  const unique = new Map();
  for (const line of report.split('\n')) {
    const match = line.match(/[+\\]---\s+([\w.-]+):([\w.-]+):([^\s]+)(?:\s+->\s+([^\s]+))?/);
    if (!match) continue;
    const [, group, artifact, requested, selected] = match;
    const version = selected || requested;
    if (!/^[0-9][\w.+-]*$/.test(version)) throw Error('Unresolved Maven version; audit incomplete');
    const name = `${group}:${artifact}`;
    unique.set(`${name}@${version}`, { package: { ecosystem: 'Maven', name }, version });
  }
  if (!unique.size) throw Error('No resolved Maven inventory; audit incomplete');
  return [...unique.values()];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw Error('Pass a resolved debugRuntimeClasspath report');
    const queries = mavenQueries(await readFile(process.argv[2], 'utf8'));
    const result = await auditQueries(queries);
    console.log(JSON.stringify({ ecosystem: 'Maven', ...result, inventory: queries }, null, 2));
    if (result.findings.length) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Maven audit incomplete');
    process.exitCode = 1;
  }
}
