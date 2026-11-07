import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppHandoff, exchangeAppHandoff, _resetHandoffStoreForTest } from '../server/app-handoff';

test('createAppHandoff generates unique token, code and deep links', () => {
  _resetHandoffStoreForTest();

  const handoff = createAppHandoff({
    userId: 'user-1234-parent',
    email: 'veli@example.com',
    role: 'parent',
    sessionPayload: {
      accessToken: 'access-token-xyz',
      refreshToken: 'refresh-token-abc',
      role: 'parent',
      email: 'veli@example.com',
      uid: 'user-1234-parent',
    },
    siteUrl: 'https://www.bilsemjunior.com',
  });

  assert.match(handoff.token, /^handoff_[A-Za-z0-9_-]+$/);
  assert.match(handoff.code, /^BJ-[23456789A-Z]{4}$/);
  assert.ok(handoff.expiresAt > Date.now());
  assert.match(handoff.deepLinkUrl, /^bilsemjunior:\/\/auth\?handoff=handoff_/);
  assert.match(handoff.appLinkUrl, /^https:\/\/www\.bilsemjunior\.com\/app-auth\?handoff=handoff_/);
  assert.match(handoff.playStoreReferrerUrl, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.quantumtech\.bilsemjunior&referrer=handoff_token%3Dhandoff_/);
});

test('exchangeAppHandoff succeeds with token and prevents replay', () => {
  _resetHandoffStoreForTest();

  const handoff = createAppHandoff({
    userId: 'user-student-999',
    email: 'deniz@bilsemjunior.local',
    role: 'student',
    sessionPayload: {
      studentCode: 'DENIZ88',
      studentName: 'Deniz',
      role: 'student',
      email: 'deniz@bilsemjunior.local',
      uid: 'user-student-999',
    },
  });

  // First exchange by token succeeds
  const first = exchangeAppHandoff({ token: handoff.token });
  assert.equal(first.success, true);
  assert.equal(first.sessionPayload?.studentCode, 'DENIZ88');
  assert.equal(first.sessionPayload?.role, 'student');

  // Replay attempt fails with 409-compatible error
  const replay = exchangeAppHandoff({ token: handoff.token });
  assert.equal(replay.success, false);
  assert.equal(replay.code, 'HANDOFF_NOT_FOUND');
});

test('exchangeAppHandoff succeeds with 6-character code (case-insensitive & prefix-tolerant)', () => {
  _resetHandoffStoreForTest();

  const handoff = createAppHandoff({
    userId: 'user-parent-456',
    email: 'veli2@example.com',
    role: 'parent',
    sessionPayload: {
      accessToken: 'acc-token',
      refreshToken: 'ref-token',
      role: 'parent',
      email: 'veli2@example.com',
      uid: 'user-parent-456',
    },
  });

  // Exchange with lowercase code
  const codeWithoutPrefix = handoff.code.replace('BJ-', '').toLowerCase();
  const res = exchangeAppHandoff({ code: codeWithoutPrefix });
  assert.equal(res.success, true);
  assert.equal(res.sessionPayload?.email, 'veli2@example.com');
  assert.equal(res.sessionPayload?.refreshToken, 'ref-token');
});

test('exchangeAppHandoff rejects missing or expired tokens', () => {
  _resetHandoffStoreForTest();

  const missing = exchangeAppHandoff({ token: 'handoff_does_not_exist' });
  assert.equal(missing.success, false);
  assert.equal(missing.code, 'HANDOFF_NOT_FOUND');

  const empty = exchangeAppHandoff({});
  assert.equal(empty.success, false);
  assert.equal(missing.code, 'HANDOFF_NOT_FOUND');
});

test('Google Play Referrer query string regex correctly extracts handoff_token', () => {
  const referrerSample1 = 'utm_source=google&handoff_token=handoff_abc123xyz&utm_medium=cpc';
  const match1 = referrerSample1.match(/(?:^|[&?])handoff_token=([a-zA-Z0-9_-]+)/);
  assert.ok(match1);
  assert.equal(match1[1], 'handoff_abc123xyz');

  const referrerSample2 = 'handoff_token=handoff_simple999';
  const match2 = referrerSample2.match(/(?:^|[&?])handoff_token=([a-zA-Z0-9_-]+)/);
  assert.ok(match2);
  assert.equal(match2[1], 'handoff_simple999');

  const referrerNoHandoff = 'utm_source=organic&utm_medium=search';
  const match3 = referrerNoHandoff.match(/(?:^|[&?])handoff_token=([a-zA-Z0-9_-]+)/);
  assert.equal(match3, null);
});
