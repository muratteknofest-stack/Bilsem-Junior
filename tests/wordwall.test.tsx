import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import catalog from '../src/content/wordwall-catalog.json';
import { WordwallLibrary } from '../src/components/WordwallLibrary';
import { WORDWALL_ACTIVITIES, WORDWALL_AUTHOR, filterWordwallActivities, isSafeWordwallActivity, wordwallInitialGrade } from '../src/features/student/wordwall-model';

test('all public activities are retained with the supplied fourth-grade example and unique identities', () => {
  assert.equal(WORDWALL_AUTHOR.id, 13992153);
  assert.equal(WORDWALL_ACTIVITIES.length, catalog.activities.length);
  assert.equal(WORDWALL_ACTIVITIES.length, 157);
  assert.equal(new Set(WORDWALL_ACTIVITIES.map(item => item.id)).size, 157);
  assert.deepEqual([1, 2, 3, 4].map(grade => WORDWALL_ACTIVITIES.filter(item => item.grade === grade).length), [77, 27, 27, 26]);
  const example = WORDWALL_ACTIVITIES.find(item => item.id === '78822332');
  assert.ok(example);
  assert.equal(example.grade, 4);
  assert.equal(example.category, 'Şekil sınıflandırma');
  assert.match(example.embedUrl, /\/tr\/embed\/813d8612535a4d8ebf979a8afd131a04\?/);
});

test('only official HTTPS resource, embed and thumbnail endpoints are accepted', () => {
  const activity = WORDWALL_ACTIVITIES[0];
  for (const embedUrl of ['javascript:alert(1)', 'https://wordwall.net.attacker.example/embed/' + 'a'.repeat(32), 'https://attacker.example/embed/' + 'a'.repeat(32), activity.embedUrl.replace('https:', 'http:'), activity.embedUrl.replace('wordwall.net', 'user:secret@wordwall.net'), activity.embedUrl.replace('wordwall.net', 'wordwall.net:8443'), 'https://wordwall.net/tr/resource/1']) {
    assert.equal(isSafeWordwallActivity({ ...activity, embedUrl }), false, embedUrl);
  }
  assert.equal(isSafeWordwallActivity({ ...activity, resourceUrl: 'https://wordwall.net/tr/resource/0' }), false);
  assert.equal(isSafeWordwallActivity({ ...activity, thumbnailUrl: 'https://attacker.example/pixel' }), false);
  assert.equal(isSafeWordwallActivity({ ...activity, grade: 5 }), false);
});

test('Turkish and unaccented searches combine with class and topic filters', () => {
  const classification = filterWordwallActivities(WORDWALL_ACTIVITIES, 4, '', 'sekil siniflandirma');
  assert.equal(classification.length, 5);
  assert.ok(classification.some(item => item.id === '78822332'));
  const foldedPaper = filterWordwallActivities(WORDWALL_ACTIVITIES, 4, 'Kâğıt katlama', 'KAGIT');
  assert.equal(foldedPaper.length, 5);
  assert.equal(filterWordwallActivities(WORDWALL_ACTIVITIES, 4, 'Kâğıt katlama', 'sayı').length, 0);
  assert.equal(filterWordwallActivities(WORDWALL_ACTIVITIES, 'all', '', '').length, 157);
});

test('student class is selected automatically and games are only embedded after choosing one', () => {
  assert.equal(wordwallInitialGrade(), 4);
  assert.equal(wordwallInitialGrade(2), 2);
  assert.equal(wordwallInitialGrade(8), 4);
  const fourth = renderToStaticMarkup(<WordwallLibrary />);
  assert.match(fourth, /26 test bulundu/);
  assert.equal((fourth.match(/class="ww-card"/g) || []).length, 12);
  assert.doesNotMatch(fourth, /<iframe/);
  assert.match(fourth, /aria-label="Testler için sınıf seçimi"/);
  assert.match(fourth, /Bu testlerin puanları ZekaPark çalışma raporlarına otomatik aktarılmaz/);
  assert.match(renderToStaticMarkup(<WordwallLibrary initialGrade={1} />), /77 test bulundu/);
});

test('static CSP permits the Wordwall frame and thumbnails while retaining script and frame protections', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const csp = config.headers[0].headers.find((header: { key: string }) => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /frame-src https:\/\/wordwall\.net;/);
  assert.match(csp, /img-src[^;]+https:\/\/screens\.cdn\.wordwall\.net/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

import {
  buildMapStops,
  buildMapSvgPath,
  getGradeWorld,
  getMapNodeCoordinates,
  toggleWordwallCompleted
} from '../src/features/student/wordwall-map-model';

test('3D adventure map builds grade-progressive worlds, winding SVG trail and star milestones', () => {
  const world1 = getGradeWorld(1);
  const world4 = getGradeWorld(4);
  assert.match(world1.worldName, /1\. Sınıf · Merak Adası/);
  assert.match(world4.worldName, /4\. Sınıf · BİLSEM Zirvesi/);

  const coords = getMapNodeCoordinates(12, 4);
  assert.equal(coords.length, 12);
  // Row 0 goes left-to-right, Row 1 snakes right-to-left
  assert.ok(coords[0].xPercent < coords[3].xPercent);
  assert.ok(coords[4].xPercent > coords[7].xPercent);

  const pathD = buildMapSvgPath(coords);
  assert.match(pathD, /^M /);
  assert.match(pathD, / Q /);

  const sampleActivities = WORDWALL_ACTIVITIES.slice(0, 4);
  const { nextIds, completed } = toggleWordwallCompleted([], sampleActivities[0].id);
  assert.equal(completed, true);
  const stops = buildMapStops(sampleActivities, new Set(nextIds), 0);
  assert.equal(stops[0].status, 'completed');
  assert.equal(stops[0].stars, 3);
  assert.equal(stops[1].status, 'current');
  assert.equal(stops[2].status, 'unlocked');

  const markup = renderToStaticMarkup(<WordwallLibrary initialGrade={2} />);
  assert.match(markup, /Bilge Baykuş Zeki/);
  assert.match(markup, /2\. Sınıf · Örüntü Krallığı/);
  assert.match(markup, /Durak 1/);
});
