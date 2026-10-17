# Öğrenci mobil görünümü ve ücretsiz erişim

Android 1.0.4 / versionCode 5 adayı. Üretim dağıtımı ve Play satışı bu değişiklikle açılmaz.

- 600px ve altında çalışma sekmeleri üç sütunda iki satırdır. Grid hücreleri `minmax(0,1fr)` ile sınırlandırılır; görev başlığı, sayaç, lig ve düğmeler dar ekranda satıra geçer.
- Capacitor SystemBars tarafından sağlanan `--safe-area-inset-*` değerleri üst çubuk, içerik ve sabit alt menüye uygulanır.
- Ücretsiz kayıtlı öğrenci: Türkiye saatine göre günlük üç sunucu kontrollü temel soru, kendi profil/sınıfı ve kendi geçmiş/ilerlemesi. Günlük soru limiti mevcut veritabanı prosedürü tarafından kilit ve benzersiz kayıtla korunur.
- Aktif üyelik: tam pratik, konu testleri, adaptif çalışma, denemeler, hata tekrarı, haftalık görev/ödüller ve öğrenci AI rehberliği. Wordwall kütüphanesi uygulama içinde üyelikle açılır; harici sağlayıcının herkese açık bağlantıları ZekaPark tarafından gizli hale getirilemez.
- Öğrenci üyelik çağrısı bağlı veli şifresini ister. Ödeme/geri yükleme mevcut veli Google Play akışındadır. Üyelik durumu sunucudan gelir; profil alanı veya localStorage üyelik kanıtı değildir.
- Satış ve eski enforce bayrakları premium erişimi ücretsiz açmaz. Önceden doğrulanmış aktif Play/Shopier alımları korunur. Üyelik doğrulanamazsa premium işlemler 503 ile kapanır; günlük ücretsiz sorular kullanılabilir. Aktif üyelik yoksa 403 / MEMBERSHIP_REQUIRED döner.
- Yarım kalmış premium oturuma dönme ve yanıt gönderme üyelik gerektirir. Kullanıcı kendi tamamlanmış sonuçlarını üyelik bittikten sonra da okuyabilir.

Doğrulama: `npm run lint`, `npm test`, `npm run android:build:web`; CI'da `npm run test:student-mobile`, Android derleme ve derlenmiş manifest/imza kontrolü. Görsel test gerçek App/AuthProvider üzerinde 320, 360, 390, 430, 600, 768, 1024, 1440px; beş sekme, büyütülmüş yazı, ücretsiz sınır ekranı, veli doğrulaması ve ödeme servisi kesintisini kapsar. İzole testler gerçek ödeme kabulünün yerine geçmez.
