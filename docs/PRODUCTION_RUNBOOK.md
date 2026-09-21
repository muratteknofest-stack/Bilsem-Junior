# ZekaPark Üretim Runbook'u

Bu runbook, `gen-lang-client-0426617456` projesindeki
`ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f` veritabanı için tek
yetkili üretim prosedürüdür. Komutlar başka bir proje veya veritabanına karşı
çalışmayı reddeder. Yine de her aşamada etkin `gcloud` hesabını ve hedefi elle
doğrulayın.

Canlı yayın kararı, bu belgedeki teknik adımların yanında hukuk, içerik, ödeme
ve olay sorumlusu kanıtlarının da tamamlanmasını gerektirir. Kod dağıtımı tek
başına GO kararı değildir.

## 1. Ön koşullar ve sorumluluklar

- Node.js 22, Java 21, güncel `gcloud`, Firebase CLI ve `curl`
- Projede gerekli yönetici/IAM yetkilerine sahip, kişiye özel operatör hesabı
- Application Default Credentials; indirilebilir servis hesabı anahtarı yok
- Doğrulanmış yönetici Firebase UID'si
- KVKK/çocuk verisi metinlerini onaylayan hukuk veya veri koruma sorumlusu
- Stripe canlı hesabı, canlı Price ID ve doğrulanmış webhook hedefi
- Alarm e-postası, olay sorumlusu, faturalandırma hesabı ve aylık bütçe
- Ayrı bir gözlemci tarafından uygulanacak geri alma ve geri yükleme provası

Başlamadan önce:

```sh
gcloud auth list --filter=status:ACTIVE
gcloud config set project gen-lang-client-0426617456
gcloud auth application-default login
gcloud projects describe gen-lang-client-0426617456
npm ci
```

`gcloud auth list` çıktısındaki hesabın doğru kişiye ait olduğunu ikinci bir
operatörle doğrulayın. Ortak hesap veya kalıcı servis hesabı anahtarı kullanmayın.

## 2. Yerel, repoya girmeyen üretim dosyaları

```sh
cp .env.example .env.production
cp ops/cloud-run.env.example.yaml ops/cloud-run.env.yaml
cp ops/release-evidence.example.json ops/release-evidence.json
```

Bu üç dosya `.gitignore` kapsamındadır. Alanları gerçek şirket unvanı/adresi,
iletişim bilgileri, üretim origin'i, Firebase istemci ayarları, App Check site
key'i, canlı Stripe Price ID'si ve hukukça onaylanmış fiyat/yenileme metniyle
doldurun. `VITE_API_BASE_URL` aynı-origin Hosting topolojisinde boş kalmalıdır.

Sırları bu dosyalara koymayın. Secret Manager'da en az şu dört sırrı oluşturun
ve güncel sürümlerini ayrı güvenli dosyalardan ekleyin:

- Gemini API anahtarı
- SMTP parolası
- `sk_live_` ile başlayan Stripe gizli anahtarı
- Stripe canlı webhook signing secret'ı

`PRIVACY_AUDIT_HMAC_KEY` de en az 32 rastgele karakter olmalı; silme işçisi
çalıştırılırken Secret Manager veya güvenli operatör ortamından sağlanmalıdır.

## 3. Yönetici hesabı olay kapatma prosedürü

Önce Firebase Console'dan hedef hesabın UID'sini iki kişiyle doğrulayın. E-posta
adresi UID yerine kullanılamaz. Yeni parolayı kabuk geçmişine veya ortam
değişkenine yazmayın:

```sh
install -m 600 /dev/null /secure/operator/zekapark-admin-password.txt
# Parolayı güvenli bir editörle dosyaya girin; en az 16 karakter ve dört sınıf.
```

