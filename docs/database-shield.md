# Aşama 3 — Bilsem Junior veritabanı kalkanı

Durum: SQL dosyaları hazırlanmıştır; canlıya uygulanmamıştır. Hedef, 25 Ekim 2026 tarihinde salt okunur katalog sorgularıyla incelenen `vtcsoqohkiagbwatlabk` projesidir. Bu aşamada kullanıcı, Auth, ilerleme, ödeme veya dosya verisi değiştirilmedi. Dosyalar mevcut hesap projesine yönelik SQL Editor teslimleridir; boş proje kurulum betiği veya otomatik migration değildir.

## Dosyalar ve uygulama sırası

| Sıra | Dosya / işlem | Sonuç |
|---|---|---|
| 1 | [preflight.sql](../supabase/security/preflight.sql) | Salt okunur tablo/RLS, temel profil uyumluluğu, bucket ve aktif dosya referansı özeti |
| 2 | [production-shield.sql](../supabase/security/production-shield.sql) | Tek transaction içinde uygulama/arşiv RLS, tablo/sütun/fonksiyon yetkileri ve profil doğrulaması |
| 3 | Storage paneli / Storage API | Referanslar incelendikten sonra `exam-images` bucket'ını private yapma; dosyaları silmeden |
| 4 | [storage-shield.sql](../supabase/security/storage-shield.sql) | İki uygulama bucket'ında istemci erişimini kısıtlama; eski dört politikayı kaldırma |
| 5 | [verify-shield.sql](../supabase/security/verify-shield.sql) | Salt okunur assertion ve kurulu politika çıktısı; beklenen sonuç `status: verified` |

Bu sıra henüz uygulanmadı. Önce aynı şemayı kullanan, üretimden ayrılmış test ortamında ve PostgreSQL 17 üzerinde deneyin. Tam şema/ACL/fonksiyon yedeğini ve veri yedeğini geri yükleme denemesiyle doğrulayın; Storage dosyalarının ayrıca yedeklenmesi gerekir. Aşama 2 kodu ile birlikte yayınlanacak değişiklikler ve eski Android sürümü aşağıdaki akışlarla denenmelidir. Canlı uygulama için ayrıca onay gerekir.

Her SQL dosyasını Supabase SQL Editor'de `postgres` rolüyle **tamamını seçerek tek çalıştırmada** yürütün. Hata oluşursa `ROLLBACK;` ile açık transaction'ı kapatın ve nedeni inceleyin; guard/constraint satırlarını atlamayın. İlk dosya hiçbir veri değiştirmez. Ana dosya 5 saniyelik kilit ve 60 saniyelik statement sınırı, transaction kilidi ve tam tablo listesi kontrolü kullanır. Beklenmeyen tablo/view varsa durur. Ek tablo gereksiniminde politika listesi yeniden incelenmelidir.

## Gerçek ortamdan doğrulanan kapsam

`public` içindeki 20 tablonun tamamında RLS zaten açıktı. Bazı API rolleri gereksiz `TRUNCATE`, `TRIGGER`, `REFERENCES` ve `MAINTAIN` yetkileri taşıyordu; profil sütun yetkileri genişti. Bu yetkilerin varlığı, PostgREST üzerinden doğrudan TRUNCATE yapılabildiği anlamına gelmez. Kalkan gereksiz veritabanı yetkilerini kaldırır.

`bilsem_legacy` içindeki 10 tablo arşivdir. Sekizinde RLS açıktı; iki manifest tablosunda değildi. Kalkan hepsinde RLS açar ve API rollerinin arşiv şemasına erişimini kaldırır; arşiv satırlarını ve fonksiyon gövdelerini korur.

Supabase tarafından yönetilen `auth`, `storage`, `realtime`, `vault`, extension ve migration tablolarının sahipliği, varsayılan yetkileri veya şemaları değiştirilmez. Storage için yalnız desteklenen politika DDL'si kullanılır. SQL ile Storage metadata güncellenmez. Sağlayıcı tablolarını uygulama tablosu gibi yeniden oluşturmamak gerekir.

## Tüm uygulama tablolarının istemci erişim matrisi

Bu tabloda istemci, `authenticated` rolüdür. `anon` tüm uygulama tablolarında kapalıdır. `—`, ilgili SQL işleminin tablo/sütun yetkisi ve/veya RLS nedeniyle kapalı olduğunu belirtir. API üzerinden izin verilen iş akışları sunucunun ayrıca kimlik, sahiplik, şema ve kota doğrulamasından geçer.

