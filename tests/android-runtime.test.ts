import test from 'node:test';
import assert from 'node:assert/strict';
import { androidParentRoute, claimAndroidBack, dispatchAndroidBack } from '../src/lib/android-navigation';
import { androidViewportHtml } from '../scripts/android-build-settings';

test('native Back is claimed once by the visible task and released on unmount', () => {
  const target = new EventTarget();
  let saves = 0, other = 0;
  const dispose = claimAndroidBack(target, () => { saves++; });
  const disposeOther = claimAndroidBack(target, () => { other++; });
  assert.equal(dispatchAndroidBack(target), true);
  assert.equal(saves, 1); assert.equal(other, 0);
  dispose();
  assert.equal(dispatchAndroidBack(target), true);
  assert.equal(other, 1);
  disposeOther();
  assert.equal(dispatchAndroidBack(target), false);
});

test('Back returns student details to their matching hub and preserves parent boundaries', () => {
  for (const route of ['student-tests', 'student-topics', 'student-plan', 'student-skills', 'mistakes', 'glossary']) assert.equal(androidParentRoute(route, 'student'), 'student-study');
  for (const route of ['student-challenges', 'student-progress', 'achievements', 'leaderboard']) assert.equal(androidParentRoute(route, 'student'), 'student-rewards');
  for (const route of ['student-profile', 'student-study', 'student-rewards']) assert.equal(androidParentRoute(route, 'student'), 'dashboard');
  assert.equal(androidParentRoute('login', 'student'), 'landing');
  assert.equal(androidParentRoute('dashboard', 'student'), null);
  assert.equal(androidParentRoute('parent', 'parent'), null);
  assert.equal(androidParentRoute('student-profile', 'parent'), null);
});

test('Android reserves system bars without disabling zoom or modifying the web source', () => {
  const source = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />';
  const result = androidViewportHtml(source);
  assert.match(result, /viewport-fit=contain/);
  assert.match(result, /maximum-scale=5.0/);
  assert.match(source, /viewport-fit=cover/);
  assert.throws(() => androidViewportHtml('<html></html>'), /güvenli ekran/);
});
