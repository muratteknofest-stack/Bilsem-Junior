# Bilsem Junior üretim kabul ve işletim rehberi

## Yayın hedefi ve kayıt kapısı

Hedef `https://bilsemjunior.vercel.app`, Supabase projesi `vtcsoqohkiagbwatlabk`.
21 Ekim 2026 eşleştirme ve arşiv kaydı: [proje geçişi](project-alignment-20261021.md).
Yönetici girişi `/admin/giris`. Yönetici TOTP kurulumu veya doğrulaması tamamlanmadan panel yüklenmez; API ve soru bankası politikaları AAL2 ister.
Kayıt durumu `/api/public/platform` ile kontrol edilir. Mevcut hesapların giriş ve çalışma erişimi kayıt kapısından etkilenmez.

Yeni aile kaydı için `release.registrationEnabled` yanında tam işletmeci bilgileri, veri koruma/aktarım ve eski anahtar iptali kayıtları da gerekir. Her kabul kaydı hem yönetici onayı hem de en az 12 karakterlik güvenli kanıt referansı ister. Eksik hazırlıkla kayıt açmaya çalışan yönetici isteği HTTP 422 alır; kapatma her zaman mümkündür. Bunlar yönetici beyanıdır, bağımsız uygunluk denetimi değildir. Kayıt açmak testleri yapılmış olarak işaretlemez. E-posta doğrulama, güçlü şifre, istek sınırı, güncel metin onayı ve aileler arası yetki kontrolleri kayıt açıkken de uygulanır. Ayarlar okunamazsa kayıt açılmaz.

Sistem ayarları Supabase'de sunucuya özel `platform_settings` tablosunda saklanır. Eşzamanlı yönetici değişiklikleri sürüm kontrolüyle reddedilir. Yeni denemeler kaydedilen soru sayısı ve süreyi kullanır; eski oturumların süreleri değiştirilmez.

İşletmeci unvanı, adres, iletişim, amaç/hukuki dayanak, saklama ve aktarım açıklamalarını doğru bilgilerle doldurun. Gizlilik, koşullar ve iletişim sayfaları bunları sunucudan okur. Hukuki açıklamalar uzman incelemesinden geçirilmelidir. Kayıt onayı metin sürümüne bağlanır; metin değişirse eski sürümle yeni kayıt kabul edilmez.

## Türkçe e-postalar ve SMTP

Kayıt ekranı veli bilgileri, öğrenci bilgileri ve onay olmak üzere üç adımdır. Başarılı kayıttan sonra öğrenci kodu ve doğrulama yönergeleri gösterilir. İki profil tek veritabanı yazımıyla oluşturulur; kayıt yarıda kalırsa yalnızca yeni oluşturulan Auth hesapları temizlenir. Profil kaydı tamamlandıktan sonra e-posta gönderimi başarısız olursa hesaplar silinmez: `verificationSent: false` döner ve kullanıcı doğrulama ekranından yeniden gönderim ister. Öğrenci denemesi genel giriş ekranından kaldırılmıştır.

`POST /api/auth/resend-confirmation` yalnızca veli e-postası alır; uygulama ve sağlayıcı istek sınırları uygulanır. Hesabın bulunup bulunmadığını açıklamayan bir yanıt verir. E-posta doğrulanmadan öğrenci hesabı etkinleşmez; veli doğrulama sonrası veli paneline giriş yapmalıdır. E-posta gönderim isteğinin kabul edilmesi, gelen kutusuna teslim edildiğinin kanıtı değildir; kabul testi gerçek teslimatı da doğrulamalıdır.

`supabase/templates` altındaki altı şablonun içerik ve konuları `subjects.json` içinde sürümlenir. Hosted Supabase dashboard > Authentication > Emails bölümünde aynı projeye uygulanmalıdır. Yerel config veya dosya değişikliği hosted ayarı kendiliğinden değiştirmez.

