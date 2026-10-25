## 1.0.30 — Kısa Android açılışı ve ekrana sığan hesap ekranları

- Android, uzun web tanıtım sayfası yerine öğrenci girişi, veli girişi, yeni aile hesabı ve örnek soru seçeneklerini içeren kısa açılış ekranını kullanır. Örnek soru motoru yalnız istenince yüklenir. Gizlilik, koşullar ve yardım erişimi korunur.
- Android kaydı beş kısa sayfaya ayrılır: veli e-postası, veli şifresi, öğrenci takma adı/sınıfı, öğrenci şifresi ve kontrol/onay. Geri dönüşlerde bilgiler korunur. Sunucuya gönderim yalnız son onayda yapılır; doğrulama ve veli onayları aynı kalır. Web kaydı üç adımlı düzenini korur.
- Android girişinde büyük tanıtım alanı kaldırılır; kayıt sonrası öğrenci kodu ve e-posta doğrulama ekranı da kısalır. Android geri tuşu önce kayıt adımına veya açık yardım metnine döner. Kayıt gönderilirken geri çıkış engellenir.
- Görünen ekran yüksekliği klavye açılmasına göre izlenir; başlıklar daraltılarak giriş alanları ve devam düğmesi için alan açılır. Yakınlaştırma korunur; büyük yazı, uzun hata veya çok küçük alan gerektiğinde iç kaydırma kullanılabilir, içerik kesilmez.
- Android sürümü 31 / 1.0.30. Aynı uygulama kimliği ve mevcut yükleme anahtarı kullanılır. Satış ayarları değiştirilmez.

Yerel doğrulama: TypeScript, kayıt/şifre/Android regresyonları; beş ekran boyutunda ana sayfa, öğrenci/veli girişi, kayıt sayfaları, başarı ekranı ve 320 piksel yüksekliğe daralan klavye senaryoları. Test bileşenleri gerçek, ağ yanıtları yalıtılmıştır; gerçek hesap oluşturulmaz. Gerçek Android cihaz kabulü ayrıca yapılmalıdır.


## 1.0.29 — Android kullanım ve abonelik iyileştirmeleri

- Android geri tuşu önce açık soru/konu penceresini veya hatırlatıcıyı kapatır. Aktif test, kendi cevap kaydetme akışından çıkar; devam eden kayıt ve hesap geçişi sırasında ekran değişmez. Öğrenci ayrıntıları ilgili Çalış/Ödüller alanına döner.
- Bağlantı kesintisi, soru alanını daraltmayan ve kapatılabilen bir uyarıyla gösterilir. Kapatılan uyarı seçeneklerin üstünde simge bırakmaz; yeni bir bağlantı kesintisinde yeniden görünür. Bağlantının gelmesi, kaydedilemeyen cevabın otomatik olarak kaydedildiği anlamına gelmez; mevcut yeniden gönder düğmesi kullanılır.
- Native WebView, Android sistem çubukları için alan ayırır (`viewport-fit=contain`, SystemBars native insets, AndroidX EdgeToEdge). Web sürümünün viewport ayarı ve yakınlaştırma desteği korunur.
- Google Play'de bekleyen, askıya alınan veya duraklatılan üyelikler yeni satın alıma yönlendirilmez. Doğrulanmış durum ve gerçek bitiş tarihi API'den gelir. Ağ kesintisinde ödeme başlatılmaz; ödeme hazırlığı sırasında kesinti de yeniden kontrol edilir.
- Android sürümü 30 / 1.0.29. Üretim yayını, mevcut yükleme anahtarıyla imzalı AAB ve Play Console kabulü gerektirir. Kod güncellemesi, yüklü APK'yı kendiliğinden güncellemez.
