# Google Play abonelik kurulumu

18 Ekim 2026: Tek ödeme sağlayıcısı Google Play. Satın alma Android veli panelinde, erişim doğrulaması sunucuda yapılır. Aynı öğrenci webde de aboneliğini kullanır. Gerçek Play Console kurulumu ve lisans testçisi kabulü tamamlanmadan satış açılmaz.

## Ürünler

İlk yüklemeden önce `com.zekapark.app` kimliğinin sahipliğini/kullanılabilirliğini doğrulayın. Değişirse Capacitor ayarı, Java paketleri, hazırlama betiğinin dosya hedefleri ve sunucu ayarı birlikte değişmelidir.

Play Console'da uygulama için bir abonelik oluşturun:

| Alan | Değer |
| --- | --- |
| Ürün kimliği | `zekapark_uyelik` |
| Aylık otomatik yenilenen temel plan | `monthly`, P1M |
| 3 aylık otomatik yenilenen temel plan | `quarterly`, P3M |
| Yıllık otomatik yenilenen temel plan | `annual`, P1Y |

Fiyatları ve ülkeleri Play Console'da belirleyip temel planları etkinleştirin. Uygulama fiyat uydurmaz: Google'ın yerelleştirilmiş fiyatını gösterir. Bu sürüm yalnızca standart, tek fiyat aşamalı otomatik yenilenen temel planları sunar; indirimli teklifler, ücretsiz deneme, ön ödemeli planlar ve uygulama içinden plan değiştirme henüz kapsamda değildir. Her Google hesabı/ürün için bir etkin abonelik vardır; bu sürümde abonelik tek öğrenciye bağlıdır. İkinci çocuk, aile paketi ve hesaplar arası aktarım desteklenmez. Süreye 30/90/365 gün eklenmez; bitiş tarihi Google'dan alınır.

## Sunucu ve veritabanı

1. `20261017061944_google_play_subscriptions.sql` geçişi `vehhvsdkifwstbjhnhao` üretim projesine uygulandı ve migration geçmişi doğrulandı. Başka bir ortama kurarken önceki hesap-silme geçişleri uygulanmış olmalıdır. Tablolar/RPC'ler yalnızca sunucuya açıktır. GitHub iş akışı migration'ı otomatik çalıştırmaz; üretimde aynı geçişi tekrar uygulamayın.
2. Google Cloud'da Android Publisher API'yi etkinleştirin. Kullanıcının inceleyip oluşturduğu hizmet hesabını Play Console uygulamasına ekleyin. Abonelikleri görüntüleme ve onaylama için gereken uygulama kapsamlı en az izinleri verin; gereksiz finans/yönetici erişimi vermeyin. İlk kurulum lisans testçisiyle doğrulanmalıdır. Hizmet hesabı/anahtar veya erişim yetkisi bu PR tarafından oluşturulmaz.
3. `.env.example` içindeki değerleri yalnızca sunucu ortam değişkenlerine girin. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` bir sunucu sırrıdır; uygulamaya, depoya veya sohbet mesajına konulmaz. Bağımsız hesap-bağlama sırrını ve şifreleme anahtarını kullanıcı güvenli ortamda oluşturmalıdır. Satış ve zorunlu erişim bayrakları başlangıçta `false` kalır.
4. Native API istekleri `CapacitorHttp` kullanır; sahte Origin göndermez, CORS istisnası eklemek gerekmez. Yalnız tarayıcı tabanlı localhost WebView testleri yapılacaksa `https://localhost` açıkça izinli kaynaklara eklenebilir. JWT, aktif oturum, doğrulanmış veli e-postası ve aile yetkisi kontrolleri korunur. Bu PR üretim CORS ayarını değiştirmez.
5. Platformun yasal işletmeci bilgileri ve mevcut yayın kabul kontrolleri tamamlanmalıdır; eksikse `/prepare` satış başlatmaz. Bu kontrolleri yapmadan başarılı işaretlemeyin.

Anahtarlar uzun ömürlü kayıtları korur: bağlama sırrını rastgele değiştirmek eski satın alımların eşleşmesini, token anahtarını değiştirmek kayıtların çözülmesini bozar. Rotasyon için kontrollü yeniden eşleme/şifreleme geçişi gerekir. Şifreli tokenlar, sahiplik ve gerekli mali kayıtlar için saklama süresini gerçek gizlilik metnine ekleyin. Hesap silmede ödeme saklama incelemesi tamamlanana kadar mevcut yönetici akışı durur; yönetici incelemesi sonrasında kimliksizleştirme ve token kaldırma prosedürü ayrıca tamamlanmalıdır. Sahipsiz token-hash kaydı başka aileye yeniden atanamaz.