| Tablo | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Kendisi; veli için karşılıklı bağlı çocuk | — | Yalnız kendi tercih sütunları | — |
| user_private_state | Kendisi / karşılıklı bağlı çocuk | — | — | — |
| practice_sessions | Kendisi / karşılıklı bağlı çocuk | — | — | — |
| test_attempts | Kendisi / karşılıklı bağlı çocuk | — | — | — |
| questions | Güncel yönetici + MFA | Yönetici + MFA, published yasak | Yönetici + MFA, sonuç published olamaz | Yönetici + MFA |
| account_deletion_jobs | — | — | — | — |
| ai_generation_jobs | — | — | — | — |
| ai_generation_logs | — | — | — | — |
| api_rate_windows | — | — | — | — |
| daily_challenge_attempts | — | — | — | — |
| google_play_purchase_bindings | — | — | — | — |
| google_play_subscriptions | — | — | — | — |
| learning_reward_claims | — | — | — | — |
| learning_sessions | — | — | — | — |
| platform_settings | — | — | — | — |
| professional_generation_runs | — | — | — | — |
| question_visual_assets | — | — | — | — |
| security_events | — | — | — | — |
| shopier_access_orders | — | — | — | — |
| support_requests | — | — | — | — |

Arşiv tablolarının tümünde dört işlem de API rollerine kapalıdır: `arena_challenges`, `exam_results`, `exams`, `function_manifest`, `profiles`, `questions`, `row_manifest`, `subjects`, `topics`, `user_purchases`. Operatör erişimi korunur.

## Oturum, yönetici ve aile izolasyonu

RLS; JWT'nin kullanıcı kimliğini, canlı `auth.sessions` kaydını, oturum son tarihini, doğrulanmış e-postayı ve silinme durumunu birlikte denetler. Eksik/hatalı session UUID'si, iptal edilen veya süresi dolan oturum, profilsiz kullanıcı ve doğrulanmamış hesap veri okuyamaz. Mevcut yönetilen öğrenci etkinleştirme akışı sunucu tarafında e-postayı doğruladığı için korunur; gerçek test hesaplarıyla yeniden denenmelidir.

Veli erişimi hem velinin `linked_student_ids` listesinde çocuğu hem de çocuğun `linked_parent_id` alanında veliyi gerektirir. Tek taraflı ilişki yeterli değildir. Veli bu SELECT izniyle çocuğun profilini doğrudan değiştiremez.

Yönetici yetkisi mevcut Auth `raw_app_meta_data.role`, uygulama profilinin admin rolü ve JWT `aal2` ile doğrulanır; kullanıcı tarafından değiştirilebilen metadata yetki kaynağı değildir. Eski JWT'deki admin iddiası sağlayıcıdaki güncel rolün yerine geçmez. Soru yayınlama ayrı sunucu denetiminden geçer.

## Profil ve Android uyumluluğu

Doğrudan UPDATE yalnız `name`, `avatar`, `daily_goal_minutes`, `daily_goal_questions`, `daily_goal_sessions`, `sound_enabled`, `featured_badge_ids`, `reminder_config`, `updated_at`, `last_login_at` sütunlarında mümkündür. Eski Android tercih payload'ları çalışır; istemcinin değiştirdiği zaman damgaları DB saatiyle üretilir. Yeni istemci Aşama 2 profil API'sini kullanır.

Beş CHECK constraint; ad/avatar UTF-16 uzunluğu ve Unicode boşlukları, 1–4 sınıf aralığı, tamsayı hedef sınırları, en çok üç benzersiz rozet ve hatırlatıcı alt alanlarını doğrular. Bilinmeyen hatırlatıcı anahtarları kabul edilmez. Mevcut uyumsuz profil varsa **tüm ana transaction geri alınır** ve yalnız kategori bazında sayılar bildirilir. Kullanıcılar otomatik yeniden adlandırılmaz, sınıfları veya hedefleri değiştirilmez. `preflight.sql` temel kontrollerdir; tam doğrulama ana SQL içindeki atomik guard'dadır.

Kimlik, aile bağlantıları, rol, XP, onay ve sınıf istemci tercihleri değildir. İkinci bir trigger gelecekte yanlış sütun grant'i verilse de bunları korur. Sınıf değişimi sunucu `/api/learning/grade` → `change_student_grade` yolunda kalır: eski açık çalışma sonlandırılır, kazanılmış XP korunur.

## Sunucu ve RPC yetkileri

`service_role` RLS'yi aşabildiği için ayrıca tablo/fonksiyon ACL'leri daraltılır. Bu anahtar hâlâ hassastır; daraltma anahtarın istemciye verilmesini güvenli yapmaz. Tüm public tablolar sunucu tarafından okunabilir; doğrudan yazma izinleri şu kadardır:

