import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { escapeHtml, normalizeStudentCode } from '../server/security.ts';

test('HTML inserted into report emails is escaped', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')">`),
    '&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;',
  );
});

test('student codes contain only normalized ASCII letters and digits', () => {
  assert.equal(normalizeStudentCode('Çağrı Öztürk<script>'), 'CAGRIOZTURKS');
});

test('Firestore authorization uses token roles and denies unmatched paths', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /request\.auth\.token\.role/);
  assert.doesNotMatch(rules, /documents\/users\/.*\.data\.role == 'admin'/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});

test('login source contains no local authentication fallback or fixed password', async () => {
  const source = await readFile(new URL('../src/components/LoginPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /SYSTEM_ACCOUNTS/);
  assert.doesNotMatch(source, /resilient local login/i);
  assert.doesNotMatch(source, /Standart şifre|setPassword\('123456'\)/);
});
