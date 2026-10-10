# Canlı yayın ve kalan doğrulamalar — 10 Ekim 2026

## Yayın sonucu

PR #14 ve #13 birleştirildi. Uygulama https://zekapark.vercel.app/ ve blog https://zekapark.vercel.app/blog adreslerinde yayında. İlk üretim commit'i 22eeda86bfbe485071175ba6e212ac7c334576f3; Vercel dağıtımı 5wgSXFP1QAVtnJM6NYCN5NDXV8K3 READY olarak doğrulandı. Bu raporu içeren takip değişikliği, uygulanan son migration kaynaklarını ve testleri ana dala kaydeder.

Altı kategoride 30 özgün yazı, ilgili gerçek Pexels fotoğrafları, kaynak/görsel bilgileri ve yayın ilkeleri eklendi. Tam yazılar statik HTML ile okunuyor; canonical, BlogPosting/Breadcrumb, robots.txt, 40 URL'lik sitemap ve RSS mevcut. Teknik hazırlık aramalarda gösterim veya sıralama garantisi değildir.

Ana sayfa/blog ortak gerçek uygulama bilgileriyle güncellenmiş footer kullanıyor. Yedi bilgi sayfası hesap, veli, destek, gizlilik ve güvenlik akışlarını açıklıyor. Desteklenmeyen bilgiler ve vaatler kaldırıldı; mobil menü ve kayıt açıklamaları güncellendi. Eksik işletmeci bilgileri uydurulmadı.

Sunucu doğrulamalı çalışma, sınav, tekrar ve ödül akışları yayında. Puanlar sunucuda hesaplanır; öğrenciye cevap anahtarı gönderilmez. Eski ilerleme silinmedi ve geçmiş puanlar geriye dönük doğrulanmış sayılmaz. CSP, frame-ancestors none, DENY, nosniff ve API no-store doğrulandı. Sunucu paketi/haritası public dist dışında; hassas hata nesneleri loglanmıyor.

Parola işlemleri Pwned Passwords range kontrolünden geçer. Yalnızca SHA-1 özetinin beş karakterlik ön eki gönderilir; tam parola/hash aktarılmaz. Padding, yanıt boyutu, zaman aşımı, önbellek ve eşzamanlı istek sınırı var. Sızdırılmış parola 422, kontrol hatası 503 döndürür; işlem durur. Aile kaydında iki parola hesap açılmadan denetlenir. Veli/yönetici kurtarması sağlayıcının kullanıcı endpoint'ini kullanıcı JWT'si ile kullanır; oturumlar iptal edilir. İstemci yalnızca 204 cevabını başarı sayar. Yeni KVKK sürümü 2026-10-10.1; eski onaylar değişmedi.

## Vercel yapılandırması ve canlı kanıt

Proje zekapark, takım dyds-projects-c415ba7a, veritabanı vehhvsdkifwstbjhnhao. Kullanıcının onayıyla mevcut SUPABASE_SERVICE_ROLE_KEY yalnızca Production kapsamına taşındı; değeri okunmadı, kopyalanmadı veya değiştirilmedi. Bütün Preview dallarına açılmadı. Güvenilir blog önizlemesine ayrı anahtar girdisi oluşturulmadı; önizleme sağlığı doğrulanmış değildir.

Production Supabase URL/public publishable yapılandırması ve PUBLIC_SITE_URL eklendi. APP_BASE_URL üretim adresine güncellendi. Eski VITE_API_BASE_URL değerleri okunmadı/değiştirilmedi; Vercel derlemesi bunları yok sayıp aynı kaynak /api kullanır. Vercel dışı ayrı sunucu ayarı korunur.

`npm run verify:live -- https://zekapark.vercel.app 22eeda86bfbe485071175ba6e212ac7c334576f3 vehhvsdkifwstbjhnhao` başarılı: doğru commit, doğru proje ve hazır veritabanı JSON ile doğrulandı. HTML giriş sayfası ve yönlendirme sağlık kanıtı sayılmaz. Sonraki dağıtımda gerçek yeni commit ile tekrar çalıştırılmalıdır.

Canlı 13 HTTP/SEO kontrolü başarılı: ana sayfa/blog/gizlilik 200, bilinmeyen blog/API 404, yetkisiz hesap/yönetici 401, yetkisiz öğrenme/parola POST 401, robots/sitemap/RSS 200 ve hostile Origin 403. Güvenlik başlıkları, API no-store, doğru sitemap/canonical ve üretim noindex bulunmaması doğrulandı. Blog masaüstü görünümü canlı tarayıcıda kontrol edildi; mobil, ekran okuyucu veya oturumlu aile testi değildir.

## Canlı veritabanı koruması

Yeni API üretime alındıktan sonra son iki migration uygulandı:

