import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('LearningIsland has clean typography without fake status dot or AI-slop decorative star inflation', async () => {
  const file = await readFile(new URL('../src/components/landing/LearningIsland.tsx', import.meta.url), 'utf8');

  // Must not contain fake status dot
  assert.ok(!file.includes('zp-status-dot'), 'Fake status dot should be removed');

  // Must have title case caption
  assert.match(file, /BİLSEM Junior · Hazırlık Stüdyosu/);

  // Must not have decorative text characters ✦ or ✧
  assert.ok(!file.includes('>✦<'), '✦ star text should be removed');
  assert.ok(!file.includes('>✧<'), '✧ star text should be removed');

  // Note kicker must be clean title case
  assert.match(file, /<small>Düşün · Keşfet · Geliş<\/small>/);
  assert.ok(!file.includes('DÜŞÜN. KEŞFET. GELİŞ.'), 'ALL-CAPS kicker should be removed');

  // Should use Compass instead of Sparkles
  assert.ok(!file.includes('Sparkles'), 'Sparkles icon should not be used in LearningIsland');
  assert.match(file, /<Compass size=\{20\} \/>/);
});

test('LandingPage converts ALL-CAPS kickers to natural sentence/title case and strips decorative slop', async () => {
  const file = await readFile(new URL('../src/components/LandingPage.tsx', import.meta.url), 'utf8');

  // Kickers in natural Title / Sentence Case
  assert.match(file, /İzlemek güzel, denemek daha güzel\./);
  assert.ok(!file.includes('İZLEMEK GÜZEL. DENEMEK DAHA GÜZEL.'));

  assert.match(file, /İlk adım tamam!/);
  assert.ok(!file.includes('İLK ADIM TAMAM!'));

  assert.match(file, /İncele ve keşfet/);
  assert.ok(!file.includes('İNCELE & KEŞFET'));

  assert.match(file, /BİLSEM hazırlığı · 1–4\. sınıf alıştırmaları/);
  assert.ok(!file.includes('BİLSEM HAZIRLIĞI · 1–4. SINIF ALIŞTIRMALARI'));

  assert.match(file, /Küçük ekran, büyük merak/);
  assert.ok(!file.includes('KÜÇÜK EKRAN, BÜYÜK MERAK'));

  assert.match(file, /BİLSEM hazırlık alanları/);
  assert.ok(!file.includes('BİLSEM HAZIRLIK ALANLARIN'));

  assert.match(file, /Keşfet, geliş, kutla/);
  assert.ok(!file.includes('KEŞFET, GELİŞ, KUTLA'));

  assert.match(file, /Büyük keşiflerin küçük rutini/);
  assert.ok(!file.includes('BÜYÜK KEŞİFLERİN KÜÇÜK RUTİNİ'));

  assert.match(file, /Birlikte daha güzel/);
  assert.ok(!file.includes('BİRLİKTE DAHA GÜZEL'));

  assert.match(file, /Aklında bir soru mu var\?/);
  assert.ok(!file.includes('AKLINDA BİR SORU MU VAR?'));

  assert.match(file, /Hadi, bir adım atalım\./);
  assert.ok(!file.includes('HADİ, BİR ADIM ATALIM.'));

  // No star character inflation
  assert.ok(!file.includes('>✦<'), '✦ character inflation should be removed from LandingPage');

  // Worlds grid wraps each world card in SpotlightSurface
  assert.match(file, /<SpotlightSurface[\s\S]*?zp-world-card-surface/);

  // Rewards grid uses SpotlightSurface Bento cards
  assert.match(file, /<SpotlightSurface[\s\S]*?zp-reward/);
});

test('LoginPage modernizes into a balanced 2-column items-stretch layout without AI slop', async () => {
  const file = await readFile(new URL('../src/components/LoginPage.tsx', import.meta.url), 'utf8');

  // 2-column items-stretch shell
  assert.match(file, /zp-auth-shell[\s\S]*?lg:grid-cols-12[\s\S]*?items-stretch/);
  assert.match(file, /zp-auth-form-panel[\s\S]*?lg:col-span-7/);
  assert.match(file, /zp-auth-showcase[\s\S]*?lg:col-span-5/);

  // Kickers in Title / Sentence Case
  assert.match(file, /BİLSEM Junior · Hazırlık Hesabı/);
  assert.ok(!file.includes('BİLSEM JUNIOR / HAZIRLIK HESABI'));

  assert.match(file, /Merak eden zihinler için/);
  assert.ok(!file.includes('MERAK EDEN ZİHİNLER İÇİN'));

  // No Sparkles in brand mark or showcase
  assert.ok(!file.includes('<Sparkles'), 'Sparkles icon should be removed from LoginPage');
  assert.match(file, /<ShieldCheck size=\{18\} \/>/);

  // No decorative star in note
  assert.ok(!file.includes('>✦<'), '✦ should be removed from LoginPage scene note');
  assert.match(file, /<div className="zp-auth-scene-note">Bugünün rotası: keşfet\.<\/div>/);
});

test('Styles enforce distraction-free discovery lab and 60-30-10 Bento cards', async () => {
  const discoveryCss = await readFile(new URL('../src/components/landing/discovery-playground.css', import.meta.url), 'utf8');
  assert.match(discoveryCss, /\.bj-discovery\s*\{[^}]*border:\s*1px solid/);
  assert.match(discoveryCss, /\.bj-discovery\s*\{[^}]*background:\s*#ffffff/);

  const homeCss = await readFile(new URL('../src/components/landing/colorful-home.css', import.meta.url), 'utf8');
  assert.match(homeCss, /\.zp-world-card\s*\{[^}]*background:\s*#ffffff/);
  assert.match(homeCss, /\.zp-world-card\s*\{[^}]*border:\s*1px solid/);

  const authCss = await readFile(new URL('../src/features/auth/auth-design-system.css', import.meta.url), 'utf8');
  assert.match(authCss, /\.zp-auth-shell\s*\{[^}]*align-items:\s*stretch/);
});
