import { apiFetch } from './api-fetch';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { isAndroidApp } from './native-app';

export interface AppHandoffResult {
  token: string;
  code: string;
  deepLinkUrl: string;
  appLinkUrl: string;
  playStoreReferrerUrl: string;
  expiresAt: number;
}

export interface AppReferrerPlugin {
  getInstallReferrer(): Promise<{ referrer?: string }>;
}

export const AppReferrer = registerPlugin<AppReferrerPlugin>('AppReferrer');

async function getSupabase() {
  const { supabase } = await import('./supabase');
  return supabase;
}

/**
 * Creates a secure handoff token on the web app to transfer the active session to Android.
 */
export async function requestAppHandoff(studentCode?: string, studentName?: string): Promise<AppHandoffResult> {
  const supabase = await getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    throw new Error('Aktarım için aktif bir oturum gereklidir.');
  }

  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const response = await apiFetch(`${base}/api/auth/app-handoff/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      studentCode,
      studentName,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Uygulama aktarım bağlantısı oluşturulamadı.';
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Consumes a handoff token or code in the Android app and establishes the authenticated session.
 */
export async function consumeAppHandoff(tokenOrCode: string): Promise<{
  success: boolean;
  role?: string;
  error?: string;
}> {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const isCode = !tokenOrCode.trim().startsWith('handoff_') && !tokenOrCode.includes('_');

  const response = await apiFetch(`${base}/api/auth/app-handoff/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(isCode ? { code: tokenOrCode.trim() } : { token: tokenOrCode.trim() }),
  });

  if (!response.ok) {
    let errorMsg = 'Aktarım kodu doğrulanamadı.';
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {}
    return { success: false, error: errorMsg };
  }

  const result = await response.json();
  const sessionPayload = result?.session;

  if (sessionPayload?.refreshToken && sessionPayload?.accessToken) {
    const supabase = await getSupabase();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: sessionPayload.accessToken,
      refresh_token: sessionPayload.refreshToken,
    });
    if (sessionError) {
      return { success: false, error: 'Oturum yüklenemedi: ' + sessionError.message };
    }
  }

  return { success: true, role: sessionPayload?.role };
}

/**
 * Checks for Google Play Install Referrer on first Android launch.
 */
export async function checkGooglePlayInstallReferrer(
  onHandoffFound?: (token: string) => void
): Promise<string | null> {
  if (!isAndroidApp || !Capacitor.isNativePlatform()) return null;

  try {
    const CHECKED_KEY = 'bj_install_referrer_checked';
    if (window.localStorage.getItem(CHECKED_KEY)) return null;

    const result = await AppReferrer.getInstallReferrer().catch(() => ({ referrer: '' }));
    window.localStorage.setItem(CHECKED_KEY, '1');

    const referrer = result?.referrer;
    if (!referrer || typeof referrer !== 'string') return null;

    // Look for handoff_token parameter in referrer url query
    const match = referrer.match(/(?:^|[&?])handoff_token=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const token = decodeURIComponent(match[1]);
      onHandoffFound?.(token);
      return token;
    }
  } catch (error) {
    console.warn('Install referrer check handled:', error);
  }
  return null;
}
