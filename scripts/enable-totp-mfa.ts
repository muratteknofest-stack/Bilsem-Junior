import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
if (!projectId) throw new Error('FIREBASE_PROJECT_ID zorunludur.');
if (projectId !== 'gen-lang-client-0426617456') {
  throw new Error('MFA işlemi beklenen üretim projesiyle eşleşmiyor.');
}
if (process.env.CONFIRM_ENABLE_TOTP_MFA !== projectId) {
  throw new Error('CONFIRM_ENABLE_TOTP_MFA proje kimliğiyle aynı olmalıdır.');
}

const adjacentIntervals = Number(process.env.TOTP_ADJACENT_INTERVALS || 1);
if (!Number.isInteger(adjacentIntervals) || adjacentIntervals < 0 || adjacentIntervals > 10) {
  throw new Error('TOTP_ADJACENT_INTERVALS 0–10 arasında tam sayı olmalıdır.');
}

const app = getApps()[0] || initializeApp({ projectId });
await getAuth(app).projectConfigManager().updateProjectConfig({
  multiFactorConfig: {
    state: 'ENABLED',
    providerConfigs: [{
      state: 'ENABLED',
      totpProviderConfig: { adjacentIntervals },
    }],
  },
});

console.log(JSON.stringify({ success: true, projectId, totpEnabled: true, adjacentIntervals }));
