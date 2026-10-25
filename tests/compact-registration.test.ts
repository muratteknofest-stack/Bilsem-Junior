import test from 'node:test';
import assert from 'node:assert/strict';
import { compactPageErrors, compactRegistrationPages, firstInvalidCompactPage } from '../src/features/auth/compact-registration';
import { validateRegistrationDraft, type RegistrationDraft } from '../src/features/auth/registration-draft';

const draft: RegistrationDraft = { parentEmail: 'veli@example.invalid', password: 'Veli937546', passwordConfirmation: 'Veli937546', studentName: 'Deniz', grade: 2, studentPassword: 'Ogrenci937546', studentPasswordConfirmation: 'Ogrenci937546', kvkkConsent: true, termsAccepted: true, guardianConfirmed: true };
test('compact registration validates every original field exactly once across five pages', () => {
  const fields = compactRegistrationPages.flatMap(page => page.fields);
  assert.equal(new Set(fields).size, Object.keys(draft).length);
  assert.equal(fields.length, Object.keys(draft).length);
  assert.deepEqual(validateRegistrationDraft(draft), {});
  assert.equal(compactPageErrors(validateRegistrationDraft({ ...draft, password: '', studentName: '' }, 0), 0).password, undefined);
  assert.ok(compactPageErrors(validateRegistrationDraft({ ...draft, password: '' }, 0), 1).password);
});
test('final validation returns to the actual compact page and preserves distinct-password and consent checks', () => {
  assert.equal(firstInvalidCompactPage({ parentEmail: 'Email' }), 0);
  assert.equal(firstInvalidCompactPage({ passwordConfirmation: 'Mismatch' }), 1);
  assert.equal(firstInvalidCompactPage({ grade: 'Select' }), 2);
  assert.equal(firstInvalidCompactPage({ studentPassword: 'Distinct' }), 3);
  assert.equal(firstInvalidCompactPage({ guardianConfirmed: 'Required' }), 4);
  const errors = validateRegistrationDraft({ ...draft, studentPassword: draft.password, guardianConfirmed: false });
  assert.ok(errors.studentPassword && errors.guardianConfirmed);
  assert.equal(firstInvalidCompactPage(errors), 3);
});
