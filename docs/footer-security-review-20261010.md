# Alt menü ve güvenlik incelemesi — 10 Ekim 2026

## Sonuç

Ana sayfa ve 30 yazılık blog aynı gerçek bilgi bağlantılarını kullanıyor. Yedi bilgi sayfası JavaScript olmadan okunabiliyor ve site haritasına ekleniyor. Veli rehberi gerçek kayıt, öğrenci kodu, e-posta doğrulaması, veri indirme ve silme talebi akışını açıklıyor. Aktif sekmeler ve hata sayısı mobil alt menüde erişilebilir şekilde sunuluyor. Veli ve yönetici menülerindeki desteklenmeyen öğrenci görünümü yerine blog ve rehber bağlantıları var.

Doğrulanmamış telefon, ofis adresi, çalışma saati, dört saatte yanıt vaadi, gönderim yapmadığı hâlde başarı mesajı veren form ve kayıt yapmayan bülten kaldırıldı. Mevcut olmayan bilişsel alanlar ve bilimsel/pedagojik güvence iddiaları yeniden yazıldı. Gizlilik ve kullanım metinlerinin eksik işletmeci bilgileri açıkça belirtiliyor. Kayıt onay sürümleri 2026-10-10 olarak güncellendi; eski kayıtların onay geçmişi değiştirilmedi.

**Kod kontrolleri başarılı; canlı sistemin tüm güvenlik eksikleri kapatılmış değildir.** Canlı denetim salt okunur metadata sorguları ve Supabase Security Advisors ile yapıldı; gerçek kullanıcı verileri veya parolalar okunmadı. Canlı ortamda yük testi veya saldırı simülasyonu yapılmadı.

## Kodda düzeltilen bulgular

| Bulgu | Yapılan düzeltme | Doğrulama |
|---|---|---|
| Vercel statik HTML, Express Helmet başlıklarından yararlanmıyordu | Statik yollar için CSP, frame-ancestors none, X-Frame-Options DENY, nosniff, referrer ve izin politikaları eklendi. CSP betikleri aynı kaynakla sınırlar; unsafe-eval yoktur. | Vercel yapılandırma testi; yerel üretim HTTP başlıkları |
| Bağımsız sunucu derlemesi kaynak paketini ve haritasını public dist içine koyuyordu | Sunucu çıktısı build/server.cjs olarak taşındı; sunucu dosya yolları 404 ile engellendi. | Derleme çıktısı taraması; server.cjs, harita ve build yollarına HTTP istekleri |
| Bazı sunucu hataları sağlayıcı nesnesini olduğu gibi logluyordu | Mesaj, gövde, parola, header ve key yazmayan sınırlı hata metadata yardımcısı kullanıldı. | İçine sahte sır yerleştirilmiş hata nesnesiyle test |
| Alt menüdeki hukuki/destek içerikleri gerçek uygulamayla uyuşmuyordu | Ortak içerik kaynağı, gerçek bilgi sayfaları ve kayıt ekranında aynı metinleri kullanan yerel dialog eklendi. | Bilgi bağlantıları, 404/HEAD/POST davranışları ve statik sayfa kontrolü |

API zaten no-store önbellek politikası, doğrulanmış oturum, rol/yetki kontrolü, sunucu puanlama ve ortak istek limiti kullanıyor. Bu kontroller yeniden test edildi; var olan korumaların eklenmiş olduğu iddia edilmedi.

## Canlı ortamda kalan bulgular

