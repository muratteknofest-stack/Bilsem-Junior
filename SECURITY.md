# Güvenlik Politikası

## Desteklenen sürüm

Güvenlik düzeltmeleri yalnızca `main` dalındaki en güncel sürüm için hazırlanır.
Üretim dağıtımları commit SHA ile izlenebilir olmalı ve geri alma paketi
saklanmalıdır.

## Güvenlik açığı bildirme

Bir güvenlik açığını herkese açık issue içinde kullanıcı verisi, erişim token'ı,
parola veya istismar adımı paylaşarak bildirmeyin. GitHub deposunun **Security →
Private vulnerability reporting** kanalını kullanın. Bildirime etkilenen sürüm,
etki, yeniden üretim adımları ve mümkünse güvenli bir düzeltme önerisi ekleyin.

## Kimlik ve sır yönetimi

- Yönetici yetkisi yalnızca Firebase özel claim'i ve eşleşen Firestore profiliyle
  verilir. E-posta adresi tek başına yetki değildir.
- Yönetici hesaplarında çok faktörlü kimlik doğrulamayı etkinleştirin.
- Sunucu sırlarını Google Secret Manager gibi yönetilen bir kasada saklayın.
- `.env`, servis hesabı anahtarı, kullanıcı token'ı ve SMTP parolası repoya
  eklenmemelidir.
- Yetki kaldırıldığında Firebase yenileme token'larını iptal edin.
- App Check üretimde zorunlu kalmalıdır.

## Yayın öncesi zorunlu olay işlemi

Projenin geçmiş bir sürümünde tarayıcı tarafında sabit yönetici kimlik bilgisi
bulunuyordu. Kodun kaldırılması, daha önce açığa çıkmış kimlik bilgisini güvenli
hâle getirmez. İlk ticari yayından önce:

1. İlgili Firebase hesabının parolasını değiştirin.
2. Hesabın tüm yenileme token'larını iptal edin.
3. Açık oturumları kapatın ve yakın dönem Firebase/Auth günlüklerini inceleyin.
4. Yönetici claim'ini yalnızca doğrulanmış UID'ye, ayrıcalıklı Admin SDK
   ortamından yeniden verin.
5. MFA'yı etkinleştirin ve kurtarma yöntemlerini test edin.
6. Firestore kurallarını dağıtıp Emulator Suite ile yetki testlerini çalıştırın.

Bu işlemler tamamlanmadan uygulama ticari kullanıma hazır kabul edilmez.

Olay kapatma araçları e-posta ile hesap seçmez; doğrulanmış Firebase UID ve tam
üretim proje/veritabanı onayı ister. Parola dosyası yalnızca sahibi tarafından
okunabilir olmalıdır. İşlem sonrası `npm run ops:verify-admin`, claim/profil,
TOTP kaydı, token iptal zamanı ve audit olayını birlikte doğrular. Komutların
güvenli sırası [üretim runbook'unda](docs/PRODUCTION_RUNBOOK.md) yer alır.

## Olay müdahalesi

Şüpheli erişimde sırasıyla erişimi sınırlandırın, token'ları iptal edin, ilgili
sırları döndürün, değişmez günlükleri koruyun, etkilenen veri kapsamını belirleyin
ve yasal bildirim gereksinimini uzmanla değerlendirin. Kanıt toplamadan günlükleri
veya hesapları kalıcı olarak silmeyin.
