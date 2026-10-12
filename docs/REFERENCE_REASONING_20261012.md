# Referanslardan geliştirilen soru motoru

Gönderilen örneklerin mantık türlerinden özgün parametrik sorular üretilir; ekran görüntüleri soru olarak kopyalanmaz.

- Görsel analoji: iç/dış dolgu değişimi, çizgi birleşimi ve yarım şekil tamamlama. Dolgu boş/dolu/taralı olabilir; kare, daire, eşkenar dörtgen ve beşgen kullanılır.
- Çizgi birleşiminde örnek; birleşim, kesişim ve XOR kurallarını birbirinden ayırmalıdır. Çeldiriciler ortak çizgiyi silme, yalnızca ortak çizgiyi alma veya bir şekli kopyalama hatalarını temsil eder.
- Şekil kodlamada üç sembol ve üç farklı rakamın eşlemesi dört karışık örnekten çıkarılır. Hazır anahtar verilmez; anahtar tek değilse üretim reddedilir. Çeldiriciler aynı rakamların farklı sıralarıdır.
- Her soru birincil çözüm ve ayrı aday denetimiyle doğrulanır. Bilinmeyen alanlar, görünmeyen seçenek farkları ve yinelenen şıklar reddedilir.
- SVG çizimler ekran büyütüldüğünde net kalır; tarama ve kırpma tanımları her çizim için benzersizdir. Cevap verisi öğrenci çizimlerine eklenmez.
- Yeni sürüm `workshop-3`. Önceki `workshop-1` ve `workshop-2` sorularının yeniden doğrulaması ve geçmiş incelemeleri korunur.

## Doğrulama

- 1.200 yeni varyasyonda deterministik üretim, dört farklı seçenek, iki çözüm ve öğrenciye hazır olma denetlendi.
- 205 test geçti; odaklı soru paketi 74 test içeriyor. TypeScript ve Vercel üretim derlemesi geçti.
- SVG çizimler raster olarak oluşturulup görsel incelendi.
- Gerçek mobil tarayıcı ekran testi tamamlanmadı: yerel Chromium kurulu değil. Sunucu HTML çizimi testi geçti.

Bu değişiklik soru üreticisini ve ekranlarını günceller. Canlı veritabanındaki 4.000 soruyu değiştirmez; yeni havuz üretimi, editör onayı ve yayımlama ayrıca uygulanmalıdır. Katlama/delme ve sayısal işlem makineleri mevcut motorlarda korunur.
