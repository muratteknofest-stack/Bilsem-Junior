# Bilsem Junior soru motoru V2

Temel: main / 7592e423ce5e45f7b8d12680df2c520fffed98cd.
Dal: codex/question-engine-v2-20261021. Mevcut kullanıcılar ve soru motorları korunur.

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

GitHub Actions sonucu PR açıldıktan sonra ayrıca kontrol edilecek. Vercel'in
önizleme yorum kontrolü başarısı, Actions test başarısı olarak sayılmıyor.

### Fazlara göre teslim ve kalan işler

| Faz | Başlıca değişen dosyalar | Doğrulama / kalan işler |
| --- | --- | --- |
| 1 | Bu rapor; mevcut dokuz hedef dosyanın analizi | Main başlangıcı 436 test ve TypeScript geçti. |
| 2 | `novelty.ts`, `symbolic-v2.ts`, `adaptive-difficulty.ts`, `generators/index.ts`, `learning-question-selection.ts` | 300 yeni sembolik örnek ve mutasyonları; toplam regresyona dahil. Diğer mevcut kategoriler korunur; her kategori için yeni uzman içerik paketi tamamlanmış değildir. |
| 3 | `SpatialCanvas.tsx`, `spatial-scene.ts`, `CubeSculpture.tsx`, `unit-cube-asset.ts`, Blender tarifi ve GLB | Gerçek GLB, mobil WebGL/SVG dönüşü geçti. Fiziksel düşük güçlü cihaz performansı henüz ölçülmedi. |
| 4 | `ai-question-pipeline-v2.ts`, `structured-ai.ts`, `role-config.ts`, `question-decoration.ts`, `AiRoleControls.tsx` | Sağlayıcı hata/şema testleri geçti. Gerçek sağlayıcı başarıları ve OpenAI görseli bekliyor; anahtar tarayıcıya verilmez. |
| 5 | Migration/rollback, `professional-generation-store.ts`, `durable-question-batch.ts`, yönetici rotaları/panelleri | Gerçek kayıt/tekrar okuma, anonim izolasyon ve yerel Postgres geri alma geçti. Mevcut hesaplar korunuyor. |
| 6 | `audit-engine-v2-pilot.tsx`, `check-engine-v2-pilot.mjs`, `tests/browser/engine-v2-pilot.tsx`, raporlar | 100 pilot, 500 sunucu çizimi, 348 mobil kontrol geçti; AI ve insan uzman incelemeleri bekliyor, yayın 0. |
| 7 | `.github/workflows/question-engine-v2.yml`, bu rapor ve PR | Yerel derleme ve Vercel READY doğrulandı; Actions ve korunan önizleme uçtan uca kabulü tamamlanmadı. |

Son salt okunur Supabase kontrolü: 9 kullanıcı, 9 profil, 5.380 XP; pilotta
100 inceleme taslağı, 0 yayın. Otomatik kalite kontrolü uzman değerlendirmesi
veya öğrenme başarısı kanıtı değildir.
