# Google Play abonelik kurulumu

23 Ekim 2026: Tek ödeme sağlayıcısı Google Play. Satın alma yalnızca gerçek Android ortamında açılır; Android derleme etiketi taşıyan tarayıcı önizlemeleri ve diğer işletim sistemleri ödeme başlatamaz. Satın alma Android veli panelinde, erişim doğrulaması sunucuda yapılır. Aynı öğrenci webde de aboneliğini kullanır. Gerçek Play Console kurulumu ve lisans testçisi kabulü tamamlanmadan satış açılmaz.

## Ürünler

Kullanıcının paylaştığı Quantum Studio App Console kaydındaki uygulama kimliği `com.quantumtech.bilsemjunior` olarak eşleştirildi. Geliştirici hesap numarası Cloud proje kimliği değildir. Mevcut uygulamayı kullanın; yeni paket veya yeni yükleme anahtarı oluşturmayın. Ürün ve hizmet hesabı ayarları Console erişimiyle ayrıca doğrulanmalıdır.

Play Console'da uygulama için bir abonelik oluşturun:

| Alan | Değer |
| --- | --- |
| Ürün kimliği | `zekapark_uyelik` |
| Aylık otomatik yenilenen temel plan | `monthly`, P1M |
| 3 aylık otomatik yenilenen temel plan | `quarterly`, P3M |
| Yıllık otomatik yenilenen temel plan | `annual`, P1Y |

Fiyatları ve ülkeleri Play Console'da belirleyip temel planları etkinleştirin. Uygulama fiyat uydurmaz: Google'ın yerelleştirilmiş fiyatını gösterir. Bu sürüm yalnızca standart, tek fiyat aşamalı otomatik yenilenen temel planları sunar; indirimli teklifler, ücretsiz deneme, ön ödemeli planlar ve uygulama içinden plan değiştirme henüz kapsamda değildir. Her Google hesabı/ürün için bir etkin abonelik vardır; bu sürümde abonelik tek öğrenciye bağlıdır. İkinci çocuk, aile paketi ve hesaplar arası aktarım desteklenmez. Süreye 30/90/365 gün eklenmez; bitiş tarihi Google'dan alınır.

## Sunucu ve veritabanı

1. `20261017061944_google_play_subscriptions.sql` geçişi önceki üretim projesine uygulanmıştı. Güncel Bilsem Junior projesi `vtcsoqohkiagbwatlabk` olup Google Play tabloları hesap-proje hizalamasıyla bu projede de bulunur. Başka bir ortama kurarken önceki hesap-silme geçişleri uygulanmış olmalıdır. Tablolar/RPC'ler yalnızca sunucuya açıktır. GitHub iş akışı migration'ı otomatik çalıştırmaz; üretimde aynı geçişi tekrar uygulamayın.
2. Google Cloud'da Android Publisher API'yi etkinleştirin. Kullanıcının inceleyip oluşturduğu hizmet hesabını Play Console uygulamasına ekleyin. Yalnız Bilsem Junior uygulaması kapsamında “View financial data, orders, and cancellation survey responses” ve “Manage orders and subscriptions” izinlerini verin. Bu izinler Billing API için Google tarafından istenir; hesap genelinde yönetici veya başka uygulamalara erişim vermeyin. İlk kurulum lisans testçisiyle doğrulanmalıdır. Hizmet hesabı/anahtar veya erişim yetkisi bu PR tarafından oluşturulmaz.
3. `.env.example` içindeki değerleri yalnızca sunucu ortam değişkenlerine girin. Bu kurulumda aşağıdaki anahtarsız Workload Identity yöntemi kullanılır. JSON anahtarı olan başka ortamlar için `service_account` modu korunur; bu moddaki `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` bir sunucu sırrıdır ve uygulamaya, depoya veya sohbet mesajına konulmaz. Bağımsız hesap-bağlama sırrı ve şifreleme anahtarı korunmalıdır. Satış ve zorunlu erişim bayrakları başlangıçta `false` kalır.
4. Native API istekleri `CapacitorHttp` kullanır; sahte Origin göndermez, CORS istisnası eklemek gerekmez. Yalnız tarayıcı tabanlı localhost WebView testleri yapılacaksa `https://localhost` açıkça izinli kaynaklara eklenebilir. JWT, aktif oturum, doğrulanmış veli e-postası ve aile yetkisi kontrolleri korunur. Bu PR üretim CORS ayarını değiştirmez.
5. Platformun yasal işletmeci bilgileri ve mevcut yayın kabul kontrolleri tamamlanmalıdır; eksikse `/prepare` satış başlatmaz. Bu kontrolleri yapmadan başarılı işaretlemeyin.

