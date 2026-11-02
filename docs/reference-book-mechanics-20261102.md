# Kullanıcı örneğine göre özgün soru yapıları — 2 Kasım 2026

Kaynak: kullanıcının sağladığı 132 sayfalık “1. Sınıflar için BİLSEM Kitabı” (Yılmaz Ölmez başlıklı PDF). Bölüm yapısı, sayfaların küçük önizlemeleri ve seçilen büyük sayfa örnekleri incelendi. Kaynakta “çıkmış sorular” başlığı bulunması resmî köken veya güncel sınav eşdeğerliği kanıtı sayılmadı. Kaynak PDF, fotoğrafları, sayfa görüntüleri, soruları ve seçenekleri uygulamaya/depolarına aktarılmadı. Aşağıdaki motorlar bağımsız kod, özgün nesne çizimleri ve yeni sayısal/verisel örnekler üretir.

## Kaynaktan uygulamaya eşleme

| PDF sayfası / yapısı | Uygulamadaki karşılığı | Durum |
|---|---|---|
| 8–17 ilişkilendirme; 29–35 iki çiftli benzeşim | Araç–kullanıldığı nesne ilişkisi; örnekten yeni çifte aktarım | Yeni `semantic-analogy` |
| 19–21 örüntüde yanlış kart; 22–27 devam | Görünür tekrar birimine göre yanlış konum; devam için mevcut iki özellikli/iç içe örüntüler | Yeni `broken-pattern`, önceki örüntüler korunur |
| 38–47 eşleri gör, sonraki sayfada hatırla; 5. sayfada sayı sırası tanımı | Eşleştirme ve sayı sırası için ayrı göster–gizle–hatırla evreleri | Yeni `paired-memory` / `number-memory` |
| 50–54 üç boyutlu katmanların üstten görünüşü ve küp yüzleri | Merkezlenmiş renkli katmanlarda gerçek örtüşme; önceki yeni küp/karşı yüz motoru | Yeni `layered-top`, `cube-lab-1` korunur |
| 56–64 denge / resimli bilinmeyenler; 70–91 resimli aritmetik | Mevcut bağımsız çözümlü denge, çok ipuçlu sembolik eşitlik ve işlem motorları | Korunur; kaynakta 1. sınıfa ağır gelebilen çarpma/bölme işlemleri kopyalanmaz |
| 66–69 sözcük–rakam örneklerinden şifre | Nesne anahtarıyla sıralı kodlama; harf–rakam ilişkisini örneklerden çıkarma | Yeni `symbol-code` / `word-code` |
| 93–105 eksik desen parçası | Açık tekrar birimi ve görünen desenin boşluğuna uygun parça; konum fazı korunur | Yeni `texture-patch` |
| 106–109 parçalarla bütünü kur | Adlandırılmış iki/üç parçanın tam hücre birleşimi; fazladan hücre yasak | Yeni `parts-union` |
| 112–126 şekil matrisi, dönüş, ilişki | Mevcut satır/sütun, yön, adet/doluluk ve bileşik dönüş motorları | Korunur; hazır resim veya cevap anahtarı aktarılmaz |

Kaynakta farklı seçenek sayıları bulunur; uygulamanın bağımsız doğrulamalı dört seçenek sözleşmesi korunur. Yeni dokuz mekanik sekiz mevcut konu alanını genişletir; dokuz yeni konu alanı veya kaynağın birebir dijital kopyası olarak sunulmaz.

## Sınıf ve güçlük ayrımı

- 1. sınıfta okuma gerektiren sözcük şifresi yoktur. Üç eş/üç sayı, iki nesneli tekrar birimi, iki katman, küçük desenler ve iki parçalı birleşim vardır.
- Üst sınıflarda bellek/anahtar yükü kademeli artar; sınıf çalışma belleği sınırları korunur. Kodlama örnekleri sorgudaki her harfi kapsar ve aynı harf için çelişkili rakam verilemez.
- Yanlış örüntü kartı örnek birimde zaten bulunan bir nesneye çevrilir. Öğrenci yalnız “farklı nesneyi” seçerek geçemez; kartın sırasını denetlemelidir.
- Sözcük kodunda üst düzeyler daha uzun sorgular kullanır. Rakam dizisi aritmetik büyüklük değildir; baştaki sıralama ve tekrar eden harfler korunur.
- Katmanlar 3B görünümde sıra ve şekilleriyle sunulur. Dört seçenek; ters katman sırası, yanlış üst şekil veya yanlış renk gibi görünür hatalar içerir. İçteki küçük katmanlar tamamen örtülmez. Şekil ve renk birlikte değerlendirilir.
- Parça birleştirmede döndürme/kaydırma yoktur; bu koşul yönergede açıktır. Tam hedefi üreten alt kümeler sayılır; birden fazla çözümde soru reddedilir.
- Temel anlam ilişkileri en fazla seviye 2, yeni mekanikler en fazla seviye 4 olarak etiketlenir. Mevcut 5–6. düzey doğrulanmış motorlar korunur. Bunlar yazılımsal/editoryal sınırlar, psikometrik güçlük ölçümleri değildir.