Auth Site URL `https://bilsemjunior.vercel.app` olmalı; Redirect URLs listesinde `https://bilsemjunior.vercel.app/reset-password` bulunmalıdır. Üretim SMTP sağlayıcısında gönderen kimliği, SPF/DKIM/DMARC ve teslimat kontrolü yapılmalıdır. Parola kurtarma e-postalarında link izleme kapatılmalıdır. Varsayılan Supabase SMTP'nin üretim kapasitesi varsayılmamalıdır.

Haftalık rapor servisi ayrıca SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve APP_BASE_URL kullanır. Bu ayarlar ile Supabase Auth SMTP farklı yapılandırmalardır. Sırları sohbet, kaynak kod veya günlüklerde paylaşmayın.

## Gerçek aile kabul testi

İzinli test aileleriyle 1–4. sınıfları kapsayan bir pilot yapın. Çocuğun gerçek adını, okulunu ve adresini istemeyin.

1. Veli ve öğrenci için farklı şifrelerle kayıt; veliye Türkçe doğrulama e-postasının ulaşması.
2. Doğrulanmamış veli hesabıyla öğrenci etkinleştirme reddi; doğrulamadan sonra etkinleşme.
3. Veli → bağlı öğrenci → veli geçişi. Veliye dönüşte yanlış parola reddi.
4. İki aile arasında öğrenci kimliği değiştirilerek erişim denemesi reddi.
5. Doğru ve yanlış şık sonrası otomatik ilerleme; geçmiş çözüm incelemesinin XP'yi tekrar artırmaması.
6. Son cevapta tamamlanma; başka cihazda aynı ilerleme; ağ kesintisinden sonra güvenli tekrar.
7. Geçerli, süresi dolmuş ve tekrar kullanılan şifre sıfırlama bağlantıları. Öğrenci şifresinin veli tarafından değiştirilmesi ve eski oturumun reddi.
8. Profil dışa aktarma ve silme talebi durumunun doğru gösterilmesi.
9. Android Chrome ve iPhone Safari'de küçük ekran, ekran klavyesi, erişilebilir odak ve kaydırma.

İlk pilotu gerçek kişisel veri içermeyen ayrı staging projesinde yürütün. Üretimde izinli kabul hesapları kullanılabilir. Kabul testleri tamamlanmadan yönetici beyan kutularını işaretlemeyin.

## Şifreli yedekleme

GitHub `production-backup` ortamını yalnızca main dalına açın ve ortam sırlarını doğrudan GitHub'a ekleyin:
- SUPABASE_DB_URL: Supabase'in session-mode veritabanı bağlantısı; SSL doğrulamasıyla.
- BACKUP_ENCRYPTION_KEY: CSPRNG ile üretilmiş 32 baytlık Base64 anahtar. Bir kopyasını ayrı bir parola kasasında saklayın.

Anahtarı değiştirmek eski yedekleri yeniden şifrelemez; eski anahtarları güvenli kasada tutun. Şifre kaybı yedekleri kullanılamaz yapar.

Backup workflow günlük 02:00 UTC için planlanır ve elle de çalıştırılabilir. Supabase CLI roles/schema/data çıktıları yalnızca geçici özel klasöre yazılır; AES-256-GCM ile şifrelenir ve bütünlük kontrolünden sonra yalnızca `.enc` arşivi 30 gün saklanır. Veriler veya SQL çıktıları repoya gönderilmez. GitHub planlı işlerin kesin çalıştırma saati garantisi yoktur; ilk başarılı işi ve başarısızlık bildirimini doğrulayın.

Bu arşiv Storage dosya içeriklerini, SMTP sırlarını, proje ayarlarını veya ödeme sağlayıcısını yedeklemez. Storage dosyaları ve proje ayarları için ayrı şifreli kurtarma kopyası gerekir. Sağlayıcı panelinden ayrıca proje günlük yedek/PITR seçeneklerini değerlendirin; satın alma otomatik yapılmaz.