## Yenileme, iptal ve iade bildirimi

- Google Cloud Pub/Sub konusu oluşturun; Google Play'in resmi bildirim yayıncısına yalnızca bu konu için yayınlama izni verin ve konuyu Play Console gerçek zamanlı geliştirici bildirimlerine (RTDN) bağlayın.
- Push hedefi: `https://zekapark.vercel.app/api/google-play/notifications`. OIDC kimlik doğrulamasını etkinleştirin. Özel push hizmet hesabı e-postasını `GOOGLE_PLAY_RTDN_EMAIL`, tam audience değerini `GOOGLE_PLAY_RTDN_AUDIENCE` olarak kaydedin. Pub/Sub servis ajanına yalnızca gereken token üretme yetkisini verin. Retry/dead-letter ve başarısız bildirim alarmı kurun; Vercel korumasının Google push'u engellemediğini doğrulayın.
- Sunucu JWT imzasını, audience, issuer, doğrulanmış e-posta ve beklenen hizmet hesabını kontrol eder. Bildirim içindeki 'yenilendi' iddiası erişim açmaz; Android Publisher `subscriptionsv2.get` tekrar çağrılır. Uygulama satın alım sonrasında kapandıysa token yalnızca satın alma öncesi yetkili veli tarafından kalıcı kaydedilmiş hesap/öğrenci eşlemesi ve Google’dan okunan aynı kimliklerle geri kazanılır. Önceden hazırlanmış eşleme yoksa bildirim erişim açmaz.
- Veli erişimi okunurken ve yeni test başlatılırken Google'dan taze doğrulama yapılır. Bildirim gecikmesi tek başına eski erişimi sürdürmez. Doğrulama servisi çalışmıyorsa ücretli erişim başarılı kabul edilmez. Bu sürüm her yeni çalışma için çevrimiçi doğrulama gerektirir; büyük hacimde Google API kota ve gecikmesini ölçün.

## Satın alım akışı

Doğrulanmış veli → seçilen öğrenci için `/prepare` → sunucunun HMAC hesap/öğrenci kimlikleri → Google Play ödeme ekranı → token sunucuya (veya uygulama kapanmışsa hazırlanmış eşlemeyle RTDN kurtarması) → Google doğrulaması → atomik, sahipliği değişmez kayıt → Google acknowledge → erişim. Uygulama callback'i veya istemcinin gönderdiği fiyat/paid bilgisi erişim açamaz.

Bekleyen ödeme erişim açmaz. Aktif ve ek ödeme süresindeki abonelikler erişim verir; kullanıcı tarafından iptal edilen abonelik Google bitiş tarihine kadar kullanılabilir. Askıya alınmış, duraklatılmış ve sona ermiş abonelikler erişim vermez. Onaylama ancak kalıcı kayıttan sonra yapılır; hata olursa geri yükleme aynı tokenla tekrar denenebilir. Token düz metin saklanmaz; AES-256-GCM ile korunur. Eşzamanlı eski doğrulama sonucu yeni durumun üstüne yazamaz.

## Kabul ve yayın sırası

1. `npm ci`, `npm run lint`, `npm run test:google-play`, mevcut regresyon testleri ve `npm run android:sync`.
2. Android Studio/JDK 21/SDK 36 ile derleyip imzalı AAB üretin. Yerel `android:sync` Java derlemesi veya cihaz doğrulaması değildir.
3. Play Console internal test kanalına yükleyin; lisans testçileri ve test ödeme yöntemlerini hazırlayın. Google Play'den aynı paket ve imzayla yükleyin. Test backend'inde gerekli kurulum ve gerçek yayın kontrollerinden sonra `GOOGLE_PLAY_BILLING_ENABLED=true`, `GOOGLE_PLAY_ALLOW_TEST_PURCHASES=true` kullanın. Test ve üretim ortamlarını karıştırmayın.
4. Aylık/3 aylık/yıllık fiyat ve dönem, başarılı satın alma, kullanıcı iptali, bekleyen ödeme, uygulama kapanırken satın alma, geri yükleme, yenileme, grace/on-hold, iptal sonrası kalan süre, iade/iptal ile erişimin kaldırılması, ağ kesintisi ve acknowledge sonrası yeniden deneme testleri. Google Play yönetim bağlantısını cihazda doğrulayın.
5. Farklı veli/öğrenci ile aynı tokenı kullanmayı, bir aileden diğerine aktarımı, eski oturumu ve yetkisiz RTDN isteğini reddettiğini gerçek ortamda doğrulayın. Bildirim testinin yalnızca 204 dönmesini değil doğru abonelik kaydını güncellemesini izleyin.
6. Üretimde `GOOGLE_PLAY_ALLOW_TEST_PURCHASES=false`; ancak gerçek ödeme ve yayın şartları tamamlandığında satış ve isteniyorsa `GOOGLE_PLAY_ENFORCE_PAID_ACCESS=true`. İkincisi sunucuda platform genelinde yeni testlere uygulanır; sadece Android UI bayrağına göre ücretli yetki verilemez. Google'dan edinilen erişim aynı öğrencinin web oturumunda da kullanılabilir.
7. Yeni bireysel Play hesabında kapalı test/üretim erişim şartlarını, çocuk hedef kitlesi/Families politikalarını, Veri Güvenliği ve uygulama/web hesap silme akışlarını tamamlayın. Kabul garantisi verilmez.

