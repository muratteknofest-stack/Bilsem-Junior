# Bilsem Junior — APK indirme kurtarma ve doğrulama (5 Kasım 2026)

## Gerçek durum

- Android kaynak sürümü **1.0.48 (versionCode 49)**. Bu, henüz herkese açık Google Play yayını değildir.
- Son **Google Play Android candidate** koşusu: https://github.com/muratteknofest-stack/Bilsem-Junior/actions/runs/41920962999 . Android işi adım başlatmadan başarısız oldu; **artifact listesi boş**. Bu koşudan paylaşılabilecek gerçek bir APK yok.
- Daha önceki CI günlüklerinde GitHub Actions hesap ödeme / harcama sınırı engeli kaydedilmişti. Hesap sahibi Billing durumunu düzeltmeden yalnızca workflow kodunu değiştirmek bu engeli ortadan kaldırmaz.
- Boş dosyalar, ZIP içerik bağlantıları veya erişim isteyen özel GitHub artifact sayfaları “APK indir” olarak gösterilmemeli.

## 1. Derlemeyi yeniden kullanılabilir hale getirme

1. https://github.com/settings/billing adresinde doğru hesap altında Actions harcama sınırı, durdurma seçeneği ve ödeme uyarılarını gözden geçir. Sınırsız bütçe gerekmez; tercihen düşük bir kontrollü üst sınır kullan.
2. GitHub engeli kalkınca ana daldan https://github.com/muratteknofest-stack/Bilsem-Junior/actions/workflows/android-release.yml iş akışını çalıştır. İşin **gerçek adımları** başlamalı.
3. **Bilsem-Junior-verified-Android-package** adlı Actions artifact ZIP'ini bilgisayara indir. ZIP doğrudan APK değildir. İçinden **Bilsem-Junior-1.0.48-test.apk** dosyasını çıkar. Aligned-unsigned APK veya unsigned AAB telefona yüklemek için uygun değildir.
4. İndirilen APK üzerinde şu komutu çalıştır; sonuçta **verified: true**, dosya boyutu ve SHA-256 bulunmalı:

   ~~~bash
   python3 scripts/verify-apk-download.py ./Bilsem-Junior-1.0.48-test.apk
   ~~~

5. Bu test APK'sı yalnız kontrollü kurulum içindir. Debug sertifikası önceki kurulu APK'nın sertifikasından farklıysa yükseltme başarısız olabilir. Uygulamayı silmeden önce öğrenci ilerlemesinin hesaba eşitlendiğini kontrol et. Test sertifikası Play üretim anahtarı değildir.

## 2. İndirme bağlantısının çalıştığını kanıtlama

1. Doğrulanan APK'yi yetkili bir **HTTPS dosya dağıtım adresine** yükle; doğrudan dosya döndüren, izin gerektirmeyen (paylaşılması amaçlanan test için) bir adres kullan. Gizli depolama anahtarlarını uygulamaya veya kaynak koduna ekleme.
2. Dosya sunucusu APK baytlarını döndürmeli; HTML erişim engeli, 404 sayfası, boş içerik, yönlendirme sayfası veya ZIP kapsayıcısı APK değildir.
3. Aynı dosya bilgisayarda dururken indirme adresini **bayt bayt** karşılaştır:

   ~~~bash
   python3 scripts/verify-apk-download.py ./Bilsem-Junior-1.0.48-test.apk --url "https://GERCEK-DOSYA-ADRESI/Bilsem-Junior-1.0.48-test.apk"
   ~~~

   Sonuçta **urlVerified: true** dönmeden bağlantıyı “çalışıyor” olarak paylaşma. URL örnektir, henüz gerçek bir APK adresi değildir. Test bağlantısı Play üretim paketi gibi gösterilmemelidir.
4. Android telefonda dosyanın tamamının indiğini ve kurulduğunu ayrıca dene. İndirme başarısı, uygulama açılışı veya satın alma testi anlamına gelmez.

## 3. Satış ve yayın kapıları

- 1.0.48 sürümünde eski öğrenci hesaplarının süresiz erişimi ve yeni kayıtların ücretsiz sınırlı kullanımı **sunucuda** korunur; bu değişiklik üyelik haklarını değiştirmez.
- Genel Google Play abonelik satışı kapalıdır. Lisans testçisiyle gerçek cihazda satın alma, geri yükleme, yenileme ve iptal kabulü; üretim AAB imzası ve çocuklara yönelik Play beyanları tamamlanmadan satış ve mağaza yayını “hazır” sayılamaz.
- Android iş akışı artık boş, HTML, ZIP yapısı bozuk veya eksik Android/WebView dosyaları olan APK'leri artifact olarak paylaşmadan önce reddeder. Bu, gerçek APK'nin **oluşturulduğu** veya kullanıcılara **sunulduğu** iddiası değildir.
