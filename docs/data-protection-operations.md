# Bilsem Junior veri koruma işletim kaydı

28 Ekim 2026. Kapsam: Türkçe web, ortak API ve mevcut Android istemcisi. Bu dosya teknik veri envanteri ve uygulanacak işletim adımlarını içerir. İşletmeci tarafından onaylanmış saklama politikası, imzalanmış aktarım sözleşmesi veya kurum izni değildir.

## Uygulanan ek düzeltmeler

- Hesap verilerini indirme işlemi artık ilgili veli/öğrencinin destek taleplerini de içerir. Aile kapsamı karşılıklı profil bağlantılarıyla belirlenir. Başka aileden bir talep dönüşe karışırsa işlem durur. Talep durumu ve gönderilen özet alınır; iç yönetici notları, inceleyici kimliği ve sorunun cevap anahtarı dışarı verilmez. Tüm KVKK başvurularının yalnız bu dosyayla karşılandığı iddia edilmez.
- Şifreli yedeklerin mevcut iş akışındaki 30 günlük teknik saklama sınırı geri yükleme aracına da uygulanır. Yeni yedekler bitiş tarihini taşır. Eski v2 yedeklerde aynı sınır oluşturulma tarihinden hesaplanır. Süresi dolmuş, geleceğe tarihli veya bitiş tarihi uzatılmış arşivler veritabanı bağlantısından önce reddedilir. Bu sınır, asıl kullanıcı kayıtlarının hukuki saklama süresi değildir.
- İzleme işi artık altı yasal belgenin gerçek başlığını, erişilebilirliğini ve `no-store` davranışını denetler. Hesap silme URL'sinin boş uygulama sayfasına dönüşmesi de hata sayılır. Yeni kayıt veya satışın beklenmedik açılması başarısızlık olarak raporlanır. Bu teknik denetim, bir başvuruya verilen gerçek yanıtın teslim edildiğini doğrulamaz.

## Teknik veri envanteri

Hukuki dayanak ve ana kayıt saklama süreleri, gerçek işletmeci tarafından faaliyet ve zorunluluklarla eşleştirilmelidir; boş alanlar tahmini metinle doldurulmaz.

| Kategori | Teknik kaynak / alıcı | Amaç ve mevcut davranış | Kesinleştirilecek kayıt |
|---|---|---|---|
| Veli iletişimi, öğrenci takma adı/sınıfı, aile bağı | Supabase Auth ve `profiles` | Hesap, doğrulama, veli yetkisi ve sınıfa uygun çalışma | Amaç başına dayanak; hesap kapanışı sonrası süre; veri sorumlusu |
| Yanıtlar ve öğrenme ilerlemesi | Supabase öğrenme/ilerleme tabloları; cihaz depolaması | Çalışmanın sürdürülmesi, raporlar ve kazanımlar | Ana kayıt ve cihaz önbelleği süreleri; talepte uygulanacak silme kapsamı |
| Destek ve veri talepleri | `support_requests`; gerçek destek e-posta hizmeti | Başvuru, inceleme, sonuç ve yanıtın takibi | İlk alınma tarihi; yetki doğrulaması; yanıt ve teslim kanıtı; kapatılan talebin süresi |
| Oturumlar ve güvenlik olayları | Supabase Auth; sunucu ve sağlayıcı günlükleri | Kimlik doğrulama ve kötüye kullanım denetimi | Günlük kategorileri, erişebilen roller, süre ve olay saklama gerekçesi |
| Satın alma ve abonelik | Google Play; şifreli sunucu kayıtları | Üyelik doğrulama, geri yükleme, iptal/iade incelemesi | Vergi/tüketici mevzuatına göre gerçek süre; muhasebe ve ödeme alıcıları |
| Şifreli uygulama/Auth yedeği | Yapılandırılmışsa özel GitHub Actions arşivi | Kurtarma; oturumlar ve Storage dosyaları bu arşive dahil değil | İş akışında 30 gün; yerel kopyaların temizlenmesi; GitHub aktarımı ve anahtar sorumlusu |
| Sağlayıcı yedekleri ve Storage | Supabase / ilgili hizmet planı | Yönetilen kurtarma ve varsa yüklenmiş dosyalar | Gerçek planın kapsamı, ülke/erişim, otomatik sona erme ve silme takvimi |
| Barındırma ve e-posta | Vercel, Supabase Auth, yapılandırılmış SMTP | Web/API hizmeti, bağlantı bilgileri ve hesap mesajları | Gerçek sözleşme tarafı, ticari plan, alt işleyenler, ülkeler ve aktarım mekanizması |
| Gömülü etkinlik ve uzak fotoğraf | Açıldığında Wordwall; blog görsellerinde Pexels | Dış içerik; IP/tarayıcı bilgisi sağlayıcıya iletilebilir | İşleme/aktarım dayanağı ve ilgili sağlayıcının saklama kapsamı |
| Sızdırılmış parola kontrolü | HIBP k-anonim uç noktası | Sunucu yalnız özetin beş karakterlik önekini iletir | Hizmet ve aktarım envanteri; sağlayıcı düzeyindeki ek koruma ayarı |

