# 1–4. sınıf soru robotu üretim kaydı

Toplu üretim kimliği: `robot-20261008-1200-v1`.
Supabase proje kimliği: `vehhvsdkifwstbjhnhao`.

## Kapsam ve sonuç

| Sınıf | Yeni soru | Tür | Zorluk aralığı | Dağılım |
|---|---:|---:|---|---|
| 1 | 300 | 12 | 1–2 | 150 / 150 |
| 2 | 300 | 15 | 1–3 | 100 / 100 / 100 |
| 3 | 300 | 15 | 1–4 | 75 / 75 / 75 / 75 |
| 4 | 300 | 15 | 1–6 | 50 / 51 / 51 / 50 / 49 / 49 |

Önceden kayıtlı 330 soru korunmuştur (86 / 86 / 79 / 79 eski taslak). Yeni toplam: 1.530 kayıt.
Üretim 4.283 aday gerektirdi: 3.083 yinelenen görsel/gövde elendi; kalite ve sınıf
kontrollerinde başarısız olan aday kabul edilmedi. 3×3 simetri ve düşük seviye sayı
örüntülerinin görünür varyasyonları sınırlı olduğundan kota diğer doğrulanmış türlere
dağıtıldı. İçerik, zorluk ve tür dağılımı `QUESTION_BATCH_20261008.json` içinde
1.200 adet sınıf/tür/zorluk/tohum/içerik parmak iziyle kayıtlıdır.

Her yeni soru dört farklı şık, bağımsız çözüm/tek cevap anahtarı, yönerge-açıklama
şablon uyumu, yaş/sınıf/zorluk/görsel yük sınırları ve eski bankayla benzerlik
kontrolünden geçti. Veritabanı son sorgusunda her sınıfta 300 benzersiz soru kimliği,
300 benzersiz görsel ve 300 benzersiz gövde parmak izi, yanlış `status`/inceleme
alanı sayısı 0 çıktı. Yükleme sırasında her JSON içerik birebir karşılaştırıldı;
ayrı bir canlı öğrenci çözüm/öğretmen pedagojik değerlendirmesi yapılmış sayılmaz.

Yeni kayıtlar `review` durumundadır. Öğrenciye yayın için mevcut soru editörünün insan
onayı ve sunucunun yayın anındaki denetimi gerekir. İnsan onayı verilmiş gibi
`reviewedBy` alanı doldurulmadı; toplu yayın yapılmadı.

## Yeniden üretim ve sonraki partiler

`npm run generate:grade-bank -- --existing <eski-banka.json> --output <sonuc.json> --batch <yeni-kimlik> --per-grade 300 --seed <pozitif-sayi>`

Girdi, `questions` JSON dışa aktarımı ya da doğrudan soru dizisi olabilir. Geçerli
bankayı bütünüyle girdi olarak verin; yeni sürüm benzersiz gövde ve görsel denetimini
geçer. Üretim aracı doğrulanmamış adayla hedef kotayı tamamlayamazsa hata verir.
Kayıt için ayrı yönetici incelemesi/sunucu geçişi gerekir; bu komut tek başına
veritabanına yazmaz ve soruları yayımlamaz.
