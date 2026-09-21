import { readFile } from 'node:fs/promises';
import process from 'node:process';
import dotenv from 'dotenv';

const EXPECTED_PROJECT_ID = 'gen-lang-client-0426617456';
const EXPECTED_DATABASE_ID = 'ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f';
const envFile = process.env.RELEASE_ENV_FILE || '.env.production';
const evidenceFile = process.env.RELEASE_EVIDENCE_FILE || 'ops/release-evidence.json';
const cloudEnvFile = process.env.CLOUD_RUN_ENV_FILE || 'ops/cloud-run.env.yaml';
const phase = process.env.RELEASE_VALIDATION_PHASE || 'go-live';
const failures = [];

if (!['predeploy', 'go-live'].includes(phase)) failures.push('RELEASE_VALIDATION_PHASE predeploy veya go-live olmalıdır.');

const loaded = dotenv.config({ path: envFile, override: false });
if (loaded.error) failures.push(`${envFile} okunamadı.`);

const required = (key) => {
  const value = process.env[key]?.trim();
  if (!value) failures.push(`${key} eksik.`);
  if (value && /REPLACE_WITH|CHANGE_ME|example\.com/i.test(value)) failures.push(`${key} yer tutucu içeriyor.`);
  return value || '';
};
const validEmail = (key) => {
  const value = required(key);
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) failures.push(`${key} geçerli bir e-posta değil.`);
  return value;
};
const exact = (key, expected) => {
  const value = required(key);
  if (value && value !== expected) failures.push(`${key} yanlış hedefe işaret ediyor.`);
};

exact('FIREBASE_PROJECT_ID', EXPECTED_PROJECT_ID);
exact('VITE_FIREBASE_PROJECT_ID', EXPECTED_PROJECT_ID);
exact('FIREBASE_DATABASE_ID', EXPECTED_DATABASE_ID);
exact('VITE_FIREBASE_DATABASE_ID', EXPECTED_DATABASE_ID);
if (required('ENFORCE_APP_CHECK').toLowerCase() !== 'true') failures.push('ENFORCE_APP_CHECK true olmalıdır.');
if (required('PAYMENTS_ENABLED').toLowerCase() !== 'true') failures.push('Ticari yayın için PAYMENTS_ENABLED true olmalıdır.');
if (required('STRIPE_LIVE_MODE_REQUIRED').toLowerCase() !== 'true') failures.push('Ticari yayın için STRIPE_LIVE_MODE_REQUIRED true olmalıdır.');

const appBaseUrl = required('APP_BASE_URL');
try {
  const parsed = new URL(appBaseUrl);
  if (parsed.protocol !== 'https:' || parsed.origin !== appBaseUrl.replace(/\/$/, '')) {
    failures.push('APP_BASE_URL kesin bir HTTPS origin olmalıdır.');
  }
} catch {
  if (appBaseUrl) failures.push('APP_BASE_URL geçersiz.');
}
if (process.env.VITE_API_BASE_URL?.trim()) {
  failures.push('Desteklenen üretim topolojisinde VITE_API_BASE_URL boş olmalı; Firebase Hosting /api yönlendirmesi aynı origin kullanır.');
}

for (const key of [
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_APPCHECK_SITE_KEY', 'VITE_LEGAL_ENTITY_NAME',
  'VITE_LEGAL_ENTITY_ADDRESS', 'VITE_LEGAL_ENTITY_PHONE',
  'VITE_LEGAL_REGISTRATION_ID', 'VITE_PREMIUM_PRICE_DISPLAY',
  'LEGAL_ENTITY_NAME', 'LEGAL_ENTITY_ADDRESS', 'LEGAL_ENTITY_PHONE',
  'LEGAL_REGISTRATION_ID', 'PREMIUM_PRICE_DISPLAY', 'STRIPE_PRICE_ID',
]) required(key);
validEmail('VITE_PRIVACY_CONTACT_EMAIL');
validEmail('VITE_SUPPORT_EMAIL');
validEmail('PRIVACY_CONTACT_EMAIL');
validEmail('SUPPORT_EMAIL');

for (const [clientKey, serverKey] of [
  ['VITE_LEGAL_ENTITY_NAME', 'LEGAL_ENTITY_NAME'],
  ['VITE_LEGAL_ENTITY_ADDRESS', 'LEGAL_ENTITY_ADDRESS'],
  ['VITE_LEGAL_ENTITY_PHONE', 'LEGAL_ENTITY_PHONE'],
  ['VITE_LEGAL_REGISTRATION_ID', 'LEGAL_REGISTRATION_ID'],
  ['VITE_PRIVACY_CONTACT_EMAIL', 'PRIVACY_CONTACT_EMAIL'],
  ['VITE_SUPPORT_EMAIL', 'SUPPORT_EMAIL'],
  ['VITE_PREMIUM_PRICE_DISPLAY', 'PREMIUM_PRICE_DISPLAY'],
]) {
  if (process.env[clientKey]?.trim() && process.env[clientKey]?.trim() !== process.env[serverKey]?.trim()) {
    failures.push(`${clientKey} ile ${serverKey} aynı olmalıdır.`);
  }
}

const [appletConfig, firebaseRc] = await Promise.all([
  readFile('firebase-applet-config.json', 'utf8').then(JSON.parse),
  readFile('.firebaserc', 'utf8').then(JSON.parse),
]);
if (appletConfig.projectId !== EXPECTED_PROJECT_ID) failures.push('firebase-applet-config.json proje kimliği yanlış.');
if (appletConfig.firestoreDatabaseId !== EXPECTED_DATABASE_ID) failures.push('firebase-applet-config.json veritabanı kimliği yanlış.');
if (appletConfig.appId !== process.env.VITE_FIREBASE_APP_ID?.trim()) failures.push('VITE_FIREBASE_APP_ID applet yapılandırmasıyla eşleşmiyor.');
if (firebaseRc.projects?.default !== EXPECTED_PROJECT_ID) failures.push('.firebaserc varsayılan projesi yanlış.');