Yerel öğrenci yardımı ve yazı tipleri üçüncü taraf model/font sunucusuna istek göndermez. Bu, Vercel/Supabase veya yukarıdaki diğer alıcılara aktarım olmadığı anlamına gelmez.

## Başvuru ve silme işlemi

1. Uygulama veya e-postadan gelen başvurunun ilk teslim zamanını kaydedin; sonradan kuyruğa aktarmak süreyi yeniden başlatmaz. Genel destek sorusuyla KVKK başvurusunu ayırın.
2. Başvuru sahibinin hesap ve aile yetkisini ölçülü biçimde doğrulayın. İlk mesajda parola, oturum belirteci, kimlik fotoğrafı veya gereksiz çocuk verisi istemeyin.
3. Kapsamı öğrenme verileri, iletişim, destek, satın alma, Storage ve yedekler bakımından inceleyin. Silme bekleyen ailelerin oturum engeli ve sabitlenmiş üye kapsamını atlamayın.
4. Talebi niteliğine göre en kısa sürede ve en geç 30 gün içinde gerekçeli sonuçlandırın. Kabul/ret, yapılan işlem, saklanan kategoriler ve gerekçe/süreyi yazılı veya elektronik yolla iletin. Yalnız panelde durum değiştirmek yanıtı teslim etmek değildir. Yanıtın ve gönderim/teslim kaydının güvenli referansını saklayın.
5. Ödeme veya dosya kaydı nedeniyle duran silmeyi yalnız işaret değiştirerek tamamlamayın. Asgari gerekli kanuni saklamayı belirleyin ve kalan verinin kaldırılmasını uygulayın. Uygulamayı kaldırmak Google Play aboneliğini iptal etmez.
6. Yedeklerdeki silinmiş veriler olağan kullanım için açılmaz. Geri yükleme yalnız izole ortamda yapılır; yedek tarihinden sonra gelen silme/düzeltme talepleriyle mutabakat yapılmadan eski veri yeniden hizmete sunulmaz. Şifreli yerel kopyaların süresi dolunca kaldırılması teknik sorumlunun işidir.

## Güvenlik olayı işletimi

- Öğrenme anını, olay sorumlusunu, etkilenen sistemleri ve ilk bulguları kaydedin. Çocuk verisini, anahtarı veya tam satın alma tokenını hata kaydına kopyalamayın.
- Erişimi daraltın ve günlükleri koruyun. Anahtar geçişinde önce tüketicileri yeni anahtarda doğrulayın, ardından eski anahtarı sağlayıcıda iptal edin. Satın alma şifreleme anahtarını bu amaçla rastgele değiştirmeyin.
- Kişisel veri ihlali öğrenildiğinde gecikmeksizin, en geç 72 saatte Kurula bildirim yükümlülüğünü ve etkilenen kişilerin en kısa sürede bilgilendirilmesini işletmeci yürütür. Bilgiler eksikse ilgili usule göre aşamalı bildirim değerlendirilir; inceleme sürüyor diye süre göz ardı edilmez.
- İzole kurtarma ve veri bütünlüğünü doğrulayın; silinmiş hesapların eski yedekten geri gelmesini kontrol edin. Olay ancak etki, giderim, bildirim ve tekrarını önleyici adımlar kaydedildikten sonra kapatılır.

Bu çalışma herhangi bir kişiye/kuruma bildirim göndermedi veya sözleşme imzalamadı. Olay ve başvuru görevlerinin gerçek sorumluları işletmeci tarafından atanmalıdır.

## Yedekleme için hesap sahibinin tamamlayacağı iki alan

28 Ekim 2026 tarihli gerçek `Encrypted database backup` çalışması başarısızdır: `production-backup` ortamında `SUPABASE_DB_URL` ve `BACKUP_ENCRYPTION_KEY` boş gelmiştir. Bu nedenle üretim yedeği alındığı veya gerçek geri yükleme yapıldığı söylenemez. Yeni ön kontrol eksik alanların adlarını değerlerini göstermeden raporlar. Bağlantının başka projeye veya URL parametresiyle başka sunucuya yönlendirilmesi de engellenir.

