# Android ve Google Play yayını

Uygulama kimliği `com.quantumtech.bilsemjunior`, bu sürüm `1.0.28` / versionCode `29`.

## Tekrarlanabilir yayın paketi — 23 Ekim 2026

Web ve Android aynı kaynak kodunu, Supabase projesini ve sunucu soru değerlendirmesini kullanır. Android içindeki dosyalar `npm run android:sync` ile güncellenir; canlı web dağıtımı cihazda kurulu paketi kendiliğinden değiştirmez.

Yerel Android hazırlığı:

```bash
npm ci
npm run lint
npm run test:google-play
npm run android:sync
cd android
./gradlew --no-daemon :app:bundleRelease :app:assembleRelease :app:assembleDebug :app:writeReleaseDependencyInventory
cd ..
npm run android:candidate
```

JDK 21, Android SDK 36, Gradle eklentisinin kullandığı Build Tools 35.0.0 ve yayın doğrulamasının kullandığı 36.0.0 kurulu olmalı; `ANDROID_HOME` SDK dizinini göstermeli. Açık API/site/Supabase değerleri `.env.android` içinde bulunmalı. Üretim sırları burada kullanılmaz.

`test-artifacts/android` dizinindeki aday paketi, imzasız AAB, 16 KB sayfa hizalaması denetlenmiş imzasız APK ve test APK'sıyla birlikte üretir. Ayrıca derlenmiş paket kimliği/güvenlik raporu, gerçek çözümlenmiş Maven bağımlılıkları, OSV sonucu, güncel web dosyalarıyla byte düzeyinde eşleşme raporu, SDK imzalayıcısı ve bütün dosyaların SHA-256 listesi bulunur. Herhangi bir kontrol eksikse geçerli aday oluşturulmuş sayılmaz. Yeniden çalıştırırken yeni/boş bir çıktı dizini kullanın; kısmi önceki çıktılar üzerine yazılmaz.

GitHub `Google Play Android candidate` işi aynı komutlarla bu dosyaları üretir. Actions hizmetinin işi başlatamaması, testlerin geçmesi anlamına gelmez. Yerel doğrulama ve uzaktaki işin durumu ayrı kaydedilir.

### Mevcut Play yükleme anahtarıyla imzalama

Özel anahtarı güvenli makinenizde tutun. `PRIVATE_KEY_DIR` içinde mevcut `zekapark-upload.p12` ve `upload-key.json` bulunmalı. JSON alanları `alias`, `password`, `certificateSha256` olmalı. Sertifika özeti **Play Console'daki yükleme sertifikasının SHA-256 değeriyle** doldurulur; yeni rastgele anahtar oluşturulmaz. Parola ve özel dosyalar sohbete/GitHub'a gönderilmez.

```bash
python3 scripts/sign-android-release.py test-artifacts/android PRIVATE_KEY_DIR SIGNED_OUTPUT_DIR
```

İmzalayıcı önce bütün zorunlu dosyaların özetini, derlenmiş güvenlik ve bağımlılık raporunu, sonra mevcut yükleme sertifikasını kontrol eder. Boş veya eksik `SHA256SUMS` kabul edilmez. İmzalı AAB ve APK ayrı doğrulanır. Bu işlem Play Console'a yükleme veya mağaza onayı değildir. Play'in imzalı AAB kabulü ve gerçek cihazdaki lisans testleri ayrıca tamamlanmalıdır.

## 1.0.28 — sınıfa göre çok adımlı akıl yürütme

- Karışık 20 soruluk çalışmada sınıfa özel sabit zorluk payları kullanılır: 1. sınıf 4/16 (düzey 1/2), 2. sınıf 6/14 (2/3), 3. sınıf 8/12 (3/4), 4. sınıf 4/7/9 (4/5/6). Öğrencinin seçtiği belirli düzey korunur.
- İki aşamalı şekil dönüşümü, birleştirme ve döndürme matrisleri, iç içe değişen sayı dizileri, ters işlem makineleri, koşullu sayma ve birden fazla ipucunu gerektiren sıralama eklendi. İki ayrı çözüm ve sınıf profili kontrolleri zorunludur.
- Soru seçiminde yakın geçmişte kullanılan mantık aileleri de değerlendirilir; yalnız sayı, isim veya renk değişimi yeni bir mantık sayılmaz.
- Yeni istemci `questionFormat=reasoning-8` yeteneğini bildirir. Eski kurulumlara uyumlu soru düzenleri seçilir. Eski istemci yeni biçimli bir çalışmayı sürdürmeye çalışırsa cevapları değiştirmeden güncelleme mesajı alır. Önceki v7 soru kayıtlarının özgün üreticisi korunur.
- APK, 1.0.26 paketinin doğrulanmış yerel kodu üzerine yeni web varlıkları ve sürüm bilgisi yerleştirilerek aynı test anahtarıyla hazırlanabilir. Bu paket Google Play üretim sürümü değildir.

1. `.env.android` içinde yalnız açık bağlantı ayarlarını tanımlayın: VITE_API_BASE_URL ve VITE_PUBLIC_SITE_URL `https://bilsemjunior.vercel.app`; VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY mevcut açık proje değerleri olmalı. Sunucu sırlarını Android paketine koymayın.
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

## 1.0.24 — gerekçeli çeldiriciler ve görünür soruya göre tekrar denetimi