Anahtarlar uzun ömürlü kayıtları korur: bağlama sırrını rastgele değiştirmek eski satın alımların eşleşmesini, token anahtarını değiştirmek kayıtların çözülmesini bozar. Rotasyon için kontrollü yeniden eşleme/şifreleme geçişi gerekir. Şifreli tokenlar, sahiplik ve gerekli mali kayıtlar için saklama süresini gerçek gizlilik metnine ekleyin. Hesap silmede ödeme saklama incelemesi tamamlanana kadar mevcut yönetici akışı durur; yönetici incelemesi sonrasında kimliksizleştirme ve token kaldırma prosedürü ayrıca tamamlanmalıdır. Sahipsiz token-hash kaydı başka aileye yeniden atanamaz.

## Bu uygulamanın sunucu değerleri ve kurulum kontrolü

| Ortam değişkeni | Değer / işlem |
| --- | --- |
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.quantumtech.bilsemjunior` |
| `GOOGLE_PLAY_PRODUCT_ID` | Kodun beklediği `zekapark_uyelik`; Console kataloğunda ayrıca doğrulayın |
| `GOOGLE_PLAY_RTDN_AUDIENCE` | `https://bilsemjunior.vercel.app/api/google-play/notifications` |
| `GOOGLE_PLAY_RTDN_EMAIL` | Pub/Sub kimlik doğrulamalı push için seçilen gerçek hizmet hesabı e-postası |
| `GOOGLE_PLAY_AUTH_MODE` | Bu proje için `workload_identity`; eski JSON kurulumu için `service_account` (varsayılan) |
| `GOOGLE_PLAY_WIF_PROVIDER` | `projects/367829590893/locations/global/workloadIdentityPools/bilsem-vercel/providers/bilsem-production` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | `bilsem-play-api@bilsem-junior-512517.iam.gserviceaccount.com` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Yalnız `service_account` modunda gerekli; anahtarsız modda kullanılmaz |
| `GOOGLE_PLAY_BINDING_SECRET` | En az 32 karakterlik bağımsız rastgele sunucu sırrı; varsa mevcut değeri koruyun |
| `GOOGLE_PLAY_TOKEN_KEY` | AES-256 için 64 onaltılık karakter; varsa mevcut değeri koruyun |
| `GOOGLE_PLAY_BILLING_ENABLED` | Gerçek kabul testlerine kadar `false` |
| `GOOGLE_PLAY_ENFORCE_PAID_ACCESS` | Gerçek kabul testlerine kadar `false` |
| `GOOGLE_PLAY_STORE_PUBLISHED` | Gerçek herkese açık mağaza sayfası açılana kadar `false` |
| `GOOGLE_PLAY_ALLOW_TEST_PURCHASES` | Üretimde `false`; ayrı test sunucusunda lisans testleri için açılır |

Sunucu ortamında `npm run google-play:check` çalıştırın. Güvenli yerel sunucu ayar dosyası varsa `node --env-file=/guvenli/yol/bilsem-server.env --import tsx scripts/check-google-play-setup.ts` kullanılabilir. Dosyayı depoya koymayın. Komut yalnızca eksik/geçersiz değişken adlarını ve kontrol sonuçlarını gösterir; sır üretmez, satış açmaz, veritabanına yazmaz. Yapılandırma tamamlandığında Google'daki gerçek abonelik kataloğunu okur; uygulama, ürün ve üç etkin dönemin eşleşmesini zorunlu tutar. Yanlış paket ayarını reddeder. Bu kontrol RTDN teslimi veya gerçek satın alma testi değildir. Tam yayın değerlendirmesi için aynı sunucu ortamında ayrıca `npm run release:commercial` çalıştırın.

Mevcut üretilmiş Android projesinde `android:prepare`, Capacitor kimliğini Gradle `namespace` ve `applicationId` alanlarına da uygular, eski paket altındaki kendi Java sınıflarını temizler. Böylece `cap sync` sonrasında eski kimlikle paket üretilemez. Bu işlem imzalama anahtarı oluşturmaz; önceki test APK'sı yeni Console paketine dönüşmez. Yeni AAB mevcut Console yükleme anahtarıyla imzalanmalıdır.