## Resmi kaynaklar — 16 Ekim 2026

- https://developer.android.com/google/play/billing/integrate — Billing 9.1.0 ve satın alma yaşam döngüsü
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2 — yetkili abonelik durumu, gerçek bitiş, hesap kimlikleri
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge
- https://developer.android.com/google/play/billing/rtdn-reference
- https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- https://support.google.com/googleplay/android-developer/answer/12154973

## Veli ekranı ve kesinti davranışı

Paket seçmek tek başına satın alım başlatmaz; seçimin ardından ayrı Google Play düğmesi kullanılır. Öğrenci adı, gerçek mağaza fiyatı, dönem, otomatik yenileme ve iptal bilgileri görünür. Bekleyen veya başka öğrenciye bağlı bir satın alım bulunduğunda yeni ödeme başlatılmaz. Fiyat kataloğu ve mevcut satın alımlar birbirinden bağımsız yüklenir; katalog arızası geri yüklemeyi durdurmaz. Güncel erişim doğrulanamazsa eski kayıt yalnızca son doğrulanan bilgi olarak gösterilir. Yenile ve geri yükle işlemleri tekrar denenebilir.

Ön plana gelme olayları, satın alma, doğrulama ve yenileme tek işlem sırasıyla yürür. Aynı anda gelen olaylar bir sonraki tek yenilemede birleştirilir. Öğrenci/veli değişiminde HTTP iptal edilir; eski native sonuçlar yeni hesaba uygulanmaz. Native eklenti satın alımın ürün kimliklerini de döndürür; farklı ürünler bu üyelik için kullanılamaz. Uygulama callback'i güncel sunucu doğrulamasının yerini tutmaz.

Arayüz kontrolleri: `npm run test:google-play` sunucu ve istemci senaryolarını çalıştırır. `npm run test:google-play:browser` kurulu Playwright Chromium ile 320/360/390/768 pikselde yedi ekran durumunu, paket seçiminin ödeme başlatmamasını, ödeme düğmesinin seçilen planı iletmesini, kurtarma düğmelerini ve klavye kullanımını kontrol eder. Bu ikinci kontrol yerel, kurmaca fiyatlı bir bileşen ekranıdır; Google veya gerçek hesaba bağlanmaz ve cihazdaki ödeme testinin yerini tutmaz.

## Web ve Android ana sayfası / üyelik

Android ilk açılışta web ile aynı LandingPage bileşenini kullanır. Öğrenci ve veli girişleri menüden açılır; Android Geri davranışı gerçek cihaz kabulünde ayrıca doğrulanmalıdır.

`/paketler` ve web veli paneli Google Play üyeliğini açıklar. Tarayıcıda BillingClient başlatılmaz; satın alma Android uygulamasındaki veli panelinde yapılır. Sunucunun doğruladığı erişim aynı öğrenci için webde de geçerlidir. Fiyatlar yalnızca Play Billing kataloğundan alınır.

`GOOGLE_PLAY_STORE_PUBLISHED=true` yalnızca gerçek mağaza sayfası erişilebilir olduktan sonra ayarlanmalıdır. Varsayılan false iken çalışmayan mağaza bağlantısı gösterilmez. Bu bayrak satın alma veya ücretli erişim açmaz; mevcut doğrulama ve yayın kontrolleri korunur.