let cloudEnv = {};
try {
  const source = await readFile(cloudEnvFile, 'utf8');
  cloudEnv = Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*):\s*(?:"([^"]*)"|'([^']*)'|([^#\s][^#]*?))?\s*(?:#.*)?$/);
    if (!match) return [];
    return [[match[1], (match[2] ?? match[3] ?? match[4] ?? '').trim()]];
  }));
} catch {
  failures.push(`${cloudEnvFile} okunamadı.`);
}
for (const key of [
  'FIREBASE_PROJECT_ID', 'FIREBASE_DATABASE_ID', 'APP_BASE_URL', 'CORS_ALLOWED_ORIGINS',
  'ENFORCE_APP_CHECK', 'LEGAL_ENTITY_NAME', 'LEGAL_ENTITY_ADDRESS', 'LEGAL_ENTITY_PHONE',
  'LEGAL_REGISTRATION_ID', 'PRIVACY_CONTACT_EMAIL', 'SUPPORT_EMAIL', 'PAYMENTS_ENABLED',
  'STRIPE_LIVE_MODE_REQUIRED', 'STRIPE_PRICE_ID', 'PREMIUM_PRICE_DISPLAY',
]) {
  const value = String(cloudEnv[key] || '').trim();
  if (!value) failures.push(`${cloudEnvFile}: ${key} eksik.`);
  if (value && /REPLACE_WITH|CHANGE_ME|example\.com/i.test(value)) failures.push(`${cloudEnvFile}: ${key} yer tutucu içeriyor.`);
  if (process.env[key]?.trim() && value && process.env[key]?.trim() !== value) {
    failures.push(`${cloudEnvFile}: ${key}, ${envFile} ile eşleşmiyor.`);
  }
}
if (cloudEnv.ENFORCE_APP_CHECK?.toLowerCase() !== 'true') failures.push(`${cloudEnvFile}: ENFORCE_APP_CHECK true olmalıdır.`);
if (cloudEnv.PAYMENTS_ENABLED?.toLowerCase() !== 'true') failures.push(`${cloudEnvFile}: PAYMENTS_ENABLED true olmalıdır.`);
if (cloudEnv.STRIPE_LIVE_MODE_REQUIRED?.toLowerCase() !== 'true') failures.push(`${cloudEnvFile}: STRIPE_LIVE_MODE_REQUIRED true olmalıdır.`);

let evidence;
try {
  evidence = JSON.parse(await readFile(evidenceFile, 'utf8'));
} catch {
  failures.push(`${evidenceFile} okunamadı veya geçersiz JSON.`);
}

const evidenceValue = (path) => path.split('.').reduce((value, part) => value?.[part], evidence);
const timestamp = (path, maxAgeDays) => {
  const raw = evidenceValue(path);
  const value = Date.parse(String(raw || ''));
  const age = Date.now() - value;
  if (!Number.isFinite(value) || age < 0 || age > maxAgeDays * 86_400_000) {
    failures.push(`${path} geçerli ve son ${maxAgeDays} gün içinde olmalıdır.`);
  }
};
const evidenceText = (path) => {
  const value = String(evidenceValue(path) || '').trim();
  if (!value || /REPLACE_WITH|CHANGE_ME|example/i.test(value)) failures.push(`${path} eksik veya yer tutucu içeriyor.`);
  return value;
};

if (evidence) {
  if (evidence.projectId !== EXPECTED_PROJECT_ID) failures.push('Kanıt dosyası proje kimliğiyle eşleşmiyor.');
  if (evidence.databaseId !== EXPECTED_DATABASE_ID) failures.push('Kanıt dosyası veritabanı kimliğiyle eşleşmiyor.');
  const adminUid = evidenceText('adminSecurity.adminUid');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(adminUid)) {
    failures.push('adminSecurity.adminUid geçersiz.');
  }
  timestamp('adminSecurity.passwordRotatedAt', 365);
  timestamp('adminSecurity.sessionsRevokedAt', 365);
  timestamp('adminSecurity.claimVerifiedAt', 365);
  timestamp('adminSecurity.mfaEnrolledAt', 365);
  timestamp('adminSecurity.incidentLogReviewedAt', 365);
  timestamp('securityRules.emulatorTestedAt', 30);
  timestamp('privacy.legalReviewApprovedAt', 365);
  timestamp('payments.stripeTestModeVerifiedAt', 30);
  timestamp('operations.restoreDrillAt', 90);
  timestamp('operations.rollbackDrillAt', 90);
  evidenceText('privacy.reviewer');
  evidenceText('operations.incidentOwner');

  if (phase === 'go-live') {
    timestamp('securityRules.deployedAt', 30);
    timestamp('appCheck.webAppRegisteredAt', 30);
    timestamp('appCheck.enforcedAt', 30);
    timestamp('deployment.cloudRunDeployedAt', 30);
    timestamp('deployment.smokeTestedAt', 30);
    timestamp('payments.stripeLiveModeVerifiedAt', 30);
    timestamp('payments.webhookVerifiedAt', 30);
    timestamp('operations.backupScheduleVerifiedAt', 30);
    timestamp('operations.retentionJobVerifiedAt', 30);
    timestamp('operations.alertChannelVerifiedAt', 90);
  }
}

if (failures.length) {
  console.error('Ticari yayın kapısı kapalı:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  success: true,
  projectId: EXPECTED_PROJECT_ID,
  databaseId: EXPECTED_DATABASE_ID,
  envFile,
  evidenceFile,
  cloudEnvFile,
  phase,
}));
