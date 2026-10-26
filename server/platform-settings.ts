import { getServiceClient } from './supabase-admin';
import { platformSettingsSchema, type SettingsRecord } from '../src/lib/platform-settings';

// Server-only table: failures are never interpreted as permission to register.
export async function readPlatformSettings(): Promise<SettingsRecord> {
  const { data, error } = await getServiceClient().from('platform_settings').select('settings,revision,updated_at').eq('id', true)
    .abortSignal(AbortSignal.timeout(5000)).single().retry(false);
  if (error || !data) throw error || new Error('Platform ayarları okunamadı.');
  return { settings: platformSettingsSchema.parse(Object.fromEntries(Object.entries(data.settings).filter(([key]) => key in platformSettingsSchema.shape))), revision: data.revision, updatedAt: data.updated_at };
}
