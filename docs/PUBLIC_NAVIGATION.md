# Ana sayfa menüsü

Ekran görüntüsündeki çift başlığın nedeni `App` içindeki genel `Navbar` ile `LandingPage` başlığının aynı anda gösterilmesiydi. Genel menü artık çalışma ekranlarında kullanılır; ana sayfa tek `LandingNav` gösterir. Giriş/kayıt ekranı kendi geri dönüş ve hesap kontrollerini kullanır.

## Değişiklikler

- Tek, yapışkan üst menü: Keşfet, Nasıl çalışır?, Aileler için, Yardım.
- Keşfet menüsünden üç soru alanına doğrudan erişim. Öğrenci ve veli için ayrı giriş seçenekleri.
- Kayıt ol / Hesap oluştur, `register` yönlendirmesiyle mevcut kayıt formunun Veli + Öğrenci sekmesini açar. Giriş düğmesi ise giriş sekmesini açar; iki işlem artık aynı başlangıç durumuna gitmez.
- Ses ve animasyon ayarları ayrı, erişilebilir bir açılır panelde toplanır.
- 1000 px ve altında yerel `dialog` tabanlı yan menü: odak sınırlandırma, Escape ve arka plana dokunarak kapatma, kaydırma kilidi ve kapanınca geri yükleme. Masaüstü genişliğine geçerken panel kapanır.
- Bölüm bağlantıları başlığa odaklanır ve sabit menü altında görünür olacak şekilde kaydırır. App içindeki iç içe `main` kaldırıldı; ana sayfada tek ana içerik bölgesi var. Sayfa geçişleri cihazın azaltılmış hareket tercihini dikkate alır.

## Doğrulama

Yerel Chromium 153'te doğrudan uygulamanın `/` girişinden (`App` + `AuthProvider`) test edildi. Dış Supabase ağı sahte bir yerel test projesi yanıtıyla taklit edildi; hesap oluşturulmadı, oturum açılmadı ve e-posta gönderilmedi.

- Tek header ve tek ana içerik alanı; masaüstü menüleri, Tab ve Escape.
- Öğrenci/veli giriş yönlendirmeleri ve kayıt sekmesinin doğrudan açılması.
- Sabit başlık, mobil menü odağı, Escape sonrası odak dönüşü, gövde kaydırmasının geri yüklenmesi.
- Bölüm/soru alanı bağlantıları, mobil kayıt ve yeniden boyutlandırma davranışı.
- 320, 390, 768, 980, 1024 ve 1440 px genişliklerde taşma kontrolü; masaüstü ve mobil ekran görüntüsü incelemesi. Tarayıcı çalışma zamanı hatası görülmedi.
- `npm run vercel-build`: 27 soru testi, TypeScript kontrolü, istemci ve Function derlemesi.

Bu değişiklik gezinme ve sunum katmanındadır. Gerçek Auth/kayıt API'sinin üretim doğrulaması önceki erişim ve ortam ayarlarına bağlıdır.