| Öncelik | Durum | Kanıt ve gerekli işlem |
|---|---|---|
| Yüksek | Son ilerleme koruması etkin değil | Canlı protect_profile_progress trigger'ı yok; protect_verified_progress migration'ı uygulanmamış. İstemcinin eski ilerleme yazma izinleri ve yayımlanmış soru bankasına erişimi nedeniyle puan değiştirme ve cevap anahtarlarına erişme riski devam eder. Yeni uygulama üretime geçirilirken supabase/migrations/20261010090133_protect_verified_progress.sql uygulanmalı. Eski uygulamayı bozacağı için bu incelemede tek başına etkinleştirilmedi. |
| Yüksek | Eski yönetici kimlik bilgisinin iptali doğrulanamadı | Önceki kodda Git geçmişine yazılmış kimlik bilgisi vardı; koddan kaldırmak parolayı değiştirmez. Orijinal kimlik sağlayıcısında değiştirme/iptal ve tekrar kullanılmış hesaplar kontrol edilmeli. Değer rapora veya loga kopyalanmadı. |
| Orta | Sızdırılmış parola koruması kapalı | Supabase Security Advisors bir WARN döndürdü. Auth yapılandırmasında leaked password protection etkinleştirilmeli. Bu bağlantı üzerinden Auth ayarı değiştirecek yönetim aracı yok. [Resmî çözüm](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). |
| Yayın öncesi | İşletmeci ve veri işleme açıklamaları eksik | Doğrulanmış işletmeci kimliği/adresi, hukuki dayanaklar, saklama süreleri ve aktarım koşulları işletmeci tarafından tamamlanmalı. [KVKK aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-). |
| Doğrulanamadı | Canlı Vercel uçtan uca testi | Korunan önizlemede API health kontrolü için Vercel deployment aliases/bypass metadata isteği HTTP 403 forbidden döndürdü. Önizlemenin gerçek HTTP güvenlik başlıkları, aile girişi ve veri akışı doğrulanamadı. Üretime yükseltme yapılmadı. |

Canlı public şemasındaki 13 tablonun tamamında RLS açık. learning_sessions, learning_reward_claims ve api_rate_windows için anon/authenticated grant yok. Advisors'ın sekiz INFO seviyesindeki “RLS Enabled No Policy” kaydı sunucuya özel tablolarla ilgili; bunlara istemci erişimi açmak çözüm değildir. [Denetim açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Çalıştırılan kontroller

- npm test: 119/119; gerçek PostgreSQL davranışını PGlite içinde sınayan RLS, sahiplik, tekrar puanlama ve işlem testleri dahil.
- npm run test:student: 7/7.
- npm run lint, npm run vercel-build, npm run build: başarılı.
- npm audit: geliştirme bağımlılıkları dahil bilinen açık 0.
- npm run security:audit: OSV üzerinden 362 npm paketinde bilinen açık 0.
- 311 mevcut kaynak dosyasında hedefli credential desen taraması: bulgu 0. Bu, Git geçmişinin veya bütün sır türlerinin tarandığı anlamına gelmez.
- 53 tarayıcı JavaScript paketinde servis rolü JWT taraması: bulgu 0; public dist içinde sunucu paketi/haritası yok.
- 39 statik içerik sayfası: her sayfada tek h1, yerel içerik bağlantılarında kırık bağlantı 0.
- npm run security:http: 11 gerçek HTTP kontrolü (CI akışına da eklendi). Yerel üretim sunucusunda ana sayfa/blog/bilgi 200, eksik ve traversal yolları 404, yetkisiz hesap/yönetici API istekleri 401; güvenlik başlıkları başarılı.
- Hostile Origin 403, geçersiz JSON 400, büyük JSON 413 ve yanıta sır yansımaması test edildi.

Tarayıcıyla görsel ve ekran okuyucu testi bu ortamda yapılamadı. Dialogun native focus/Escape davranışı ve responsive CSS uygulandı; otomatik render/HTML testleri tam tarayıcı testi yerine geçmez. Bağımlılık taramalarındaki sıfır bulgu, bilinmeyen veya uygulama mantığına ait açıkların olmadığı garantisi değildir.

## Yayın sırası

Önce PR #13'teki sunucu doğrulama temeli ve PR #14'teki blog/alt menü/güvenlik değişiklikleri birleştirilmeli. Yetkili Vercel erişimiyle önizlemede test aile hesabı kullanılarak kayıt, doğrulama, öğrenci aktivasyonu, çalışma, tekrar, sınav ve veli raporu sınanmalı. Yeni uygulamaya üretim geçişi sırasında bekleyen ilerleme migration'ı etkinleştirilmeli ve canlı izin testleri tekrarlanmalı. Ayrıntılar: [verified-learning-rollout.md](verified-learning-rollout.md).
