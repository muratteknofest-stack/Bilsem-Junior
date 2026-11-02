# Özgün görsel soru mekanikleri — 2 Kasım 2026

Bu çalışma, kamuya açık ürün tanıtımları, ücretsiz örnek sayfaları ve bir ebeveyn rehberindeki soru türlerini karşılaştırır. Ücretli uygulamaların tam bankaları, gerçek sınav maddeleri veya kullanıcı sonuçları incelenmemiştir. Rakip sorular, seçenekler, görseller ve sayfa tasarımları kopyalanmamıştır. Aşağıdaki mekanikler Bilsem Junior için bağımsız olarak yazılmıştır; eşdeğer psikometrik kalite veya sınav başarısı iddiası değildir.

## İncelenen birincil kaynaklar

| Ürün | Açık kaynak | Karşılaştırmada kullanılan özellik |
| --- | --- | --- |
| MentalUP | [Görsel zekâ soruları](https://www.mentalup.net/blog/zeka-sorulari), [bireysel SSS](https://www.mentalup.net/sss/bireysel) | Görsel ilişkiler, parça–bütün, perspektif ve çözüm açıklaması |
| Bilsem Online | [Özellikler](https://www.bilsemonline.com/ozellikler), [29 Aralık 2023 tarihli örnek yazısı](https://bilsemonline.com/blog/bilsem-sinavi-cikmis-sinav-sorulari-ve-cevaplari) | Matris, benzeşim, kodlama, kısa süreli bellek, perspektif; eski yazı güncel sınav bankası sayılmadı |
| Bilsem Zeka | [2026 ebeveyn rehberi](https://bilsemzeka.com/wp-content/uploads/2026/02/BILSEM-KITABI-EBEVEYN-REHBERI.pdf), [ürün SSS](https://bilsemzeka.com/sikca-sorulan-sorular/) | Açık demo türleri: örüntü, simetri, sınıflama, şekil sayma, bellek, küp ve denge |
| BilsemTeknik | [Soru türleri](https://bilsemteknik.com/bilsem-sorulari), [matris örnekleri](https://bilsemteknik.com/bilsem-sorulari/matris), [örüntü açıklaması](https://bilsemteknik.com/blog/bilsem-oruntu-sorulari-nasil-cozulur) | Satır/sütun ilişkisi, örneklerden kural çıkarma ve adım adım açıklama |

Erişim tarihi 2026-11-02. Kaynakların soru sayısı, yaş etkisi ve başarı oranı gibi pazarlama beyanları doğrulanmış ürün ölçütleri olarak kullanılmadı. Yalnız soru türü ve görünür akıl yürütme yapıları karşılaştırıldı.

## Motora eklenenler

Mevcut motor matris, perspektif, bellek, simetri, parça–bütün, denge ve kodlama başlıklarını zaten içeriyordu. Eksik olan, bazı başlıklarda adet, yön ve doluluğu birlikte izleme ve çeldiriciyi belirli bir hataya bağlama çeşitliliğiydi. Altı yeni mekanik mevcut beş konu başlığını genişletir; bunlar altı yeni BİLSEM konu alanı olarak sayılmaz.

| Mekanik | Mevcut konu | Öğrencinin yaptığı çıkarım |
| --- | --- | --- |
| `analogy-grid` | 2×2 matris | Üst satırdaki adet ekleme/çıkarma, çeyrek dönüş ve doluluk değişimini alt satıra uygular |
| `paired-analogy` | Görsel benzeşim | İki tamamlanmış çiftten toplama ile iki katına çıkarma/yarıya indirmeyi ayırır; aynı ilişkiyi yeni çifte taşır |
| `matrix-attributes` | 3×3 matris | Eksik adedi hem satırdan hem sütundan bulur; yön ve doluluk koşullarını birlikte sağlar |
| `feature-classification` | Sınıflama | Üç örneğin bir veya iki ortak özelliğinin tümünü sağlayan seçeneği seçer |
| `attribute-sequence` | Görsel örüntü | Adet artış/azalışı, dönüş ve doluluk değişimini birlikte sürdürür |
| `interleaved-sequence` | Görsel örüntü | Tek ve çift numaralı iki bağımsız diziyi ayırır; doğru diziyi devam ettirir |

Şekiller özgün SVG ok, bayrak, anahtar ve yapraktır. Renk şekle bağlıdır; tek başına doğru cevabı belirlemez. Her şeklin dört çeyrek dönüşü birbirinden ayırt edilebilir. Yeni mekanikler, mevcut perspektif/bellek/katlama motorlarının yerine geçmez.

## Kabul kuralları

- Görünür kartlar ve eksik yer dışında öğrenci verisinde cevap, gizli katsayı, kural parametresi veya cevap anahtarı bulunmaz. Katı şema ek alanları reddeder.
- Birinci çözüm örneklerden kural çıkarır; ikinci çözüm dört adayı ayrı ayrı yerleştirerek tamamlanmış ilişkileri kontrol eder. İkisi tek seçenekte birleşmezse soru sunulmaz.
- Benzeşimde tek örnekten toplama/çarpma belirsizliği yaratılmaz: 2×2 yönergesi ekleme/çıkarma ailesini belirtir; çarpımsal benzeşimde iki farklı başlangıç adedi gösterilir.
- Matris yalnız son satırı kontrol etmez: üç satır, üç sütun, yön ve doluluk birlikte denetlenir. Sınıflama bütün ortak özellikleri zorunlu tutar.
- Çeldiriciler öncelikle bir koşulu yanlış uygular; bir koşullu sınıflamada farklı serbest özellikler kullanılsa da her yanlış kart ortak koşulu bozar. Açıklama, bozulan özelliği adlandırır.
- 1. sınıfta en fazla dört şekil/adet; 3×3 ve iç içe örüntü yoktur. İç içe örüntü 2. sınıf ve seviye 2 ile başlar. Diğer yeni mekanikler en fazla seviye 3, 3×3 en fazla seviye 4 üretir. Seviye 5–6 etiketleri basit sorulara verilmez.
- Adet, sonra dönüş, sonra doluluk eklenir; 3×3 seviye 4 iki eksendeki değişimleri birleştirir. Bunlar yazılımın editoryal yük sınırlarıdır; deneysel güçlük kalibrasyonu değildir.
- Tohum, renk, şekil adı, seçenek sırası ve yalnız çeldirici değişimi yeni akıl yürütme kuralı sayılmaz. Ortak mekaniklerin kullanım geçmişi aynı stil altında sayılır.
- Yeni biçim `perceptual-1` ile istenir. `reasoning-lab-2` önceki müfredat çizimlerini almaya devam eder; eski istemci yeni kartları alamaz. Kayıtlı testte uyumsuz biçim 426 verir, cevaplar silinmez.
- Robot ve karışık test üreticisi yeni motoru kullanabilir. Konu testleri yayımlanmış havuzdan seçilir; yeni motorun yayımlanmış adayları isteği doldurabildiğinde tercih edilir.

## Doğrulama ve içerik kaydı

`tests/perceptual-engine.test.tsx` elle hesaplanan örnekleri, belirsizliği, değiştirilmiş ipuçlarını/anahtarları/açıklamaları, her desteklenen sınıf–seviye–mekanik hücresini, geçmiş istemci uyumluluğunu ve özgün SVG çizimlerini denetler. `test:question-art` gerçek Chromium'da 32 şekil/doluluk/yön durumunun farklı ve kırpılmamış çizildiğini, 320/390/768/1440 pikselde kartların sığdığını, seçim ve yerleştirme kiplerini kontrol eder.

`scripts/generate-perceptual-bank.ts` hücre kotalı, tekrar üretilebilir paket oluşturur; sınıf etiketi ve çeldirici değişikliklerini çıkararak görünür ipuçlarının SHA-256 özetiyle bütün paket boyunca tekrarları reddeder. `--verify` yeniden çözüm ve dağılım kontrolü yapar. Çıktı ilk olarak `review` durumundadır. Sunuma geçişte kanonik motor sürümü ve doğrulama kanıtı korunmalı, mevcut sorular/sunulmuş testler değiştirilmemelidir.

Her kayıtta `individualHumanReview: false` ve `editorReview: pending` açıkça tutulur. Otomatik matematiksel/görsel kontrol; bağımsız eğitimci, çocuk kullanılabilirlik çalışması, madde güçlüğü/ayırt ediciliği veya ticari yayın onayı yerine geçmez.