## Geri yükleme kabulü

Üretimin üzerine geri yüklemeyin. Ayrı, temiz bir Supabase staging projesi kullanın.
Şifreli arşivi özel makineye indirin. BACKUP_ENCRYPTION_KEY güvenli ortamdan tanımlıyken:

```
node scripts/decrypt-backup.mjs zekapark-database.enc backup-private
```

Bu araç yalnızca özel klasöre çözer; veritabanını değiştirmez. Supabase'in güncel roles/schema/data geri yükleme rehberine göre staging'e geri yükleyin. Rol ve Auth/Storage trigger işlemlerini rehbere göre gözden geçirin. Kaynak/hedef proje kimliğini, kullanıcı/profil ilişkilerini, soru sayısını, RLS'yi ve son çalışma kaydını karşılaştırın. Test e-postalarını devre dışı bırakın. Gerçek kurtarma süresini ve en son kurtarılabilir zamanı kaydedin; 24 saat RPO hedefi yalnızca günlük yedekler başarıyla tamamlanıyorsa sağlanır. Test geçmeden `restoreTested` işaretlenmez.

## İzleme ve kapasite

Production health monitor 15 dakika aralıkla site/blog/API/veritabanını, iki hukuki sayfayı, abonelik durumunu ve iki özel uç noktanın anonim erişimi reddetmesini denetler. `MONITOR_EXPECT_PAID_SALES=false` beklenmeyen satış açılışını hata sayar; satış gerçekten yeniden açılacağı zaman bu beklenti aynı yayın değişikliğinde güncellenir. Tek seferlik kontrol, zamanlanmış işin ve alarm teslimatının çalıştığını kanıtlamaz. GitHub Actions başarısızlık bildirimlerini işletim sorumlusunun hesabında açın ve teslim edildiğini doğrulayın. Bu çalışma profesyonel alarm sisteminin veya kesin 15 dakika SLA'nın yerine geçmez.

Sunucu hataları gizli istek içeriğini loglamaz; hata kategorisi ve requestId kullanır. Vercel ve Supabase panel hesaplarında MFA etkinleştirilmelidir. WAF, kota, günlük saklama ve destek sorumlusunu provider panellerinden doğrulayın.

Yük testini staging'de, hedef eşzamanlı öğrenci sayısıyla yapın. Soru başlatma/cevap kaydı/bitirme p95 sürelerini, hata oranını, 429 yanıtlarını ve mükerrer XP'yi takip edin. Üretimde otomatik yoğun trafik üretilmez. Wordwall puanlarının ZekaPark raporlarına aktarılmadığını kabul kriterinde ayrı değerlendirin.

## Ücretli yayın

27 Ekim 2026 itibarıyla yeni satış anahtarı kapalıdır. Google Play entegrasyonu vardır; yapılandırmanın bulunması satışa hazır olunduğu anlamına gelmez. Satış için `GOOGLE_PLAY_BILLING_ENABLED=true`, eksiksiz sunucu yapılandırması ve bütün `releaseBlockers` kayıtları gerekir; satın alma hazırlığı ayrıca Google ürün kataloğunu doğrular. Eski abonelik doğrulaması, geri yükleme ve bildirimler yeni satış anahtarından bağımsızdır. Kayıt hazırlığı için gerekenlere ek olarak tüketici metinleri, vergi/çalışma uygunluğu, WAF, dört ödeme kabul testi ve dört işletim testi tamamlanmalıdır.

Gerçek cihaz kabul testleri genel satışı açmak için uydurma başarı kaydı girilerek yapılmaz. [27 Ekim tamamlama ve tekrar açma rehberi](commercial-launch-20261027.md) içindeki izole test sırası izlenir. Yeni öğrenci abonelik kesim tarihi ve eski kullanıcıların erişim politikası korunur.

Kaynaklar:
- https://supabase.com/docs/guides/auth/auth-mfa/totp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
