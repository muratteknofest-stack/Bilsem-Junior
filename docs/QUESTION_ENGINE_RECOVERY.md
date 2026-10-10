# Soru motoru incelemesi — 7 Ekim 2026

## Bulgular

Ekran görüntüsündeki tablo `AdminStressTest` bileşenidir. 44 tür vardır; eski başlıklar 18 diyordu. `i % 44` tür seçimi ile `i % 6` zorluk seçimi birlikte kullanıldığından bir tür yalnızca üç zorluk seviyesine ulaşabiliyordu. Test edilmeyen satırlar da `failed === 0` üzerinden başarılı görünüyordu. Hata gerekçeleri toplanıyor fakat gösterilmiyordu.

İkinci tanı penceresi sadece yapısal doğrulama yapıyor, cevap doğruluğunu test etmiyordu. Sabit “0 hata” ve test öncesi “%100” ifadeleri kaldırıldı. İki ekran artık aynı bağımsız cevap doğrulama hattını kullanır.

Başlangıçta 11 türün bağımsız çözücüsü vardı. Diğer 33 eski türün taslak olarak karantinaya alınması doğruydu; kırmızı satırların tamamı yanlış cevap anlamına gelmiyordu. Bazı eski üreticilerde ayrıca gerçek kopya seçenek kusurları var.

## Değişiklikler

- `verified-4`: simetri tamamlama, şekil birleştirme, yön/rota takibi ve sayı piramidi yeniden uygulandı. Yeni türler hem öğrenci üretimine hem dokuz aşamalı sunucu hattına eklendi.
- İki ayrı çözüm: simetride koordinat yansıtma; birleştirmede mantıksal birleşim ve doygun toplam; rotada iki boyutlu yürüyüş ve doğrusal hücre hesabı; piramitte ardışık toplama ve Pascal katsayıları.
- Dört görünür ve farklı seçenek, tek doğru cevap, açıklama/çeldirici/şablon eşleşmesi ve sınıf profili yeniden kontrol edilir. Cevap anahtarını değiştirerek onay üretme yoktur. Eski v2/v3 şablonları korunur.
- SVG simetride gizli hücreler soru işaretiyle ayrıldı; rota başlangıcı ve okları, piramit tabanı ve eksik kutuları çizildi. Uzun koordinat seçenekleri dar kartlarda satıra bölünür.
- Desteklenmeyen kategori veya tür isteği başka bir kategoriye sessizce dönüşmez. Geçersiz parametreler reddedilir. Aday üretimi hata verirse en fazla 16 deterministik aday denenir; hiçbiri geçmezse doğrulanmamış soru döndürülmez.
- Tanı: 44 × 6 × 1/3/10 tur; bağımsız kanıt eksikliği, gerçek hata ve test edilmeyen durum ayrılır. Başarısız örneklerin tohumu, zorluğu ve gerekçeleri açılabilir. Uzun taramada ilerleme ve ekran kapandığında iptal desteği vardır.

## Doğrulama

- `npm test`: 64/64 geçti. Eski güvenlik testindeki yayın koşulu kontrolü, daha önce eklenmiş olan banka tekrar denetimini de zorunlu tutacak şekilde güncellendi.
- `npm run vercel-build`: 49 soru testi, TypeScript, Vite ve Express Function paketlemesi geçti.
- Yeni türler: 720 soru × deterministik yeniden üretim, yanlış cevap anahtarı, kopya seçenek, değiştirilmiş açıklama ve cevap değerlendirme kontrolleri.
- Yeni türler: 1.440 sınıf/seviye/tohum isteği. Sınıf tavanları ve sayısal/görsel yük denetlendi.
- AI hattı: dört yeni tür için dokuz aşama, taklit kör çözücü ve editörle geçti. Gerçek sağlayıcı çağrısı yapılmadı.
- El hesabıyla sabit çözüm örnekleri; sunucu tarafı React çiziminde verilenler ve soru işaretlerinin varlığı kontrol edildi.
- Kapsamlı tanı: 2.640 örnekte 900 geçti (15 desteklenen tür × 60), 168 yapısal hata, 1.572 bağımsız kanıt eksikliği. Desteklenen 15 türde başarısız örnek yok.
- Kalan gerçek yapısal kusurlar eski `visual_analogy`, `logical_sequence`, `shadow_matching`, `venn_diagram`, `top_view`, `detail_detection`, `word_scramble_logic` türlerinde görüldü. Bu türler dahil toplam 29 eski tür öğrenciye kapalı kalır. Taslakları silinmedi veya yanlış biçimde onaylanmadı.

## Sınırlar

Bu değişiklik 44 türün tamamının düzeltildiği anlamına gelmez. Karantinadaki 29 tür için ayrı semantik çözücü ve görünür içerik denetimi gerekiyor. Desteklenen matematiksel kurallardaki testler pedagojik akreditasyon veya mutlak hatasızlık garantisi değildir.

Yerel Vite sunucusu 127.0.0.1 üzerinde açıldı; uzak tarayıcı bu çalışma alanına `ERR_CONNECTION_REFUSED` ile erişemedi. Bu turda tarayıcı/dokunma/görsel ekran testi tamamlanamadı. Gerçek Supabase yazımı, gerçek AI sağlayıcısı ve korumalı Vercel Auth/API uçtan uca akışı test edilmedi. Canlıya geçiş yapılmadı.
