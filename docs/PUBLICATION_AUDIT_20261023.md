# Bilsem Junior — web ve Android yayın incelemesi

Tarih: 23 Ekim 2026. Kapsam: mevcut GitHub ana dalı, canlı web uçları, öğrenci/veli/yönetici akışları, soru sunumu, sunucu güvenliği, Android yerel derlemesi ve Google Play yayın hazırlığı.

## Sonuç

Web uygulaması erişilebilir ve ücretsiz kayıt açıktır. Bu çalışma web ve Android derleme/yayın zincirindeki somut hataları giderir; Android AAB, APK ve doğrulama dosyaları gerçekten derlenmiştir. Google Play üretim yayını ve ücretli satış henüz tamamlanmış değildir. Mevcut yükleme sertifikasıyla imzalama, Play Console ürünleri/beyanları ve gerçek cihazdaki satın alma kabul testleri gerekir. Otomatik test sonuçları öğretmen onayı, gerçek e-posta teslimi veya gerçekleşmiş ödeme anlamına gelmez.

## Mimari ve kapsam

| Katman | Mevcut yapı ve değerlendirme |
| --- | --- |
| Web | React 19 + TypeScript + Vite. Ana sayfa, ücretsiz örnek, kayıt/giriş, öğrenci alanı, veli alanı, yönetici alanı ve blog mevcut. Üretim dosyaları Vercel'de; API aynı sitede `/api/*` altında. |
| Android | Capacitor 8; `com.quantumtech.bilsemjunior`, sürüm 1.0.28 / kod 29, min SDK 24, hedef SDK 36. Yerel web dosyaları paketlenir; web dağıtımı kurulu Android dosyalarını kendiliğinden güncellemez. |
| Hesaplar | Supabase. Veli–öğrenci bağları ve rol kontrolleri sunucuda denetlenir; yönetici erişiminde MFA gerekir. Tarayıcı testleri yalıtılmış hesap verileriyle yürütüldü. |
| Sorular | Sınıf/zorluk, soru biçimi uyumluluğu, doğrulama ve çeşitlilik kuralları; cevap değerlendirme ve ödüller sunucuda. 22 Ekim arşiv raporu sınıf başına 2.000, toplam 8.000 yayınlanmış soru kaydeder; bu incelemede canlı banka yeniden sayılmadı. İnsan eğitmen tarafından tek tek onaylandığı iddia edilmez. |
| Satış | Yalnız yerel Android Google Play satın alımı. Web aynı öğrenciye bağlı üyeliği okur. Shopier çalışma zamanı uçları kaldırılmıştır. |
| Play sunucusu | Production ile sınırlı Vercel OIDC → Google Workload Identity bağlantısı hazırlanmış; kullanıcının Cloud çıktısında `wifTrustVerified:true` doğrulandı. Gerçek token değişimi ve Publisher API erişimi bu çıktıyla kanıtlanmaz. |

## Bulunan ve giderilen sorunlar

1. **Bilinen bağımlılık açıkları:** OSV ilk taramada dört paket/sürüm çiftini işaretledi: iki Zod kopyası, Vite ve `ip-address`. Zod 4.6.6, Vite 6.4.4 ve dolaylı `ip-address` 10.7.4 sürümlerine yükseltildi. Kilit dosyası güncellendi. Güncelleme sonrasında 531 benzersiz npm çifti OSV taramasında temiz; npm audit toplamı sıfır. Bu, gelecekte açık çıkmayacağına dair garanti değildir.
2. **Android paketleme ve imzalama kopukluğu:** Eski CI yalnız AAB/test APK ve birkaç metin dosyası üretiyor; imzalayıcı farklı dosyalar, Maven denetimi ve SHA-256 listesi bekliyordu. Artık tek paketleme komutu tüm zorunlu girdileri üretir. Aday paket, imzalama yapılmış gibi gösterilmez.
3. **Eksik bütünlük listesi kabulü:** İmzalayıcı boş/eksik SHA256SUMS ile ilerleyebiliyordu. Tüm on zorunlu dosya, benzersiz ve doğru özetlerle bulunmalıdır. Değiştirilmiş dosya, yinelenen kayıt, dış dizin yolu veya sembolik bağlantı reddedilir. Mevcut Play yükleme sertifikasının SHA-256 özeti ayrıca sabitlenir.
4. **Android varlık denetimi:** Web dosyaları için uygulanan gizli anahtar/kaynak haritası taraması Android çıktısına da uygulanır. AAB ve release APK içindeki 121 dosya, güncel Android web derlemesi ve Capacitor'un ürettiği köprü dosyalarıyla byte düzeyinde karşılaştırıldı. Fazladan/eski dosyalar da reddedilir.
5. **CI ortamı ve SDK uyumsuzluğu:** Kalite işine gereken açık Supabase/site ayarları eklendi. Android işinde SDK 36, AGP'nin kullandığı Build Tools 35 ve doğrulama araçları 36 kurulur. Üretim HTTP kontrolü mevcut derlenmiş web çıktısıyla çalışır.
6. **320 px ana menü taşması:** Marka yazısı ve aksiyonlar dar ekranda menü düğmesini sağ kenarın dışına itiyordu. Küçük ekrana özel marka aralığı/yazı boyutu düzeltildi; 44 px menü dokunma alanı korundu. Mevcut regresyon testi artık geçiyor.
7. **Geliştirme sırasında gereksiz yeniden yükleme:** Android derlemesi ve test ekran görüntüleri Vite sayfalarını yeniden yükleyebiliyordu. Üretilen Android/build/test-artifacts dosyaları izleme dışında bırakıldı. `DISABLE_HMR` davranışı korundu.

## Doğrulama kanıtları

