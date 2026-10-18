import { publicBuildSettings } from './public-build-settings';

/** Android has no same-origin /api server: require explicit, public HTTPS configuration. */
export function androidBuildSettings(env: Record<string, string | undefined>) {
  const settings = publicBuildSettings(env, true, false, env.VITE_PUBLIC_SITE_URL || '');
  if (!settings.VITE_API_BASE_URL || !settings.VITE_PUBLIC_SITE_URL || !settings.VITE_SUPABASE_URL || !settings.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Android derlemesi için API, site ve Supabase açık bağlantı ayarlarını .env.android dosyasında tamamlayın.');
  }
  for (const value of [settings.VITE_API_BASE_URL, settings.VITE_PUBLIC_SITE_URL, settings.VITE_SUPABASE_URL]) {
    const host = new URL(value).hostname;
    if (['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new Error('Android paketinde sunucu adresi olarak localhost kullanılamaz.');
  }
  return settings;
}
