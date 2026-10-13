# ZekaPark Türkçe yayın durumu — 14 Ekim 2026

Ücretsiz Türkçe sürüm https://zekapark.vercel.app/ adresinde yayımlanıyor. Ücretli satışın hazır olduğu beyan edilmiyor.

## Canlı veritabanında doğrulanan durum

- Platform ayarları revizyon 4: kayıt açık; Shopier satış ve ücretli erişim zorlaması kapalı.
- Yayımlanan Türkçe sorular: 1., 2., 3. ve 4. sınıfların her birinde 1.000; toplam 4.000. Satır kimliği, sınıf ve yayın durumu JSON içerikleriyle eşleşiyor.
- Öğrenme oturumları, platform ayarları, Shopier siparişleri ve destek talepleri için anonim/oturumlu istemci SELECT yetkisi yok. İlgili tablolarda RLS açık.
- Supabase güvenlik danışmanında ERROR bulunmadı. Sunucu tablolarındaki politikasız RLS kayıtları istemci erişimini kapatır. Sağlayıcının sızdırılmış parola koruması için bir WARN var; uygulamanın kendi parola denetimi bunu tüm dış Auth istemcileri için gidermez. Açıklama: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Bu kontroller kayıt açılması ile tam ticari yayın onayını birbirine karıştırmaz. Kabul işaretleri kanıt olmadan değiştirilmedi.

## Bu güncellemede tamamlanan teknik işler

Eski `release:commercial` betiği her koşulda başarısız sonuç veriyordu ve uygulamanın kullanmadığı işletmeci ortam değişkenlerini arıyordu. Yeni betik gerçek platform ayarlarını, canlı API/veritabanı sağlığını, Shopier sunucu anahtarının varlığını ve gerçek ürünlerin fiyat/dijital teslimat doğrulamasını değerlendirir. Anahtar veya müşteri verisi yazdırmaz; ayar değiştirmez.

Ana dala alınan her yeni yayın, mevcut kalite ve hesap kontrollerinden sonra üretim commit'i ve Supabase proje kimliğiyle doğrulanır. Ardından Türkçe ana sayfa, blog, kayıt/kurtarma bağlantıları, bilgi/paket sayfaları, robots/sitemap, herkese açık API'ler, yetkisiz hesap erişimleri ve dış Origin reddi kontrol edilir. Gerçek üretim doğrulamasının sonucu GitHub Actions `live-release` kaydındadır; başlatılan işlem geçmiş bir başarı gibi kabul edilmez.

## Ücretli yayın için gerçek eksikler

- `Quantum tech` marka olarak kayıtlı. Gerçek satıcı/veri sorumlusu adı henüz yok. `Quantum tech lab` bir posta adresinin yerini tutacak doğrulanmış açık adres değil.
- Veri işleme amaç/dayanak, saklama/silme süresi ve hizmet sağlayıcı/aktarım açıklamaları tamamlanmadı. Uygulamanın yapmadığı otomatik silme, yurt içi saklama veya uyumluluk vaatleri yazılmamalı.
- Gerçek iki Shopier ürün numarası ve ürün bağlantısı yok. Sunucu erişim anahtarı güvenli yayın ortamında yapılandırılmalı; sohbet veya istemci koduna yazılmamalı. Ürün fiyatları ve dijital teslimat API ile doğrulanmadan satış açılmaz.
- Türkçe e-posta/kurtarma, gerçek aile pilotu, şifreli yedekten geri yükleme ve izleme/yük/alarm kabul kayıtları tamamlanmış olarak işaretlenmemiş. Yerel veya taklit tarayıcı testleri bu canlı kabul kayıtlarının yerine geçmez.

İşletmeci bilgileri ve Shopier ürünleri sağlandığında kalan gerçek kabul akışları tamamlanır. `releaseBlockers` ve Shopier doğrulaması satış açılırken sunucuda uygulanmaya devam eder. Bu belge bir hukuki uygunluk onayı veya bütün güvenlik açıklarının kapandığına dair garanti değildir.
