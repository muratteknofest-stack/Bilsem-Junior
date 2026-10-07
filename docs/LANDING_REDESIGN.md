# Ana sayfa: keşif adası

Ana sayfa açık zemin, mor/adaçayı/şeftali renkleri, katmanlı oyun adası ve Zeki karakteriyle yenilendi. Yüzen küpler CSS 3D yüzeylerinden; karakter, platform ve küçük illüstrasyonlar ışık/gölge katmanlarından oluşur. WebGL, video, yeni paket veya uzak görsel bağımlılığı eklenmedi. Mevcut logo ve yazı tipi ayarları korunur.

## Etkileşimler

- Fareye hafif tepki veren sahne; dokunmatik cihazlarda bakış açısı ve selamlama düğmeleri.
- Dekoratif animasyonları durdurma; `prefers-reduced-motion`, sekme görünürlüğü ve sahnenin ekranda görünmesi kontrolleri. Klavye odak göstergeleri ve içeriğe geç bağlantısı.
- Örüntü, mantık ve dikkat kartlarından doğrulanmış soru demosuna geçiş. Demo, ortak `AnswerWorkspace` ve bağımsız cevap doğrulamasını kullanır. Cevap sonrası açıklama, tekrar deneme, ses kontrolü ve oturuma özel deneme sayacı.
- Öğrenci/veli/yönetici girişleri mevcut uygulama geri çağrılarını kullanır. Gizlilik ve kullanım koşulları mevcut bilgi penceresinde açılır.
- Önceki temsili canlı öğrenci bildirimleri, dayanağı olmayan başarı tahminleri ve yalnızca istemcide başarılı görünen bülten formu yeni ana sayfada bulunmaz. Deneme sonuçlarının hesaba kaydedilmediği açıkça belirtilir.

## Kontroller

Yerel Chromium 153 tarayıcısında tamamlandı:

- 320, 390, 768, 1024 ve 1440 piksel genişlikte yatay taşma/başlık yerleşimi kontrolü; masaüstü ve mobil ekran görüntülerinin görsel incelemesi.
- Sahne yönü, selamlama, animasyonları durdurma ve azaltılmış hareket tercihi.
- Fare sürüklemesi, Chromium dokunma girdisi ve klavyeyle kart yerleştirme.
- Örnek cevap gönderimi, sayaç, gönderim kilidi, yeni soru, sıralamada tekillik ve sayısal cevap tamamlanması.
- Üç rolün giriş yönlendirmeleri ve SSS açma/kapama. Tarayıcı çalışma zamanı hatası görülmedi.
- `npm run vercel-build`: soru güvenliği testleri, TypeScript kontrolü, Vite ve Express Function paketleme.

Tarayıcı dokunma benzetimi gerçek Android/iOS cihaz testi değildir. Korumalı Vercel önizlemesindeki Auth/API erişimine ilişkin önceki sınırlamalar bu görsel değişiklikle çözülmüş sayılmaz. Üretime geçiş yapılmaz; mevcut taslak PR güncellenir.
