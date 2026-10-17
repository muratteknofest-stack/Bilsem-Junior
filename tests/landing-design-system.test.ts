import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PremiumButton, PremiumField } from '../src/components/landing/PremiumUI';

function luminance(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
}
function contrast(first: string, second: string) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test('public semantic color pairs clear WCAG AA normal-text contrast threshold', async () => {
  const css = await readFile(new URL('../src/components/landing/design-system.css', import.meta.url), 'utf8');
  const tokens = Object.fromEntries([...css.matchAll(/(--zp-[\w-]+):\s*(#[\da-fA-F]{6});/g)].map(([, name, value]) => [name, value]));
  for (const [foreground, background] of [
    ['--zp-ink', '--zp-canvas'], ['--zp-ink-muted', '--zp-canvas'],
    ['--zp-violet', '--zp-paper'], ['--zp-violet-deep', '--zp-lilac'],
    ['--zp-ink', '--zp-sage'], ['--zp-ink', '--zp-peach'],
  ]) assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${foreground} on ${background}`);
  assert.ok(contrast(tokens['--zp-paper'], tokens['--zp-violet']) >= 4.5);
});

test('shared public controls retain native semantics and accessible field errors', () => {
  const button = renderToStaticMarkup(React.createElement(PremiumButton, { disabled: true, tone: 'quiet' }, 'Kayıt ol'));
  assert.match(button, /<button/);
  assert.match(button, /disabled=""/);
  assert.match(button, /zp-ui-button/);
  const field = renderToStaticMarkup(React.createElement(PremiumField, { id: 'mail', label: 'E-posta', hint: 'Veli adresi', error: 'Geçersiz adres', type: 'email' }));
  assert.match(field, /<label for="mail">E-posta<\/label>/);
  assert.match(field, /aria-describedby="mail-hint mail-error"/);
  assert.match(field, /aria-invalid="true"/);
  assert.match(field, /role="alert">Geçersiz adres/);
});

test('public layout provides explicit 12/6/4 grid and reduced-motion overrides', async () => {
  const css = await readFile(new URL('../src/components/landing/design-system.css', import.meta.url), 'utf8');
  assert.match(css, /--zp-columns:\s*12/);
  assert.match(css, /max-width:\s*1000px[\s\S]*--zp-columns:\s*6/);
  assert.match(css, /max-width:\s*680px[\s\S]*--zp-columns:\s*4/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@supports \(backdrop-filter:/);
});
