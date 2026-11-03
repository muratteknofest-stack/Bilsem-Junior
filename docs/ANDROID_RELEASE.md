## 1.0.42 — Daha büyük soru görselleri, daha küçük şıklar

- Android soru ekranında görsel/şık alan oranı 1,12:1 yerine 1,45:1; yatay telefonda sütun oranı 1,1:1 yerine 1,35:1. Şık aralıkları, iç boşlukları ve harf etiketleri daha kompakt; en az 44 px dokunma yüksekliği korunur.
- Soru, alıştırma, deneme ve macera ortak ekranında uygulanır. Hafıza sorularının gösterim/gizleme aşaması korunur. Android sürümü 43 / 1.0.42.
- Test APK'sı üretim imzası veya fiziksel cihaz kabulü değildir.

## 1.0.41 — Eğlenceli uygulama sesleri

- Android sürümü 42 / 1.0.41. Web ve Android için kısa düğme ve geçiş sesleri; lobide neşeli, profilde sakin özgün melodiler.
- Müzik ilk kullanıcı etkileşiminden sonra başlar; soru/konu ekranlarında ve arka planda durur. Görünüm ve ses alanında bağımsız müzik açma/kapatma ve düzey ayarı cihazda hatırlanır. Üst çubuk tüm sesleri susturur.
- Sesler cihazda üretilir; indirme ve ek izin gerektirmez. `python3 scripts/package-android-candidate.py test-artifacts/android` paket sürümünü, derlenmiş varlıkları ve güvenlik bayraklarını doğrular. Test APK'sı üretim imzası, fiziksel cihaz testi veya ticari yayın kabulü değildir.

## 1.0.40 — Uygulama adı yazılı Android simgesi

- Android sürümü 41 / 1.0.40. Ana ekran ve uygulama listesinde görünen simgenin içinde BİLSEM / JUNIOR adı iki satırda yer alır. Üç boyutlu tilki, kitap, yıldız ve mor arka plan korunur.
- Yerel Android simgesi ve 512 px mağaza simgesi aynı görsele güncellendi. Mevcut uyarlanabilir simgenin güvenli iç boşluğu korunur; uygulama içi giriş düzeni değişmez.
- `python3 scripts/package-android-candidate.py test-artifacts/android` derlenmiş paket kimliğini, varlıkları ve güvenlik bayraklarını doğrular. Test APK'sı üretim imzası, fiziksel cihaz testi veya ticari yayın kabulü değildir.

## 1.0.39 — Üç boyutlu Junior ve modern Android girişi

- Android sürümü 40 / 1.0.39. Yeni, renkli 3B tilki maskotu; kitap ve yıldızlı yeni uygulama logosu; Android başlatıcı için eski sürüm ve uyarlanabilir simgeler.
- Kısa açılış; katmanlı renkler, küçük hareketler, belirgin öğrenci/veli düğmeleri ve kısa ikincil seçeneklerle yenilendi. Giriş formu aynı görsel dille güncellendi. Küçük ekran, klavye, koyu tema ve azaltılmış hareket düzenleri korunur.
- Uygulamadaki rehber tilki kullanımları yeni WebP varlığına taşındı. Görseller paket içinden yüklenir; yeni hesap veya e-posta oluşturulmaz.
- `python3 scripts/package-android-candidate.py test-artifacts/android` derlenmiş paketin kimliğini, varlıklarını ve güvenlik bayraklarını doğrular. Test APK'sı üretim imzası, gerçek fiziksel cihaz veya ticari yayın kabulü değildir.

## 1.0.38 — Daha kısa ve dokunmaya uygun APK açılışı

- Android sürümü 39 / 1.0.38. Büyük illüstrasyon ve slogan alanı; küçük rehber görseli, kısa başlık ve iki belirgin öğrenci/veli giriş düğmesiyle yenilendi. Kayıt ve örnek soru yan yana iki kısa seçenek olarak yer alır; açıklayıcı erişilebilir adları korunur.
- Açılış düğmeleri en az 50 px yüksekliğindedir. Yatay telefon yerleşimi ve koyu tema eklendi; büyük metinde doğal kaydırma korunur. Yasal bağlantılar açılıştan erişilebilir kalır.
- Gerçek derlenmiş uygulamanın oturumsuz başlangıç kabulü 320×480, 360×640, 390×844, 768×1024 ve 844×390 boyutlarını; dört açılış seçeneğini ve geri dönüşlerini kontrol eder. Gerçek hesap/e-posta oluşturulmaz.
- `python3 scripts/package-android-candidate.py test-artifacts/android` sürümü, güvenlik bayraklarını ve derlenmiş varlıkları doğrular. Test APK'sı üretim imzası, gerçek fiziksel cihaz veya ticari yayın kabulü değildir.

## 1.0.37 — APK'nın gerçek ilk açılışını düzeltme

