# Eğitmen inceleme sırası — 14 Ekim 2026

## Devralınan durum

GitHub ana dalı `1afa2b49872446c183400578b0f4f72be9ed6df8`, birleştirilmiş PR #34 ve başarılı Quality and Function build kontrolü üzerinden devam edildi. Canlı veritabanının salt okunur kontrolünde sınıf başına 2.000 olmak üzere 8.000 yayımlanmış soru, her sınıfta 44 konu ve 660 sınıf/konu/zorluk birleşimi doğrulandı. Birleşim başına 2–35 soru var. Kontrol anında bu 8.000 soruda bireysel eğitmen kaydı bulunmuyordu. Önceki çalışma kapsamı sınıf başına 2.000 sorudur; her zorluk için ayrıca 2.000 değildir.

## Değişiklik

Eğitmen Onayı ve Bulut Kütüphanesi artık sınıf, konu ve zorlukla daraltılabilir. Sınıf değişince zorluk filtresi sıfırlanır ve izin verilen seviyeler gösterilir. Sayfalama filtre değişikliğinde başa döner. İnceleme sayacı seçilen sınıf/konu/zorluğun yayımlanmış sorularını kapsar; arama ve denetim filtresinden bağımsız olduğu ekranda açıklanır.

Sıradaki bekleyen soru düğmesi mevcut liste filtrelerinin içinde ilerler, sonunda başa döner ve tamamlanan soruları atlar. Kayıt beklenirken devre dışıdır. Her geçiş mevcut soru açma yolunu kullanır: kaydedilmemiş düzenleme uyarısı, öğrenci önizlemesine kaydırma, cevap/çözüm ve üç inceleme kutusunun sıfırlanması korunur. Geçiş onay kaydı oluşturmaz. Onay kaydı yalnızca mevcut yetkili API başarılı yanıtından sonra sayaca yansır.

İnsan incelemesi için gerçek `reviewedBy` gerekir; otomatik yayın veya eksik metadata onay sayılmaz. `individualHumanReview: false` ile çelişen bir kayıt da bekleyenler arasında kalır. Sunucu doğrulaması, MFA ve bireysel onay koşulları değiştirilmedi. Canlı soru gövdeleri, cevap anahtarları, onaylar ve kullanıcı verileri bu çalışmada değiştirilmedi.

## Doğrulama

- 296 otomatik test, TypeScript ve üretim derlemesi başarılı.
- Yeni birim senaryoları birleşik filtreler, çok sınıflı kayıtlar, eksik/çelişkili inceleme metadatası, sıranın başa dönmesi, tamamlanan kaydın atlanması ve boş sıra durumunu kapsar.
- Türkçe izole tarayıcı senaryosu filtreleme, ilerleme, sonraki soruda kutuların sıfırlanması ve 320/390/820 piksel taşma kontrolleriyle genişletildi ve başarılı geçti. Mobil ekran görüntüsü de incelendi.
- Tarayıcı senaryosu izole Auth/API örneklerini kullanır; gerçek bir eğitmenin incelemesi veya üretim onay kaydı değildir.
