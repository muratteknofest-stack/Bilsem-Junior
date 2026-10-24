# Test çözme deneyimi — 24 Ekim 2026

## İnceleme

- Odak ekranındaki eski ilerleme çubuğu cevaplanan soru sayısını değil, ziyaret edilen sorunun sırasını kullanıyordu. Önceki soruya dönmek ilerlemeyi geriye götürebiliyordu.
- Doğru ve yanlış cevap için aynı 620 ms süre kullanılıyordu; hareket azaltmada bu süre 260 ms oluyordu. Özellikle yanlış cevap mesajını okumak güçtü.
- Birikmiş CSS katmanları renkli seçenekleri tekrar griye çeviriyor, tasarımın bakımını zorlaştırıyordu.
- Süre sayacı değiştikçe aynı soru görseli yeniden işleniyordu.

## Değişiklikler

- Mor, turkuaz, bal ve mavi vurgularla yenilenen cevap kartları, dokunma durumları ve kısa soru giriş animasyonları.
- Sunucunun onayladığı cevaplardan hesaplanan keşif rotası, XP ve doğru cevap serisi. Soruya bakmak puan veya ilerleme üretmez.
- Yanlış cevapta sunucunun bildirdiği doğru seçenek, 3,6 saniyelik okuma süresi ve beklemeyi bitiren “Devam et” düğmesi. Doğru cevap 1,4 saniye, deneme kayıt bildirimi 0,7 saniye gösterilir.
- Hareket azaltma ayarı animasyonları durdurur; mesajı okuma süresini kısaltmaz.
- Bekleyen cevap ve geri bildirim sırasında mevcut istek kilidi korunur. Devam etme ve bileşenin kapanması bekleme zamanlayıcısını temizler.
- Deneme ilerleme bileşeni doğruluk, seri ve XP göstermez. Geri bildirim de deneme bitmeden doğru seçeneği açıklamaz.
- Hafıza sorularında deseni gizlemeden seçenekler açılmaz; gizlenen desen büyütme aracından geri getirilemez.
- Sabit soru nesnesi ve memoize görsel sayesinde sayaç güncellemeleri görseli tekrar çizmez.
- Telefon, tablet ve kısa yatay ekranlar için tek bir düzenli stil dosyası.
- Windows üzerinde geliştirme/derlemeyi engelleyen blog Markdown satır sonu uyumsuzluğu giderildi.

## Doğrulama

- `npm run lint`
- `npm test`
- `npm run test:student`
- `npm run build`
- `npm run test:layout`
- `npm run test:test-experience`

Tarayıcı betikleri `tests/browser/question-screen.html` üzerinden gerçek React bileşenlerini yükler. `BROWSER_EXECUTABLE` ortam değişkeniyle kurulu bir Chromium/Chrome yolu seçilebilir. Görüntüler ve raporlar `test-artifacts/question-experience/` altında tutulur ve Git'e eklenmez.

Bu kontroller yerel bileşen davranışını ve sahte API kullanan mevcut cevap-kayıt testlerini kapsar. Canlı öğrenci hesabı, üretim API'si veya üretim veritabanında uçtan uca oturum yürütülmedi. Yayınlama bu çalışmanın kapsamında yapılmadı.

### Elde edilen sonuçlar

- Tür kontrolü başarılı.
- İlk tam test çalışmasında 497 testten 496'sı geçti. Tek hata, SQL kaynak karşılaştırmasında Windows satır sonlarından kaynaklandı. Karşılaştırma yalnızca satır sonlarını eşitleyecek şekilde düzeltildi; bu kontrolü de içeren 17 test yeniden çalıştırıldı ve hepsi geçti. SQL kaynakları ve veritabanı yapısı değiştirilmedi.
- Öğrenci çalışma merkezi: 7/7 test başarılı.
- Cevap etkileşimi, ilerleme ve ödül kontrolleri: ilk hedefli çalışmada 34/34 test başarılı.
- Gerçek Chromium yerleşim taraması: 915 senaryo, 0 hata. 44 soru türü, 11 ekran boyutu, ek sınıf/zorluk ve hafıza senaryoları kapsandı.
- Tarayıcı etkileşimleri: 10 kontrol başarılı; JavaScript sayfa hatası yok.
- Üretim derlemesi ve genel varlık kontrolü başarılı. Mevcut büyük paket ve üçüncü taraf yorum uyarıları sürüyor.

Önizlemeler: `test-artifacts/question-experience/mobile.png`, `desktop.png`, `correct.png`, `incorrect.png`. Makine tarafından okunabilir sonuçlar: `interaction-results.json` ve `layout/results.json`.
