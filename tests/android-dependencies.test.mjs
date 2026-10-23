import test from 'node:test';
import assert from 'node:assert/strict';
import { mavenQueries } from '../scripts/audit-android-dependencies.mjs';
import { auditQueries } from '../scripts/osv-audit.mjs';

test('Android audit scans resolved transitive pairs and refuses incomplete or malformed evidence', async () => {
  const billing = { group: 'com.android.billingclient', name: 'billing', version: '9.1.0' };
  const core = { group: 'androidx.core', name: 'core', version: '1.17.0' };
  const queries = mavenQueries([billing, core, billing]);
  assert.equal(queries.length, 2);
  assert.ok(queries.every(q => q.package.ecosystem === 'Maven'));
  for (const inventory of [[], {}, [core], [{ ...billing, version: '' }], [null]]) assert.throws(() => mavenQueries(inventory));
  await assert.rejects(() => auditQueries(queries, async () => Response.json({ results: [{}] })));
  const report = await auditQueries(queries, async () => Response.json({ results: [{}, { vulns: [{ id: 'fixture-advisory' }] }] }));
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].package, 'com.android.billingclient:billing');
});
