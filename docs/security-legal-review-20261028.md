# Bilsem Junior güvenlik ve yasal gereklilik incelemesi

Tarih: 28 Ekim 2026 (Türkiye). Kapsam: Türkçe web uygulaması, ortak API ve Android/Capacitor paketi. Başlangıç sürümü: c1e5c2e. Bu kayıt teknik inceleme ve uygulanan iyileştirmelerdir; hukuki uygunluk belgesi veya kapsamlı sızma testi değildir.

## Düzeltilen bulgular

| Bulgu | Etki | Yapılan değişiklik |
|---|---|---|
| Öğrenci günlük planının tek cihaz önbelleğiyle paylaşılması | Aynı cihazda hesap değişince önceki öğrencinin adı ve öğrenme özeti gösterilebiliyordu | Hesap ve sınıfa özel sürümlü önbellek; eski sahibi belirsiz kaydı taşımadan kaldırma; bellek ve kalıcı kayıt için hesap değiştirme testleri |
| Öğrenci desteğinde gereksiz sunucu çağrıları ve devre dışı dış model kodu | Çocuğun yanıtı/adı gibi bilgilerin gereksiz yere API'ye gönderilmesi; ileride yanlışlıkla dış modele yönlendirme riski | İpucu, yanlış açıklaması, adım adım çözüm ve günlük plan cihazda üretiliyor. Eski APK yolları kimlik/rol/limit kontrollerini koruyarak yerel motor yanıtı veriyor. Mevcut Gemini istemcisi zaten kapalıydı; aktif bir dış model sızıntısı tespit edilmedi |
| Google Fonts'a otomatik bağlantı | Kullanıcı açılışında üçüncü tarafa bağlantı/IP bilgisi | Aynı lisanslı fontları yerel paketleme; Türkçe karakter doğrulaması ve OFL lisansları; CSP'den Google font izinlerini çıkarma |
| Eksik işletmeci bilgisi olduğunda KVKK haklarının gizlenmesi | Kullanıcı haklarını göremiyordu | Haklar ve başvuru kanalı her durumda görünür; eksik kimlik/işleme dayanağı/saklama/aktarım uyarısı korunuyor |
| Yanıt süresinin ve yönetici takibinin eksikliği | KVKK başvurusunun gecikmesi riski | En kısa sürede/en geç 30 gün yanıt açıklaması; silme taleplerine son tarih/gecikme göstergesi; yönetici kuyruğunda eski silme taleplerine öncelik. Bu otomatik silme veya otomatik e-posta bildirimi değildir |
| Metin içeriği değiştiğinde yalnız ayar revizyonuyla sürümleme | Eski belge okuma beyanı yeni metinle eşleşebiliyordu | İçerik tarihi + ayar revizyonu; eski belge sürümünde 409 POLICY_UPDATED ve yeniden okuma |
| Aydınlatma ile açık rıza ifadelerinin karışması | Belirsiz kullanıcı beyanı | Okundu bilgisi, kullanım koşulları kabulü ve veli beyanını ayıran dil; açık rıza yerine geçen genel onay iddiası kaldırıldı |

## Kontrol edilen mevcut korumalar

- Supabase canlı metaveri incelemesinde public ve eski şemalardaki tabloların RLS'si açık; anonim SELECT yetkisi yok. Kontrol edilen ayrıcalıklı public fonksiyonlar anon/authenticated rollerinden çağrılamıyor. Politikasız özel tablolara ilişkin INFO bildirimleri tek başına veri açığı sayılmadı. Kişisel öğrenci kayıtları indirilmedi.
- Sağlayıcı denetiminde sızdırılmış parola koruması ayarı için bir uyarı var. Uygulama kayıt/parola değiştirme yollarında sunucu tarafında HIBP k-anonim kontrolü zaten var; tam parola/özet gönderilmiyor. Sağlayıcı düzeyindeki ayarın kapalı olması kalan bir sertleştirme maddesidir.
- Android kaynaklarında Internet/Billing dışında hassas izin eklenmemiş; düz HTTP, yedekleme ve release WebView hata ayıklama kapalı. Test APK'sı debug imzası taşır; Play üretim imzası sayılmaz.
- Başlangıç canlı kontrolü: health 200 ve veritabanı hazır, public registrationOpen=false, membership ready=false. /.env, /.git/config, /wp-login.php ve /phpmyadmin yolları 403. Bu dört yolun engellenmesi tüm saldırıların engellendiği anlamına gelmez.
- Wordwall etkinliği ve uzak blog görselleri hâlâ dış bağlantı oluşturabilir. Yerel font/yardım iyileştirmesi tüm üçüncü taraf aktarımlarını ortadan kaldırmaz.

## İşletmecinin tamamlaması gerekenler