Yeni üretim `verified-7` ve `colorful-3` kullanır. Sınıfa uygun azalan ve iç içe sayı dizileri, iki yansıma ekseni kullanan şekil analojileri ve çarpma ardından çıkarma yapan işlem makineleri eklendi. Dört şık yine tek sonuç ve iki bağımsız çözücüyle denetlenir. Yanlış seçenekler bir işlem veya konum hatasını temsil eder; mozaiklerde en az bir yakın çeldirici yalnız iki hücrenin yerini değiştirir ve tüm renk adetlerini korur. Eksik mozaik açıklaması görünür bir referans hücresine dayanır.

Çalışma geçmişi ve oturum seçimi artık yalnız yanlış şıkları değiştirilmiş aynı verilenleri yeni soru saymaz. Gizli mozaik hücresi tekrar kimliğine katılmaz. Dar konu havuzunun soru sayısı aynı verilenlere göre sınırlanır. Eski `verified-6` ve `colorful-2` kayıtları özgün şablonları ve cevap anahtarlarıyla doğrulanır.

SVG hücreleri girintili, işaretler kabartmalı olarak çizilir. Düz görünüm ve renk dışındaki motifler korunur; mozaiklerin ekran okuyucu açıklamaları satır ve desen sırasını aktarır. Yeni motor otomatik üretilen veya editörde hazırlanacak yeni sorularda çalışır; mevcut yayımlanmış bankayı sessizce yeniden yazmaz. Sunucu değişikliği web/API dağıtımıyla etkinleşir. APK test dağıtımıdır; Google Play yayını veya öğretmen onayı anlamına gelmez.

Doğrulama: 380 test ve 7 öğrenci çalışma alanı testi, TypeScript ve üretim derlemesi başarılı. Testlerin içinde 3.490 sınıf profilli örnek ve 3.300 profesyonel motor örneği denetlendi. Chromium ile 11 ekran ölçüsünde toplam 771 yerleşim/etkileşim kontrolü ve 48 ayrı, kırpılmamış gölge çizimi geçti. Android APK/AAB derlendi; APK'nın 110 web dosyası son Android web derlemesiyle birebir karşılaştırıldı. Paket kimliği, sürüm, kapalı hata ayıklama/yedekleme/açık HTTP ayarları ve önceki test imzası doğrulandı. Bu kontroller canlı öğrenci hesabı veya gerçek Play ödemesi testi değildir.

## 1.0.25 — sınıfa göre uzun hikâyeli macera parkuru

- 1–4. sınıfların her birinde dört ayrı hikâye; toplam 16 hikâye ve 128 bölüm. Her hikâye 48 görev / 144 karışık alan sorusuyla tamamlanır.
- Açılan duraklar, bölüm sandıkları, hikâye sonu eşyaları, sekiz rozet ve on alıştırma alanında birikim seviyeleri. Görev tekrarı ek macera puanı vermez. XP mevcut sunucu sonuçlarından gelir.
- Android ve web aynı parkuru kullanır. Hikâye seçimi, görevler ve koleksiyon cihazda hesap/sınıf ayrımıyla korunur; eski rota sayacı kaybolmaz. Cihazlar arası hikâye eşitlemesi yoktur.
- 320/390/820 px yerleşim, kayıt kesintisi, tekrar yükleme, bölüm geçişi, hikâye değiştirme ve final ödülü yalıtılmış gerçek uygulama akışlarıyla doğrulanır. Final ekranı testi son göreve hazırlanmış yerel veri kullanır; tüm 48 görevin ilerlemesi dört sınıfta gerçek soru üretimi ve sunucu değerlendirme modeliyle ayrıca sınanır.

## 1.0.26 — 20 soruluk maceralar ve beş yıldız

- Yeni macera görevleri 20 sorudan oluşur: 10 alandan ikişer soru, tekrarlanan kalıptan önce farklı doğrulanmış konu önceliği. Hikâye başına 48 görev / 960 soru.
- Doğru sayısına orantılı, kısmi dolan beş yıldız: 10/20 → 2,5; 19/20 → 4,75; 20/20 → 5. Dört farklı sonuç animasyonu ve görev boyunca değişen doğru cevap efektleri.
- Sonuçtan ve haritadan yeniden oynanabilir. Her deneme taze sunucu oturumu açar; en iyi yıldız sonucu korunur. Yeniden oynamak yeni durak açmaz, macera puanını ve ilk tamamlama alıştırma sayaçlarını çoğaltmaz; soru XP’si sunucudan gelir.
- Eski durak ve hikâye ilerlemesi korunur. Eski görevlerin yıldızları 20 soruluk tekrar oynandıktan sonra kaydedilir. Yıldızlar cihazda hesap/sınıf ayrımıyla saklanır.
- Sonuç ekranında çözümler açılır bölümden incelenir. Azaltılmış hareket tercihi açıkken süslemeler kapanır; cihaz tercihi değişince anında uygulanır.

## 1.0.27 — üç boyutlu kaşif profili

- Profilde mor kaşif pasaportu, kabartmalı avatar, ışık geçişli gerçek XP çubuğu ve renkli 3B ayar tuşları. Basılı tuşlar fiziksel derinlik hissi verir; hatırlatıcı, veli alanı, rehber, İngilizce alanı ve çıkış işlemleri mevcut akışlarını kullanır.
- Görünüm ve ses ayarları profil içinde açılır. Hareket düğmesi, cihazın azaltılmış hareket tercihi ve arka plan/ekran dışı duraklatma desteği bütün dekoratif CSS animasyonlarına uygulanır.
- Seviye, XP, seri kalkanı, keşif ve biten hikâye sayıları mevcut hesap/ilerleme verilerinden gelir. Profil etkileşimleri ek XP veya rozet vermez. Açık/koyu tema ve 320–820 px ekranlar kontrol edilir.
