import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MobileBottomNav } from '../src/components/MobileBottomNav';

test('Navbar.tsx fulfills Top Bar Contract with 3 zones, clean typography and nowrap discipline', async () => {
  const content = await readFile(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');

  // Zone 1: Brand Logo
  assert.match(content, /ZONE 1: MARKA LOGOSU/);
  assert.match(content, /<Logo/);

  // Zone 2: Navigation & role transition tabs
  assert.match(content, /ZONE 2: TEK SATIRLI GEZİNME VE ROL GEÇİŞ SEKME GRUBU/);
  assert.match(content, /Öğrenci Paneli/);
  assert.match(content, /Veli Portalı/);
  assert.match(content, /whitespace-nowrap shrink-0/);
  assert.match(content, /aria-label="English version"/);

  // Zone 3: Primary action, audio control and clean typography (no pill badge sandwich)
  assert.match(content, /ZONE 3: BİRİNCİL AKSİYON VE KOMPAKT KULLANICI \/ SES KONTROL/);
  assert.match(content, /data-audio-control/);
  assert.match(content, /currentUser\?\.name/);
  assert.match(content, /·/); // Unboxed typographic dot separator
  assert.match(content, /currentUser\.studentCode/);
  assert.match(content, /aria-label="Çıkış yap"/);

  // Preserves Android native header branching
  assert.match(content, /bj-native-header/);
  assert.match(content, /bj-native-parent-header/);
});

test('LandingNav.tsx adheres to 3-zone architecture with nowrap buttons and audio data attribute', async () => {
  const content = await readFile(new URL('../src/components/landing/LandingNav.tsx', import.meta.url), 'utf8');

  // Zone 1: Brand Logo
  assert.match(content, /ZONE 1: MARKA LOGOSU/);
  assert.match(content, /zp-public-brand/);
  assert.match(content, /aria-label="Bilsem Junior ana sayfa"/);

  // Zone 2: Single line navigation links
  assert.match(content, /ZONE 2: TEK SATIRLI GEZİNME BAĞLANTILARI/);
  assert.match(content, /zp-public-links/);
  assert.match(content, /href="#bilsem-rehberi"/);
  assert.match(content, /href="#siniflar"/);
  assert.match(content, /href="#aile"/);

  // Zone 3: Compact controls, sound and primary register button
  assert.match(content, /ZONE 3: BİRİNCİL AKSİYON VE KOMPAKT DENEYİM \/ GİRİŞ PANELİ/);
  assert.match(content, /data-audio-control/);
  assert.match(content, /zp-nav-signup/);
  assert.match(content, /whitespace-nowrap shrink-0/);
});

test('navigation.css ensures compact height and nowrap on links and buttons', async () => {
  const css = await readFile(new URL('../src/components/landing/navigation.css', import.meta.url), 'utf8');
  assert.match(css, /\.zp-public-nav\{[^}]*min-height:\s*64px/);
  assert.match(css, /\.zp-nav-link\{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.zp-nav-signup\{[^}]*white-space:\s*nowrap/);
});

test('MobileBottomNav satisfies <=15% height rule with h-14 (56px) and >=44px touch targets', () => {
  const html = renderToStaticMarkup(
    <MobileBottomNav
      currentRoute="mistakes"
      userRole="student"
      mistakesCount={5}
      onNavigate={() => {}}
    />
  );

  // Height and structure
  assert.match(html, /h-14/); // Compact 56px height
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  assert.match(html, /min-h-\[44px\]/); // Minimum 44px touch target
  assert.match(html, /min-w-\[44px\]/); // Minimum 44px touch target

  // Accessibility semantics
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Tekrar: 5 yanlış soru/);
});

test('MobileBottomNav for parent user includes guide and blog without student panel leak', () => {
  const html = renderToStaticMarkup(
    <MobileBottomNav
      currentRoute="parent"
      userRole="parent"
      mistakesCount={0}
      onNavigate={() => {}}
    />
  );

  assert.ok(!html.includes('Öğrenci Paneli'));
  assert.match(html, /href="\/bilgi\/hesap-ve-veli-rehberi"/);
  assert.match(html, /href="\/blog"/);
});
