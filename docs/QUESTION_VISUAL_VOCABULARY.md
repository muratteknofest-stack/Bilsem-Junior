# Soru görselleri

## Tek sözlük

`src/features/questions/visual-vocabulary.ts` 12 sembolün kimliğini, Türkçe adını, SVG yolunu ve rengini tanımlar. Soru üretimi, kalite kontrolü, soru tahtası ve eşleştirme hedefleri bu sözlüğü kullanır. Tanımsız sembol başka bir şekle dönüştürülmez; sınıf denetiminde reddedilir.

Yeni `verified-5` motoru sayma ve sembol kodlamada soru başına 3–4 farklı sembol seçer. Sembol havuzu genişlerken hücre sayısı, işlem yükü ve sınıf sınırları korunur. Eski `verified-2`, `verified-3` ve `verified-4` içerikleri kendi doğrulanmış üretim yollarını kullanır. v3 için dondurulmuş içerik özetleri geriye uyumluluğu test eder.

## Desen stilleri

Kare, daire, eşkenar dörtgen, sekizgen, dört yapraklı çiçek ve dört uçlu yıldız olmak üzere altı hücre işareti ve beş renk ailesi vardır. Soru kimliği ve seed yalnızca sunum stilini seçer. Seçim, doğru cevabı ve seçenek sırasını okumaz; mantıksal veriyi değiştirmez. Bütün işaretler 90° dönüşte ve aynalamada aynı silueti korur. Böylece soru kuralı yalnızca dolu hücrelerin konumlarıyla ilgilidir.

`QuestionRenderer`, `OptionRenderer` ve `AnswerWorkspace` aynı sorudan aynı stili alır. Yeni bir seçenek önizlemesi eklerken `OptionRenderer` bileşenine `question` verilmelidir. Cevap anahtarı gizlenen sunucu görevleri ortak varsayılan stili kullanır.

## Netlik ve erişilebilirlik

- Çizimler SVG'dir; büyütmede raster bulanıklığı oluşmaz.
- Renk, sembol kimliğinin tek göstergesi değildir; her sembolün ayrı silueti vardır.
- Dolu ve boş hücre konumları ekran okuyucu etiketinde açıklanır.
- Sade görünüm hacim efektini kaldırır; şekil ve mantıksal düzen aynı kalır.
- Sembol eşleştirme hedefleri metin adını ve gerçek SVG çizimini birlikte gösterir.
- Dönen, yanıp sönen veya cevabı işaret eden süslemeler eklenmez.

## Doğrulama

`tests/question-visuals.test.tsx` 720 yeni sembol sorusunda iki bağımsız çözücüyü, 330 eski v3 sorunun kabulünü, dondurulmuş v3 içeriklerini, altı stilin çeşitliliğini ve soru/seçenek eşleşmesini sınar. Vercel derlemesindeki `test:questions` komutuna dahildir.
