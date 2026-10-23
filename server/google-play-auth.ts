import { GoogleAuth, IdentityPoolClient, type IdentityPoolClientOptions } from 'google-auth-library';
import { StsCredentials } from 'google-auth-library/build/src/auth/stscredentials.js';
import { getVercelOidcToken } from '@vercel/oidc';
import { z } from 'zod';
import { GooglePlayError } from './google-play-model';

const scope = 'https://www.googleapis.com/auth/androidpublisher';
const serviceEmail = z.string().email().endsWith('.iam.gserviceaccount.com');
const workloadEmail = serviceEmail.regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/);
const credentialsSchema = z.object({ type: z.literal('service_account'), client_email: serviceEmail, private_key: z.string().startsWith('-----BEGIN PRIVATE KEY-----') });
const providerPattern = /^projects\/[0-9]{6,20}\/locations\/global\/workloadIdentityPools\/[a-z][a-z0-9-]{3,31}\/providers\/[a-z][a-z0-9-]{3,31}$/;

class PlayIdentityClient extends IdentityPoolClient {
  constructor(options: IdentityPoolClientOptions) {
    super(options);
    // The Google SDK creates a separate STS transport; share the bounded transport.
    this.stsCredential = new StsCredentials({ tokenExchangeEndpoint: 'https://sts.googleapis.com/v1/token', transporter: this.transporter });
    this.transporter.interceptors.request.add({ resolved: async options => ({ ...options, timeout: 8000, retry: false, maxRedirects: 0 }) });
  }
}

// An explicit mode prevents incomplete federation settings from falling back to a key.
export function playAuthIssues(env: NodeJS.ProcessEnv = process.env): string[] {
  const mode = env.GOOGLE_PLAY_AUTH_MODE || 'service_account';
  if (mode === 'service_account') {
    try { credentialsSchema.parse(JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '')); return []; }
    catch { return ['GOOGLE_PLAY_SERVICE_ACCOUNT_JSON']; }
  }
  if (mode !== 'workload_identity') return ['GOOGLE_PLAY_AUTH_MODE'];
  const issues: string[] = [];
  if (!providerPattern.test(env.GOOGLE_PLAY_WIF_PROVIDER || '')) issues.push('GOOGLE_PLAY_WIF_PROVIDER');
  if (!workloadEmail.safeParse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL).success) issues.push('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL');
  if (env.VERCEL_ENV !== 'production') issues.push('VERCEL_ENV');
  return issues;
}

export function createPlayIdentityClient(env: NodeJS.ProcessEnv = process.env, supplyToken = getVercelOidcToken): IdentityPoolClient {
  if (env.GOOGLE_PLAY_AUTH_MODE !== 'workload_identity' || playAuthIssues(env).length) throw new GooglePlayError('Google Play anahtarsız bağlantı ayarları geçersiz.');
  // All outbound destinations are fixed Google endpoints; config contains resource names only.
  return new PlayIdentityClient({
    type: 'external_account',
    audience: `//iam.googleapis.com/${env.GOOGLE_PLAY_WIF_PROVIDER}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    scopes: [scope],
    service_account_impersonation: { token_lifetime_seconds: 600 },
    // Read the current invocation's token at refresh time, never at module load.
    subject_token_supplier: { getSubjectToken: () => supplyToken() },
    transporterOptions: { timeout: 8000, retry: false, maxRedirects: 0 },
  });
}

let auth: GoogleAuth | IdentityPoolClient | undefined;
let credentialVersion: string | undefined;
export async function playAccessToken(): Promise<string> {
  try {
    if (playAuthIssues().length) throw Error();
    const mode = process.env.GOOGLE_PLAY_AUTH_MODE || 'service_account';
    const version = JSON.stringify(mode === 'workload_identity'
      ? [mode, process.env.GOOGLE_PLAY_WIF_PROVIDER, process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL]
      : [mode, process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON]);
    if (!auth || version !== credentialVersion) {
      auth = mode === 'workload_identity' ? createPlayIdentityClient() : new GoogleAuth({
        credentials: credentialsSchema.parse(JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '')),
        scopes: [scope], clientOptions: { transporterOptions: { timeout: 8000, retry: false } },
      });
      credentialVersion = version;
    }
    const result = await auth.getAccessToken();
    const token = typeof result === 'string' ? result : result?.token;
    if (!token) throw Error();
    return token;
  } catch {
    // SDK errors can contain JWTs, provider responses and private configuration.
    throw new GooglePlayError('Google Play doğrulama servisi henüz kullanılamıyor.');
  }
}
