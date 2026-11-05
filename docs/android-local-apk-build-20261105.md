# Android APK'yi GitHub Actions olmadan oluşturma — 5 Kasım 2026

GitHub-hosted Actions iş adımları başlatılamadığında bilgisayarda, Android SDK içeren yetkili bir geliştirme ortamında **gerçek test APK dosyası** oluşturmak için bu alternatif yol kullanılır. Google Play abonelik hakları, veritabanı, üretim anahtarları ve mağaza yayını değiştirilmez.

## Gerekenler

- Kaynak kodu erişimi: özel [Bilsem-Junior deposuna](https://github.com/muratteknofest-stack/Bilsem-Junior) giriş yapmış yetkili GitHub hesabı.
- Node.js 22 veya üzeri; Python 3; JDK 21 veya üzeri; Android Studio (Android SDK Platform **36** ve SDK Build-Tools **36.0.0**).
- SDK yolu, işletim sisteminde ANDROID_HOME veya ANDROID_SDK_ROOT olarak tanımlı olmalı. Linux/macOS/Windows desteklenir.
- Proje kökündeki, Git'e alınmayan .env.android.local dosyasına Android'in **herkese açık** dört derleme ayarı girilmeli: VITE_API_BASE_URL, VITE_PUBLIC_SITE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Bu değerlerin kaynakları mevcut .github/workflows/android-release.yml içindeki aynı isimli genel ayarlardır; şifre, service-role veya özel erişim tokenı eklemeyin.
- Projeyi özel depodan bilgisayara klonlayın. Kaynak indirme bağlantısı APK değildir.

## İki komut

Depo klasöründe terminal/PowerShell açın.

Önce sistem kontrolü:

~~~bash
python3 scripts/build-android-without-actions.py --doctor
~~~

Windows'ta python3 yoksa py -3 kullanın. Sonuçta ready: true olana kadar eksik SDK, JDK, Node veya Android public ayar isimlerini tamamlayın. Kontrol ayar **değerlerini** veya sırları yazdırmaz.

Ardından üretim:

~~~bash
python3 scripts/build-android-without-actions.py --build
~~~

Betik sırayla npm ci, TypeScript kontrolü, Google Play otomatik testleri, Android WebView derlemesi/Capacitor senkronizasyonu ve Gradle debug APK derlemesi yapar. Gerçek Android paketinin adı/sürümü, arşiv bütünlüğü, APK imzası ve Android web dosyalarının kaynakla birebir eşleşmesi doğrulanır. Önkoşullardan biri yoksa *başarılı APK varmış gibi* devam etmez.

Başarılıysa çıktı yolu:

~~~text
test-artifacts/android-local/Bilsem-Junior-1.0.48-local-test.apk
test-artifacts/android-local/SHA256SUMS
test-artifacts/android-local/verification.json
~~~

Sürüm adı kaynak dosyadan alındığından ileriki sürümlerde otomatik güncellenir. Dosya zaten varsa doğrulanmış APK'yi üzerine yazmaz; yeni klasör için --output-dir test-artifacts/android-local-ikinci kullanın.

APK'yı tekrar kontrol etmek için:

~~~bash
python3 scripts/verify-apk-download.py test-artifacts/android-local/Bilsem-Junior-1.0.48-local-test.apk
~~~

Dosyayı yalnızca yetkilendirilmiş test kullanıcılarına gönderin. Telefonun güvenli indirme ve kurulum korumalarını devre dışı bırakmasını istemeyin. Önceki test APK farklı sertifikayla imzalandıysa, üstüne kurulum reddedilebilir. Eski uygulamayı kaldırmadan önce öğrenci ilerlemesini hesaba eşitleyin.

## Android cihazda deneme

Android SDK adb kuruluysa ve telefon USB hata ayıklamaya açık test cihazıysa, doğrulanmış dosyayı aşağıdaki komutla kurabilirsiniz. Hata halinde gerçek hata mesajını inceleyin; veriyi temizlemeyi otomatik denemeyin.

~~~bash
adb install -r test-artifacts/android-local/Bilsem-Junior-1.0.48-local-test.apk
~~~

## Paylaşım adresi boş görünüyorsa

Yüklemeden önce çalışan bir HTTPS dosya paylaşım alanı seçilmeli. Kaynak deposunun ZIP dosyası, Actions artifact ZIP kapsayıcısı, Vercel HTML hata sayfası ve imzasız AAB indirilebilir APK değildir. APK'nin URL'deki baytlarıyla aynı olduğunu doğrulamak için:

~~~bash
python3 scripts/verify-apk-download.py test-artifacts/android-local/Bilsem-Junior-1.0.48-local-test.apk --url "https://GERCEK-DOSYA-SUNUCUSU/Bilsem-Junior-1.0.48-local-test.apk"
~~~

Örnek URL gerçek bir indirme bağlantısı değildir. urlVerified: true olmadan indirme kartına APK bağlantısı eklemeyin. Google Play herkese açık yayımlanmadan mağaza kartını aktif gösterme.

## Bu yöntem neleri çözmez?

Yerel test APK'sı **debug sertifikalıdır**; Google Play Console'a ticari AAB yüklemesi için mevcut üretim upload key ve imzalı release AAB gerekir. Gerçek Play satın alma, geri yükleme, yenileme, iptal ve cihaz/e-posta kabul testleri ayrıca yapılmalıdır. Kod derlemesi GitHub hesabının ödeme limitini çözmez ve web uygulamasını otomatik güncellemez.