## Yenileme, iptal ve iade bildirimi

### Google Cloud Shell ile kurulumu tamamlama

23 Ekim 2026: Vercel üretim ortamında iki kalıcı Secret ve satışları kapalı tutan ayarlar bulunur. `GOOGLE_PLAY_RTDN_EMAIL` ayrıca Production için kaydedildi; bu ek ayar henüz yeni dağıtıma uygulanmadı. Kullanıcı `bilsem-junior-512517` (367829590893) projesinde Cloud Shell kurulumu çalıştırdı ve `cloudResourcesVerified: true` sonucu paylaştı. `bilsem-play-api` hizmet hesabı, onaylanan uygulama izinleriyle Play Console'da Etkin olarak doğrulandı. JSON anahtarı üretimi Google tarafından `FAILED_PRECONDITION: Key creation is not allowed on this service account` ile reddedildi; ardından dosyanın var olması geçerli anahtar kanıtı değildir. Uzak Cloud Console erişimi hâlâ kullanılamadığından anahtarsız güven kurulumu kullanıcı Cloud Shell oturumunda tamamlanmalıdır. RTDN teslimi, etkin üç temel plan ve gerçek satın alma henüz doğrulanmadı.

### Bu proje için anahtarsız bağlantı

Vercel OIDC ve Google Workload Identity Federation kullanılır. `@vercel/oidc` 4.0.0 güncel çağrı bağlamındaki tokeni yalnız kimlik yenilerken okur. Google SDK bunu STS'de değiştirir, mevcut Play API hesabını 600 saniyelik Android Publisher yetkisiyle temsil eder. STS ve IAM çağrılarında zaman sınırı, yönlendirme engeli ve gizli hata ayrıntılarının filtrelenmesi uygulanır. Mod açıkça seçilir; eksik federasyon ayarları JSON anahtarına geri düşmez. Bu mod yalnız Vercel Production ortamında hazır kabul edilir.

`scripts/bilsem-play-keyless.py` bu gerçek Cloud/Vercel proje kimliklerine sabitlenmiştir. Varsayılan çalıştırma yalnız plan üretir. Mevcut Vercel issuer modu doğrulandıktan sonra Cloud Shell'de:

```bash
python3 scripts/bilsem-play-keyless.py
python3 scripts/bilsem-play-keyless.py --apply
```

Global issuer seçiliyse her iki komuta `--issuer-mode global` ekleyin; Team modu için varsayılan geçerlidir. Betik sadece `bilsem-vercel` havuzu ve `bilsem-production` sağlayıcısını oluşturur. İzin, mevcut API hizmet hesabında yalnız `owner:dyds-projects-c415ba7a:project:bilsemjunior:environment:production` principal'ına `roles/iam.workloadIdentityUser` olarak verilir. Sağlayıcı koşulu ayrıca gerçek `owner_id` ve `project_id` ile Production ortamını sınırlar. Başka veya daha geniş mevcut güven ilişkilerini üzerine yazmadan reddeder. Kuruluşun anahtar üretme politikası değiştirilmez; özel anahtar oluşturulmaz veya dosya içeriği okunmaz.

`wifTrustVerified: true` yalnız Cloud güven yapılandırmasının doğrulandığını gösterir. Gerçek token değişimi ayrıca Production işlev çağrısıyla doğrulanmalıdır. Yukarıdaki üç anahtarsız ortam değişkenini yalnız Vercel Production'a Config olarak kaydedin, yeni kodu dağıtın, ardından gerçek katalog ve RTDN testlerini çalıştırın. Vercel tokenini elle kopyalamayın veya ortam değişkeni olarak sabitlemeyin; SDK güncel çağrı tokenini alır. Mevcut bağlama ve şifreleme Secret'larını değiştirmeyin.

