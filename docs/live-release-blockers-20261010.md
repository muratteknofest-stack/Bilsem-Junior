# Canlı yayın için doğrulanan eksikler — 10 Ekim 2026

## Tamamlanan kod değişiklikleri

- Aile kaydında veli ve öğrenci parolaları, hesap açılmadan önce Have I Been Pwned Pwned Passwords range API üzerinden denetlenir. Öğrenci parola yenilemesi ve veli/yönetici kurtarma akışı aynı kontrolden geçer. Tam parola veya tam hash gönderilmez; yalnızca SHA-1 özetinin ilk beş karakteri gönderilir. Padding istenir; yanıt boyutu, zaman aşımı, eşzamanlı istek ve önbellek sınırlandırılmıştır.
- Sızdırılmış parola 422; ulaşılamayan veya geçersiz kontrol servisi 503 döndürür ve parola işlemi yapılmaz. Bu dış servise bağımlılık, güvenlik kontrolü kesildiğinde kayıt ve parola yenilemeyi geçici olarak durdurur. Kayıt öncesinde iki parola kontrol edilerek yarım hesap oluşturma riski azaltılır.
- Kendi parolasını değiştiren doğrulanmış veli/yönetici, kullanıcı JWT'si ile sağlayıcının kullanıcı endpoint'inden geçirilir. Böylece sağlayıcının kurtarma ve yeniden doğrulama politikaları korunur. İşlem sonrası eski oturumlar iptal edilir. İstemci yalnızca 204 cevabını başarı kabul eder.
- Kullanılmayan doğrudan istemci signUp yardımcısı kaldırıldı. Bu uygulama koruması Supabase Auth'ın bütün dış istemcilerine uygulanan yerleşik bir politika değildir; ücretsiz planda yerleşik leaked-password uyarısı devam eder. Pro plan satın alınmadı.
- Gizlilik açıklamasına parola kontrolü aktarımı eklendi; yeni kayıtların KVKK metin sürümü 2026-10-10.1 oldu. Geçmiş onaylar değiştirilmedi. Bu teknik açıklama, işletmecinin hukuki dayanak ve aktarım değerlendirmesini tamamlamaz.
- `/api/health` veritabanı erişiminin yanında public proje referansı ve Vercel commit kimliği döndürür. `npm run verify:live -- ORIGIN COMMIT_SHA PROJECT_REF`, HTML giriş sayfasını ve yönlendirmeleri reddeder; yalnızca doğru commit ve veritabanına bağlı JSON yanıtını kabul eder. Bu kontrol oturumlu uçtan uca test yerine geçmez.
- Vercel derlemesi aynı proje içindeki /api uç noktalarını kullanır. VERCEL=1 ve kasıtlı yanlış VITE_API_BASE_URL ile derleme başarılı oldu; 52 tarayıcı paketinde bu eski adres bulunmadı. Mevcut korunan önizleme üzerinde yeni yayın kontrolü çalıştırıldı ve beklenen şekilde başarısız oldu; giriş duvarını sağlıklı API saymadı.

## Vercel yönetim ekranında doğrulanan yapılandırma

Kod doğrulaması: 133 test başarılı (14 yeni parola/yayın regresyon kontrolü dahil); öğrenci akışları 7/7; üretim HTTP güvenlik kontrolleri 12/12; TypeScript kontrolü ve Vercel derlemesi başarılı. npm audit geliştirme bağımlılıkları dahil bilinen açık 0 döndürdü. Parola testi gerçek parolalara veya hesaplara erişmez; sahte range yanıtları ve bağımlılık taklitleri kullanır.

Proje: `zekapark`, takım: `dyds-projects-c415ba7a`. Üretim adresi: `https://zekapark.vercel.app/`. Üretim hâlâ `main` dalındaki `d662710cdab75f368f5d3edcdbc695845cb4c8ed` sürümünü kullanıyor. Yönetim ekranı mevcut yetkili hesapla okunabildi; connector isteği 403 ve önizleme testi giriş duvarında kaldı. Gizli değişken değerleri okunmadı veya kopyalanmadı.

