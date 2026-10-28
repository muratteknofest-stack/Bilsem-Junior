# Bilsem Junior — 27 Ekim 2026 yayın tamamlama kaydı

Bu kayıt teknik hazırlık ve somut kabul ölçütlerini açıklar. İmzalı sözleşme, vergi tescili, kurum izni veya hukuki uygunluk sertifikası değildir. Kullanıcı, müşteri belgesi, parola ve satın alma tokenı içermez. Ayrıntılı test/kimlik belgeleri özel işletim kaydında tutulmalıdır.

## Uygulanan korumalar

- Üretimde yeni satış anahtarı kapatıldı; yeni aile kaydı da kapatıldı. Mevcut hesaplar, doğrulama/geri yükleme ve abonelik bildirimleri ayrı çalışır.
- Marka ile yasal işletmeci ayrıldı. Tam kimlik ve açık adres doğrulanmadığı için canlı alanda işletmeci adı/adresi tamamlanmış gösterilmiyor.
- Sunucunun eksik hukuki dayanak, saklama ve aktarım alanlarını otomatik metinle doldurması kaldırıldı.
- Yeni kayıt için işletmeci kimliği/adres/iş telefonu/e-posta, amaç ve dayanaklar, saklama/silme ve aktarım açıklamaları ile dört hazırlık kaydı gerekir: kimlik, veri koruma, aktarım, eski anahtar iptali.
- Yeni satış için bunlara ek olarak tüketici metinleri, vergi/uygulanıyorsa çalışma statüsü incelemesi, WAF ve satın alma/geri yükleme/yenileme/iptal-iade kabul kayıtları gerekir. E-posta, gerçek yedek geri yükleme, aile pilotu ve izleme kabulü ayrıca korunur.
- Her yeni kayıt bir onay ve en az 12 karakterlik kanıt referansı gerektirir. Bu yalnızca yönetici beyanının izlenmesini sağlar; metnin doğruluğunu otomatik ispatlamaz. Tarih, ortam ve özel belge/test numarası yazılır; sır veya kişisel müşteri belgesi yazılmaz.
- Eksik hazırlıkla kayıt açma isteği HTTP 422; eski sürümle ayar değiştirme HTTP 409 alır. MFA ve rol denetimi devam eder. Hazırlık eksik olsa da kayıt kapatılabilir.
- İzleme artık hukuki sayfaları, satışın beklenen durumunu ve özel API'lerin anonim erişimi reddetmesini de kontrol eder.

## Tamamlanması gereken gerçek kayıtlar

| Kayıt | Kabul ölçütü | Kanıtı hazırlayan |
| --- | --- | --- |
| İşletmeci | Gerçek kişi veya tüzel kişi, tam posta adresi, iş telefonu, veri iletişim e-postası ve yetkili | İşletmeci |
| Veri koruma | Veli/çocuk veri envanteri, amaç/dayanak, uygulanmış saklama/silme süreci, aydınlatma ve gerekli rıza ayrımı | İşletmeci ve hukuk uzmanı |
| Aktarım | Vercel, Supabase, SMTP ve diğer gerçek alıcılar için uygulanabilir mekanizma; gereken karşılıklı imza ve bildirim kaydı | İşletmeci, sağlayıcı, hukuk uzmanı |
| Tüketici | Dönem, vergiler dahil bedel, otomatik yenileme, kapsam, iptal/iade ve ön bilgilendirmenin gerçek akışta uyumu | İşletmeci ve hukuk uzmanı |
| Vergi/çalışma statüsü | Faaliyete uygulanabilir vergi ve belge düzeni; gerekiyorsa kamu görevi açısından yazılı değerlendirme | SMMM ve yetkili kurum/hukuk birimi |
| Anahtarlar | Tüm gerçek tüketiciler yeni sunucu anahtarında; eski anahtarlar sağlayıcıda devre dışı; yetkiler ve servis sağlığı doğrulandı | Yetkili hesap sahibi ve teknik sorumlu |
| WAF | Dar kapsamlı kural logda incelendi; gerekli uygulama yolları çalışıyor; seçili zararlı yol engelleniyor; geri alma kaydı var | Yetkili Vercel yöneticisi |
| Gerçek cihaz ödeme | Sunucu doğrulaması, kalıcı kayıt, acknowledge ve web/Android erişimi aynı öğrenci için doğru | İzinli test ailesi ve teknik sorumlu |
| Operasyon | Gerçek e-posta teslimi, ayrı ortamda yedek geri yükleme, aile ayrımı, mobil/yük ve alarm teslimi | Teknik sorumlu |
| Play yayını | Console hedef kitle, Veri Güvenliği, hesap silme bağlantısı, abonelik açıklamaları ve ilgili test/yayın uygunluğu | Play hesap sahibi |