| Yetki | Tablolar |
|---|---|
| INSERT, UPDATE | profiles, learning_sessions, daily_challenge_attempts, google_play_subscriptions, google_play_purchase_bindings, professional_generation_runs, support_requests, ai_generation_logs, security_events |
| INSERT, UPDATE, DELETE | questions, question_visual_assets |
| UPDATE | platform_settings |
| Doğrudan yazma yok | Diğer public tablolar; defter/ilerleme/silme işlemleri denetlenmiş RPC ile |

İstemciye açık public RPC'ler yalnız `patch_user_progress(jsonb)` ve `save_question(jsonb,integer)` olur. İlki iki izinli tercih anahtarını birleştirir, korunan ilerlemeyi yazdırmaz; ikincisi mevcut yönetici kontrollerine tabidir. Öğrenci soruları/cevapları doğrudan veritabanından çekmez.

Sunucuya açık 20 public RPC: `answer_daily_challenge`, `change_student_grade`, `claim_learning_reward`, `claim_professional_generation`, `commit_learning_session`, `commit_professional_generation`, `consume_api_limit`, `finish_account_deletion`, `is_user_session_active`, `issue_daily_challenge`, `learning_reward_facts`, `patch_user_progress`, `prepare_account_deletion`, `prepare_google_play_binding`, `question_review_summary`, `record_google_play_subscription`, `revoke_user_sessions`, `save_question`, `save_question_draft_batch`, `submit_support_request`. Eski Shopier claim fonksiyonları ve arşiv fonksiyonları kapalı kalır. Özel şemadaki üç silme yardımcısı yalnız sunucuya; RLS/doğrulama yardımcıları gerektiği kadar authenticated/sunucuya açılır.

Uygulama/arşiv şemalarında CREATE ve gereksiz tablo/sequence izinleri kapatılır. `postgres` tarafından gelecekte oluşturulacak nesneler için global ve şema bazında varsayılan erişim kapalıdır; yeni migration açıkça gerekli grant/RLS'yi vermelidir. Özellikle yalnız şema bazında REVOKE, global PUBLIC EXECUTE varsayılanını kaldırmaz. Sağlayıcının `supabase_admin` varsayılanları değiştirilmez; başka owner ile oluşturulan nesneler ayrıca incelenmelidir. RLS otomatik olarak gelecekteki her tabloda açılmaz; yeni tablo için ENABLE RLS zorunludur.

`FORCE ROW LEVEL SECURITY` kullanılmaz: özel SECURITY DEFINER yardımcıları tablo sahibi üzerinden özyinelemeye girmeden izin kontrolü yapar. İstemci rollerinin tablo sahipliği yoktur; fonksiyonların `search_path` değeri boştur. Bu, tablo sahibi veya servis anahtarı ele geçirilmesine karşı tam izolasyon iddiası değildir.

## Storage: ayrı ve görünür etki

İnceleme anında `exam-images` herkese açık ve içinde **933 nesne** vardı. Aktif beş uygulama veri alanında buna referans sayısı sıfırdı; bu sayım arşiv içeriklerini, önceden paylaşılmış URL'leri veya dış siteleri kapsamaz. Dosya içeriği veya adları okunmadı. Gizliye alma eski public URL'lerini keser; daha önce indirilmiş veya önbelleğe alınmış kopyaları geri alamaz. Gerekli dış bağlantılar varsa önce kontrollü sunucu erişimine taşınmalıdır.

`bilsem-question-visual-drafts-v2` zaten private, en fazla 10 MiB ve PNG/WebP ile sınırlıydı. Kalkan bu ayarları guard ile doğrular; upload sunucudaki gerçek MIME/boyut denetiminden geçmeye devam eder.

Uygulama sırası: preflight referanslarını ve dış kullanımları incele → ana SQL → Storage panelinde `exam-images` public ayarını kapat (veya sunucudan Storage API `updateBucket` ile aynı ayar) → Storage SQL → doğrulama. Storage SQL public bucket görürse durur. Bucket ayarı ve politika transaction'ı ayrı işlemlerdir; işlem aralığında eski yönetici politikaları zaten kaldırılmış arşiv yetkilerine bağlıdır. Eski URL'leri gizliye alma adımından itibaren kapalı kabul edin.

AS RESTRICTIVE politika anon/authenticated için iki bucket'ta tüm dosya işlemlerini engeller; ileride eklenecek geniş permissive politika bunu aşamaz. Diğer bucket'ların bağımsız politikaları korunur. Sunucu Storage API erişimi korunur. Hiçbir nesne/bucket silinmez.

