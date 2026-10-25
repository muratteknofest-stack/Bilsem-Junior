
## 1.0.29 — Android kullanım ve abonelik iyileştirmeleri

- Android geri tuşu önce açık soru/konu penceresini veya hatırlatıcıyı kapatır. Aktif test, kendi cevap kaydetme akışından çıkar; devam eden kayıt ve hesap geçişi sırasında ekran değişmez. Öğrenci ayrıntıları ilgili Çalış/Ödüller alanına döner.
- Bağlantı kesintisi, soru alanını daraltmayan ve kapatılabilen bir uyarıyla gösterilir. Kapatılan uyarı seçeneklerin üstünde simge bırakmaz; yeni bir bağlantı kesintisinde yeniden görünür. Bağlantının gelmesi, kaydedilemeyen cevabın otomatik olarak kaydedildiği anlamına gelmez; mevcut yeniden gönder düğmesi kullanılır.
- Native WebView, Android sistem çubukları için alan ayırır (`viewport-fit=contain`, SystemBars native insets, AndroidX EdgeToEdge). Web sürümünün viewport ayarı ve yakınlaştırma desteği korunur.
- Google Play'de bekleyen, askıya alınan veya duraklatılan üyelikler yeni satın alıma yönlendirilmez. Doğrulanmış durum ve gerçek bitiş tarihi API'den gelir. Ağ kesintisinde ödeme başlatılmaz; ödeme hazırlığı sırasında kesinti de yeniden kontrol edilir.
- Android sürümü 30 / 1.0.29. Üretim yayını, mevcut yükleme anahtarıyla imzalı AAB ve Play Console kabulü gerektirir. Kod güncellemesi, yüklü APK'yı kendiliğinden güncellemez.
