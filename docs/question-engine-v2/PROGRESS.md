# Bilsem Junior soru motoru V2

Temel: main / 7592e423ce5e45f7b8d12680df2c520fffed98cd.
Dal: codex/question-engine-v2-20261021. Mevcut kullanıcılar ve soru motorları korunur.

Güncel önizleme: https://zekapark-i80xtpkqn-dyds-projects-c415ba7a.vercel.app/ .
21 Ekim 2026: READY, gerçek sunucu yanıtı `status: ok, database: ready`.
Gerçek hesapla giriş kabulü ve GitHub Actions kontrolleri henüz tamamlanmadı.

## Faz 1

İstenen dokuz dosya, gerçek öğrenci seçimi ve yayın RPC'si incelendi. İlk main
kontrolünde 436 test ve TypeScript geçti. Tek modelle iki inceleme yapılması,
yalnız seçenek değiştirilerek aynı kökün tekrar sayılabilmesi ve toplu kaydın
veritabanı cevabını beklememesi bulundu. Gerçek hesabın Supabase projesi kullanılır.

## Faz 2

novelty.ts, adaptive-difficulty.ts, generators/index.ts, multi-stage-quality.ts ve
learning-question-selection / learning-routes değişti. 16 kanıtlı aday arasından
tekrar etmeyen, en az kullanılan mantık ailesi seçilir. Sınıf sınırı korunur.
Adaptif öneri aynı sınıfta en az 8 cevap ister; son 20 cevabı değerlendirir.
Kaydedilen cevapların sıra numarasıyla anahtarlandığı durum ayrıca test edildi.
Bu bir ürün sezgiselidir, akademik başarı veya yetenek ölçümü değildir.

Yeni symbolic-v2 motoru 2–4 farklı sembolle tam rank eşitlikler, ağırlıklı sorgu ve çıkarma ilişkileri üretir. Gaussian eleme ve Cramer determinantları birbirinden bağımsız çözer. 300 sınıf/seviye örneği ve bozma testleri geçti. Eski generator sürümleri ve kayıtlar değişmez. Eski reasoning-8 APK formatı desteklenir; yeni geometri yalnız professional-v2 istemcilerine verilir.

## Faz 3

Three.js, React Three Fiber ve Drei kilitli sürümlerle eklendi. Gerçek Blender
GLB, tools/blender/export-unit-cube.py ile üretildi. Birim boyut, merkez, tek mesh
ve bağımsız kaynak içermemesi gerçek GLTFLoader ile doğrulanır. SVG ve WebGL aynı
tam sayı küp verisini kullanır. Sabit kamera, yumuşak gölge, sınırlı DPR, düşük
cihaz kalite profili, isteğe bağlı yükleme ve SVG yedeği vardır. Kamera türü
editör önizlemesinde seçilir; öğrenci sahnesi döndürülemez. Mobil kontrol,
ölçeklenen şeklin dışında 44px dokunma alanı kullanır.

## Faz 4

Gemini korunur. OpenAI Responses ve Qwen için sunucu adaptörleri eklendi.
Tasarımcı yalnız kanıtlı geometrilerden seçim yapar ve kısa bağlam tasarlar;
cevap veya geometrik veriyi değiştiremez. Kör çözücü cevap anahtarını görmez.
Pedagojik denetçi ayrı çağrıda çalışır. Her çağrı katı şemayla doğrulanır.
API hatası, eksik inceleme veya değişmiş içerik yayın kapısını kapatır.

Sağlayıcıdan dönen gerçek kullanım saklanır. Fiyat sunucuda tanımlı değilse
maliyet bilinmiyor gösterilir. AI görseli yalnız özel süsleme taslağıdır; cevap
ve matematiksel şekil olarak kullanılmaz, otomatik eklenmez veya yayımlanmaz.
Gerçek OpenAI çağrısı doğrulanmadı: bağlı Vercel ortamında OpenAI anahtarı yok.
Gerçek AI başarı sonucu veya insan uzman onayı üretilmiş sayılmadı.

## Faz 5

Yeni migration, mevcut verileri yeniden yazmadan stimulus hash, özel işlem ve
görsel kayıt tabloları, özel Storage kovası ve atomik RPC'ler ekler. Geri alma
soruları/görselleri silmez; yeni metadata özel arşive taşınır.

