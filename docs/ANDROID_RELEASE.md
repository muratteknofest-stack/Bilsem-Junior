# ZekaPark Android hazırlığı

Bu dal, mevcut React/Vite uygulamasının Capacitor 8.5.3 ile Android projesini hazırlar. Google Play'e yüklenmiş, imzalanmış veya gerçek cihazda doğrulanmış bir sürüm değildir.

## Kapsam

- Türkçe öğrenci ve veli akışları, mevcut sunucu/veritabanı ile çalışır. İnternet gerekir; çevrimdışı soru çözme sözü verilmez.
- Android derlemesi giriş ekranıyla başlar. Veli paneli Google Play aboneliklerini, gerçek mağaza fiyatlarını, erişim durumunu, geri yükleme ve iptal/yönetim bağlantısını sunar. Google Play kurulumu tamamlanmadan satış açılmaz. Web satış ekranı korunur. Ayrıntılar: `GOOGLE_PLAY_BILLING.md`.
- Native dosyalar `npm run android:prepare` ile sabitlenmiş resmi Capacitor şablonundan üretilir; güvenlik ve logo kaynakları `mobile/android/` altındadır. Üretilen `android/` klasörü ve web varlıkları git'e eklenmez.
- HTTPS zorunludur. Uygulama içinde uzak `server.url`, karışık içerik, açık metin trafik ve üretim WebView hata ayıklaması açılmaz. Android yedekleme/cihaz aktarımından uygulama verileri hariç tutulur.
- Paket kimliği taslağı: `com.zekapark.app`. İlk Play yüklemesinden önce sahiplik ve kullanılabilirlik doğrulanmalıdır; yayınlandıktan sonra değiştirilemez.

## Hazırlama

1. Node 22 veya üstü ve `npm ci` kullanın.
2. `android-env.example` dosyasını `.env.android` olarak kopyalayın. API ve site için mevcut HTTPS alan adını; Supabase için yalnızca aktif publishable/anon açık anahtarını girin. Parola, Shopier anahtarı ve `service_role` anahtarını eklemeyin.
3. Android API istekleri `apiFetch` üzerinden resmi `CapacitorHttp.request` servisine gider. Native istekler tarayıcı Origin bilgisi taklit etmez; sunucu Bearer doğrulaması ve üyelik kontrolü geçerlidir. Yalnızca açık yapılandırmadaki HTTPS sunucusunun `/api/` adresleri kabul edilir, yönlendirmeler ve otomatik tekrarlar kapalıdır. Web istekleri mevcut `fetch`/CORS yolunu kullanır. Tarayıcıdan `https://localhost` ile ayrıca test yapılacaksa bu kaynak sunucunun `CORS_ALLOWED_ORIGINS` listesine açıkça eklenmelidir; `*` kullanmayın.
4. `npm run test:android`, `npm run lint`, `npm run android:sync` çalıştırın. Bu aşama APK/AAB üretmez.
5. Android Studio ile JDK 21, Android SDK 36 ve gerekli derleme araçlarını kurup lisansları kendiniz inceleyip kabul edin. `npm run android:open` ile projeyi açın.
6. Cihaz testi için `npm run android:apk` kullanın. Debug APK mağaza sürümü değildir. Google Play için Android Studio'daki **Generate Signed App Bundle** akışında kendi yükleme anahtarınızı oluşturun ve güvenli tutun. Anahtar/parola depoya veya sohbet mesajına eklenmemelidir. `android:bundle` yalnızca Gradle release derlemesini başlatır; imza yapılandırılmadıysa çıktısı yayınlanabilir değildir.

## Otomatik Android testi

`Android test APK` iş akışı derleme ve imza kontrolüne ek olarak Android 15 emülatörüne uygulamayı kurar. Giriş ekranı, gerçek API sağlık yanıtı, oturumsuz özel isteğin 401 alması, kayıt formunun gerçek sunucu ayarlarını yüklemesi ve Android geri tuşu doğrulanır. Hesap açılmaz, e-posta gönderilmez, ödeme yapılmaz. Bu kontrol gerçek telefondaki tüm öğrenci akışlarının ve Google Play ödeme testinin yerini tutmaz.

Test 1.0.1 (`versionCode=2`) yerel HTTP bağlantısını, e-posta yeniden gönderme adresini, boş etkinleştirme isteğini ve React sayfalarında Android geri hareketini düzeltir. CI her geçici çalıştırıcıda farklı debug sertifikası oluşturabilir. Eski test APK'sı üzerine imza uyuşmazlığı nedeniyle yüklenemezse önce eski test uygulamasını kaldırın; bu işlem cihazda saklanan oturumu ve henüz buluta gönderilmemiş verileri siler. Üretim sürümünde kalıcı Play imzalama/yükleme anahtarı kullanılmalıdır.

## Yayından önce tamamlanacaklar

- Gerçek Android telefon/tablette giriş, veli-öğrenci geçişi, sınıf/konu filtreleri, cevap kaydı, ses, animasyon, Android geri hareketi ve bağlantı kesilmesi testi.
- Hesap/veri silme isteğinin uygulama içinde ve web üzerinden çalıştığının doğrulanması; inceleme hesabı ve erişim talimatlarının hazırlanması.
- Veri Güvenliği formu: hesaplar, öğrenci ilerlemesi, hata kayıtları, üçüncü taraf ağ istekleri ve veri silme/saklama süreleri gerçek uygulamayla eşleşmelidir.
- Çocuk hedef kitlesi ve Google Play Families kuralları, yaş derecelendirmesi ve ebeveyn akışları. Henüz reklam veya izleme SDK'sı eklenmedi.
- Tüm ekranların dış bağlantı/ödeme yönlendirmesi denetimi. Android uygulamasındaki dijital üyelik satışı Play Billing kullanır. Shopier satış/aktivasyon ekranı Android veli akışında sunulmaz; diğer ekranların dış ödeme yönlendirmeleri de yayın öncesi denetlenmelidir. Bu hazırlık Google Play kabul garantisi değildir.
- Play Console geliştirici hesabı, kimlik ve cihaz doğrulaması; yeni bireysel hesaplar için en az 12 testçinin son 14 gün kesintisiz katıldığı kapalı test ve üretim erişim başvurusu.
- Mağaza açıklamaları, gerçek cihaz ekran görüntüleri, uygulama simgesi/özellik görseli ve imzalı AAB yüklemesi. Kullanıcının hesabı adına sözleşme kabulü veya kayıt ücreti ödemesi yapılmadı.

## Resmi kaynaklar — 16 Ekim 2026

- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/android
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10281818
- https://support.google.com/googleplay/android-developer/answer/9867159
