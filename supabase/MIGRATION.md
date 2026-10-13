# ZekaPark Supabase yönetimi

Aktif proje: `vehhvsdkifwstbjhnhao`. Kimlik doğrulama Supabase Auth, kalıcı hesap/soru/öğrenme verileri Supabase Postgres üzerindedir. Alternatif kimlik sağlayıcısı, belge veritabanı veya eski dışa/içe aktarma betiği kullanılmaz.

## Çalışan proje

Mevcut projeye `schema.sql` veya tarihsel migration dosyalarını topluca yeniden uygulamayın. Canlı kayıtlardaki zamanlar bazı kaynak dosyalardan farklıdır; uygulanmış migration isimlerini/içeriğini eşleştirin. [Canlı yayın raporu](../docs/live-release-blockers-20261010.md) son güvenlik migration eşleştirmesini açıklar.

Tarihsel migration dosyaları yalnızca sürüm geçmişini korur. Bunlar eski sağlayıcıya bağlantı açmaz ve mevcut kullanıcıları yeniden içe aktarmaz. Veri silme, kimlik birleştirme veya kullanıcı yeniden oluşturma bu kurulumun parçası değildir.

## Yapılandırma

- Tarayıcı: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- API sunucusu: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; sunucu anahtarı tarayıcıya aktarılmaz.
- Vercel aynı kaynak `/api` kullanır. Ayrı bir API barındırılıyorsa `VITE_API_BASE_URL` kullanılır.
- Supabase Auth Site URL, dönüş URL'leri ve e-posta teslimini yapılandırın. Yönetici daveti yalnızca `scripts/bootstrap-admin.mjs` ile yetkili sunucudan gönderilir; yetki sağlayıcının koruduğu app_metadata üzerinden denetlenir.
- Yapay zekâ model çağrıları uygulamanın yetkili API uçlarından yapılır; model sağlayıcısı bir kimlik/veritabanı servisi değildir. E-posta gönderimi mevcut SMTP servisini kullanır.

## Yeni proje

Yeni, boş bir projede `schema.sql` temel şemadır. Ancak `schema.sql` tek başına nihai güvenlik korumalarını içermez. Zorunlu kurulum sırası:
1. `schema.sql` dosyasını boş veritabanına uygulayın.
2. `supabase/migrations/` altındaki tüm SQL migrasyonlarını kronolojik dosya sırasıyla uygulayın (özellikle `20261010090133_protect_verified_progress.sql` ve `20261010091235_distributed_api_limits.sql` güvenlik ve limit kilitlerini sağlar).
3. `scripts/verify-commercial-db.sql` betiğini çalıştırarak RLS kısıtlamalarının, rol yetkilerinin ve kota işlevlerinin aktif olduğunu doğrulayın (test işlemi otomatik rollback yapar).
4. Bu talimat mevcut üretim projesinde şemayı yeniden oluşturma veya toplu sıfırlama izni değildir. Canlı ortamda yalnızca yeni eklenen migration dosyaları uygulanır.

## Doğrulama

`npm run lint`, `npm test`, `npm run test:student` ve `npm run vercel-build` çalıştırın. Üretimde `npm run verify:live -- https://zekapark.vercel.app COMMIT_SHA vehhvsdkifwstbjhnhao` doğru sürümü ve veritabanını JSON yanıtıyla doğrular. Gerçek aile kaydı, e-posta doğrulaması, öğrenci girişi ve veli raporlarını ayrılmış test hesaplarıyla ayrıca kontrol edin.

Veritabanı rollback testi: `tests/supabase-learning.integration.sql`. Ayrılmış fixture kimlikleriyle çalışır; rollback satırını kaldırmayın. Yapılandırma, bağlantı veya kaynak temizliği mevcut hesap/ilerleme verilerini değiştirmez.
