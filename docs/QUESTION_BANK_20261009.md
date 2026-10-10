# Sınıf başına 1.000 soruluk banka

Supabase projesi `vehhvsdkifwstbjhnhao` içinde `robot-20261009-2800-v1`
partisi, önceki `robot-20261008-1200-v1` partisine eklenmiştir.

| Sınıf | Önceki parti | Yeni parti | Yayımlanan | Önceki taslaklar |
|---|---:|---:|---:|---:|
| 1 | 300 | 700 | 1.000 | 86 |
| 2 | 300 | 700 | 1.000 | 86 |
| 3 | 300 | 700 | 1.000 | 79 |
| 4 | 300 | 700 | 1.000 | 79 |

Toplam 4.000 otomatik denetimden geçmiş `published` soru ve 330 eski `draft`
bulunmaktadır. Bu sayılar pedagojik olarak tek tek insan tarafından onaylanmış
içerik sayısı değildir.

Üretici 10.518 aday denedi; 7.718 görsel/gövde tekrarı elendi. 27 doygun tür ve
zorluk hücresinin kotası başka doğrulanmış türlere dağıtıldı. Kabul edilen 2.800
sorunun tamamı bağımsız cevap çözümü, içerik, sınıf, zorluk, görsel yük ve eski
bankayla tekrar testlerinden geçti. Veritabanında iki partinin 4.000 ayrı görsel
ve 4.000 ayrı gövde özeti olduğu, yeni partide durum/inceleme/sınıf tutarsızlığı
bulunmadığı sorguyla doğrulandı.

Yeni parti için önceki 330 taslağın tam soru gövdesi ve önceki 1.200 sorunun
SHA-256 görsel/gövde özetleri kullanıldı. Üreticiye tam önceki bankayı vermek de
mümkündür. Sonraki partilerde tüm partilerin özetlerini dahil edin:

```bash
npm run generate:grade-bank -- \
  --existing old-drafts.json \
  --existing-hashes existing-sha256-pairs.json \
  --output next-batch.json \
  --batch robot-next-batch \
  --per-grade 700 --seed 20261009
```

`existing-sha256-pairs.json`, her kayıt için `[visualKeySha256, stemKeySha256]`
çiftlerinden oluşur. Üretim geçersiz özetleri reddeder, aynı gövde veya görseli
yeniden üretmez ve güvenli içerikle kota tamamlanamazsa durur. Bu komut veritabanı
yazması veya toplu yayın yapmaz.

## 9 Ekim sahibinin isteğiyle yayına açılış

Kullanıcı isteği üzerine iki parti sınıf başına 1.000 soru olarak yayımlandı.
Başlangıçta her sınıftan 10 soru açıldı; veritabanından geri okunan örnekler
tekrar denetlendi. Kalan 990'ar soru yalnızca `review`, revizyon 1, kaynak parti,
otomatik kontrol ve sınıf eşleşmesi koşullarını karşılıyorsa atomik olarak
`published`, revizyon 2 yapıldı. Veritabanı son sorgusu her sınıfta tam 1.000
`published`, 0 `review` ve eski 86/86/79/79 `draft` gösterdi. `questions_read`
RLS politikası yalnız oturum açmış kullanıcılara yayımlanmış kayıtları okutur.

Bireysel insan editör onayı **yapılmadı**. Yayın kayıtlarında `reviewedBy` boş,
`releaseAuthorization.individualHumanReview=false` ve sahibinin talebi ayrıca
işaretlidir. Yönetici Soru Atölyesi bu yayınları eğitmen incelemesi bekleyen
olarak listeler. Editör soruyu gerçekten incelediğinde mevcut üç kontrolü
onaylayarak yeniden kaydedebilir; bu işlem insan incelemesini kayıt altına alır.
Bu yayımlama gelecekteki sorular için editör denetim kapısını kaldırmaz.