## Ödeme kabulünü genel satışı açmadan tamamlama

1. Hukuki/veri koruma ve anahtar güvenliği hazırlığını tamamlayın. Tamamlanmamış kaydı test açmak için onaylamayın.
2. Ayrı Supabase test ortamı ve yetkili Google lisans testçisi kullanın. Üretim kişisel verisini veya üretim sırlarını önizlemeye kopyalamayın. Mevcut dar kapsamlı lisans pilotu tek veli/öğrenciye bağlıdır, en çok 24 saat sürer ve ücretli erişim kesim tarihiyle birlikte çalışmaz; üretim kesim tarihini sırf test için silmeyin.
3. Google satın alma ekranında **test ödeme yöntemini** doğrulayın. Test kanalında bulunmak tek başına gerçek ücret alınmasını önlemez. Ödeme ekranında test yöntemi yoksa satın almayı tamamlamayın.
4. Satın alma: Google durumu → şifreli kalıcı kayıt → acknowledge → seçili öğrencide tam erişim. Başka aile/öğrenciye erişim açılmamalı. Satın alma tokenı ve tam makbuz günlük/rapora eklenmez.
5. Geri yükleme: aynı aileyle uygulamadan çıkış/giriş veya yeniden kurulum sonrası Google kaydı doğrulanır; aynı öğrenciye erişim döner; mükerrer hak oluşmaz.
6. Yenileme: hızlandırılmış lisans testinde yeni bitiş tarihi ve bildirim/yeniden doğrulama görülür. Otomatik birim testi bu kabulün yerine geçmez.
7. İptal: otomatik yenileme kapanır; ödenmiş dönem sonuna kadar erişim doğru kalır. İade/iptal nedeniyle erişim geri alındığında yeniden doğrulama tam erişimi kapatır. Başarısız/bekleyen/askıdaki ödeme tam erişim üretmez.
8. Kanıtlar tarih, uygulama sürümü, test ortamı, maskeli test hesap numarası, beklenen/gerçek sonuç ve güvenli kayıt numarasıyla tutulur. Üretimde gerçek ücretli son kabul gerekiyorsa ödeme hesap sahibi tarafından, belirli tutar ve iade koşulları görülerek tamamlanır.

## Anahtar iptalini tamamlama sırası

1. Vercel üretim/önizleme, GitHub Actions, yerel işletim işleri ve eski dağıtımlar için hangi anahtarın kullanıldığını yalnız metadata ile envanterleyin.
2. Supabase'de eşdeğer yetkili modern sunucu anahtarını güvenli şekilde oluşturun; sırları sohbet veya GitHub'a yazmayın. Tarayıcı üzerinden yeni kimlik bilgisi giriş/oluşturma adımları hesap sahibine aittir.
3. Gerekli tüketicileri güvenli sır alanında güncelleyin, üretimi yeniden dağıtın, giriş/öğrenme/abonelik servislerini doğrulayın.
4. Supabase'de eski anahtarı/legacy API anahtarlarını uygun kapsamda devre dışı bırakın; yalnız yeni anahtar oluşturmak eskisini iptal etmez. JWT imzalama anahtarları ayrı bir geçiştir; karıştırmayın.
5. Sağlayıcıda eski anahtarın devre dışı durumu ve eski anahtarla erişimin reddi güvenli operatör ortamında doğrulanır. Eski sızmış anahtarı sohbet geçmişinden alıp yeniden kullanmayın. Yeni sır değerini kanıt kaydına koymayın.

