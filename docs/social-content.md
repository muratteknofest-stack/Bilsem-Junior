# Sosyal içerik otomasyonu

## Çalışan akış

`Sosyal İçerik` yönetici sekmesi sabah ve akşam taslaklarını üretir, iki JPEG kartı gösterir, açıklamayı düzenletir ve onay/reddet işlemi yapar. Soru seçimi sunucuda Firestore'daki `published` sorulardan yapılır. Uygun soru yoksa sunucuda çalışan `verified-2` motoru tek doğru cevabı programatik olarak doğrulanmış yeni bir taslak oluşturur. Yalnızca `verified_board` içindeki matris/dönüşüm ve sayı örüntüsü kartları bu sürümde desteklenir. Üretilen soru başka bir koleksiyonda otomatik yayımlanmaz. Firestore'daki `social_content`, `social_question_usage`, `social_publications` ve `social_metrics` kayıtlarını yalnızca Admin SDK yazar; mevcut Firestore kuralları bu koleksiyonları istemciye kapatır.

Kartlar sunucuda 1080×1350 JPEG'e dönüştürülür. Yönetici ön izlemesi kimlik doğrulamalıdır. `/api/social/media/:id/:kind.jpg` yalnızca onaylanan içerik için herkese açıktır. Sosyal ağın içeriği alabilmesi için görsel URL'si gerçek bir HTTPS API adresinde erişilebilir olmalıdır.

## Gerekli ortam değişkenleri

Sunucuda:

- `PUBLIC_API_BASE_URL`: herkese açık HTTPS Express API kökü (yol sonuna `/api` eklemeyin).
- `PUBLIC_SITE_BASE_URL`: ziyaretçi soru sayfası kökü; Facebook gönderisindeki ölçülebilir bağlantıyı sağlar.
- `SOCIAL_SCHEDULER_AUDIENCE`: Cloud Scheduler OIDC audience; Cloud Run servis URL'siyle aynı olmalıdır.
- `SOCIAL_SCHEDULER_SERVICE_EMAIL`: yalnızca görev çağrısına yetkili servis hesabı e-posta adresi.
- `META_GRAPH_VERSION`: Meta uygulamasında onaylı Graph sürümü; boşsa `v26.0`.
- `META_IG_USER_ID`, `META_IG_ACCESS_TOKEN`: Instagram profesyonel hesap ve yayınlama izni olan erişim tokenı.
- `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`: Facebook Sayfası ve gönderi yetkisi olan erişim tokenı.

Bu değerler `VITE_` önekli olmamalı; tarayıcıya veya Git'e konmamalıdır. Meta uygulama incelemesi, ilgili hesap/yetkiler ve token yenileme gerçek hesapta ayrıca tamamlanır. Platform değerleri yoksa o platforma istek yapılmaz. TikTok için bu sürüm API otomasyonu sunmaz; iki JPEG'i indirip elle yayımlayın.

Statik Vercel/Firebase/Sites ön yüzünde `VITE_API_BASE_URL` ayrı Express API adresini göstermelidir. `PUBLIC_API_BASE_URL` de aynı canlı API servisinin HTTPS adresidir. `CORS_ALLOWED_ORIGINS` içine ön yüzün gerçek kökenini ekleyin.

## Zamanlayıcı

Cloud Scheduler, Cloud Run üzerindeki `POST /api/internal/social/run` yolunu her 15 dakikada bir OIDC kimliğiyle çağırır. Zaman dilimini `Europe/Istanbul` seçin. Görev sabah 09.00'dan, akşam 19.00'dan sonra taslak oluşturur. Yalnızca yöneticinin onayladığı içerik sabah 10.00 ve akşam 20.00 sonrası bağlı platforma gönderilir. Slot ve platform başına Firestore işlem kaydı ikinci gönderimi engeller. Meta çağrısının sonucu belirsizleşirse `needs_attention` kaydı oluşur ve otomatik tekrar denenmez; operatör Meta hesabındaki gönderiyi kontrol etmelidir.

Örnek yapılandırma (proje değerlerini değiştirin):

```sh
gcloud scheduler jobs create http zekapark-social --location=europe-west1 \
  --schedule='*/15 * * * *' --time-zone='Europe/Istanbul' \
  --uri='https://API-SERVICE-URL/api/internal/social/run' --http-method=POST \
  --oidc-service-account-email='SCHEDULER-SERVICE-ACCOUNT' \
  --oidc-token-audience='https://API-SERVICE-URL'
```

`SOCIAL_SCHEDULER_AUDIENCE` tam olarak token audience değeri olmalıdır. Scheduler hesabına Cloud Run invoker yetkisi gereken dağıtım biçiminde bu yetkiyi verin. Herkese açık Express API çalışıyorsa OIDC doğrulaması ayrıca rota içinde yapılır. Hizmetleri canlıya dağıtmadan önce izinleri ve hesap erişimini doğrulayın.

## Sınırlar ve doğrulama

- İlk sürümde yönetici onayı zorunludur; iki günlük paylaşım, yöneticinin uygun taslakları zamanında onaylamasına bağlıdır.
- `social_metrics` ziyaret ve çözüm sayısını toplulaştırır; bot trafiğini ve tekil ziyaretçileri ayırmaz. Ebeveyn kayıt dönüşümü henüz ayrı ölçülmez.
- Instagram profil bağlantısını hesabınızda `PUBLIC_SITE_BASE_URL` ile yönetmeniz gerekir; açıklamadaki bağlantı tıklanabilir varsayılmamalıdır.
- Gerçek Meta API çağrısı hesabın ve izinlerin yokluğunda yerel testte yapılmaz. Entegrasyonu önce test hesabında doğrulayın. Facebook fotoğraf ve Instagram karusel izinleri hesap türü/sürümüne göre değişebilir.
- `npm run build` ve sosyal modül testleri geçer. Depoda sosyal modülden önce de bulunan genel TypeScript ve bazı regresyon testi hataları `npm run check` sonucunu engeller; bunlar ayrıca izlenmelidir.
