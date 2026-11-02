# Küp motoru ve okunaklı 3B çizimler — 2 Kasım 2026

Yeni `cube-lab-1` motoru, mevcut küp sayma, üst görünüş, çok yönlü görünüş ve küp açılımı konularını genişletir. Eski sorular ve kaydedilmiş çalışmalar değiştirilmez. Teknik kanıtlar eğitimci veya psikometrik onay olarak sunulmaz.

## Mekanikler ve sınıf sınırları

| Mekanik | İşlem / görünür bilgi | Sınıf |
|---|---|---|
| Toplam küp | Yükseklik toplamı ve bağımsız birim küp sayımı | 1–4 |
| Belirli katman | O seviyeye ulaşan sütunlar | 1–4, seviye 2 ve üstü |
| Bloğu tamamla | Tam dolu hedef hacim eksi mevcut küpler | 2–4, seviye 2 ve üstü |
| Ön görünüş | Aynı plan sütunundaki en yüksek kule | 1–4 |
| Sağ görünüş | Plan satırlarının ters sıralı en yüksek kuleleri | 2–4 |
| Üst görünüş | Dolu taban hücreleri | 1–4 |
| Döndürülmüş üst görünüş | Merkez çevresinde 90/180/270 derece saat yönü | 2–4, seviye 2 ve üstü |
| Karşı küp yüzü | 11 geçerli küp açılımından ortak kenarla katlama | 2–4, seviye 2 ve üstü |

1. sınıf 2×2 taban ve en fazla iki kat; en kolay düzeyde en fazla dört küp kullanır. 2. sınıf en fazla 3×3 taban/üç kat, üst sınıflar en fazla 4×4 taban/dört kat kullanır. Toplam çizilen küp yükü mevcut sınıf sınırları olan 16/24/30/36'yı aşamaz. 1. sınıfta küp açılımı ve zihinsel döndürme üretilmez. Yeni mekanikler en fazla seviye 4 içindir; basit bir soruya 5–6 etiketi yapıştırılmaz. Üst seviyelerde önceki doğrulanmış motorlar uyumlu kalır. Bunlar editoryal yük sınırlarıdır, deneysel güçlük ölçümleri değildir.

Yapılar zemin üzerinde, destekli ve yüzey komşuluğuyla bağlı sütunlardan oluşur. Her sütunun yüksekliği aynı anda planda görünür. Gizli küplerin tek örtülü resimden tahmin edilmesi istenmez. ÖN planın alt kenarı; SAĞ sağ kenarıdır. Sağ görünüşte alt plan satırı solda görünür. Üst görünüşte sayılar değil dolu/boş yerleşim ölçülür.

## İki çözüm ve yayın güvenliği

Birinci çözücü yükseklik toplamı/eşik/maksimum ve tamsayı hücre dönüşlerini kullanır. İkinci çözücü birim küp koordinatlarını tek tek kurar, görünüşlerde aynı ışınlara düşen küpleri birleştirir ve dolu hedef hacimdeki eksik koordinatları sayar. Açılımlarda biri yüz çerçevelerini, diğeri çapraz çarpımla 90 derece vektör dönüşlerini kullanır. Bağlantısız, yinelenen, çevrimli veya üst üste katlanan açılımlar reddedilir. Cevap anahtarı bağımsız çözücüye verilmez.

Katı öğrenci şeması; yalnız plan, mekanik, yön/katman/hedef ve görünür yüz etiketlerini içerir. Gizli cevap veya katsayılar eklenemez. Kanonik tohumla şablon yeniden kurulurken yönerge, açıklama, seçenekler ve editoryal notların tamamı karşılaştırılır. Cevap anahtarı bozulduğunda, görünür seçenekler aynı olduğunda veya şablon değiştiğinde soru sunulmaz.

Yeni istemci `cube-lab-1` ister. Önceki `perceptual-1` ve daha eski biçimler kendi uyumlu sorularını almaya devam eder. Uyuşmayan kayıtlı soru 426 ile güncelleme ister; kaydedilmiş cevaplar silinmez. Robot ve karışık test motoru yeni varyantları seçebilir; konu pratiği yeterli yeni yayımlanmış aday bulunduğunda yeni küp havuzunu tercih eder.

## Çizim kalitesi

SVG çiziminde birim küpün üç eksendeki izdüşen kenar uzunlukları tam eşittir. Üst/sol/sağ yüzlere ayrı malzeme ışığı, koyu ve net kenar çizgileri uygulanır. Katı içindeki yüzler çizilmez; dış birim küp sınırları kalır. Görünüm kutusu en yüksek kuleye ve bütün yüzlere göre hesaplanır. ÖN/SAĞ okları gerçek taban kenarlarına bağlıdır. Çizim vektöreldir; sabit çözünürlüklü bir fotoğraf veya 4K raster varlık iddiası yoktur. Önceki atölye küp soruları da aynı iyileştirilmiş çizimden yararlanır.

Mevcut tembel yüklenen WebGL/Blender görünümü ve cihazda kullanılamadığında SVG'ye dönüş korunur. Kamera değerlendirmede sabittir. Plan her iki görünümde aynı koordinat düzenini kullanır. Seçenekler ve yerleştirme kartları da aynı tam hücre bilgisiyle çizilir; renk tek başına cevap belirlemez.

## Doğrulama kapsamı

`tests/cube-lab.test.tsx`: elle hesaplanan katman/hacim/üç yön/90 derece örnekleri, bilinen karşı yüz çiftleri, 11 açılım, 1.660 sınıf–zorluk–mekanik/tohum örneği, eş kenarlar, iç yüzlerin elenmesi, kırpılma sınırları, şema tahrifatı, eski istemci uyumluluğu ve robot/karışık çalışma entegrasyonu.

`scripts/generate-cube-bank.ts`: 83 desteklenen hücrede 20'şer soru; 1.660 farklı görünür kök. Sınıf etiketi veya yalnız yanlış seçenek değişikliği yeni soru sayılmaz. Paket `review`, `individualHumanReview=false`, `editorReview=pending` olarak hazırlanır. `--verify` yeniden çözüm ve hücre dağılımı kontrolü yapar. Üretim içeriği uyumlu ana dal hazır olmadan etkinleştirilmez.

CI görsel kontrolü dört sınıftan 28 küp kartını 320/390/768/1440 pikselde, şık seçme ve kart yerleştirme kiplerinde denetler. Test görselleri yalnız iç inceleme içindir. Bu çalışma gerçek çocuk/aile deneyi veya fiziksel Android/Play kabulü değildir.

Ana sayfa testinde daha önce görülen logo yükleme yarışı için yalnız yüklenen resmin hazır olmasını bekleyen 10 saniyelik sınır eklendi; eksik/bozuk resim başarıya çevrilmez.
