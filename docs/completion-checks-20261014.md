> Ödeme bölümleri tarihsel kayıttır. Güncel sistem yalnızca Google Play kullanır; [güncel kurulum](GOOGLE_PLAY_BILLING.md).

# Türkçe uygulama: tamamlanan teknik akışlar ve gerçek kabul kontrolleri

## Hesap silme

Hesap sahibi mevcut Hesabım ve Verilerim bölümünden talep oluşturur. MFA doğrulanmış yönetici, Bildirimler bölümünde silme kapsamını yükler; saklama incelemesini ve hesap sayısını ayrı onaylar. API, aile bağlarını veritabanında yeniden doğrular. Farklı aileler, yönetici hesapları veya değişmiş kapsam silinmez.

Silme hazırlığı kapsamı bir iş kaydına sabitler, uygulama erişimini kapatır ve aile oturumlarını iptal eder. Resmî Supabase Admin API hesapları siler; bağlı profil, ilerleme ve çalışma kayıtları foreign key cascade ile kaldırılır. Kesinti yaşanırsa aynı talep aynı kapsamla tekrar denenir. Auth hesaplarının hepsi kaldırılmadan talep çözüldü işaretlenmez. Tamamlanan kayıtta hesap UUID listesi ve diğer kişisel destek/güvenlik kayıtları temizlenir; kimlik içermeyen işlem fişi kalır.

Ödeme kaydı veya Storage dosyası bulunan aileler otomatik işleme alınmaz. Bu kaynaklar için saklama/kaldırma prosedürü ayrıca incelenmelidir. Üretim kullanıcısı bu geliştirme sırasında silinmedi. Yedeklerden veri kaldırma ve yedek ömrü, gerçek işletmeci politikasıyla belirlenmelidir.

## Türkçe tarayıcı senaryosu

`npm run test:turkish-accounts` gerçek Türkçe bileşenleri izole Auth/API verileriyle sınar: üç adımlı kayıt, sınıf ve onaylar, e-posta yeniden isteme, doğrulanmamış veli reddi, doğrulanmış giriş, veri indirme, talep geçmişi hatası/yeniden deneme, öğrenciye geçiş/veliye dönüş, yönetici silme onayı ve kesinti sonrası tekrar.

Fixture bileşenleri yalnızca geliştirme testi içindir; üretim paketine eklenmez. Bu senaryo gerçek e-posta teslimi veya gerçek aile pilotu yerine kabul edilmez. Postgres testleri gerçek veritabanı motorunda silme yetkilerini ve aile izolasyonunu ayrıca sınar.

## Yedek ve geri dönüş

Eski varsayılan CLI dökümüne ek olarak v2 arşiv Auth verilerini açıkça içerir. Oturum, refresh token, geçici doğrulama ve flow state verileri yeniden canlandırılmaz. Yönetilen Auth şema sürüm kayıtları ve instance yapılandırması hedef ortamdan korunur. Auth kullanıcı ve kimlik tablolarının COPY dökümü arşiv oluşturulmadan kontrol edilir. Her dosyanın SHA-256 özeti şifreli arşivin içindedir; AES-GCM bütünlüğü ve dosya özetleri çözümden önce doğrulanır.

`npm run restore:database -- /özel/yedek.enc` yalnızca boş ve yerel izole Supabase hedefini kabul eder. `RESTORE_DATABASE_URL` ve `BACKUP_ENCRYPTION_KEY` güvenli ortamdan sağlanır; üretim/uzak hedefler reddedilir. Kaynak ve hedef Auth şema sürümleri uyumlu olmalıdır. Target varsayılan tablo yetkileri önce kapatılır; roller, uygulama şeması, Auth verileri ve uygulama verileri tek transaction içinde yüklenir. Auth/profil ve aile bağları doğrulanmadan başarı verilmez. Storage nesnelerinin dosya içeriği ayrıca yedeklenmelidir.

Şifreli örnek arşivin izole PostgreSQL'e geri dönüş testi mevcuttur. Gerçek üretim yedeğinin geri dönüşü yapılmadı. Dökümler ayrı alınır; canlı yazı sırasında bütünlük için uygun bakım penceresi veya tutarlı snapshot prosedürü gereklidir. Saklama/silme politikası olmadan yedeklerde kişisel verinin ne kadar süre tutulacağı beyan edilmez.

## İzleme ve yük

15 dakikalık mevcut sağlık işi artık her yol için başarı/hata ve süre raporu üretir; GitHub iş özetine ve 7 günlük JSON artifact'e kaydeder. Sağlıksız veritabanı veya koruma sayfası başarılı sayılmaz. Hata çıktısında müşteri verisi veya credential bulunmaz. GitHub bildirimlerinin işletmeciye ulaştığı gerçek alarm denemesi ayrıca gerekir.

`npm run test:load`: yalnızca yerel API erişim korumalarında 10 eşzamanlı, toplam 60 isteklik bütçeli testtir. Gerçek oturumlu öğrenci trafiğinin yük testi değildir; üretime yük göndermez.

## Eğitmen incelemesi

Yönetici Bildirimler bölümünde her sınıfın yayımlanan, bireysel inceleme kaydı bulunan ve bekleyen soruları ile ilk aday kimlikleri görünür. Cevap belgeleri bu özet API'sinden gönderilmez. Otomatik denetim ve eğitmen incelemesi ayrı sayılır. Gerçek inceleme yapılmadan 4.000 sorunun insan tarafından değerlendirildiği işaretlenmez.

## Kalan dış girdiler

Gerçek satıcı adı/açık adres, işletmecinin veri işleme/saklama/aktarım açıklamaları, iki Shopier ürünü ve güvenli sunucu anahtarı hâlâ gereklidir. Gerçek Türkçe e-posta/kurtarma, aileler arası pilot, üretim yedeği geri dönüşü, cihaz ve alarm kabul kayıtları kanıtsız true yapılmaz. Ücretli satış kapalı kalır.
