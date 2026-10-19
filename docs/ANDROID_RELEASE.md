# Android ve Google Play yayını

Uygulama kimliği `com.zekapark.app`, bu sürüm `1.0.21` / versionCode `22`.

1. `.env.android` içinde yalnız açık bağlantı ayarlarını tanımlayın: VITE_API_BASE_URL ve VITE_PUBLIC_SITE_URL `https://zekapark.vercel.app`; VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY mevcut açık proje değerleri olmalı. Sunucu sırlarını Android paketine koymayın.
2. `npm ci`, `npm run lint`, `npm run test:google-play`, `npm run android:sync` çalıştırın.
3. JDK 21 ve Android SDK 36 ile `npm run android:bundle` çalıştırın. İmzasız AAB mağazaya yüklenemez; mevcut yükleme anahtarıyla güvenli makinede imzalayın. Parola ve anahtar depoya veya sohbete eklenmez.
4. Play Console uygulaması, `zekapark_uyelik` ürünü ve üç etkin otomatik yenilenen plan (`monthly` P1M, `quarterly` P3M, `annual` P1Y) kurulmalı. Gerçek fiyatlar mağazadan alınır.
5. [Sunucu kurulumu](GOOGLE_PLAY_BILLING.md), uygulama kapsamlı servis hesabı yetkileri ve kimliği doğrulanan RTDN push yapılandırmasını tamamlayın.
6. İmzalı AAB'yi dahili teste yükleyin. Lisans testçisiyle gerçek Play satın alımı, bekleyen ödeme, geri yükleme, iptal, iade, diğer öğrenciye erişim reddi ve webde aynı öğrenciye erişim akışını doğrulayın.
7. Gerçek mağaza bağlantısı erişilebilir olduktan sonra GOOGLE_PLAY_STORE_PUBLISHED; kabul testleri ve yayın koşulları tamamlandıktan sonra GOOGLE_PLAY_BILLING_ENABLED etkinleştirilir. Ücretli erişim zorunluluğu ayrı GOOGLE_PLAY_ENFORCE_PAID_ACCESS ayarıdır.

Google Play hesap/kimlik doğrulaması, mağaza içerikleri, veri güvenliği ve çocuk hedef kitlesi beyanları işletmeci tarafından gerçek bilgilerle tamamlanmalı. Uygulama mağaza kabulü veya gerçekleşmiş ödeme testi varsayılmaz.

## 1.0.21 — hareketli öğrenci macerası

Mobil öğrenci ekranında fotoğrafın yavaş hareketi, bulutlar, ışık parçacıkları, Junior, keşif durağı ve görev kartları canlandırılır. Ekrandaki hareket düğmesi bütün sürekli efektleri kapatır; cihazın hareket azaltma tercihi önceliklidir. Ekran dışında kalan sahneler ve arka plana geçen uygulama CSS animasyonlarını duraklatır. Soru içeriği, puanlama ve abonelik akışı bu değişiklikten etkilenmez. Test APK’sı Play mağazası yayını değildir.