| Öncelik | Somut gereklilik / kanıt | Sorumlu |
|---|---|---|
| Yayın öncesi | Gerçek veri sorumlusu/satıcı unvanı, açık adres ve doğrulanmış iletişim; amaç başına hukuki dayanak, veri kategorileri ve alıcılar | İşletmeci + hukuk danışmanı |
| Yayın öncesi | Kategori bazlı saklama/silme takvimi, kanuni saklama gerekçeleri, yedeklerden silinme yöntemi ve takvimi | İşletmeci + teknik sorumlu |
| Yayın öncesi | Vercel/Supabase/e-posta/Wordwall/görsel sağlayıcılarının sözleşmeleri ve fiilî yurt dışı aktarım mekanizması; uygulanıyorsa standart sözleşme bildirimi | İşletmeci + hukuk danışmanı |
| Yayın öncesi | Vergi, fatura, faaliyet yetkisi ve varsa kamu görevlisi statüsünün değerlendirilmesi; uygulanabilir ETBİS/VERBİS yükümlülüklerinin işletmenin gerçek koşullarıyla belirlenmesi | İşletmeci + mali müşavir/hukuk danışmanı |
| Yayın öncesi | Gerçek fiyat/dönem/yenileme/iptal/geri ödeme ve ön bilgilendirme; kalıcı veri saklayıcısı kanıtı; gerçek satın alma, geri yükleme ve iptal/iade kabul testleri | İşletmeci + ödeme sorumlusu |
| Yayın öncesi | Google Play hedef kitle, Families ve Data safety beyanlarının gerçek veri akışıyla eşleştirilmesi; doğru gizlilik ve webden silme URL'si; üretim imzası/yayın incelemesi | Play Console sahibi |
| Yüksek | Daha önce ifşa edilmiş olabilecek anahtarların iptal/rotasyon kanıtı; sağlayıcı hesaplarında MFA; parola koruması uyarısının kapatılması veya belgelendirilmiş telafi | Teknik sorumlu |
| Yüksek | Güvenlik olayı müdahale planı, erişim kaydı, geri yükleme ve alarmın gerçek kabul testi | İşletmeci + teknik sorumlu |
| Satış öncesi | Barındırma planının ticari kullanım koşullarına uygunluğu; mevcut plan bu incelemede yeniden doğrulanamadı | Hesap sahibi |

Aydınlatma sayfası yazmak veya bir kutuyu işaretletmek bu belgeleri oluşturmaz. Eksik ticari/kurumsal kanıtlar onaylanmadı; kayıt ve satış kapıları kapalı kalır. Destek e-postalarının ilk teslim tarihiyle ayrıca takip edilmesi gerekir; yönetici ekranındaki gösterge genel bir başvuru yönetim sistemi değildir. Hesap silme aboneliği kendiliğinden iptal etmez. AB/ABD gibi ek pazarlara yönelik yayın öncesi hedef ülke ve yaş grubuna özgü yükümlülükler ayrıca değerlendirilmelidir.

## Doğrulama

- Yerel `npm run check`: TypeScript, 610 test ve web/sunucu derlemesi başarılı.
- Derlenmiş sunucu: 37 HTTP güvenlik kontrolü başarılı.
- OSV: 532 benzersiz npm paket/sürüm çiftinde bilinen açık bulunmadı.
- Android aday arşiv bütünlüğü için üç Python testi başarılı.
- Hesap değişimi, sınıf değişimi, yeniden açma, eski/bozuk/yanlış sahipli önbellek; ağ yasakken yerel öğrenci desteği; artık gün ve ay sınırlarında yanıt süresi; eksik işletmeciyle hakların görünmesi; eski içerik sürümünde kayıt reddi test edildi.
- CI/tarayıcı, üretim ve yeni Android paketinin kesin sonuçları sürüm teslim kaydında belirtilir. Yerel test başarısı canlı yayın başarısı değildir.

## Resmî kaynaklar (28 Ekim 2026)

- [KVKK Kanunu, özellikle 10–13. maddeler](https://www.aile.gov.tr/kvkk/mevzuat/): aydınlatma, haklar, güvenlik ve başvurulara yanıt.
- [KVKK 2026/347 ilkesi](https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu): aydınlatma ve açık rızanın ayrı ele alınması.
- [Standart sözleşme bildirim modülü](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu): bu mekanizma seçildiğinde imzadan itibaren beş iş günü içinde bildirim.
- [KVKK veri ihlali bildirimi](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi): olay planında Kurula 72 saatlik bildirim ve ilgili kişilere bildirim değerlendirmesi.
- [Ticaret Bakanlığı mesafeli sözleşmeler](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme) ve [abonelikler](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/abonelik-sozlesmeleri-hakkinda-bilgilendirme): hizmet modeline uygun ön bilgilendirme ve tüketici hakları.
- [Google Play hesap silme](https://support.google.com/googleplay/android-developer/answer/13327111), [Families](https://support.google.com/googleplay/android-developer/answer/9893335) ve [Data safety](https://support.google.com/googleplay/android-developer/answer/11043825): mağaza yükümlülükleri; bunlar kanunun yerine geçmez.
- [Vercel Hobby koşulları](https://vercel.com/docs/plans/hobby): kişisel ve ticari olmayan kullanım.
- [Supabase parola güvenliği](https://supabase.com/docs/guides/auth/password-security): sağlayıcı düzeyinde ek koruma.
