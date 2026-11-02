# Supabase Auth Türkçe E-posta ve Mesaj Yapılandırma Kılavuzu

Bilsem Junior platformunda kullanıcılara (veli, öğrenci, yönetici) gönderilen tüm e-postaların ve sistem mesajlarının Türkçe olması için aşağıdaki yönergeleri izleyin.

---

## 1. Yöntem: Otomatik Senkronizasyon (Önerilen)

Projeye eklenen senkronizasyon betiği, Supabase Management API üzerinden tüm e-posta şablonlarını, konu başlıklarını, yönlendirme adreslerini ve gönderen adını tek komutla buluttaki projeye (`vehhvsdkifwstbjhnhao`) aktarır:

1. [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) sayfasına gidin ve yeni bir Personal Access Token (PAT) oluşturun.
2. Terminalde aşağıdaki komutu çalıştırın:
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_ornek_tokeniniz SUPABASE_PROJECT_REF=vehhvsdkifwstbjhnhao npm run sync:email-templates
   ```
3. Betik çıktısında `✅ Tebrikler! Tüm Türkçe e-posta şablonları ve başlıkları Supabase projenize başarıyla uygulandı.` onayını görürsünüz.

---

## 2. Yöntem: Supabase Dashboard Üzerinden Manuel Ayarlama

Supabase Dashboard arayüzünden doğrudan güncellemek için:

1. [Supabase Dashboard](https://supabase.com/dashboard/project/vehhvsdkifwstbjhnhao/auth/templates) > **Authentication** > **Email Templates** sekmesine gidin.
2. Aşağıdaki 6 şablonu ilgili sekmelere yapıştırın:

### 1. Confirm signup (Kayıt Onayı)
- **Subject:** `Bilsem Junior e-posta adresinizi doğrulayın`
- **Body:** `supabase/templates/confirm-sign-up.html` dosyasının içeriği.

### 2. Reset Password (Şifre Sıfırlama)
- **Subject:** `Bilsem Junior şifrenizi sıfırlayın`
- **Body:** `supabase/templates/reset-password.html` dosyasının içeriği.

### 3. Magic Link (Güvenli Giriş Bağlantısı)
- **Subject:** `Bilsem Junior giriş bağlantınız`
- **Body:** `supabase/templates/magic-link-or-otp.html` dosyasının içeriği.

### 4. Change Email Address (E-posta Değiştirme)
- **Subject:** `Bilsem Junior e-posta değişikliğini doğrulayın`
- **Body:** `supabase/templates/change-email-address.html` dosyasının içeriği.

### 5. Invite User (Kullanıcı Daveti)
- **Subject:** `Bilsem Junior hesabınıza davet edildiniz`
- **Body:** `supabase/templates/invite-user.html` dosyasının içeriği.

### 6. Reauthentication (Güvenlik Kodu)
- **Subject:** `Bilsem Junior doğrulama kodunuz`
- **Body:** `supabase/templates/reauthentication.html` dosyasının içeriği.

---

## 3. URL ve Yönlendirme Ayarları (URL Configuration)

**Authentication** > **URL Configuration** sekmesinde:
- **Site URL:** `https://zekapark.vercel.app`
- **Redirect URLs (Redirect Whitelist):**
  - `https://zekapark.vercel.app/reset-password`
  - `https://zekapark.vercel.app`
  - `http://localhost:5173/reset-password`
  - `http://localhost:5173`

> [!IMPORTANT]
> Şifre sıfırlama bağlantısının doğrudan şifre belirleme formuna ulaşabilmesi için `https://zekapark.vercel.app/reset-password` adresinin Redirect URLs listesinde bulunması şarttır.

---

## 4. SMTP ve Gönderen Bilgileri

**Authentication** > **SMTP Settings** sekmesinde:
- **Sender Name:** `Bilsem Junior`
- **Sender Email:** Kurumsal gönderici e-posta adresiniz (örn: `destek@zekapark.com` veya `noreply@zekapark.com`).
- E-posta sağlayıcınızda (Resend, SendGrid, Postmark vb.) link tıklama izlemesinin (click tracking) kapalı olduğundan emin olun. Tıklama izleyicileri Supabase doğrulama tokenlarını değiştirebilir veya geçersiz kılabilir.

---

## 5. İstemci Tarafı Hata Mesajları Çevirisi

Uygulama istemcisinde (`src/features/auth/auth-error-messages.ts`), Supabase GoTrue servisinden dönebilecek tüm İngilizce hata mesajları otomatik olarak yakalanır ve kullanıcıya anlaşılır Türkçe olarak sunulur:
- "Invalid login credentials" &rarr; "Giriş bilgileri hatalı. E-posta/öğrenci kodu ve şifrenizi kontrol edin."
- "Email not confirmed" &rarr; "E-posta adresiniz doğrulanmamış..."
- "User already registered" &rarr; "Bu e-posta adresiyle kayıtlı bir hesap zaten var..."
- "Token has expired or is invalid" &rarr; "Bağlantının veya doğrulama kodunun süresi dolmuş..."
- "For security purposes, you can only request this after X seconds" &rarr; "Güvenlik nedeniyle çok sık e-posta talebinde bulunamazsınız..."

---

## 6. Aile Kayıtlarını Açma (registrationEnabled)

Eğer kayıt ekranında *"Hesap oluşturma şu anda kapalıdır"* veya *"Kayıtlar şu anda kapalı"* uyarısı alıyorsanız, platform veritabanındaki `platform_settings` tablosunda kayıtlar henüz açılmamış demektir.

Açmak için 3 pratik yöntem:

### A. Supabase SQL Editor (En Kolay ve Anında)
[Supabase Dashboard > SQL Editor](https://supabase.com/dashboard/project/vehhvsdkifwstbjhnhao/sql) sayfasına gidin ve aşağıdaki sorguyu çalıştırın:
```sql
UPDATE public.platform_settings
SET settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{release}',
  coalesce(settings->'release', '{}'::jsonb) || '{"registrationEnabled": true}'::jsonb
),
revision = revision + 1,
updated_at = now()
WHERE id = true;
```

### B. Yönetici Paneli Arayüzünden
1. `/yonetici` sayfasına yönetici hesabınızla giriş yapın.
2. **Sistem Ayarları** sekmesine geçin.
3. **"Yeni aile kayıtlarını aç"** kutusunu işaretleyin.
4. **"Ayarları Supabase'e kaydet"** butonuna tıklayın.

### C. Terminal Komutu ile
```bash
SUPABASE_SERVICE_ROLE_KEY="ey..." npm run registration:open
```
