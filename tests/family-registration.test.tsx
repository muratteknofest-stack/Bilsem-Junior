import test from 'node:test';
import { registrationReadySettings } from './fixtures/launch-settings';
import assert from 'node:assert/strict';
import type { Request, Response as ExpressResponse } from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createFamilyRegistrationHandler } from '../server/family-registration';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { PasswordPolicyError } from '../server/password-policy';
import { validateRegistrationDraft, firstInvalidRegistrationStep, registrationControls, type RegistrationDraft } from '../src/features/auth/registration-draft';
import { registerFamilyInSupabase, resendFamilyConfirmation } from '../src/services/family-registration-service';
import { RegistrationConfirmation } from '../src/features/auth/components/RegistrationConfirmation';
import { accountEntry, accountEntryPath } from '../src/features/auth/account-entry';
const parentId = '11111111-1111-4111-8111-111111111111', studentId = '22222222-2222-4222-8222-222222222222';
test('closed or unavailable registration permits editing and step navigation, but prevents account creation', () => {
  for (const open of [undefined, false, true]) {
    for (const step of [0, 1] as const) assert.deepEqual(registrationControls(step, false, open), { fieldsDisabled: false, submitDisabled: false });
    assert.deepEqual(registrationControls(2, false, open), { fieldsDisabled: false, submitDisabled: open !== true });
    for (const step of [0, 1, 2] as const) assert.deepEqual(registrationControls(step, true, open), { fieldsDisabled: true, submitDisabled: true });
  }
  const source = readFileSync(new URL('../src/features/auth/components/RegistrationForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /<fieldset disabled=\{controls\.fieldsDisabled\}/);
  assert.match(source, /type="submit" disabled=\{controls\.submitDisabled\}/);
  assert.ok(source.indexOf('if (step < 2) { setStep') < source.indexOf('if (!availability?.registrationOpen) {'));
});
test('direct registration and login addresses preserve the public account form and never select administrator access', () => {
  for (const path of ['/register', '/register/']) assert.deepEqual(accountEntry(new URL(path, 'https://bilsemjunior.vercel.app')), { mode:'register',role:'parent' });
  assert.deepEqual(accountEntry(new URL('https://bilsemjunior.vercel.app/login?role=parent')), { mode:'login',role:'parent' });
  assert.deepEqual(accountEntry(new URL('https://bilsemjunior.vercel.app/login?role=admin')), { mode:'login',role:'student' });
  for (const path of ['/', '/admin/giris', '/register/extra', '/blog/login']) assert.equal(accountEntry(new URL(path, 'https://bilsemjunior.vercel.app')), null);
  assert.equal(accountEntryPath('register','parent'),'/register'); assert.equal(accountEntryPath('login','parent'),'/login?role=parent'); assert.equal(accountEntryPath('login','admin'),'/login');
});
const input = { parentEmail: ' VELI@example.com ', parentPassword: 'VeliGüvenli937', studentPassword: 'ÖğrenciGüvenli938', studentName: ' Deniz ', grade: 2, examFocus: 'Genel Zihinsel Yetenek', consentAccepted: true, termsAccepted: true, guardianConfirmed: true, policyVersion: '2026-10-11.1' };
async function run(options: { fail?: 'config'|'password'|'parent'|'student'|'profiles'|'mail'|'cleanup'; closed?: boolean; stale?: boolean; collision?: boolean; incompleteReadiness?: boolean; body?: unknown } = {}) {
  const actions: string[] = [], profiles: Array<Record<string, unknown>> = [];
  const settings = registrationReadySettings();
  settings.release = { registrationEnabled: !options.closed, emailTested: true, restoreTested: true, familyPilotTested: true, monitoringTested: true };
  if (options.incompleteReadiness) {
    settings.business = defaultPlatformSettings().business;
    settings.release = { ...defaultPlatformSettings().release, registrationEnabled: true };
  }
  let attempts = 0;
  const handler = createFamilyRegistrationHandler({
    async configuration() { actions.push('config'); if (options.fail === 'config') throw Error('private-configuration'); return { settings, revision: options.stale ? 2 : 1, updatedAt: null }; },
    async checkPassword() { if (options.fail === 'password') throw new PasswordPolicyError('PASSWORD_COMPROMISED'); },
    async createUser(value) {
      assert.equal(value.emailVerified, false); assert.ok(!('role' in value));
      const isParent = value.email === 'veli@example.com'; actions.push(isParent ? 'parent' : 'student');
      if (isParent && options.fail === 'parent') throw { code: 'email_exists', message: 'private-duplicate' };
      if (!isParent && options.fail === 'student') throw Error('private-provider-detail');
      if (!isParent && options.collision && attempts++ === 0) throw { code: 'email_exists' };
      return { uid: isParent ? parentId : studentId };
    },
    async saveProfiles(rows) { actions.push('profiles'); if (options.fail === 'profiles' || options.fail === 'cleanup') throw Error('private-database-detail'); profiles.push(...rows); },
    async deleteUser(id) { actions.push(`delete:${id}`); if (options.fail === 'cleanup') throw Error('private-cleanup-detail'); },
    async sendVerification(email) { assert.equal(email, 'veli@example.com'); actions.push('mail'); if (options.fail === 'mail') throw Error('private-smtp-password'); },
    logFailure() { actions.push('log'); }, suffix: () => 1234,
  });
  const record = { status: 200, payload: {} as any, cache: '' };
  const res = { setHeader(_name: string, value: string) { record.cache = value; }, status(value: number) { record.status = value; return this; }, json(payload: unknown) { record.payload = payload; return this; } } as unknown as ExpressResponse;
  await handler({ body: options.body ?? input } as Request, res);
  assert.equal(record.cache, 'no-store');
  assert.doesNotMatch(JSON.stringify(record.payload), /private-|VeliGüvenli|ÖğrenciGüvenli|access_token|refresh_token/);
  return { ...record, actions, profiles };
}
test('family registration creates two unverified users and saves reciprocal profiles before requesting email', async () => {
  const result = await run(); assert.equal(result.status, 201); assert.equal(result.payload.verificationSent, true);
  assert.deepEqual(result.actions, ['config','parent','student','profiles','mail']);
  assert.equal(result.profiles[0].role, 'parent'); assert.deepEqual(result.profiles[0].linkedStudentIds, [studentId]);
  assert.equal(result.profiles[1].linkedParentId, parentId); assert.equal(result.payload.student.code, 'DENIZ1234');
});
test('an enable flag cannot create accounts with incomplete identity and privacy preparation', async () => {
  const result = await run({ incompleteReadiness: true });
  assert.equal(result.status, 503);
  assert.deepEqual(result.actions, ['config']);
});
test('mail outage keeps completed accounts and reports delivery failure without repeating registration', async () => {
  const result = await run({ fail: 'mail' }); assert.equal(result.status, 201); assert.equal(result.payload.success, true); assert.equal(result.payload.verificationSent, false);
  assert.equal(result.profiles.length, 2); assert.ok(!result.actions.some(action => action.startsWith('delete:')));
});
test('registration gates and invalid input reject work before account creation', async () => {
  for (const [options,status] of [[{ closed:true },503],[{ stale:true },409],[{ fail:'config' },503],[{ fail:'password' },422],[{ body:{ ...input, guardianConfirmed:false } },400],[{ body:{ ...input, parentPassword: input.studentPassword } },400],[{ body:{ ...input, role:'admin' } },400]] as const) {
    const result = await run(options); assert.equal(result.status,status); assert.ok(!result.actions.includes('parent'));
  }
});
test('duplicate emails never overwrite existing accounts; code collisions retry only the new student', async () => {
  const duplicate = await run({ fail:'parent' }); assert.equal(duplicate.status,409); assert.equal(duplicate.payload.code,'ACCOUNT_EXISTS'); assert.ok(!duplicate.actions.some(action=>action.startsWith('delete:')));
  const collision = await run({ collision:true }); assert.equal(collision.status,201); assert.equal(collision.actions.filter(action=>action==='parent').length,1); assert.equal(collision.actions.filter(action=>action==='student').length,2);
});
test('unfinished registrations clean up only newly created identities, including cleanup failures', async () => {
  const student = await run({ fail:'student' }); assert.equal(student.status,503); assert.deepEqual(student.actions.filter(a=>a.startsWith('delete:')),[`delete:${parentId}`]);
  for (const fail of ['profiles','cleanup'] as const) { const result=await run({ fail }); assert.equal(result.status,503); assert.deepEqual(result.actions.filter(a=>a.startsWith('delete:')),[`delete:${studentId}`,`delete:${parentId}`]); assert.ok(!result.actions.includes('mail')); }
});
const draft: RegistrationDraft = { parentEmail:' VELI@example.com ',password:'VeliGüvenli937',passwordConfirmation:'VeliGüvenli937',studentName:'Deniz',grade:2,studentPassword:'ÖğrenciGüvenli938',studentPasswordConfirmation:'ÖğrenciGüvenli938',kvkkConsent:true,termsAccepted:true,guardianConfirmed:true };
test('registration requires an explicit supported school grade', () => {
  for (const grade of [0,5]) assert.ok(validateRegistrationDraft({ ...draft, grade },1).grade);
  for (const grade of [1,2,3,4]) assert.equal(validateRegistrationDraft({ ...draft, grade },1).grade,undefined);
});
test('registration steps validate only their fields; final review catches earlier edits and missing consent', () => {
  assert.deepEqual(validateRegistrationDraft(draft),{});
  const broken={...draft,parentEmail:'wrong',passwordConfirmation:'wrong',studentPassword:draft.password,studentPasswordConfirmation:draft.password,guardianConfirmed:false};
  const parent=validateRegistrationDraft(broken,0); assert.ok(parent.parentEmail && parent.passwordConfirmation); assert.ok(!parent.studentPassword && !parent.guardianConfirmed);
  const child=validateRegistrationDraft(broken,1); assert.ok(child.studentPassword); assert.ok(!child.parentEmail);
  const all=validateRegistrationDraft(broken); assert.equal(firstInvalidRegistrationStep(all),0); assert.ok(all.guardianConfirmed);
});
test('client preserves delivery status and refuses malformed success responses; resend stays separate from creation', async () => {
  const previous=globalThis.fetch;
  try {
    globalThis.fetch=async()=>Response.json({success:true,parentProfile:{id:parentId,role:'parent'},student:{id:studentId,code:'DENIZ1234',email:'deniz1234@zekapark.com'},verificationSent:false});
    assert.equal((await registerFamilyInSupabase(input)).verificationSent,false);
    globalThis.fetch=async()=>Response.json({success:true}); await assert.rejects(registerFamilyInSupabase(input),/sonucu doğrulanamadı/);
    globalThis.fetch=async()=>new Response('<html>Gateway error</html>',{status:503}); await assert.rejects(registerFamilyInSupabase(input),/tamamlanamadı/);
    globalThis.fetch=async()=>Response.json(null,{status:503}); await assert.rejects(registerFamilyInSupabase(input),/tamamlanamadı/);
    globalThis.fetch=async()=>{throw Error('secret-network-detail')}; await assert.rejects(registerFamilyInSupabase(input),/Sunucu yanıtı/);
    globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/auth/resend-confirmation');assert.deepEqual(JSON.parse(String(init?.body)),{email:'veli@example.com'});return Response.json({success:true,message:'Doğrulama istendi.'},{status:202})};
    assert.equal(await resendFamilyConfirmation(' VELI@example.com '),'Doğrulama istendi.');
  } finally { globalThis.fetch=previous; }
});
test('confirmation presents actual account state and code without passwords; login has no student demo entry', () => {
  const html=renderToStaticMarkup(<RegistrationConfirmation result={{identifier:'veli@example.com',createdStudentCode:'DENIZ1234',verificationSent:false}} onLogin={()=>{}} />);
  assert.match(html,/Hesaplarınız oluşturuldu, ancak/);assert.match(html,/DENIZ1234/);assert.match(html,/Veli girişine geç/);assert.match(html,/yeniden gönder/);assert.doesNotMatch(html,/type="password"|VeliGüvenli937|ÖğrenciGüvenli938/);
  const login=readFileSync('src/features/auth/components/LoginForm.tsx','utf8'); assert.doesNotMatch(login,/handleQuickDemo|demo_student_user|Öğrenci denemesini aç|Hızlı Deneme/);
});
