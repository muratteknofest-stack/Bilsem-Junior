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
3. Mevcut sunucunun `CORS_ALLOWED_ORIGINS` listesine yalnızca `https://localhost` kaynağını ekleyin. Mevcut kaynakları koruyun, `*` kullanmayın. Bu dal üretim ayarlarını otomatik değiştirmez. Bearer doğrulaması ve üyelik kontrolü korunmalıdır.
4. `npm run test:android`, `npm run lint`, `npm run android:sync` çalıştırın. Bu aşama APK/AAB üretmez.
5. Android Studio ile JDK 21, Android SDK 36 ve gerekli derleme araçlarını kurup lisansları kendiniz inceleyip kabul edin. `npm run android:open` ile projeyi açın.
6. Cihaz testi için `npm run android:apk` kullanın. Debug APK mağaza sürümü değildir. Google Play için Android Studio'daki **Generate Signed App Bundle** akışında kendi yükleme anahtarınızı oluşturun ve güvenli tutun. Anahtar/parola depoya veya sohbet mesajına eklenmemelidir. `android:bundle` yalnızca Gradle release derlemesini başlatır; imza yapılandırılmadıysa çıktısı yayınlanabilir değildir.

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
