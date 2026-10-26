# ZekaPark Supabase yönetimi

Aktif proje: `vtcsoqohkiagbwatlabk`. Kimlik doğrulama Supabase Auth, kalıcı hesap/soru/öğrenme verileri Supabase Postgres üzerindedir. Alternatif kimlik sağlayıcısı, belge veritabanı veya eski dışa/içe aktarma betiği kullanılmaz.

## Çalışan proje

25 Ekim 2026 güvenlik kalkanının SQL Editor dosyaları ve uygulama sırası: [Aşama 3 veritabanı rehberi](../docs/database-shield.md). Dosyalar hazırlanmıştır; bu kayıt canlıya uygulandıkları anlamına gelmez. Mevcut projeyi sıfırlamadan, önce izole ortamda prova ederek uygulanırlar.

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
2. Nihai uygulama sözleşmelerinin kaynak listesi `scripts/build-bilsem-alignment.mjs` içindedir. Eski ve yeni bootstrap dosyalarını topluca yürütmeyin; `schema.sql` ile aynı nesneyi oluşturan tarihsel dosyalar vardır. Mevcut hesap projesine özgü alignment migration yalnız beklenen eski şemayı kabul eder.
3. `scripts/verify-commercial-db.sql` betiğini çalıştırarak RLS kısıtlamalarının, rol yetkilerinin ve kota işlevlerinin aktif olduğunu doğrulayın (test işlemi otomatik rollback yapar).
4. Bu talimat mevcut üretim projesinde şemayı yeniden oluşturma veya toplu sıfırlama izni değildir. Canlı ortamda yalnızca yeni eklenen migration dosyaları uygulanır.

## Doğrulama

`npm run lint`, `npm test`, `npm run test:student` ve `npm run vercel-build` çalıştırın. Üretimde `npm run verify:live -- https://bilsemjunior.vercel.app COMMIT_SHA vtcsoqohkiagbwatlabk` doğru sürümü ve veritabanını JSON yanıtıyla doğrular. Gerçek aile kaydı, e-posta doğrulaması, öğrenci girişi ve veli raporlarını ayrılmış test hesaplarıyla ayrıca kontrol edin.

Veritabanı rollback testi: `tests/supabase-learning.integration.sql`. Ayrılmış fixture kimlikleriyle çalışır; rollback satırını kaldırmayın. Yapılandırma, bağlantı veya kaynak temizliği mevcut hesap/ilerleme verilerini değiştirmez.

## 21 Ekim 2026 hesap projesi eşleştirmesi

[Geçiş ve doğrulama kaydı](../docs/project-alignment-20261021.md). Eski hesapların şifreleri ve doğrulama durumları değiştirilmez. Eski `profiles.is_admin` alanı yeni yönetici yetkisi sayılmaz; sağlayıcı tarafından korunan `app_metadata.role` doğrulanır.
