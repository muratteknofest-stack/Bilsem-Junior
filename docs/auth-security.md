# Kayıt ve parola güvenliği — Aşama 2, grup 3

Bu grup yalnızca kaynak kodunu değiştirir. Supabase ayarları, veritabanı,
abonelik planı ve canlı dağıtımlar değiştirilmemiştir. Sağlayıcı kontrolleri
doğrulanmadan Aşama 1 raporundaki doğrudan kayıt ve parola politikası bulguları
tamamen kapanmış sayılmaz.

## Uygulama koruması

`config/vercel-base.json` içindeki yöntem bazlı kurallar, genel Auth geçidinden
önce aşağıdaki istekleri uygulamanın sabit `410` yanıtına yönlendirir. Express
aynı yolları yerel/VPS çalıştırmada da reddeder.

| İstek | Sonuç |
| --- | --- |
| `POST /api/supabase/auth/v1/signup` | `FAMILY_REGISTRATION_REQUIRED` |
| `POST /api/supabase/auth/v1/otp` | `FAMILY_REGISTRATION_REQUIRED` |
| `PUT /api/supabase/auth/v1/user` | `APP_PASSWORD_CHANGE_REQUIRED` |

Veli ve öğrenci hesapları `/api/register-family` üzerinden açılır. Mevcut
sunucu şeması, veli onayları, kayıt anahtarı, iki parolanın sızıntı denetimi,
yerel/dağıtık hız sınırı ve hata durumunda yeni hesapların geri alınması korunur.
Kullanıcı oluşturmak için sunucu Admin API'si kullanılır; istemci `signUp` çağrısı
yapılmaz. Parola yenileme `/api/auth/change-password` üzerinden sahiplik, parola
politikası ve oturum iptalinden geçer. Parola güncellemesinde kullanıcı JWT'si
ile sağlayıcının kullanıcı uç noktası kullanılır; Admin API ile sağlayıcı
kontrolleri atlanmaz.

Giriş, refresh token, `GET user`, çıkış, MFA, doğrulama e-postası, kurtarma
e-postası ve Data API geçitleri bu kuralların dışında kalır. Böylece mevcut
Android sürümlerinin giriş ve kurtarma protokolü değişmez. Doğrudan kullanıcı
güncellemesine dayanan ilerideki bir özellik, ayrı bir yetkili sunucu uç noktası
gerektirir.

Bu kurallar **Supabase'in kendi açık adresine erişimi engellemez**. Proje adresi
ve publishable anahtar gizli değildir. Başka bir istemci sağlayıcıya doğrudan
ulaşabilir; aşağıdaki ayarlar bu yüzden zorunludur. Eski Vercel dağıtımları ve
eski istemciler de yalnızca yeni kod yayımlanarak güncellenmiş sayılmaz.

## Aşama 4'te uygulanacak sağlayıcı ayarları

İncelenebilir hedef değerler `config/supabase-auth-security.json` dosyasındadır.
Bu dosya kendi başına Supabase'e uygulanmaz; build sırasında bir PATCH yapılmaz.

1. Supabase Auth ayarlarında **Allow new users to sign up** seçeneğini kapatın
   (`disable_signup: true`). E-posta sağlayıcısını kapatmayın; mevcut kullanıcı
   girişi, kurtarma ve sunucudan yönetilen aile kaydı ona ihtiyaç duyar.
2. **Confirm Email** açık kalsın (`mailer_autoconfirm: false`); anonim giriş
   kapalı kalsın (`external_anonymous_users_enabled: false`).
   Sağlayıcı minimum parola uzunluğu uygulamadaki veli/öğrenci kuralıyla aynı,
   en az 8 olmalıdır (`password_min_length: 8`). 28 Ekim 2026'da canlı değer
   6'dan 8'e yükseltildi ve yönetim API'sinden tekrar okunarak doğrulandı.
3. E-posta/parola ayarlarında sızdırılmış parola korumasını etkinleştirin
   (`password_hibp_enabled: true`). Resmî belgelere göre bu özellik Pro ve üstü
   planlarda sunulur. Ücretli plan değişikliği bu kod tarafından yapılmaz.
   Özellik kullanılamıyorsa doğrudan Auth parola güncelleme açığı açık kalır;
   yalnızca uygulamadaki HIBP kontrolü veya Vercel WAF bu yolu kapatmaz.
   28 Ekim 2026'daki gerçek etkinleştirme isteği HTTP 402 ile reddedildi;
   ücretli plan alınmadı ve bu bulgu kapanmış sayılmadı.
4. Projenin Site URL ve Redirect URLs değerlerini kendi ortamıyla eşleştirin.
   Production için ana adres ve `/reset-password` dönüşü kullanılır. Ayrı
   preview veritabanı yalnızca kendi preview adreslerine yönlendirsin; joker
   alan adları ve production'a preview token gönderimi eklemeyin.

Bu değişikliklerden sonra kontrollü test hesaplarıyla aile kaydı → doğrulama →
veli/öğrenci girişi → kurtarma e-postası → parola yenileme → önceki oturumun
reddedilmesi akışları denenmelidir. Doğrudan provider signup/OTP ile hesap
oluşturmanın ve sızdırılmış parolayla doğrudan kullanıcı güncellemesinin
reddedildiği de ayrı doğrulanmalıdır. Bu mutasyon testleri canlı kullanıcıların
hesaplarında çalıştırılmamıştır. Geçmişte oluşturulmuş profilsiz Auth hesapları
otomatik silinmez; ayrıca incelenmelidir.

## Salt okunur kontrol

`npm run security:auth` yalnızca GET yapar. Şunları ister:

- Aynı ortama ait `SUPABASE_URL`, `VITE_SUPABASE_URL` ve açık istemci anahtarı
  `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Tam doğrulama için yalnızca operatör ortamında Supabase Management API okuma
  erişimi sağlayan `SUPABASE_ACCESS_TOKEN`. Bu, service-role anahtarı değildir;
  `VITE_` ile başlamamalı, kaynak koduna/build çıktısına eklenmemelidir.

Örnek, sunucudaki ortam değişkenleri güvenli biçimde yüklendikten sonra:

```sh
npm run security:auth
```

Betik `/auth/v1/settings` ve erişim verilmişse
`https://api.supabase.com/v1/projects/<ref>/config/auth` uç noktalarını okur.
Yönlendirme takip etmez; yönetim token'ını yalnızca sabit Management API alan
adına gönderir. Çıktısı yalnızca kontrol adları ve sonuçlarıdır; SMTP ayarları,
anahtarlar ve yanıt gövdeleri yazdırılmaz. Herhangi bir kontrol başarısızsa veya
doğrulanamıyorsa çıkış kodu `1` olur. Management erişimi yokken HIBP denetimi
başarılı varsayılmaz. Bu komut çalışma zamanı girişlerini bloke etmez; Aşama 4
yayın kontrolünde zorunlu olarak çalıştırılmalıdır.

2026-10-25 salt okunur doğrulamada doğrudan signup açık bulundu; Supabase
Security Advisor `auth_leaked_password_protection` uyarısını hâlâ döndürdü.
Dolayısıyla bu grup üretimde iki bulgunun kapandığını iddia etmez.

## Resmî kaynaklar

- [Supabase genel Auth ayarları](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase parola güvenliği](https://supabase.com/docs/guides/auth/password-security)
- [Supabase sunucu kullanıcı oluşturma API'si](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Auth yapılandırma alanları](https://supabase.com/docs/reference/api/v1-update-auth-service-config)
- [Vercel yöntem bazlı route tanımı](https://vercel.com/docs/project-configuration/vercel-json#routes)