| Değişken | Gözlenen kapsam | Yeni sürümün ihtiyaç duyduğu kapsam/değer |
|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | Yalnızca Preview, feature/supabase-fresh-start-20261006 | Aynı ZekaPark projesinin Production sunucusu ve yalnızca test edilen güvenilir önizleme dalı. Değer gizli kalmalı; bütün önizleme dallarına açılmamalı. |
| SUPABASE_URL | Önce yalnızca Preview; Production Config eklendi ve listede doğrulandı | https://vehhvsdkifwstbjhnhao.supabase.co |
| VITE_SUPABASE_URL | Önce yalnızca Preview; Production Config eklendi ve listede doğrulandı | Aynı Supabase URL'si |
| VITE_SUPABASE_PUBLISHABLE_KEY | Önce yalnızca Preview; Production Config eklendi ve listede doğrulandı | Aynı projenin public publishable anahtarı |
| VITE_API_BASE_URL | Eski dal için ayrı Config; eski Production/Preview Secret girdisi de var | Değer okunmadı/değiştirilmedi. Vercel derlemesi artık bu eski ayarı yok sayıp aynı kaynak /api kullanır. Vercel dışındaki ayrı sunucu dağıtımlarının ayarı korunur. |
| APP_BASE_URL | İlk görünür listede yer almıyordu; isimle filtrelenince mevcut Production/Preview Secret girdisi doğrulandı | https://zekapark.vercel.app olarak güncellendi; başarı bildirimi ve Updated just now gözlendi. Bu bir adres ayarıdır; kimlik bilgisi değildir. |
| PUBLIC_SITE_URL | Önce yoktu; Production Config eklendi ve listede doğrulandı | https://zekapark.vercel.app; önizleme canonical üretimi hedeflemeli ve noindex kalmalı. |

SMTP/doğrulama e-postası gönderimi ve Supabase Auth Site URL/izin verilen dönüş URL'leri ayrıca sınanmalı; liste görünümü e-posta teslimini kanıtlamaz. Dört açık Production Config girdisi eklendi ve APP_BASE_URL adresi güncellendi; yeni dağıtım yapılana kadar mevcut sürümü etkilemezler. Gizli sunucu anahtarı değiştirilmedi. Anahtarın üretime ve yeni önizleme dalına kapsam genişletmesi, tarayıcı güvenlik politikası gereği kaydetme anında kullanıcı onayı ister. Preview için yalnızca feature/professional-blog-20261010 dalına ayrı girdi kullanılmalı; Production + bütün Preview dalları seçilmemelidir. Yeni kimlik bilgisi girilecekse kullanıcı devralmalıdır.

## Kapanması için dış işlem gereken bulgular

1. Yukarıdaki yapılandırma tamamlanıp test ailesiyle kayıt, doğrulama, öğrenci aktivasyonu, çalışma, sınav, tekrar ve veli raporu sınanmalı. Ardından PR #14 fix dalına, PR #13 main dalına alınabilir. Ana dal değişikliği üretim dağıtımı tetikler; yeni üretim commit'i ayrıca doğrulanmalı.
2. `20261010090133_protect_verified_progress.sql` yeni uygulamaya geçişle birlikte uygulanmalı. Eski uygulama çalışırken tek başına uygulanmaz; mevcut istemci akışını bozar. Sonrasında istemci XP yazımı, soru cevap anahtarlarına erişim ve iptal edilmiş oturumların reddi canlı kontrol edilmelidir.
3. Git geçmişindeki eski Firebase yönetici parolası ilgili sağlayıcıda değiştirilmeli ve oturumlar iptal edilmelidir. Firebase yönetim bağlantısı kurulmadı; bu değişiklik doğrulanmadı. Değer buraya yazılmadı.
4. İşletmeci adı/unvanı, yazışma adresi, resmî iletişim e-postası ve veri işleme dayanak/saklama/aktarım kararları işletmeci tarafından sağlanmalıdır. Kullanıcı bilgileri paylaşacağını belirtti; henüz değer vermedi. Bilgi uydurulmadı.

Bu rapor tamamlanmış bir canlı penetrasyon testi veya bütün açıkların kapandığına dair garanti değildir. Kod düzeltmeleri GitHub değişiklik dalında incelenebilir; canlı kapsam, izin ve kimlik bilgisi işlemleri ayrı doğrulanmalıdır.
