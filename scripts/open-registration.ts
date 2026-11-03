import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://vehhvsdkifwstbjhnhao.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('--- Bilsem Junior Aile Kayıtlarını Açma / Kapama Aracı ---');

  if (!key) {
    console.log(`
[KAYIT DURUMU BİLGİLENDİRMESİ]
Kayıtların "Hesap oluşturma şu anda kapalıdır" demesinin sebebi:
Supabase veritabanındaki "platform_settings" tablosunda "registrationEnabled" değerinin henüz true yapılmamış olmasıdır.

Kayıtları hemen açmak için şu 3 yöntemden birini kullanabilirsiniz:

1. YÖNTEM (En Kolay - Supabase Dashboard SQL Editor):
---------------------------------------------------------------------------------
https://supabase.com/dashboard/project/vehhvsdkifwstbjhnhao/sql adresine gidin ve şu sorguyu çalıştırın:

UPDATE public.platform_settings
SET settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{release}',
  coalesce(settings->'release', '{}'::jsonb) || '{"registrationEnabled": true}'::jsonb
),
revision = revision + 1,
updated_at = now()
WHERE id = true;
---------------------------------------------------------------------------------

2. YÖNTEM (Yönetici Paneli Arayüzünden):
- /yonetici sayfasına yönetici hesabınızla giriş yapın.
- "Sistem Ayarları" sekmesine geçin.
- "Yeni aile kayıtlarını aç" kutusunu işaretleyin.
- "Ayarları Supabase'e kaydet" butonuna tıklayın.

3. YÖNTEM (Terminal Komutu ile):
SUPABASE_SERVICE_ROLE_KEY="ey..." npm run registration:open
`);
    return;
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: current, error: readError } = await client
    .from('platform_settings')
    .select('settings,revision')
    .eq('id', true)
    .single();

  if (readError || !current) {
    console.error('❌ platform_settings okunamadı:', readError);
    process.exitCode = 1;
    return;
  }

  const updatedSettings = {
    ...current.settings,
    release: {
      ...(current.settings?.release || {}),
      registrationEnabled: true,
    },
  };

  const { error: updateError } = await client
    .from('platform_settings')
    .update({
      settings: updatedSettings,
      revision: current.revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (updateError) {
    console.error('❌ Kayıtlar açılamadı:', updateError);
    process.exitCode = 1;
    return;
  }

  console.log('✅ Tebrikler! Aile kayıtları (registrationEnabled: true) başarıyla AÇILDI.');
  console.log('Artık kullanıcılar yeni aile kaydı oluşturabilir.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