| Kaynak dosya | Canlı migration kaydı | Sonuç |
|---|---|---|
| 20261010085952_server_verified_learning.sql | 20261010085952 server_verified_learning | Sunucuya özel çalışma/ödül işlemleri |
| 20261010091235_distributed_api_limits.sql | 20261010091235 distributed_api_limits | İşçiler arasında ortak istek limiti |
| 20261010090133_protect_verified_progress.sql | 20261010121716 protect_verified_progress | XP/ilerleme koruması, gizli soru bankası, aktif oturum RLS |
| 20261010122109_private_security_helpers.sql | 20261010122154 private_security_helpers | Yetkili yardımcılar zekapark_private şemasına taşındı; public progress RPC SECURITY INVOKER |

Yeni proje tarihsel is_admin migration'ını içermiyordu. Koruma migration'ı kendi doğrulanmış yönetici yardımcısını oluşturacak şekilde düzeltildi. Yetki auth.users üzerindeki güncel sağlayıcı metadata'sı ve doğrulanmış e-postadan okunur; eski JWT yönetici rolü erişim vermez. PostgreSQL test başlangıcı canlı yeni şemayı yansıtır.

Son `tests/supabase-learning.integration.sql` canlıda başarılı çalıştı. Ayrılmış sahte hesaplar tek transaction içinde kullanıldı ve rollback yapıldı. Tek seferlik XP/ödül, revision çakışması, değiştirilemeyen sonuç, hesap sahipliği, cevap anahtarı/snapshot gizliliği, sahte XP/mastery reddi, avatar/favori izni, süresi geçmiş/iptal edilmiş oturum reddi ve yönetici yetkisi kaldırılınca eski JWT reddi doğrulandı. Public yetkili yardımcıların kaldırılması, anonim private erişim reddi ve invoker wrapper da test edildi.

Protect_profile_progress aktif; 13 public tablonun tamamında RLS açık; özel öğrenme tablolarında istemci grant'ı yok. Test hesabı kalmadı. Dört mevcut profilin işlem öncesi/sonrası içerik parmak izi aynı; kullanıcı verileri rapora alınmadı.

Canlı migration zamanları kaynak dosyalardan farklıdır. Mevcut projeye schema.sql veya geçmiş migration'lar topluca yeniden uygulanmamalı; isim/içerik ve migration kaydı eşleştirilmeli. Eski doğrudan puanlayan uygulamaya dönmek güvenlik korumasını kaldırmak için gerekçe değildir.

## Supabase sağlayıcısı

Kullanıcı eski kimlik/veritabanı sağlayıcısının kullanım dışı olduğunu belirtti. Aktif sistem yalnızca Supabase Auth/Postgres kullanır. Eski aktarım betikleri ve kullanılmayan istemci AI bağlantı katmanı kaldırıldı; tarayıcı ortam değişkenleri Supabase/API ile sınırlandırıldı. Eski sağlayıcı yönetimi bu uygulamanın yayın gereksinimi değildir.

## Testler ve açık kalan sınırlar

- Son npm test: 133/133; gerçek PostgreSQL motoru ile RLS/transaction testi dahil.
- Öğrenci testleri 7/7; TypeScript, bağımsız ve Vercel derlemeleri başarılı. Son SQL/test değişikliklerinden sonra tüm 133 test yeniden geçti.
- Yerel üretim HTTP 12/12; canlı HTTP/SEO 13/13. npm audit geliştirme bağımlılıkları dahil bilinen açık 0; önceki OSV 362 pakette 0. Yeni uygulama bağımlılığı eklenmedi.
- Son Security Advisors: ERROR yok; API'ye açık SECURITY DEFINER uyarıları kalktı. İstemci erişimine kapalı sekiz sunucu tablosundaki RLS Enabled No Policy INFO kasıtlıdır. [Açıklama](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Yerleşik Supabase leaked-password koruması Free planda etkin değil; bir WARN sürüyor. Uygulama kontrolü sağlayıcı ayarının yerini bütün dış Auth istemcileri için tutmaz. Pro plan satın alınmadı. [Açıklama](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Gerçek test ailesiyle kayıt, e-posta teslimi/doğrulaması, öğrenci aktivasyonu, çalışma/sınav/tekrar ve veli raporu canlı tarayıcıdan tamamlanmadı. SMTP, Auth Site URL ve redirect izinleri bu kontrollerle kanıtlanmaz.
- İşletmeci adı/unvanı, yazışma adresi, resmî e-posta ve hukuki dayanak/saklama/aktarım kararları henüz verilmedi.

Bu rapor hedefli kod, HTTP ve veritabanı kontrollerini kaydeder; tam penetrasyon testi veya bütün açıkların kapandığına dair garanti değildir.