1. [GitHub ortam ayarlarında](https://github.com/muratteknofest-stack/Bilsem-Junior/settings/environments) `production-backup` ortamını açın. Supabase'de ilgili projenin Connect bölümündeki veritabanı bağlantısını `SUPABASE_DB_URL` ortam sırrı olarak girin. Doğrudan veritabanı adresine erişilemiyorsa IPv4 session pooler ve 5432 seçilir; transaction pooler 6543 yedekleme hedefi olarak kabul edilmez. URI parola alanını URL kurallarına uygun kodlayın.
2. `BACKUP_ENCRYPTION_KEY` için kriptografik olarak rastgele 32 baytın Base64 karşılığını ayrı ortam sırrı olarak girin. Anahtar yalnız güvenli parola/anahtar kasasında yedeklenmelidir. Sohbete, kaynak koduna, rapora veya ekran görüntüsüne yazmayın. Daha önce kullanılan bir yedek anahtarı varsa onu rastgele değiştirmeyin; eski arşivler o anahtara bağlıdır.
3. [Yedekleme işini](https://github.com/muratteknofest-stack/Bilsem-Junior/actions/workflows/backup.yml) ana dalda elle çalıştırın. Başarıyı ve yalnız şifreli arşiv oluştuğunu doğrulayın. Sonra ayrı yerel Supabase ortamında geri yükleme, silme talepleriyle mutabakat ve süre ölçümü yapın. Başarılı dosya üretimi tek başına geri yükleme kabulü değildir.

Gerçek veritabanı bağlantısı ve ayrı kasada saklanan yedek anahtarı sağlanmadığı için bu alanlar boş kalır. Bu tur gerçek parola veya anahtar oluşturulmadı ve mevcut anahtar değiştirilmedi. Yönetici erişiminin bulunması, bu iki değerin bilindiği veya yedeğin çalıştığı anlamına gelmez.

## Dal koruması ve yedekleme alt süreçleri

28 Ekim 2026 tarihinde GitHub API ile `main` dalı koruması etkinleştirildi ve ayrıca dal metaverisinde doğrulandı. Birleştirme için pull request, güncel dal ve GitHub Actions uygulamasından gelen `quality` ve `android` kontrolleri gerekir. Kurallar yöneticilere de uygulanır; zorla yazma ve dal silme kapalıdır, açık inceleme konuşmaları çözülmelidir. Tek kişilik depoda kişinin kendi onayını vermesini gerektirmemek için zorunlu onay sayısı sıfırdır. `production-backup` ortamı yalnız `main` dalına açıktır.

Yedekleme ve geri yükleme araçları artık devralınan `PG*` değişkenlerini alt süreçlerden temizler. Özellikle `PGHOSTADDR`, URL veya `PGHOST` doğrulansa bile gerçek ağ hedefini değiştirebildiğinden, yalnız URL kontrolü yeterli değildi. Geri yükleme ön kontrolü ve uygulaması yalnız doğrulanmış yerel bağlantı alanlarını alır. Şifreleme anahtarı ve gereksiz yedek/geri yükleme URL değişkenleri `npx`/`psql` ortamına geçirilmez. Döküm aracının ihtiyacı olan bağlantı hâlâ doğrulanmış komut satırı parametresidir; süreç listelerine erişim güvenilir işletim ortamıyla sınırlandırılmalıdır.

İki regresyon testi gerçek giriş betiklerini sahte `npx`/`psql` ile çalıştırır, yönlendirme ayarlarının ve arşiv anahtarının alt süreçlere ulaşmadığını doğrular. Testler üretim verisine veya gerçek veritabanına bağlanmaz; gerçek yedek/izole geri yükleme kabulünün yerine geçmez.

Kaynak: [PostgreSQL bağlantıda host/hostaddr davranışı](https://www.postgresql.org/docs/current/libpq-connect.html) ve [libpq ortam değişkenleri](https://www.postgresql.org/docs/current/libpq-envars.html).

## Kapanışı bekleyen somut işler

| İş | Tamamlanma kanıtı |
|---|---|
| İşletmeci, vergi ve varsa kamu görevi uygunluğu | Gerçek unvan/adres/iletişim; yetkili kurum ve mali/hukuki değerlendirme |
| Amaç/dayanak ve saklama takvimi | Her kategori için onaylı süre, başlangıç olayı, silme yöntemi ve istisna; teknik süreçle eşleşme |
| Yurt dışı aktarım | Vercel, Supabase, SMTP, GitHub ve diğer gerçek alıcılar için uygun mekanizma; gerekiyorsa taraf imzaları ve standart sözleşme bildirimi |
| Anahtar ve hesap güvenliği | Eski anahtarın iptal kanıtı, MFA, sağlayıcı parola koruması ve dar yetkiler |
| Gerçek işletim kabulü | Üretim yedeğinin izole geri yüklenmesi; gerçek e-posta/yanıt ve alarm teslimi; gerçek cihaz ödeme kabulü |
| Mağaza/ticari yayın | Play beyanları ve imzası; ticari barındırma planı; tüketici ön bilgileri ve satın alma koşulları |

Kayıt ve satışın kapalı tutulması bu işlemleri yapılmış saydırmaz; tamamlanmış gibi işaretlenmemelidir.

## Resmî kaynaklar

- [KVKK başvuru yanıtının bildirim usulü](https://www.kvkk.gov.tr/Icerik/9024/ilgili-kisilerin-basvurularina-verilecek-cevabin-bildirim-usulune-iliskin-kamuoyu-duyurusu)
- [KVKK ihlal bildirimi](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi)
- [KVKK standart sözleşmeler](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu)

- [Supabase veritabanı bağlantı yöntemleri](https://supabase.com/docs/guides/database/connecting-to-postgres)