Yerel Postgres testinde atomiklik, tekrar isteği, değişiklik çatışması, rol
izinleri ve geri alma geçti. Canlı Supabase'de migration uygulandı, 100 pilot
inceleme taslağı yazılıp geri okundu. Aynı 10 taslağın tekrar kaydı toplamı
artırmadı: 100 kaldı. Anonim erişimde 0 soru görünür. 9 kullanıcı, 9 profil ve
5.380 toplam XP korundu. Eski özel arşivlere müdahale edilmedi.

Toplu kayıt artık veritabanı onayını bekler. Yalnız ağ/429/5xx kayıt hataları
sınırlı tekrar denenir. Başarısız parçalar ayrı tutulur. AI üretiminin istek kimliği
ve sonuç kaydı aynı taslağı yeniden üretmeden geri alınabilir; belirsiz süren
istek otomatik yeniden faturalandırılmaz. Mevcut kuyruk soruları ayrıca incelenir.

## Faz 6

100 soru: sınıf başına 25, 12 içerik grubu, 47 mantık ailesi. Bağımsız çözüm,
benzersiz seçenek, tekrar kontrolü ve 500 gerçek soru/şık sunucu çizimi geçti.
Denetlenen 100 son taslakta hata yok; üreticinin iç aday retleri ayrıca sayılmadı.

İki AI incelemesi ve insan uzman incelemesi bekliyor. 0 soru yayımlandı. Pilot
kapıları tamamlanmadan daha geniş üretim/yayın yapılmamalıdır. Mobil sonuçları
mobile-report.json içinde, otomatik içerik sonucu automatic-pilot-report.json
ve gerçek kayıt sonucu pilot-report.json içindedir. **348 mobil kontrol geçti:**
100 kayıtlı pilot ve 16 ek üretim/bağlam örneği, 320×568, 390×844 ve 768×1024
ekranlarında denetlendi. Yatay taşma, seçenek dokunma alanları ve okunabilirlik
kontrolleri geçti. Gerçek GLB yüklemesi, WebGL çizimi ve bağlam kaybında SVG'ye
dönüş doğrulandı. SVG karşılaştırmasında piksel farkı 0; hata listesi boş.

## Faz 7

Kod ayrı GitHub dalına gönderildi. **450/450 test**, TypeScript ve tam
`npm run vercel-build` geçti. Derleme ayrıca 73 başlangıç/güvenlik testi,
gerçek Auth bağlantısı, 175 soru testi ve 148 herkese açık varlık kontrolü
çalıştırdı. İlk Auth denemesi başarısız oldu; ayrı gerçek SDK denemesinde
geçersiz token 403/bad_jwt ile reddedildi ve tam derleme tekrarında kontrol geçti.
Kontrol koşulu gevşetilmedi. Büyük parça boyutu uyarısı devam ediyor; 3B motor
isteğe bağlı yükleniyor, bu uyarı performans ölçümünün yerine geçmez.

Vercel `c9388e896436245006b0ff29c17a5c74d2bf4425` kodu için **READY** bildirdi:
https://zekapark-q20ia2oue-dyds-projects-c415ba7a.vercel.app . Koruma ekranı
uygulamaya erişimi durduruyor; yetkili Vercel bağlantısının önizlemeyi açma
işlemi de 403 `read_protection_bypass` döndürüyor. Bu yüzden dağıtılmış
uygulamanın giriş → API → veritabanı akışı doğrulanmış sayılmıyor. Preview
ortamında Supabase sunucu anahtarı yok; ayrı önizleme yapılandırması gerekir.
Üretim anahtarı önizlemelere kopyalanmadı. Yeni V2 için main birleştirilmedi.