TOTP sağlayıcısını proje düzeyinde etkinleştirin:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
CONFIRM_ENABLE_TOTP_MFA=gen-lang-client-0426617456 \
npm run ops:enable-mfa
```

Parolayı değiştirin, mevcut claim'leri yalnızca `role=admin` ile değiştirin,
Firestore profilini eşleyin ve bütün yenileme token'larını iptal edin:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
ADMIN_UID=DOĞRULANMIŞ_UID \
ADMIN_NEW_PASSWORD_FILE=/secure/operator/zekapark-admin-password.txt \
CONFIRM_ADMIN_SECURITY_ROTATION=gen-lang-client-0426617456 \
npm run ops:secure-admin
```

Parola dosyasını işlemden sonra kurumsal güvenli silme prosedürüyle kaldırın.
Yönetici yeni parolayla kontrollü bir operatör tarayıcısında giriş yapar;
yönetim panelindeki zorunlu TOTP ekranından authenticator kaydını tamamlar ve
yeniden giriş yapar. Kurtarma yönteminin saklanması kurum prosedürüne göre
ayrıca doğrulanır.

Son olarak otomatik doğrulamayı çalıştırın:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
ADMIN_UID=DOĞRULANMIŞ_UID \
CONFIRM_ADMIN_SECURITY_VERIFICATION=gen-lang-client-0426617456:DOĞRULANMIŞ_UID \
npm run ops:verify-admin
```

Firebase Authentication ve Cloud Audit günlüklerinde geçmiş açığa çıkma
dönemini inceleyin. Şüpheli erişim varsa kanıtı koruyun ve olay/KVKK bildirim
değerlendirmesini hukuk sorumlusuna aktarın. Parola döndürme, token iptali,
claim, MFA ve günlük inceleme zamanlarını `ops/release-evidence.json` içine
kaydedin.

## 4. Yerel kalite ve güvenlik kapısı

```sh
npm run check
npm audit --omit=dev --audit-level=high
npm run security:audit
git diff --check
```

`npm run check`, gerçek Firestore Emulator üzerinde öğrenci/veli/yönetici
negatif yetki testlerini de çalıştırır. Java 21 zorunludur. Sonuçları ve zamanı
kanıt dosyasına yazın; başarısız bir kontrolle ilerlemeyin.

`security:audit` üretim container'ına giren bağımlılıkları denetler. Ayrıca
`npm run security:audit:all` ile Firebase CLI dâhil geliştirme araçlarını
inceleyin; yalnızca upstream'i bekleyen, runtime'a girmeyen bir bulgu kabul
edilecekse kimliği, etkisi, telafisi, sahibi ve son tarihi risk kaydına yazın.

## 5. Operasyon altyapısı ve yedek

Secret adlarını, faturalandırma hesabını, bütçeyi ve iletişim hedefini yalnızca
o operatör oturumuna tanımlayın. Ardından:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
APP_BASE_URL=https://ÜRETİM_HOSTU \
ALERT_EMAIL=OLAY_EPOSTASI \
BILLING_ACCOUNT_ID=FATURALANDIRMA_HESABI \
MONTHLY_BUDGET_AMOUNT=1000TRY \
GEMINI_API_KEY_SECRET=GEMINI_SECRET_ADI \
SMTP_PASS_SECRET=SMTP_SECRET_ADI \
STRIPE_SECRET_KEY_SECRET=STRIPE_KEY_SECRET_ADI \
STRIPE_WEBHOOK_SECRET_SECRET=STRIPE_WEBHOOK_SECRET_ADI \
CONFIRM_PRODUCTION_OPS=gen-lang-client-0426617456:ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
npm run ops:configure-production
```

Bu adım ayrı API, retention ve Scheduler servis hesaplarını oluşturur; en düşük
rolleri verir; günlük 14 haftalık Firestore yedeği, `/api/ready` uptime kontrolü,
5xx alarmı ve bütçe alarmını kurar. E-posta bildirim kanalını gelen kutusundan
mutlaka doğrulayın. Retention job henüz yoksa Scheduler uyarısı beklenir.