`storage.objects` sahibi `supabase_storage_admin` olduğu için normal PostgreSQL owner testi tek başına Supabase politika DDL desteğini ölçmez. Supabase bu tabloda policy DDL'sini açıkça destekler; yerel test, sağlayıcının bu izin katmanını taklit etmez. Ayrılmış gerçek Supabase ortamında prova zorunludur. SQL Editor `42501` hatası verirse transaction'ı geri alın, desteklenen proje/rol ve sağlayıcı sürümünü Supabase desteğiyle kontrol edin; owner değiştirmeyin, yönetilen admin rolünü kendinize vermeyin, RLS kapatmayın.

## Doğrulama ve geri dönüş

`npm run test:database-shield` sahte verilerle gerçek PostgreSQL motoru (PGlite) üzerinde 16 test çalıştırır: tekrar uygulama, veri koruma, 30 tablo ACL/RLS, aile izolasyonu, eski Android payload'ları, mass assignment, sınıf/XP, metadata/MFA, aktif oturum, kota/ödeme/günlük görev/üretim RPC'leri, Storage ve varsayılan grant'ler. Geçersiz mevcut veri ve aktif dosya referansı durumlarında transaction rollback ayrıca denenir.

Yerel PGlite PostgreSQL **18.3**, hedef proje PostgreSQL **17.6** kullanır. Kullanılan SQL özellikleri 17'de vardır; bu sonuç üretimdeki extension, Storage API/CDN veya sağlayıcı özel izinlerinin birebir testi değildir. Yerel Storage dosyaları sahte metadata/payload ile temsil edilir; 933 gerçek dosyaya dokunulmaz.

25 Ekim 2026 doğrulaması: tüm `npm test` paketi **594/594**, TypeScript kontrolü ve örnek ortam değişkenleriyle web/sunucu derlemesi başarılı; yerel production sunucusunda **37 HTTP güvenlik kontrolü** geçti. Derlemede 158 public dosya denetlendi, tanınan özel anahtar veya source map bulunmadı. Bunlar hazırlanmış değişikliğin yerel sonuçlarıdır; canlıya yayınlandığı anlamına gelmez. Canlıda yalnız temel profil uyumluluk sayımları yapıldı ve altı kategoride sıfır bulundu; tam yeni constraint'ler henüz gerçek verilere uygulanmadı.

Prova sonrasında iki ayrı aile hesabıyla yabancı profil/ilerleme okuma ve yazmanın reddedildiğini; veli raporunu, yeni aile kaydını, öğrenci etkinleştirmesini, eski Android tercihlerini, 1–4 sınıf değişimini, yönetici MFA/soru taslağını, ödeme bildirimini ve hesap silme akışını doğrulayın. `verify-shield.sql` tüm adımlar tamamlanmadan başarı bildirmez; public eski bucket kaldıysa özellikle durur.

Hata transaction commit'inden önceyse rollback veri/yetki değişimini geri alır. Commit sonrasında topluca geniş eski yetkileri geri veren bir rollback betiği teslim edilmez. Yayını durdurup kaydedilmiş şema/ACL/fonksiyon yedeği üzerinden hedefli düzeltme veya doğrulanmış geri yükleme yapılmalıdır. Storage ayarı ayrıca geri alınabilir; public yapmak dosyaları tekrar açacağından bunu otomatik rollback'e bağlamayın.

Aşama 4'e kalanlar: bu dosyaların gerçek izole Supabase provası ve kontrollü canlı uygulaması, Aşama 2 kodunun yayınlanması, eski anahtarın iptalinin doğrulanması, preview sırlarının izolasyonu, Auth signup/HIBP sağlayıcı ayarları, eski Firebase'in aktif olup olmadığının kontrolü, platform WAF/kota ve yayın öncesi uçtan uca testler. Bu aşamanın tamamlanması tek başına production güvenlik onayı değildir.

Bu işlemlerin ortam değişkenleri, WAF ve beş test senaryosunu içeren [Aşama 4 yayın rehberi](production-security-runbook.md) hazırlanmıştır; rehberin hazırlanması işlemlerin canlıda uygulandığı anlamına gelmez.

## Birincil kaynaklar

- [Supabase Storage erişim politikaları](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage metadata için API kullanımı](https://supabase.com/docs/guides/storage/schema/design)
- [Supabase yönetilen şema sınırları ve desteklenen policy DDL](https://github.com/orgs/supabase/discussions/34270)
- [PostgreSQL 17 varsayılan yetkiler](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html)
- [PostgreSQL 17 tablo yetkileri](https://www.postgresql.org/docs/17/ddl-priv.html)
