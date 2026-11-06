import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentMissionStrip } from '../src/components/student/StudentMissionStrip';
import type { UserProfile } from '../src/types';

const mockUser: UserProfile = {
  id: 'student-modern-1',
  role: 'student',
  name: 'Elif',
  avatar: '🦊',
  level: 4,
  xp: 1450,
  streak: 7,
  grade: 2,
  lastActiveDate: new Date().toISOString(),
  dailyGoalMinutes: 20,
  todayMinutesSpent: 10,
  dailyGoalQuestions: 15,
  todayQuestionsSolved: 8,
  todaySessionsCompleted: 2,
  soundEnabled: true,
};

test('StudentMissionStrip applies tabular-nums to daily mission progress', () => {
  const html = renderToStaticMarkup(
    <StudentMissionStrip user={mockUser} weeklyQuestions={42} />
  );

  assert.match(html, /Günün yıldızları/);
  assert.match(html, /tabular-nums/);
});

test('StudentHeroBanner source complies with Faz 4 design system discipline', async () => {
  const source = await readFile(new URL('../src/components/student/StudentHeroBanner.tsx', import.meta.url), 'utf8');

  // No redundant badge sandwich
  assert.doesNotMatch(source, /KAŞİF KARTIN/);
  assert.match(source, /Bugün de harikalar keşfedelim/);

  // Tabular nums applied to stats, XP, level
  assert.match(source, /tabular-nums/);
  assert.match(source, /SEVİYE (?:\{xpProgress\.level\}|<CountUpNumber value=\{xpProgress\.level\} \/>)/);
});

test('StudentSkillsGrid source applies tabular-nums to metrics and maintains 60-30-10 discipline', async () => {
  const source = await readFile(new URL('../src/components/student/StudentSkillsGrid.tsx', import.meta.url), 'utf8');

  assert.match(source, /tabular-nums/);
  assert.match(source, /%\$\{masteryPct\} Ustalık/);
  assert.match(source, /%\$\{m\.accuracy \|\| 0\} Doğruluk/);
});

test('StudentModesGrid source code eliminates AI-slop decorative symbols and enforces clean case', async () => {
  const source = await readFile(new URL('../src/components/student/StudentModesGrid.tsx', import.meta.url), 'utf8');

  // No decorative text sparkle glyphs
  assert.doesNotMatch(source, />✦</);
  assert.doesNotMatch(source, />✧</);

  // Clean title case instead of ALL-CAPS kickers
  assert.match(source, /Keşif Yolu · BİLSEM Hazırlık/);
  assert.match(source, /Durak \{number\}/);
  assert.match(source, /tabular-nums/);
});

test('StudentDashboard source code integrates navigation group and preserves accessibility', async () => {
  const source = await readFile(new URL('../src/components/StudentDashboard.tsx', import.meta.url), 'utf8');

  // Unified navigation group container
  assert.match(source, /zp-student-nav-group/);
  assert.match(source, /bj-primary-navigation/);
  assert.match(source, /bj-more-navigation/);

  // Clean casing on kickers
  assert.match(source, /Bugünkü ilk adımın/);
  assert.match(source, /Bugünkü hedefin/);
  assert.match(source, /Bu hafta/);

  // Tabular nums applied
  assert.match(source, /zp-daily-meter tabular-nums/);
  assert.match(source, /zp-week-stats tabular-nums/);
});

test('compact-interface.css contains desktop nav integration and mobile compaction', async () => {
  const css = await readFile(new URL('../src/components/student/compact-interface.css', import.meta.url), 'utf8');

  assert.match(css, /@media\(min-width:\s*1024px\)/);
  assert.match(css, /\.zp-student-nav-group/);
  assert.match(css, /@media\(max-width:\s*680px\)/);
  assert.match(css, /\.zp-student-topline/);
  assert.match(css, /\.bj-motion-toolbar/);
});