Google satın alma tokenı şifreleme ve aile bağlama anahtarları bu işlem sırasında rastgele değiştirilmez; mevcut kayıtları kullanılamaz yapabilir.

## WAF ve kurtarma

28 Ekim 2026 tarihli yeniden kontrolde `/.env`, `/.git/config`, `/wp-login.php` ve `/phpmyadmin` yolları 403 ve `x-vercel-mitigated: deny` döndü. Önceki API 404 sonucu, 27 Ekim'deki sonraki panel kurulumu ve canlı doğrulama ile aşılmıştır. Kural yalnız bu tam yolları kapsar; bütün saldırılara karşı kapsamlı koruma iddiası değildir. Ana sayfa, hesap ve yasal belge erişimi ayrıca izlenir.

Günlük şifreli yedek ve 15 dakikalık izleme iş tanımları bulunur. Test verisiyle kripto/geri yükleme testinin geçmesi, üretim yedeğinin gerçekten alındığını ve ayrı Supabase ortamına geri yüklendiğini kanıtlamaz. İlk gerçek yedek, ayrı ortam geri yükleme süresi, Storage içeriği/ayarların kurtarma kapsamı ve alarm teslimi özel kayıtla tamamlanır. Üretimin üzerine test geri yüklemesi yapılmaz.

## Yeniden açma

Yönetici `/admin/giris` → Sistem ayarları bölümünde yalnız doğrulanmış kayıtları tamamlar. Sunucu `release:commercial` raporunda eksikleri göstermelidir. Ürün kataloğu ve gerçek kabul kayıtları tamamlandıktan sonra satış anahtarı kontrollü açılır, üretim dağıtımı ve cihaz testi doğrulanır; izleme beklentisi aynı değişiklikte güncellenir. Kayıt ayrı olarak açılır. Yeni öğrenci kesim tarihi değiştirilmez. Bu değişiklikler sunucudadır; bu tur yeni AAB üretilmedi.

## Resmî kaynaklar

27 Ekim 2026 tarihinde yeniden kontrol edilen kaynaklar:

- [KVKK standart sözleşme duyurusu](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu): bu mekanizma seçilirse geçerli taraf imzaları ve beş iş günü içinde bildirim gereği.
- [Ticaret Bakanlığı mesafeli sözleşme rehberi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme): ön bilgilendirme ve tüketici hakları. Anında sunulan dijital hizmetlerde cayma istisnası somut koşullara göre değerlendirilir; bütün satışlara otomatik aynı sonuç uygulanmaz.
- [Google Play Billing test rehberi](https://developer.android.com/google/play/billing/test): lisans testçileri, test yöntemleri ve gerçek ücret riski.
- [Supabase API anahtarı geçişi](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys): modern anahtar ve legacy devre dışı bırakma ayrı adımlardır.
- [MEB 2 Şubat 2021 kazanç getirici faaliyet yazısı](https://karayazi.meb.gov.tr/meb_iys_dosyalar/2021_02/18095128_ust_yazY.pdf): 657/28 bakımından riskin değerlendirilmesine kaynak; tek başına bu uygulama için verilmiş izin veya yasak kararı değildir.

Vergi istisnası, şirket türü veya kamu görevi uygunluğu bu teknik dosyayla karara bağlanmaz. Gerçek faaliyet ve güncel mevzuat üzerinden yetkili değerlendirme gerekir.
