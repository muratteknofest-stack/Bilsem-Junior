import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SurfaceCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  AnimatedTabs,
  MetricCard,
  CountUpNumber,
  SpotlightSurface,
} from '../src/components/ui';

test('index.css includes Tailwind v4 custom dark variant and 60-30-10 semantic tokens', async () => {
  const indexCss = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  // Verify @custom-variant dark definition
  assert.match(
    indexCss,
    /@custom-variant\s+dark\s+\(&:\s*where\(\.dark,\s*\.dark\s+\*\)\);/,
    'Tailwind v4 custom dark variant must be defined'
  );

  // Verify :root semantic variables
  assert.match(indexCss, /:root[\s\S]*--surface-canvas:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /:root[\s\S]*--surface-card:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /:root[\s\S]*--border-subtle:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /:root[\s\S]*--text-primary:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /:root[\s\S]*--text-secondary:\s*#[a-fA-F0-9]{6}/);

  // Verify .dark semantic variables
  assert.match(indexCss, /\.dark[\s\S]*--surface-canvas:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /\.dark[\s\S]*--surface-card:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /\.dark[\s\S]*--border-subtle:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /\.dark[\s\S]*--text-primary:\s*#[a-fA-F0-9]{6}/);
  assert.match(indexCss, /\.dark[\s\S]*--text-secondary:\s*#[a-fA-F0-9]{6}/);
});

test('typography.css defines tabular-nums standard and heading balance/letter spacing', async () => {
  const typoCss = await readFile(new URL('../src/typography.css', import.meta.url), 'utf8');

  // Verify tabular-nums standard
  assert.match(typoCss, /\.tabular-nums[\s\S]*font-variant-numeric:\s*tabular-nums/);

  // Verify heading balance and tracking
  assert.match(typoCss, /:where\(h1,\s*h2,\s*h3\)[\s\S]*text-wrap:\s*balance/);
  assert.match(typoCss, /:where\(h1,\s*h2,\s*h3\)[\s\S]*letter-spacing:\s*-0?\.025em/);
});

test('dashboard-design-system.css does not force #fff background in dark mode and enforces single-line nowrap tabs', async () => {
  const dashCss = await readFile(new URL('../src/components/dashboard-design-system.css', import.meta.url), 'utf8');

  // Verify no forced white background in dark student cards
  assert.doesNotMatch(
    dashCss,
    /\.dark\s+\.zp-student-dashboard\s+:is\([^)]+\)\s*\{[^}]*background:\s*#fff/
  );

  // Verify tabs enforce nowrap
  assert.match(
    dashCss,
    /\.zp-student-dashboard\s+\.zp-dashboard-tabs\s*>\s*button\s*\{[^}]*white-space:\s*nowrap/
  );
});

test('SurfaceCard renders single-elevation card and subcomponents correctly with data and aria attributes', () => {
  const html = renderToStaticMarkup(
    <SurfaceCard id="test-card" data-testid="surface-card" role="region" aria-label="Örnek Kart">
      <CardHeader>
        <CardTitle id="card-title">Kart Başlığı</CardTitle>
        <CardDescription>Kart açıklaması burada yer alır</CardDescription>
      </CardHeader>
      <CardContent>
        <p>İçerik</p>
      </CardContent>
      <CardFooter>
        <button type="button">Tamam</button>
      </CardFooter>
    </SurfaceCard>
  );

  assert.match(html, /id="test-card"/);
  assert.match(html, /data-testid="surface-card"/);
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Örnek Kart"/);
  assert.match(html, /Kart Başlığı/);
  assert.match(html, /Kart açıklaması burada yer alır/);
  assert.match(html, /rounded-2xl/);
});

test('AnimatedTabs renders with tablist semantics, nowrap discipline and motion active indicator', () => {
  const tabs = [
    { id: 'summary', label: 'Özet' },
    { id: 'details', label: 'Detaylar', badge: <span className="badge">3</span> },
    { id: 'disabled', label: 'Kilitli', disabled: true },
  ];

  const html = renderToStaticMarkup(
    <AnimatedTabs tabs={tabs} activeTab="summary" onChange={() => {}} aria-label="Panel Sekmeleri" />
  );

  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-label="Panel Sekmeleri"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /whitespace-nowrap/);
  assert.match(html, /shrink-0/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /disabled=""/);
});

test('MetricCard renders Tremor KPI pattern, tabular numbers and progress bar', () => {
  const html = renderToStaticMarkup(
    <MetricCard
      title="Doğruluk Oranı"
      metric="94%"
      subtitle="Geçen haftaya göre artış"
      delta={{ value: '+8%', direction: 'up', label: 'bu hafta' }}
      progressBar={{ value: 94, label: 'Hedef' }}
    />
  );

  assert.match(html, /Doğruluk Oranı/);
  assert.match(html, /94%/);
  assert.match(html, /tabular-nums/);
  assert.match(html, /\+8%/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="94"/);
});

test('MetricCard renders CategoryBar correctly with distribution segments', () => {
  const html = renderToStaticMarkup(
    <MetricCard
      title="Soru Dağılımı"
      metric="120"
      categoryBar={{
        values: [50, 30, 20],
        labels: ['Kolay', 'Orta', 'Zor'],
        showLabels: true,
      }}
    />
  );

  assert.match(html, /Soru Dağılımı/);
  assert.match(html, /120/);
  assert.match(html, /Kolay/);
  assert.match(html, /Orta/);
  assert.match(html, /Zor/);
});

test('CountUpNumber renders accessible tabular numbers and formatted value', () => {
  const html = renderToStaticMarkup(
    <CountUpNumber value={1250} prefix="XP " suffix=" pts" />
  );

  assert.match(html, /tabular-nums/);
  assert.match(html, /aria-label="XP 1\.250 pts"/);
});

test('SpotlightSurface renders with interactive attributes and children', () => {
  const html = renderToStaticMarkup(
    <SpotlightSurface data-testid="spotlight-card" className="p-6">
      <h4>Bento Başlığı</h4>
      <p>Bento içeriği</p>
    </SpotlightSurface>
  );

  assert.match(html, /data-testid="spotlight-card"/);
  assert.match(html, /Bento Başlığı/);
  assert.match(html, /rounded-2xl/);
});
