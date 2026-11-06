import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Faz 6: ParentPortalView & ParentProgressOverview Tremor Modernization', () => {
  const parentTsx = readFileSync(resolve(process.cwd(), 'src/components/ParentPortalView.tsx'), 'utf-8');
  const overviewTsx = readFileSync(resolve(process.cwd(), 'src/components/parent/ParentProgressOverview.tsx'), 'utf-8');
  const parentCss = readFileSync(resolve(process.cwd(), 'src/components/parent/parent-executive.css'), 'utf-8');

  // No blur-3xl or ambient background blurred blobs
  assert.ok(
    !parentTsx.includes('blur-3xl'),
    'ParentPortalView must not have blur-3xl background spheres'
  );

  // Kicker converted to Title Case
  assert.ok(
    parentTsx.includes('Aile Gelişim Merkezi'),
    'Parent portal kicker must be Title Case (Aile Gelişim Merkezi)'
  );
  assert.ok(
    !parentTsx.includes('BİLSEM JUNIOR · AİLE GELİŞİM MERKEZİ'),
    'Parent portal kicker must not have ALL-CAPS text'
  );

  // Tremor 4-KPI strip and daily goal ring with tabular-nums
  assert.ok(
    overviewTsx.includes('tabular-nums'),
    'ParentProgressOverview metrics and goal must use tabular-nums'
  );
  assert.ok(
    overviewTsx.includes('Haftanın Görünümü') && overviewTsx.includes('Öğrenme Analitiği'),
    'Overview headers must be Title Case'
  );

  // Screen reader table preserved
  assert.ok(
    overviewTsx.includes('<table className="sr-only">'),
    'Screen reader accessibility table must be preserved'
  );

  // Recharts Tremor styling & custom tooltips
  assert.ok(
    parentTsx.includes('PolarGrid') && parentTsx.includes('stroke="#cbd5e1"'),
    'RadarChart PolarGrid must have high contrast Tremor gridline'
  );
  assert.ok(
    parentTsx.includes('tabular-nums text-indigo-600') || parentTsx.includes('tabular-nums'),
    'Chart tooltips must use tabular-nums'
  );
});

test('Faz 6: AdminPortal & AdminPanelView Console Modernization', () => {
  const adminPortalTsx = readFileSync(resolve(process.cwd(), 'src/components/AdminPortal.tsx'), 'utf-8');
  const adminPanelTsx = readFileSync(resolve(process.cwd(), 'src/components/AdminPanelView.tsx'), 'utf-8');

  // No blur-3xl or blurred ambient spheres
  assert.ok(
    !adminPanelTsx.includes('blur-3xl') && !adminPanelTsx.includes('blur-[120px]'),
    'AdminPanelView must not contain background blur spheres'
  );

  // Admin portal kicker converted to Title Case
  assert.ok(
    adminPortalTsx.includes('Yönetim Konsolu'),
    'AdminPortal kicker must be Title Case'
  );
  assert.ok(
    !adminPortalTsx.includes('BİLSEM JUNIOR / YÖNETİM'),
    'AdminPortal kicker must not have ALL-CAPS text'
  );

  // Single-elevation high-contrast sidebar console
  assert.ok(
    adminPanelTsx.includes('bg-slate-900 border-r border-slate-800'),
    'Admin sidebar must have single-elevation high-contrast console styling'
  );

  // 13 management tabs preserved with high contrast active states
  assert.ok(
    adminPanelTsx.includes('bg-indigo-600') && adminPanelTsx.includes('text-slate-300 hover:text-white'),
    'Admin navigation tabs must have high contrast active and hover states'
  );
});
