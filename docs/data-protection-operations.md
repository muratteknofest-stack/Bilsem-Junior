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
| Şifreli uygulama/Auth yedeği | Yapılandırılmışsa GitHub Actions şifreli arşivi | Kurtarma; oturumlar ve Storage dosyaları bu arşive dahil değil | Public depoda şifreli dosya indirilebilir; anahtar yalnız özel ortam sırrıdır. İş akışında 30 gün; anahtar kurtarma sorumlusu ve aktarım koşulları |
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

## Yedekleme kurulumu ve doğrulaması

İlk günlük çalışma eksik ayarlar nedeniyle başarısızdı. Yeni yol gerçek veritabanı parolasını bilmeden çalışabilir: `SUPABASE_ACCESS_TOKEN` ile yalnız sabit projenin birincil pooler bilgisi alınır; her döküm öncesinde Supabase'in süreli `cli_login_postgres` oturumu oluşturulur. Standart döküm filtreleri `SET ROLE postgres` kullandığından sağlayıcının salt okunur kimliği bu işlem için yeterli değildir; gerçek libpq bağlantısına sabit `default_transaction_read_only=on` iletilir. Bu ayar bir rol yetkisi sınırı değildir; kısa ömürlü kimliğin yetkileri `postgres` düzeyindedir ve yalnız incelenmiş döküm komutları çalıştırılır. Projenin `postgres` parolası sıfırlanmaz. Token modu tercih edilir; eski `SUPABASE_DB_URL` yolu da desteklenir.

1. [GitHub ortam ayarlarında](https://github.com/muratteknofest-stack/Bilsem-Junior/settings/environments) yalnız main dalına açık `production-backup` ortamını kullanın. `SUPABASE_ACCESS_TOKEN` için bu projeye sınırlı, gerekli veritabanı/bağlantı okuma ve CLI oturumu oluşturma yetkili Supabase tokenı kullanın. Kullanılan API deneysel olduğundan reddi veya biçim değişimi işlemi durdurur; başka sunucuya veya normal veritabanı parolasına sessiz geçiş yapılmaz. Alternatif olarak doğru proje/5432 session bağlantısı `SUPABASE_DB_URL` olabilir.
2. `BACKUP_ENCRYPTION_KEY`, kriptografik rastgele 32 baytın Base64 karşılığıdır. Yeni anahtar yalnız alan boşsa oluşturulur; mevcut anahtarın üzerine rastgele yazılmaz. GitHub ortam sırrını ve ayrı güvenli kasadaki kurtarma kopyasını koruyun. Anahtar kaybında eski arşivler açılamaz. Hiçbir anahtar sohbet, kaynak kodu, rapor, günlük veya artifact'a açık biçimde eklenmez. Erişim tokenı süresi dolmadan/iptal edilmeden yeni sınırlı tokenı güvenli alanda değiştirin.
3. [Yedekleme işi](https://github.com/muratteknofest-stack/Bilsem-Junior/actions/workflows/backup.yml), PostgreSQL 17 araçlarıyla `verify-full` ve sistem kök sertifikalarını doğrudan libpq'ya iletir. Genel veri dosyası Auth/Storage dahil yönetilen şemaları dışlar. Auth ayrı alınır; oturum/yenileme tokenı satırları arşivin tüm SQL dosyalarında ayrıca reddedilir. Geri yükleme önce boş, geçici yerel Supabase'de Auth/profil/aile bütünlüğünü doğrular; üretime geri yükleme yapmaz. Geçici ortam/SQL dosyaları temizlenir.
4. İş başarısı, şifreli artifact ve `backup-restore-verification.json` içindeki `verified:true` birlikte doğrulanmalıdır. Public deponun artifact'ı diğer okuyucularca indirilebilir: burada yalnız güçlü anahtarla şifrelenmiş arşiv ve kişisel veri içermeyen doğrulama durumu saklanır. Açık SQL, parola ve anahtar yüklenmez. 30 gün platform saklaması, başkasının indirdiği şifreli kopyaları uzaktan sileceği anlamına gelmez. Storage nesneleri, silme talepleriyle kurtarma mutabakatı ve gerçek e-posta giriş pilotu ayrı kabul işleridir.

Bu dosyanın varlığı, ortam ayarlarının kaydedildiğini veya gerçek yedek/geri yükleme çalışmasının başarılı olduğunu tek başına kanıtlamaz. Gerçek çalışmanın bağlantısı ve sonucu teslim raporunda tutulur.

## Dal koruması ve yedekleme alt süreçleri

28 Ekim 2026 tarihinde GitHub API ile `main` dalı koruması etkinleştirildi ve ayrıca dal metaverisinde doğrulandı. Birleştirme için pull request, güncel dal ve GitHub Actions uygulamasından gelen `quality` ve `android` kontrolleri gerekir. Kurallar yöneticilere de uygulanır; zorla yazma ve dal silme kapalıdır, açık inceleme konuşmaları çözülmelidir. Tek kişilik depoda kişinin kendi onayını vermesini gerektirmemek için zorunlu onay sayısı sıfırdır. `production-backup` ortamı yalnız `main` dalına açıktır.

Yedekleme ve geri yükleme araçları devralınan `PG*` değişkenlerini alt süreçlerden temizler. Özellikle `PGHOSTADDR`, URL veya `PGHOST` doğrulansa bile gerçek ağ hedefini değiştirebildiğinden, yalnız URL kontrolü yeterli değildi. Geri yükleme ön kontrolü ve uygulaması yalnız doğrulanmış yerel bağlantı alanlarını alır. Arşiv anahtarı, Supabase yönetim tokenı ve gereksiz bağlantı URL'leri `npx`/`pg_dump`/`psql` ortamına geçirilmez. Doğrulanmış döküm parolası yalnız PostgreSQL alt sürecinin ortamındadır; komut satırında bulunmaz. Süreç ortamlarına erişim güvenilir işletim ortamıyla sınırlandırılmalıdır.

Regresyon testleri gerçek giriş betiklerini sahte PostgreSQL araçlarıyla çalıştırır; yönlendirme ayarları, anahtarların ayrılması, TLS'nin gerçek alt sürece ulaşması, süreli erişimin proje hedefi ve Auth oturum satırlarının dışlanmasını doğrular. Bu testler üretim verisine bağlanmaz; gerçek iş akışındaki izole geri yükleme kabulü ayrıca doğrulanmalıdır. Standart Supabase SQL filtrelerinin incelenmiş kopyası lisansı ve SHA-256 kaydıyla kaynakta tutulur.

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
