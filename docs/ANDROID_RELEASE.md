## 1.0.32 - Web ve Android yasal açıklama bağlantıları

- Ortak yasal bağlantılar: Gizlilik/KVKK, kullanım koşulları, çerez/yerel depolama, abonelik/iptal/iade, hesap/veri silme ve iletişim/işletmeci. Android açılışı, giriş/kayıt üst alanı, öğrenci profili, veli hesabı ve ödeme açıklamaları bu sayfalara erişim sunar. Web alt bilgisi, oturum içi sayfalar, üyelik sayfası ve İngilizce alt bilgisi de bağlantıları içerir.
- Belgeler uygulamada okunabilir; bağlantı kopyalama ve ayrı sayfa açma korunur. Android ayrı sayfa bağlantıları gerçek web adresini kullanır. Ağ hatasında tekrar deneme ve ayrı belge sayfası sunulur. Açılan açıklama kayıt/giriş alanlarını sıfırlamaz.
- Yeni genel hesap silme sayfasında uygulama içi talep yolu ve uygulamayı kurmadan yapılandırılmış iletişim adresine e-posta göndererek başvuru yolu açıklanır. E-posta bağlantısı kullanıcı tarafından gönderilecek bir taslak açar; otomatik talep veya anında silme değildir. Google Play iptali ayrı açıklanır.
- Üç yeni açıklama sayfası da güncel işletmeci ayarlarını kullanan sunucu yolundan sunulur ve no-store kullanır. Dağıtımda eski statik politika dosyaları sunulmaz. Yalnız izinli genel HTML belgeleri dış sayfalardan okunabilir; çapraz site JSON, iframe ve yazma istekleri engelli kalır.
- Bağlantıların varlığı nihai hukuki uyum onayı değildir. Tam yasal kimlik, açık adres, gerçek saklama/aktarım uygulamaları ve satış öncesi bilgiler işletmeci tarafından doğrulanmalıdır. Satış/kayıt kabul ayarları bu çalışmada değiştirilmez.
- Android sürümü 1.0.32 / kod 33; paket ve mevcut yükleme anahtarı korunur.

Kontroller: `test:legal-links` gerçek web/Android bağlantı bileşenlerini ve altı genel belgeyi izole hizmetlerle kontrol eder. Ek hukuki belge regresyonları, mevcut giriş/veli düzen kontrolleri ve Android sürüm bütünlüğü kontrolleri korunur. Gerçek Google Play kabulü ve fiziksel cihaz kontrolü ayrıca gerekir.

## 1.0.31 - Mobil veli çalışma alanı ve veri geçişi

- Android veli alanı kısa bir gerçek veri özeti ve dört sabit bölüme ayrılır: Özet, Beceriler, Üyelik, Hesap. Grafikler yalnız istendiğinde açılır; üyelik paneli kendi bölümünde çalışır. Öğrenciye geçiş, giriş bilgileri, şifre yenileme, hatırlatıcı, rapor paylaşma ve veri/silme işlemleri korunur.
- Android veli başlığı sadeleşir; ses ve çıkış işlemleri erişilebilir kalır. Native veli ekranındaki genel Blog/Rehber alt menüsü kaldırılır. Kalan ortak bilgi/İngilizce bağlantıları doğru genel site adresini kullanır.
- Öğrenci değiştirilirken profil ve ilerleme birlikte yüklenmeden gösterilmez. Yükleme hatası eski öğrencinin bilgilerini yeni seçim altında göstermez; tekrar deneme yolu sunulur. Çift yönlü aile bağı kontrolü korunur. Kopyalama başarısı yalnız pano işlemi tamamlandıktan sonra bildirilir; reddedilirse anlaşılır hata görünür.
- Native Back açık veli pencerelerini veya ayrıntılı raporu kapatır ve diğer bölümlerden özete döner. Satın alma/ağ doğrulaması sürerken öğrenci seçimi, bölüm değişimi ve Back ile panelden çıkış engellenir.
- Bölüm yüklenirken boş alan yerine marka görseli ve kısa yükleme durumu gösterilir. Karanlık tema, büyük metin, 44 px dokunma alanları ve azaltılmış hareket ayarları gözetilir.
- Sürüm kodu 32, sürüm adı 1.0.31. Paket kimliği ve mevcut yükleme anahtarı korunur. Bu arayüz çalışması satış veya üretim yayın kabulünü açmaz.

