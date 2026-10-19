# Android ve Google Play yayını

Uygulama kimliği `com.zekapark.app`, bu sürüm `1.0.23` / versionCode `24`.

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

## 1.0.22 — kaşif pasaportu, ödül odası ve bitmeyen turlar

Profil mor pasaport, renkli kabartmalı ayar kartları ve mevcut XP alanıyla; Ödüller kupa, gerçek rozet sayısı ve dört renkli 3B menü kartıyla yenilendi. Hareket tercihi, arka plan/ekran dışı duraklama ve azaltılmış hareket desteği korunur.

Hikâye son durakta kapanmaz. Her 18 keşiften sonra yeni tur başlar; sonraki görev her zaman açılabilir. Eski v1 ilerlemesi aynı hesap/sınıf anahtarından v2 sayaca taşınır. İlerleme sınırsız büyüyen dizi yerine sayaç ve son 64 oturum kimliğiyle saklanır. Geçmiş durakları yeniden oynamak ilerlemeyi geriye almaz. Yerel hikâye ilerlemesi XP veya ücretli erişim vermez.

Maceranın her görevinde `mixCategories:true` ile üç ayrı bilişsel alandan, sınıfa uygun ve doğrulanmış karışık sorular seçilir. Sunucunun mevcut dengeli seçim, yakın geçmişi tekrar etmeme önceliği, yeni kanıtlanmış varyant ve seçenek karıştırma mekanikleri kullanılır. Standart adaptif çalışma, belirli konu seçimi ve sınav davranışı korunur. Yeni mobil sürümden önce bu API sürümü yayımlanmalıdır. Soru çizimleri ve cevap anahtarları değiştirilmez.

## 1.0.23 — görünür veriden kanıtlanan soru atölyesi

Yeni üretim `verified-6` ve `colorful-2` sürümlerini kullanır. Eski `verified-2/3/4/5`, renkli ve atölye kayıtları kendi şablonlarıyla doğrulanmaya devam eder; mevcut oturumların cevap anahtarları yeniden üretilmez.

Eksik mozaikte kayıtlı gizli renk çözüm kanıtı değildir. Cevap görünen karelerden çıkarılır; ikinci denetim her adayı koordinat ilişkilerine yerleştirir. Aynı satır, aynı sütun, sola kaydırılan satır ve aşağı kaydırılan sütun düzenleri açık yönergelerle üretilir. Hafıza ve yansıma çeldiricileri aynı renk çokluğunu korur; yanlış şık rastgele yeni bir renkten anlaşılmaz.

Dönüşüm desenleri okunabilir bağlı parçalar ve isteğe bağlı köşe işaretinden oluşur. Orta ve ileri sıralama soruları kesin konum, kişi aralığı ve göreli sıra ipuçlarını birleştirir. Bağımsız çözücü bütün yerleşimin tekliğini kanıtlar; sürükle-bırak da tüm ipuçlarını denetler. Çözüm metinlerindeki açık tam sayılı toplama, çıkarma ve çarpma eşitlikleri yayın kapısında işlem önceliğiyle hesaplanır.

Renkli görsel alanları büyütüldü; kabartmalı kart tabanları, sayı taşları ve yüksek kontrastlı çerçeveler eklendi. Keskin SVG geometrisi, renk dışında desen ipuçları ve hafıza sorusunu gizleme korunur. Bunlar özgün hazırlık alıştırmalarıdır; resmî MEB sorusu veya insan editör onayı olduğu iddia edilmez. Test APK’sı Google Play mağazası yayını değildir.