## Çözümler ve öğrenci sınırı

`reference-lab-1` yalnız görünür verilenleri saklar: örnek çiftler, tekrar birimi ve dizi, hatırlanacak bilgi, kod örnekleri, işaretli boşluk, parçalar veya katmanlar. Desenin eksik hücreleri `null`'dır; gizli cevap resmi veya cevap dizisi öğrenci çizim verisinde yoktur. Katı şemalar çizilmeyen alanları reddeder. Bellek pratiğinin özgün çalışma bilgisi sunucu anlık görüntüsünde ve istemci oturumunda bulunur; tarayıcı güvenliğine dayanan bir gözetimli bellek ölçümü iddiası yoktur.

Birincil çözüm kuralı kurar; dört aday ayrı koşul denetiminden geçer. Örüntüde aday konumu dışındaki bütün kartlar doğru, aday kart yanlış olmalıdır. Parçada, seçeneğin görünen hücreleri kaynakta o numarayla gösterilen parçayla birebir eşleşmelidir; sonra birleşim hedefin bütün hücreleriyle karşılaştırılır. Desen parçası yerine yerleştirilir ve bütün desen yeniden denetlenir. Katmanlar için seçenek farkı gizli veri üzerinden değil, üstte kalan görünür malzemenin örneklenmesiyle hesaplanır. Değişik parça sırası aynı kümeyi yeni seçenek yapmaz.

Kanonik tohumla yönerge, açıklama, görsel yapı, bütün seçenekler ve çeldirici notları yeniden oluşturulur. Değişmiş veya iki doğru seçenekli bir soru yayımlanmaya hazır sayılmaz. Doğal nesne ilişkileri kapalı bir olgu sözlüğü kullanır; otomatik koşul doğrulaması gerçek öğretmen veya psikometrik inceleme yerine geçmez.

Hafıza sorularında cevap alanı ilk gösterimde kilitlidir. Öğrenci “Deseni gizle ve cevapla” dediğinde eşler/sayılar çizim DOM'undan kaldırılır ve sorgu/cevaplar açılır. Sonuç incelemesinde özgün çalışma tekrar görülebilir. Bu, kitapta ayrı sayfa kullanma yaklaşımının uygulama içi karşılığıdır; klinik bellek ölçümü değildir.

## Uyumluluk ve paket

Yeni istemci `reference-lab-1` ister. Önceki `cube-lab-1`, `perceptual-1` ve diğer biçimler uyumlu bankalarını almaya devam eder; kayıtlı oturumlar değiştirilmez. Robot ve karışık çalışma yeni varyantları kullanabilir. Konu pratiği yeni nesil referans/küp/görsel ilişki havuzlarını birlikte değerlendirebilir; yeni motor bir önceki mekanikleri dışlamaz.

`scripts/generate-reference-bank.ts`, desteklenen 107 sınıf–seviye–mekanik hücresinde 10'ar özgün görünür soru üretir: 1. sınıf 160, 2. sınıf 250, 3. ve 4. sınıf 330'ar; toplam 1.070. Seçenek değiştirme veya sınıf etiketi değişikliği tekrarları gizlemek için kullanılmaz. İlk durum `review`, `individualHumanReview=false`, `editorReview=pending`'dir. `--verify` tam yeniden çözüm ve dağılım kontrolü yapar. Uyumlu üretim sürümü hazır olmadan etkinleştirme yapılmaz; geçmiş sorular ve öğrencilerin kaydedilmiş çalışmaları korunur.

## Doğrulama

Elle hesaplanan anlam/örüntü/bellek/kod/eksik parça/alt küme/katman örnekleri; eksik ve çelişkili kodlar; değiştirilmiş cevaplar, seçenekler ve açıklamalar; her desteklenen hücrede 20 tohum; görünür seçenek eşsizliği, hafıza kilidi ve eski istemci uyumluluğu test edilir. Gerçek tarayıcı kontrolü dört sınıftan 35 soru kartını 320/390/768/1440 pikselde denetler; hafıza sorularında bilgi gizleme, şık seçme ve kart yerleştirme doğrulanır. Görseller yalnız iç inceleme içindir.

İçerik üretimi çocuk deneyi, bireysel eğitmen onayı, insan sesi, resmî BİLSEM soru bankası veya ticari yayın kabulü değildir. Önceki kayıt/satış ve hukuki/Play/cihaz kabul kapıları değişmez.
