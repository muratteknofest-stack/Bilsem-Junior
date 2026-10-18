> Ödeme bölümleri tarihsel kayıttır. Güncel sistem yalnızca Google Play kullanır; [güncel kurulum](GOOGLE_PLAY_BILLING.md).

# Hesap ve yönetici ekranlarında hata toparlama

- Talep kodu kopyalama işlemi panoya yazma sonucunu bekler. İzin yoksa veya tarayıcı desteklemiyorsa açıklayıcı hata gösterir; başarılı kopyalama erişilebilir durum mesajıyla bildirilir. Düğme dokunmatik kullanım için en az 44 px boyutundadır.
- Yönetici silme kapsamını yenilerken eski kapsam ve onaylar kaldırılır. Talep kimliği, tekil hesap kimlikleri, hesap sayısı ve işlem durumu doğrulanmadan kalıcı silme düğmesi gösterilmez. Başka talebe geçişte durum sıfırlanır ve ayrılan ekranın isteği iptal edilir.
- Başarılı HTTP yanıtı tek başına tamamlanma kanıtı sayılmaz. Tamamlanma kaydı ve hesap sayısı doğrulanamazsa yeniden kapsam kontrolü gerekir. Doğrulanmış silme sonrasında liste yenilemesi başarısız olsa bile tamamlanma durumu korunur.
- Eğitmen inceleme paneli sınıf tekrarlarını, negatif/kesirli sayıları, tutarsız toplamları ve hatalı örnek kodlarını reddeder. Yenileme sırasında eski sonuçlar kaldırılır; boş soru havuzu ve bağlantı hatası ayrı gösterilir.

Yerel doğrulama: `npm run lint`, `npm test` (283 test), `npm run build`, `git diff --check`.

`npm run test:turkish-accounts` CI tarayıcı senaryosuna panoya erişim reddi/başarı, inceleme verisi doğrulama/yenileme/boş durum ve silme kapsamı/sonuç bozulması kontrolleri eklenmiştir. Türkçe ve İngilizce tarayıcı işleri ile canlı sürüm kontrolü yayın akışında çalışır.

Bu senaryolar yalıtılmış test hesapları ve yanıtları kullanır; gerçek hesap silmez, gerçek e-posta göndermez ve eğitmen incelemesi kaydetmez. Gerçek aile pilotu, üretim yedeğini geri yükleme, alarm teslimi ve 4.000 sorunun bireysel eğitmen incelemesi ayrıca doğrulanmalıdır. Gerçek satıcı bilgileri ve Shopier ürün/entegrasyon ayarları tamamlanana kadar ücretli satış kapalı kalır.