En güncel günlük yedeği üretimden ayrı bir prova veritabanına geri yükleyin:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
RESTORE_BACKUP=projects/gen-lang-client-0426617456/locations/LOCATION/backups/BACKUP_ID \
RESTORE_DATABASE_ID=zekapark-restore-drill-YYYYMMDD \
CONFIRM_RESTORE_DRILL=gen-lang-client-0426617456:zekapark-restore-drill-YYYYMMDD \
npm run ops:restore-drill
```

Betik prova veritabanını otomatik silmez. Doğrulama kanıtını alın; ardından
veritabanını yalnızca kurumun onaylı imha prosedürüyle kaldırın.

## 6. Eski cevap sırlarının taşınması

Önce salt okunur keşif çalıştırın:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
ANSWER_SECRET_MIGRATION_MODE=dry-run \
npm run ops:migrate-answer-secrets
```

Sayıları inceleyip yedeği doğruladıktan sonra aynı commit'ten gerçek taşımayı
çalıştırın:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
ANSWER_SECRET_MIGRATION_MODE=execute \
CONFIRM_ANSWER_SECRET_MIGRATION=gen-lang-client-0426617456 \
npm run ops:migrate-answer-secrets
```

Taşıma, eski hata defteri cevap/seed verilerini tarayıcı durumundan çıkarıp
sunucuya özel kasaya alır. İkinci bir dry-run sonucu `affectedUsers: 0` olmalıdır.

## 7. Stripe canlı ödeme kabulü

Stripe Dashboard'da canlı Product/Price oluşturun ve abonelik, yenileme, iptal,
iade, vergi/fatura yükümlülükleri ile ekranda gösterilen fiyat metnini hukuk ve
mali müşavirle onaylayın. Webhook hedefi:

```text
https://ÜRETİM_HOSTU/api/billing/webhook
```

Abone olunacak olaylar:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Önce Stripe test modunda başarılı ödeme, başarısız ödeme, gecikmeli/out-of-order
webhook, tekrar teslim, portal iptali ve yeniden abonelik senaryolarını
doğrulayın. Sonra düşük tutarlı kontrollü bir canlı işlem yapın; entitlement,
fatura/portal ve iade akışını uçtan uca kontrol edin. Kart verisi ZekaPark
sunucusundan geçmemelidir. Test ve canlı kanıt zamanlarını kaydedin.

## 8. Üretim dağıtımı

Dağıtım, çalışma dizininin doğrulanmış release commit'inde ve temiz olduğundan
emin olunarak yapılır. API servis hesabı `zekapark-api@...`, retention hesabı
`zekapark-retention@...` olmalıdır.

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
CLOUD_RUN_SERVICE_ACCOUNT=zekapark-api@gen-lang-client-0426617456.iam.gserviceaccount.com \
RETENTION_SERVICE_ACCOUNT=zekapark-retention@gen-lang-client-0426617456.iam.gserviceaccount.com \
APP_BASE_URL=https://ÜRETİM_HOSTU \
GEMINI_API_KEY_SECRET=GEMINI_SECRET_ADI \
SMTP_PASS_SECRET=SMTP_SECRET_ADI \
STRIPE_SECRET_KEY_SECRET=STRIPE_KEY_SECRET_ADI \
STRIPE_WEBHOOK_SECRET_SECRET=STRIPE_WEBHOOK_SECRET_ADI \
CONFIRM_PRODUCTION_DEPLOY=gen-lang-client-0426617456:ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
CONFIRM_APP_CHECK_ENFORCEMENT=gen-lang-client-0426617456 \
npm run deploy:production
```

Betik sırasıyla predeploy kanıtlarını, kalite kapısını ve sırları doğrular;
commit SHA etiketli container üretir; Cloud Run API/retention job, Firestore
rules/indexes ve Hosting'i dağıtır; reCAPTCHA Enterprise App Check kaydını geri
okuyarak doğrular; health/readiness smoke testlerinden sonra Auth ve Firestore
App Check enforcement'ını açar.

Dağıtımdan sonra 5. adımdaki `ops:configure-production` komutunu yeniden
çalıştırın. Bu kez retention job bulunduğu için Europe/Istanbul saat diliminde
günlük Scheduler görevi kurulur.