| Kontrol | Sonuç ve sınırı |
| --- | --- |
| Uygulama testleri | 493 geçti. |
| Öğrenci çalışma alanı | 7 test geçti. |
| Cloud kurulum testleri | 17 geçti; çevrimdışı doğrulama, gerçek Cloud bağlantısı testi değildir. |
| Android bütünlük testleri | 3 geçti; eksik özet, değiştirilmiş dosya ve varlık uyuşmazlığı reddedilir. |
| TypeScript / web üretim derlemesi | Geçti. 151 açık web dosyasında tanınan özel anahtar veya kaynak haritası bulunmadı. |
| Soru ekranları | 11 ekran ölçüsünde 915 yerleşim/etkileşim kontrolü; hata yok. |
| Ana sayfa / kayıt / giriş | 320–1440 px arasında 18 görünüm kontrolü geçti; menü ve marka kontrol edildi. |
| Türkçe aile/yönetici tarayıcı akışları | Kayıt/sınıf/veli onayı, doğrulama hataları, giriş, dışa aktarma, silme talebi, aile geçişi, cevap kaydı, tekrar deneme, yönetici MFA ve inceleme akışları geçti. Yalıtılmış sağlayıcı yanıtları kullanılır. |
| Google Play ekranları | 85 yerleşim + 5 etkileşim; tarayıcı hatası yok. Kurgusal mağaza verisi kullanılır, gerçek satın alım yapılmadı. |
| HTTP güvenliği | Yerel üretim sunucusunda 35 kontrol geçti. |
| API koruma yükü | 60 yerel istek, eşzamanlılık 10, p95 51 ms. Kimliği doğrulanmış üretim kullanıcı yükünü temsil etmez. |
| npm / OSV | npm audit sıfır; OSV 531 npm çifti, bilinen bulgu yok. |
| Android yerel derleme | JDK 21 / SDK 36 / Gradle 8.14.3 ile release AAB, release APK ve debug APK derlendi. Son güncel web dosyalarıyla tekrar derlendi. |
| Android Maven güvenliği | Gerçek release bağımlılık grafiğindeki 63 çift; OSV bulgusu yok. |
| Derlenmiş Android ayarları | Doğru paket/sürüm, SDK 24/36; release hata ayıklama, testOnly, açık HTTP ve yedekleme kapalı. APK 16 KB sayfa hizalaması doğrulandı. |
| Canlı web başlangıç durumu | Sağlık yanıtı `status:ok`, `database:ready`, doğru Supabase projesi. Ücretsiz kayıt açık; ücretli satış kapalı. |

Yerel native derleme, gerçek Android cihazında çalıştırma veya Play'den indirme testi değildir. Son gözlenen GitHub Actions Android/kalite işleri başarısızdır; bu rapordaki yerel sonuçlar uzak CI işi başarılıymış gibi sunulmaz. Yeni işlerin durumu ayrıca izlenmelidir.

## Yayın öncesi kalan somut işler

| İş | Gerekli işlem |
| --- | --- |
| Mevcut Android imzası | Play Console'daki mevcut yükleme anahtarı ve sertifika özetiyle güvenli makinede imzala. İmzasız aday AAB doğrudan Play'e yüklenemez. Özel anahtarı/parolayı sohbet veya GitHub'a koyma. |
| Play ürünleri | Console Abonelikler ekranı halen faturalandırma destekli yeni APK/AAB istiyor. İmzalı paket kabul edildikten sonra `zekapark_uyelik` ve `monthly` P1M, `quarterly` P3M, `annual` P1Y planları, gerçek fiyat/bölgelerle yapılandırılmalı. |
| Gerçek sunucu bağlantısı | Production ortamından token değişimi, uygulama kapsamlı Publisher API erişimi ve üç aktif planın katalog doğrulaması yapılmalı. |
| Bildirim teslimi | RTDN konusu Console'a kaydedildi. Test mesajının sunucuda kimliği doğrulanarak 204 ile işlendiği henüz doğrulanmadı. |
| Satın alma kabulü | Play lisans testçisiyle satın alma, bekleyen ödeme, geri yükleme, iptal/yenileme/iade ve başka öğrenciye yetki verilmemesi denenmeli. Webde aynı öğrencinin erişimi ayrıca kontrol edilmeli. |
| İşletmeci açıklamaları | Canlı gizlilik sayfasında gerçek veri sorumlusu/unvan, adres, işleme dayanakları, saklama/silme süreleri ve aktarım koşulları eksik. Doğrulanmış destek adresi ve gerçek bilgiler işletmeci tarafından tamamlanmalı. |
| Mağaza beyanları | Gerçek hedef yaş, çocuk hedef kitlesi, veri güvenliği, içerik derecelendirme, gizlilik/hesap silme bağlantıları ve mağaza görselleri tamamlanmalı. Bu rapor mağaza veya mevzuat onayı değildir. |
| Operasyon | Gerçek e-posta/şifre sıfırlama, şifreli yedekten geri yükleme, gerçek aile pilotu ve hata alarmı kabul kayıtları tamamlanmalı. Test edilmemiş kutular otomatik işaretlenmez. |

Kurulum ve imzalama komutları: [ANDROID_RELEASE.md](ANDROID_RELEASE.md). Play/WIF ve bildirim ayrıntıları: [GOOGLE_PLAY_BILLING.md](GOOGLE_PLAY_BILLING.md).

Kaynaklar: [Vite güvenlik duyuruları](https://github.com/vitejs/vite/security/advisories), [OSV](https://osv.dev/), [Android zipalign](https://developer.android.com/tools/zipalign), [Google Play sunucu ve bildirim kurulumu](https://developer.android.com/google/play/billing/getting-ready), [Capacitor Android](https://capacitorjs.com/docs/android).