[Taslak PR #76](https://github.com/muratteknofest-stack/Bilsem-Junior/pull/76)
açıldı; GitHub birleştirme çatışması bildirmiyor. GitHub Actions V2 görevi
[39593861406](https://github.com/muratteknofest-stack/Bilsem-Junior/actions/runs/39593861406)
başarısız: `verify` işi 2 saniyede, runner atanmadan ve `steps: []` ile sonlandı.
Mevcut Quality/Android iş akışları da başarısız. Bu sonuç yerel test başarısı
ile değiştirilmedi. Ayrıntılı check annotation yolu bağlı GitHub aracı
tarafından desteklenmediği için neden kesinleştirilmedi; faturalandırma veya
hesap sorunu olduğu varsayılmıyor. Vercel'in önizleme yorum kontrolü başarısı,
Actions test başarısı olarak sayılmıyor. Önce CI runner/hesap engeli giderilip
bu PR için iş akışları tekrar çalıştırılmalıdır.

### Fazlara göre teslim ve kalan işler

| Faz | Başlıca değişen dosyalar | Doğrulama / kalan işler |
| --- | --- | --- |
| 1 | Bu rapor; mevcut dokuz hedef dosyanın analizi | Main başlangıcı 436 test ve TypeScript geçti. |
| 2 | `novelty.ts`, `symbolic-v2.ts`, `adaptive-difficulty.ts`, `generators/index.ts`, `learning-question-selection.ts` | 300 yeni sembolik örnek ve mutasyonları; toplam regresyona dahil. Diğer mevcut kategoriler korunur; her kategori için yeni uzman içerik paketi tamamlanmış değildir. |
| 3 | `SpatialCanvas.tsx`, `spatial-scene.ts`, `CubeSculpture.tsx`, `unit-cube-asset.ts`, Blender tarifi ve GLB | Gerçek GLB, mobil WebGL/SVG dönüşü geçti. Fiziksel düşük güçlü cihaz performansı henüz ölçülmedi. |
| 4 | `ai-question-pipeline-v2.ts`, `structured-ai.ts`, `role-config.ts`, `question-decoration.ts`, `AiRoleControls.tsx` | Sağlayıcı hata/şema testleri geçti. Gerçek sağlayıcı başarıları ve OpenAI görseli bekliyor; anahtar tarayıcıya verilmez. |
| 5 | Migration/rollback, `professional-generation-store.ts`, `durable-question-batch.ts`, yönetici rotaları/panelleri | Gerçek kayıt/tekrar okuma, anonim izolasyon ve yerel Postgres geri alma geçti. Mevcut hesaplar korunuyor. |
| 6 | `audit-engine-v2-pilot.tsx`, `check-engine-v2-pilot.mjs`, `tests/browser/engine-v2-pilot.tsx`, raporlar | 100 pilot, 500 sunucu çizimi, 348 mobil kontrol geçti; AI ve insan uzman incelemeleri bekliyor, yayın 0. |
| 7 | `.github/workflows/question-engine-v2.yml`, bu rapor ve PR #76 | Yerel derleme ve Vercel READY doğrulandı; özel V2 önizlemede Supabase bağlantısı hazır. Gerçek hesapla giriş ve CI runner sorunu bekliyor. |

Son salt okunur Supabase kontrolü: 9 kullanıcı, 9 profil, 5.380 XP; pilotta
100 inceleme taslağı, 0 yayın. Otomatik kalite kontrolü uzman değerlendirmesi
veya öğrenme başarısı kanıtı değildir.

## Önizleme giriş düzeltmesi — 21 Ekim 2026

Kullanıcı korunan V2 önizlemede giriş hatası bildirdi; ana canlı sitede girişi
çalışıyor. Ana yayın V2 dalına geçirilmiş değildir. Kod incelemesinde Supabase
transport katmanının aynı adres için bile `credentials: omit` kullandığı bulundu.
Bu, sayfa Vercel hesabıyla açıldıktan sonra Auth/REST isteklerinin erişim
çerezini kaybetmesine yol açar. Aynı origin için `same-origin`, farklı web/native
origin için `omit` kullanılır. Elle verilen Cookie başlığı yine silinir.

Vercel edge kuralı yalnız `/api/supabase/(auth|rest)/v1/` için Cookie başlığını
Supabase'e dış yönlendirmeden önce siler; bearer/apikey başlıkları ve no-store
kuralları korunur. Güncel resmi Vercel JSON şeması doğrulaması geçti.

Değişenler: `src/lib/supabase-transport.ts`, `vercel.json`, ilgili 14 regresyon
testi, `scripts/check-protected-preview-auth.mjs`, npm komutu ve V2 CI adımı.
14/14 transport testi geçti. Gerçek Chromium HTTP cookie deneyi geçti: aynı
adres için çerez var, çapraz adreste çerez yok; bearer başlığı her durumda korundu.
Sonuç `preview-auth-cookie-report.json` içinde kayıtlıdır. Bu yerel deney
Vercel'de gerçek kullanıcı girişi kabulü olarak sunulmaz.

Dağıtılmış kabul hâlâ engelli: Vercel MCP koruma erişiminde 403
`read_protection_bypass`; CLI'da oturum yok. Ortam listesinde sunucu
`SUPABASE_SERVICE_ROLE_KEY` yalnız Production için tanımlı. Preview için ayrı
sunucu yapılandırması ve bağlantıya proje/takım erişimi gerekir. Mevcut üretim
anahtarı önizlemelerin tamamına açılmadı; hesaplar, şifreler veya giriş koruması
değiştirilmedi. Yeni URL aşağıdaki PR'da takip edilir.

Son dağıtım denemesi: Vercel `POST /v13/deployments`, doğru
`team_OCPzh4sUtUTDyhohl2KeH6C0` kapsamında **403 forbidden** döndürdü.
Sunucunun bildirdiği çözüm: bağlı hesaba `dyds-projects-c415ba7a` takım
erişiminin kullanıcı tarafından verilmesi (`grant_team_access`); yalnız SSO
girişi bu yetkiyi eklemez. CLI kimlik bilgisi de yok. Yeni Auth düzeltmesi
GitHub dalında `2119dd9fc599e17779cee3c1a873591fa4acfd9d` ile kayıtlıdır;
dağıtıldığı veya gerçek kullanıcıyla girişin başarılı olduğu iddia edilmez.
Değişen transport dosyalarında TypeScript strict kontrolü geçti. Ana canlı
health kontrolü mevcut `7592e42` sürümünü, `database: ready` durumunu döndürdü;
Auth settings 200 ve boş parola isteği 400/validation_failed döndü.

## Tarayıcı üzerinden V2 dağıtımı — 21 Ekim 2026

Vercel MCP takım erişimi 403 kalırken kullanıcının açık onayıyla tarayıcıdaki
mevcut Vercel oturumu kullanıldı. `b1f30360d9fb278b0730150779315f6ad2661f38`
commit'i Preview ortamına dağıtıldı. Dağıtım `dpl_CU6A4zQT2pZEX2V4UZ8WBVcsejrz`,
5 dk 24 sn sonunda READY: https://zekapark-jfrfrik3m-dyds-projects-c415ba7a.vercel.app/ .
Vercel'de 175 soru testi (0 hata), TypeScript ve 148 herkese açık varlık kontrolü
geçti. Ana sayfanın gerçekten çizildiği tarayıcıda görüldü.

`/api/health` gerçek yanıtta `{"status":"unavailable","database":"unavailable"}`
döndü. Önizleme sunucusu hazır değildir; gerçek hesapla giriş kabulü iddia
edilmez. `SUPABASE_SERVICE_ROLE_KEY` hâlâ yalnız Production ortamındadır.
Otomatik güvenlik incelemesi bu mevcut üretim anahtarına Preview erişimi ekleme
adımını reddetti; değişiklik kaydedilmedi. Üretim veritabanına yetkili erişim
vereceği için yalnız güvenilen V2 dalının özel Preview sunucusuyla sınırlandırılan
kullanım ayrıca açık kullanıcı onayı bekliyor. Anahtar okunmadı, kopyalanmadı
veya yeni bir anahtarla değiştirilmedi. Üretim yayını değiştirilmedi.

Makine okunabilir sonuç: `preview-deployment-report.json`.

## V2 önizleme sunucu bağlantısı tamamlandı — 21 Ekim 2026

Kullanıcının mevcut üretim Supabase anahtarını yalnız güvenilen V2 dalının özel
Preview sunucusunda kullanmaya verdiği açık onay üzerine ayrı bir Secret kaydı
eklendi. Kapsam yalnız `codex/question-engine-v2-20261021`; genel Preview ve
Development seçilmedi. Mevcut Production kaydı değiştirilmedi. Anahtar değeri
kaynak koda veya bu rapora eklenmedi. Önceki bölümdeki onay bekleme durumu giderildi.

Aynı incelenmiş uygulama kodu `b1f30360d9fb278b0730150779315f6ad2661f38`,
güncel sunucu ayarlarıyla `dpl_GoAYk9Be261J7XfY6dEYEbJ5ErJR` olarak yeniden
Preview ortamına dağıtıldı. 4 dk 49 sn sonunda READY:
https://zekapark-i80xtpkqn-dyds-projects-c415ba7a.vercel.app/ .

Bu dağıtımda 74 başlangıç/güvenlik ve 175 soru testi, TypeScript, gerçek Auth
bağlantı kontrolü ve 148 varlık taraması geçti. Varlık taraması tanınan özel
anahtar veya source map bulmadı. Büyük SpatialCanvas parçası uyarısı sürüyor.
Bu kontrol önceki 450 testin tamamının yeniden çalıştırıldığı anlamına gelmez.

Gerçek tarayıcı isteğinde `/api/health`, `status: ok, database: ready`, doğru
proje referansı ve `b1f3036` commit'ini döndürdü. Bu uç nokta `profiles`,
`learning_sessions`, `platform_settings` tablolarına sınırlı okuma yapar;
veritabanına yazma yapılmadı. Ana sayfa gerçekten çizildi. Gerçek kullanıcıyla
parolalı giriş henüz doğrulanmadı; sunucu hazırlığı bunun yerine sunulmaz.

GitHub PR başı artık `972edf1` commit'ini gösteriyor. Güncel V2 Actions
çalışması `39624951642` yine runner atanmadan (`runner_id: 0`, `steps: []`)
başarısız; CI geçti sayılmıyor. PR taslak kalır; main veya üretim yayını
birleştirilmedi. Pilotun AI ve insan uzman incelemeleri beklemeye devam eder.

Bu adımda değişen dosyalar: `PROGRESS.md` ve `preview-deployment-report.json`.

## Profesyonel test oluşturma — 21 Ekim 2026

`test-assembly.ts`, mevcut üreticileri koruyarak sınıf kotasına göre kısa giriş,
ana çalışma ve pekiştirme sorusu planlar. Zorluk seviyelerinin adetleri değişmez;
son sıralama artık soruları kendi zorluk yuvalarından çıkarmaz. Son beş sorudaki
alan/tür yoğunluğu ve art arda gelen mantık aileleri dikkate alınır. Bu sıralama
bir ürün sezgiselidir; psikometrik eşdeğerlik veya öğrenme başarısı iddiası değildir.

Türkçe karma test ve macerada normal seçim, mevcut son 30 gün / en fazla 30 oturum
bağlamında görülmemiş soru ister. İsim/şık sırası değişikliği aynı kökü gizlemez;
aynı oturumda kök ve görsel tekrarı engellenir. Havuz tükenince sessiz tekrar
yapılmaz. Belirli konu tekrarları ve sonlu İngilizce havuzu, açık `oldest-first`
seçim politikasıyla önceki çalışma davranışını korur. Eski kayıtlar yeniden yazılmaz.

Değişen uygulama dosyaları: `server/learning-question-selection.ts`,
`server/routes/learning-routes.ts`, `src/features/questions/test-assembly.ts`,
`src/features/student/learning-selection.ts`. Yeni test `tests/test-assembly.test.ts`;
mevcut iki tekrar testi açık tekrar politikasını kullanacak şekilde güncellendi.
Yeni kodda `any` eklenmedi. npm test ve soru testleri yeni dosyayı çalıştırır;
`npm run audit:test-assembly` makine okunabilir raporu yeniden üretir.

Sonuç: **456/456 regresyon testi**, TypeScript ve tam `npm run vercel-build`
geçti. Derlemede gerçek Auth bağlantısı, 74 başlangıç/güvenlik, 180 soru testi
ve 148 varlık kontrolü çalıştı. Ayrı denetim 4 sınıfta 12 gerçek algoritmik test
ve 240 soru oluşturdu; bağımsız çözüm, zorluk sırası, dengeli alanlar ve yakın
geçmişe göre yenilik geçti. Test başına 16–17 tür, 16–19 mantık ailesi görüldü.
Bu QA soruları veritabanına yazılmadı veya yayımlanmadı.

**348 mobil kontrol yeniden geçti:** 320×568, 390×844, 768×1024; gerçek Blender
GLB / WebGL ve bağlam kaybında SVG yedeği doğrulandı, piksel farkı 0, hata 0.
İlk yerel tarayıcı başlatması eksik açılmış Chromium dosyası nedeniyle çöktü;
resmî arşivin CRC denetimi yapılıp yeniden açılınca tam tekrar başarılı oldu.
100 kayıtlı pilotta 500 çizim ve matematik denetimi tekrar geçti.

Canlı salt okunur yayın denetimi: 100 review, 0 published, 0 eligible;
100 kör AI ve 100 pedagojik AI incelemesi bekliyor, reviewed_by dolu kayıt 0.
Mevcut yayın kapıları korunur; herhangi bir soruya tamamlanmamış inceleme/onay
atanmadı. Yeni toplu üretim yapılmadı, mevcut sorular silinmedi veya yayımlanmadı.
Yayın engeli `publication-readiness-report.json`, algoritma kapsamı
`test-assembly-report.json` içinde kayıtlıdır. Bu adım main'i değiştirmez.