- Android sürümü 38 / 1.0.37. Oturumsuz kök sayfayı yöneten AuthStartupView, Android paketinde uzun web tanıtım sayfası yerine AndroidWelcome açar. Öğrenci/veli girişleri, kayıt ve örnek soru, uygulamanın gerçek başlangıç yolunda erişilebilirdir.
- Önceki 1.0.36 derlemesinde gerçek derlenmiş index.html ile hata yeniden üretildi. Önceki doğrudan bileşen testleri bu AuthProvider yolunu kapsamıyordu. Yeni `test:android-public-startup`, derlenmiş uygulamayı 320×480, 360×640, 390×844 ve 768×1024 boyutlarında gerçekten açar; giriş, kayıt, örnek soru ve geri dönüş bağlantılarını izole ağ yanıtlarıyla kontrol eder. Hesap/e-posta oluşturulmaz.
- Web'in masaüstü tanıtım sayfası aynı kalır. AuthProvider erişim koşulları veya üyelik kuralları değiştirilmez; yalnız herkese açık başlangıç görünümü platforma göre seçilir.
- `python3 scripts/package-android-candidate.py test-artifacts/android` sürümü ve derlenmiş varlıkları doğrular. Test APK'sı üretim imzası, gerçek fiziksel cihaz veya ticari yayın kabulü değildir.

## 1.0.36 — Sade Android açılış ve giriş ekranı

- Android sürümü 37 / 1.0.36. Açılış metinleri kısaltıldı; öğrenci ve veli girişleri büyük düğmelerde gösterilir. Giriş ekranında yinelenen Giriş Yap sekmesi kaldırıldı; Yeni Kayıt formun altında kalır.
- Öğrenci/veli seçimi, kod/e-posta, şifre ve tek giriş düğmesi öne çıkar. Şifremi Unuttum ve Beni hatırla aynı satırda kalır; hatırlama varsayılan olarak kapalıdır ve seçildiğinde ortak cihaz uyarısı görünür. Doğrulama, hata ve onay e-postası akışları korunur.
- Öğrenci ana ekranındaki yinelenen XP, hikâye adı ve soru sayısı açıklamaları azaltıldı; ilerleme çubuğunun erişilebilir açıklaması görev sayısını korur. Web arayüzüne yeni mobil yönlendirme eklenmedi.
- `python3 scripts/package-android-candidate.py test-artifacts/android` paket sürümünü, web varlıklarını ve güvenlik bayraklarını doğrular. Test APK'sı üretim imzası, gerçek cihaz veya ticari yayın kabulü değildir.

## 1.0.35 — Kısa Android ana ekranı

- Android sürümü 36 / 1.0.35; mevcut uygulama kimliği korunur. Tek devam kartı, Test çöz ve Konu öğren kısa yolları ana ekranda görünür. Tam parkur, hikâyeler ve koleksiyon Macera haritası ile açılır; Android geri tuşu kısa ana ekrana döner.
- 320×568, 360×640, 390×844 ve 820×1180 boyutlarında kaydırmadan yerleşim ve alt menü üstünde dokunulabilir düğmeler kontrol edilir. Kaydetme hataları görünür kalır; büyük metin veya uzun adlarda içerik kesilmeden kaydırılabilir.
- `python3 scripts/package-android-candidate.py test-artifacts/android` derlenen AAB/APK sürümünü, güvenlik bayraklarını ve web varlıklarını doğrular. Paketleyici, doğrulayıcı ve çevrimdışı imzalayıcı 36 / 1.0.35 kimliğini bekler.
- Test APK'sı debug imzalıdır; Play üretim imzası, gerçek cihaz veya ticari yayın kabulü değildir. Önceki test APK'sıyla imza eşleşmesi ayrıca kontrol edilir.

## 1.0.34 — Üretim imzası ve Play kabul kanıtı

- Android sürümü 35 / 1.0.34 (`mobile/android/play-billing.gradle`); uygulama kimliği ve mevcut yükleme anahtarı korunur.
- `python3 scripts/package-android-candidate.py test-artifacts/android` derlenmiş AAB/APK'dan sürüm kimliğini (35 / 1.0.34), SDK düzeylerini ve debug/test/cleartext/backup bayraklarını doğrular. Kimlik kaynakta sabitlendiği için sürüm artırmak betiği ve bu notu birlikte güncellemeyi gerektirir.
- `scripts/sign-android-release.py` doğrulanmış CI adayını yerel üretim anahtarıyla imzalar ve `bilsem-android-signing-v1` biçiminde, kişisel veri içermeyen bir doğrulama kaydı üretir.
- Bu kayıt Play Console yüklemesi, mağaza incelemesi veya ticari yayın kabulü yerine geçmez. Dahili testte doğrulanmış son yapı 1.0.33 / kod 34'tür.
- Gerçek cihaz kurulumu, dört satın alma akışı ve Play beyanları operatör tarafından ayrıca yürütülür; kapanış kapısı bunları `android.device-tests` ve `android.play-listing` olarak izler.

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