Resmi kaynaklar: [Vercel GCP bağlantısı](https://vercel.com/docs/oidc/gcp), [Vercel OIDC başvurusu](https://vercel.com/docs/oidc/reference), [Google Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation).

`scripts/provision-google-play-cloud.py` oturum açılmış Google Cloud Shell/CLI ile kalan Cloud kaynaklarını kurar. Python 3.9+ gerekir; paket yüklemez. Önce **mevcut gerçek Cloud proje kimliğini** belirleyin. Play geliştirici hesap numarası `8719423094329535468` Cloud proje kimliği değildir. Betik yeni proje veya faturalandırma hesabı açmaz. İlgili Cloud hesabının hizmet/API etkinleştirme, hizmet hesabı oluşturma, Pub/Sub ve kaynak kapsamlı IAM izinlerini yönetme yetkileri olmalıdır.

Depo dizininde önce yalnız planı inceleyin (`GERCEK_PROJE_KIMLIGI` alanını gerçek değerle değiştirin):

```bash
python3 scripts/provision-google-play-cloud.py --project GERCEK_PROJE_KIMLIGI
```

Plan Cloud'a bağlanmaz ve hiçbir kaynağı değiştirmez. Gerçek kurulum için:

```bash
python3 scripts/provision-google-play-cloud.py --project GERCEK_PROJE_KIMLIGI --apply
```

Betik Android Publisher, IAM ve Pub/Sub API'lerini etkinleştirir; `bilsem-play-api` ve `bilsem-play-push` hizmet hesaplarını oluşturur. Bildirim ve başarısız mesaj konuları ile push/inceleme aboneliklerini hazırlar. Google Play'in resmi yayıncısına yalnız bildirim konusu üzerinde yayınlama; Pub/Sub servis ajanına yalnız push hesabında token üretme, başarısız mesaj konusunda yayınlama ve ana abonelikte okuma izni verir. Proje genelinde Owner/Editor/Token Creator veya herkese açık erişim eklemez. Push imzalı OIDC, tam audience, sarılmış Pub/Sub JSON gövdesi, 10–600 saniye yeniden deneme ve 10 denemelik dead-letter kuralı kullanır. Başarısız mesajlar yedi gün tutulur; inceleme aboneliği otomatik sona ermez. Alarm ayrıca kurulmalıdır.

Mevcut aynı adlı kaynaklar tekrar oluşturulmaz. Başka hedef, hesap, audience, filtre veya mesaj dönüşümü varsa betik üzerine yazmadan durur. Hata sonrası kaynakları otomatik silmez. Üretim Cloud kurulumu bu ortamda çalıştırılmış değildir; çevrimdışı testler gerçek Google erişimini kanıtlamaz.

Anahtarsız bağlantı kullanılmayan ve kuruluşun izin verdiği ayrı ortamlarda, Android Publisher hizmet hesabı için isteğe bağlı özel dosya oluşturulabilir. Bu projedeki anahtar üretme engelini kaldırmak için kullanılmaz:

```bash
python3 scripts/provision-google-play-cloud.py --project GERCEK_PROJE_KIMLIGI --apply --key-file ~/bilsem-play-private/service-account.json
```

Anahtar yalnız açık `--key-file` isteğinde üretilir, mevcut dosyanın üzerine yazılmaz, depoya yazılamaz ve ekrana basılmaz. Dizin/dosya izinleri 0700/0600'dür. Kuruluş anahtar oluşturmayı engelliyorsa betik durur; güvenlik politikasını aşmaz. Sonraki çalıştırmalarda mevcut anahtarı koruyun ve `--key-file` kullanmayın. Vercel'deki iki kalıcı kripto anahtarını tekrar üretmeyin.

Cloud kurulumu sonrasında üç bağlantı tamamlanır:

1. Çıktıdaki `apiServiceAccount` e-postasını Play Console → Hesabı yönetme → Kullanıcılar ve izinler altında **yalnız Bilsem Junior** uygulamasına ekleyin. Billing API'nin gerektirdiği finansal veri görüntüleme ve sipariş/abonelik yönetme izinlerini verin. Betik Play Console daveti göndermez.
2. Vercel `bilsemjunior` projesinin yalnız **Production** ortamına `GOOGLE_PLAY_RTDN_EMAIL` ve yukarıdaki anahtarsız kimlik ayarlarını Config olarak kaydedin. Yalnız ayrı bir `service_account` kurulumu yapılıyorsa JSON dosyası `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` adıyla **Secret** olarak kaydedilir. Toplu `.env` yapıştırma tür/ortam seçimini değiştirebildiğinden her kayıt sonrası türü ve kapsamı doğrulayın. Sırları sohbet, GitHub, APK veya ekran görüntüsüne koymayın. Yeniden dağıtım gerekir.
3. Play Console → Bilsem Junior → Google Play ile para kazanın → Para kazanma kurulumu altında bildirimleri açın; çıktıdaki `playConsoleTopic` değerini girin. “Yalnızca abonelikler ve geçersiz satın alma işlemleri” seçeneğiyle kaydedin. Test bildiriminin sunucuda doğrulanıp 204 dönmesini kontrol edin. Sonra gerçek katalog kontrolünü ve lisans testçisiyle satın alma/yenileme/iade testlerini yapın. Google Play abonelik ekranının istediği faturalandırma destekli imzalı AAB de yüklenmiş olmalıdır.

Çevrimdışı güvenlik ve yeniden çalıştırma kontrolleri: `npm run test:google-play:cloud`. Betik satışları veya yayın kabul bayraklarını açmaz.

- Google Cloud Pub/Sub konusu oluşturun; Google Play'in resmi bildirim yayıncısına yalnızca bu konu için yayınlama izni verin ve konuyu Play Console gerçek zamanlı geliştirici bildirimlerine (RTDN) bağlayın.
- Push hedefi: `https://bilsemjunior.vercel.app/api/google-play/notifications`. OIDC kimlik doğrulamasını etkinleştirin. Özel push hizmet hesabı e-postasını `GOOGLE_PLAY_RTDN_EMAIL`, tam audience değerini `GOOGLE_PLAY_RTDN_AUDIENCE` olarak kaydedin. Pub/Sub servis ajanına yalnızca gereken token üretme yetkisini verin. Retry/dead-letter ve başarısız bildirim alarmı kurun; Vercel korumasının Google push'u engellemediğini doğrulayın.
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

## Resmi kaynaklar — 23 Ekim 2026

- https://developers.google.com/android-publisher/getting_started — hizmet hesabı ve gerekli Play Console izinleri
- https://developer.android.com/google/play/billing/getting-ready — Pub/Sub ve RTDN bağlantısı
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

## 1.0.20 — abonelik ekranı ve kurtarma akışı

- Android ve web veli üyelik kartları renkli, üç boyutlu yüzeylerle güncellendi. Roket ve yıldız animasyonları cihazın hareketi azalt tercihini izler. Paket kartları telefonda daha kısa tutulur; mevcut robot görselleri kullanılır.
- Yalnızca sunulan ve doğru dönemi taşıyan paket seçilir. Aylık sunulmadığında, örneğin yalnız yıllık sunuluyorsa, kullanılabilir dönem otomatik seçilir. Paket seçmek ödeme başlatmaz.
- Geçici katalog hatası sonrasında geri yükleme, gerçek fiyatları da yeniden yükler. İnternet bağlantısı geri geldiğinde üyelik yeniden sorgulanır.
- Google ödeme ekranından dönüldüğünde normal callback gelmezse Android eklentisi satın alınmış/bekleyen işlemleri Google Play'den sorgular ve açık çağrıyı tamamlar. Gelen normal callback önceliklidir; geç sonuçlar ikinci kez işlem başlatmaz. `ITEM_ALREADY_OWNED` sonucunda yeni ödeme yerine sahip olunan işlemler okunur. Yerel sonuç erişim açmaz; sunucu doğrulaması korunur.

19 Ekim 2026 kurulum kontrolünde üretim ortamında `GOOGLE_PLAY_*` ayarları bulunmadı. Gerçek satış bu nedenle açık değildir. Gerekli bağlantılar: Android Publisher hizmet hesabı (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`), kalıcı hesap bağlama sırrı (`GOOGLE_PLAY_BINDING_SECRET`), token şifreleme anahtarı (`GOOGLE_PLAY_TOKEN_KEY`), doğrulanmış RTDN hedefi ve hizmet hesabı (`GOOGLE_PLAY_RTDN_AUDIENCE`, `GOOGLE_PLAY_RTDN_EMAIL`). Bunlar sunucuya güvenli şekilde tanımlanmalıdır; sohbet veya APK içine konulmaz. `GOOGLE_PLAY_BILLING_ENABLED` ve ücretli erişim bayrakları kabul testinden önce açılmaz.

Play Console'da `com.quantumtech.bilsemjunior` uygulamasının `zekapark_uyelik` ürünü ile `monthly` / P1M, `quarterly` / P3M, `annual` / P1Y otomatik yenilenen temel planları etkin olmalıdır. Ürünlerin mevcut Console durumu bu kod çalışmasıyla doğrulanmış değildir. Gerçek fiyat, satın alma ve yenileme testleri lisans testçisi ve Google Play kurulumu üzerinden tamamlanmalıdır.

Bu sürümün APK'sı geliştirme test anahtarıyla imzalanmış test dağıtımıdır. Google Play'e yayımlama ve gerçek ödeme kabul testi yapılmış sayılmaz.