Doğrulama: TypeScript, mevcut regresyonlar ve Android sürüm bütünlüğü kontrolleri. `test:android-parent` gerçek veli bileşenini izole hesap/veri hizmetleriyle altı ekran boyutunda kontrol eder: özet/rapor/beceriler/üyelik/hesap, Back, ödeme sırasında gezinme kilidi, pano reddi, öğrenci yükleme hatası ve kurtarma, karanlık tema ve büyük metin. Bu kontrol gerçek Google Play satın alma veya fiziksel cihaz kabul testi değildir. `test:android-entry`, mevcut Play UI ve hikâye kontrolleri ayrıca korunur.

## 1.0.30 — Kısa Android açılışı ve ekrana sığan hesap ekranları

- Android, uzun web tanıtım sayfası yerine öğrenci girişi, veli girişi, yeni aile hesabı ve örnek soru seçeneklerini içeren kısa açılış ekranını kullanır. Örnek soru motoru yalnız istenince yüklenir. Gizlilik, koşullar ve yardım erişimi korunur.
- Android kaydı beş kısa sayfaya ayrılır: veli e-postası, veli şifresi, öğrenci takma adı/sınıfı, öğrenci şifresi ve kontrol/onay. Geri dönüşlerde bilgiler korunur. Sunucuya gönderim yalnız son onayda yapılır; doğrulama ve veli onayları aynı kalır. Web kaydı üç adımlı düzenini korur.
- Android girişinde büyük tanıtım alanı kaldırılır; kayıt sonrası öğrenci kodu ve e-posta doğrulama ekranı da kısalır. Android geri tuşu önce kayıt adımına veya açık yardım metnine döner. Kayıt gönderilirken geri çıkış engellenir.
- Görünen ekran yüksekliği klavye açılmasına göre izlenir; başlıklar daraltılarak giriş alanları ve devam düğmesi için alan açılır. Yakınlaştırma korunur; büyük yazı, uzun hata veya çok küçük alan gerektiğinde iç kaydırma kullanılabilir, içerik kesilmez.
- Android sürümü 31 / 1.0.30. Aynı uygulama kimliği ve mevcut yükleme anahtarı kullanılır. Satış ayarları değiştirilmez.

Yerel doğrulama: TypeScript, kayıt/şifre/Android regresyonları; beş ekran boyutunda ana sayfa, öğrenci/veli girişi, kayıt sayfaları, başarı ekranı ve 320 piksel yüksekliğe daralan klavye senaryoları. Test bileşenleri gerçek, ağ yanıtları yalıtılmıştır; gerçek hesap oluşturulmaz. Gerçek Android cihaz kabulü ayrıca yapılmalıdır.


## 1.0.29 — Android kullanım ve abonelik iyileştirmeleri

- Android geri tuşu önce açık soru/konu penceresini veya hatırlatıcıyı kapatır. Aktif test, kendi cevap kaydetme akışından çıkar; devam eden kayıt ve hesap geçişi sırasında ekran değişmez. Öğrenci ayrıntıları ilgili Çalış/Ödüller alanına döner.
- Bağlantı kesintisi, soru alanını daraltmayan ve kapatılabilen bir uyarıyla gösterilir. Kapatılan uyarı seçeneklerin üstünde simge bırakmaz; yeni bir bağlantı kesintisinde yeniden görünür. Bağlantının gelmesi, kaydedilemeyen cevabın otomatik olarak kaydedildiği anlamına gelmez; mevcut yeniden gönder düğmesi kullanılır.
- Native WebView, Android sistem çubukları için alan ayırır (`viewport-fit=contain`, SystemBars native insets, AndroidX EdgeToEdge). Web sürümünün viewport ayarı ve yakınlaştırma desteği korunur.
- Google Play'de bekleyen, askıya alınan veya duraklatılan üyelikler yeni satın alıma yönlendirilmez. Doğrulanmış durum ve gerçek bitiş tarihi API'den gelir. Ağ kesintisinde ödeme başlatılmaz; ödeme hazırlığı sırasında kesinti de yeniden kontrol edilir.
- Android sürümü 30 / 1.0.29. Üretim yayını, mevcut yükleme anahtarıyla imzalı AAB ve Play Console kabulü gerektirir. Kod güncellemesi, yüklü APK'yı kendiliğinden güncellemez.