Üretim smoke matrisi:

- `/api/health` 200 ve `/api/ready` 200
- App Check'siz korumalı API isteği reddediliyor
- Yetkisiz kullanıcı yönetim API'sinden 403 alıyor
- MFA'sız yönetici yönetim API'sinden 403 alıyor
- Öğrenci pratik/sınav başlatabiliyor; başlangıç yanıtında cevap/seed/açıklama yok
- Tekrar gönderilen cevap/submit aynı sonucu veriyor, XP ikinci kez artmıyor
- Veli yalnızca bağlı öğrencisini görüyor
- Veri dışa aktarımı cevap anahtarı içermiyor; silme talebi yeniden giriş istiyor
- Stripe checkout/portal/webhook kontrollü canlı senaryosu başarılı
- Uptime, 5xx ve bütçe alarm testleri olay e-postasına ulaşıyor

## 9. Saklama ve silme operasyonu

Retention Scheduler'ın son başarılı çalışmasını günlük kontrol edin. Silme
taleplerinde istek kimliği ve yönetici UID'si iki kişiyle doğrulanır:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
PRIVACY_REQUEST_ID=OPAQUE_REQUEST_ID \
PRIVACY_APPROVER_UID=DOĞRULANMIŞ_ADMIN_UID \
CONFIRM_PRIVACY_APPROVAL=gen-lang-client-0426617456:OPAQUE_REQUEST_ID \
npm run ops:privacy-approve
```

Yasal saklama olmadığı teyit edildikten sonra ayrı işlemle silin:

```sh
FIREBASE_PROJECT_ID=gen-lang-client-0426617456 \
FIREBASE_DATABASE_ID=ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f \
PRIVACY_REQUEST_ID=OPAQUE_REQUEST_ID \
CONFIRM_PRIVACY_DELETION=gen-lang-client-0426617456:OPAQUE_REQUEST_ID \
npm run ops:privacy-delete
```

Silme işçisi Auth, Firestore konu kökleri ve varsa Stripe müşterisini kaldırır;
yalnızca HMAC ile takma adlandırılmış uyum kanıtını bırakır. Kısmi hata olursa
aynı istek güvenle devam ettirilebilir.

## 10. Geri alma ve olay müdahalesi

Cloud Run'da önce sağlıklı önceki revision'ı belirleyin, sonra trafiği ona alın:

```sh
gcloud run revisions list --service zekapark-api --region europe-west1 --project gen-lang-client-0426617456
gcloud run services update-traffic zekapark-api --region europe-west1 --project gen-lang-client-0426617456 --to-revisions SAĞLIKLI_REVISION=100
```

Hosting için Firebase Console'daki doğrulanmış önceki release'i geri alın veya
aynı eski commit'in kilitli bağımlılıklarıyla yalnızca Hosting'i yeniden
dağıtın. Firestore rules geri alımı daha geniş erişim yaratabileceğinden eski
kuralları körlemesine dağıtmayın; güvenli ileri düzeltmeyi tercih edin.

Şüpheli erişimde token'ları iptal edin, etkilenmiş sırları döndürün, trafiği
sınırlayın, günlükleri değişmeden koruyun ve olay/KVKK bildirim kararını yetkili
kişiye yükseltin. Veri veya hesabı kanıt toplamadan silmeyin.

## 11. Son GO kapısı

Dağıtım ve manuel kontrollerden sonra kanıt dosyasını gerçek zamanlar ve gerçek
sorumlularla güncelleyin:

```sh
RELEASE_VALIDATION_PHASE=go-live npm run release:validate
```

Bu komut başarılı değilse veya hukuk/içerik/ödeme kabulü imzalanmadıysa karar
**NO-GO**'dur. Başarılı çıktı, commit SHA, Cloud Run revision, Hosting release,
Stripe webhook hedefi ve geri alma sorumlusu değişmez yayın kaydına eklenir.
