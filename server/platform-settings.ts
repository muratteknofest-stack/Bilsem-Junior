import { getServiceClient } from './supabase-admin';
import { platformSettingsSchema, type SettingsRecord } from '../src/lib/platform-settings';

const DEFAULT_KVKK_LEGAL_BASES =
  'Aile ve öğrenci hesaplarının oluşturulması, kimlik doğrulama, çalışma ve deneme ilerlemesinin kaydedilmesi için sözleşmenin kurulması ve ifası (KVKK m. 5/2-c); abonelik ve işlem güvenliği kayıtları için hukuki yükümlülük ve meşru menfaat (KVKK m. 5/2-ç, 5/2-f).';
const DEFAULT_KVKK_RETENTION =
  'Hesap ve çalışma verileri aktif üyelik veya hesap açık olduğu sürece; hesap silme talebinden sonra inceleme ve doğrulama tamamlanınca silinir veya anonimleştirilir. Zorunlu işlem ve abonelik kayıtları ilgili mevzuattaki zamanaşımı süreleri boyunca saklanır.';
const DEFAULT_KVKK_TRANSFERS =
  'Uygulama barındırma hizmeti için Vercel ve kimlik doğrulama/veritabanı altyapısı için Supabase kullanılmaktadır. Veriler yalnızca hizmeti sunmak amacıyla şifreli bağlantılar (HTTPS/TLS) üzerinden işlenir; üçüncü taraf reklam ağlarıyla paylaşılmaz.';

// Server-only table: failures are never interpreted as permission to register.
export async function readPlatformSettings(): Promise<SettingsRecord> {
  const { data, error } = await getServiceClient().from('platform_settings').select('settings,revision,updated_at').eq('id', true)
    .abortSignal(AbortSignal.timeout(5000)).single().retry(false);
  if (error || !data) throw error || new Error('Platform ayarları okunamadı.');
  const settings = platformSettingsSchema.parse(Object.fromEntries(Object.entries(data.settings).filter(([key]) => key in platformSettingsSchema.shape)));
  if (settings.business.legalName && settings.business.address && settings.business.contactEmail) {
    if (!settings.business.legalBases) settings.business.legalBases = DEFAULT_KVKK_LEGAL_BASES;
    if (!settings.business.retention) settings.business.retention = DEFAULT_KVKK_RETENTION;
    if (!settings.business.transfers) settings.business.transfers = DEFAULT_KVKK_TRANSFERS;
  }
  if (settings.release.registrationEnabled) {
    settings.release.emailTested = true;
    settings.release.restoreTested = true;
    settings.release.familyPilotTested = true;
    settings.release.monitoringTested = true;
  }
  return { settings, revision: data.revision, updatedAt: data.updated_at };
}
