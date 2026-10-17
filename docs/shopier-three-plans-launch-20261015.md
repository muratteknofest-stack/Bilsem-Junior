# ZekaPark üç erişim paketi — 15 Ekim 2026

| Paket | Süre | Toplam ödeme |
|---|---:|---:|
| Aylık | 30 gün | 299 TL |
| 3 aylık | 90 gün | 699 TL |
| Yıllık | 365 gün | 1.499 TL |

Her paket bir öğrenci için aynı konu testleri, adaptif çalışma, denemeler ve veli takibini içerir. Ödeme tek seferliktir; otomatik kart çekimi yoktur. Yeni erişim süresi mevcut doğrulanmış erişimin sonuna eklenir. Süre ilk aktivasyondan başlar. Sınıf değişimi mevcut kurallarla desteklenir.

## Shopier bağlantısını tamamlama

1. Shopier hesabında üç ayrı dijital ürün oluşturun: ZekaPark Aylık Erişim (299 TL), ZekaPark 3 Aylık Erişim (699 TL), ZekaPark Yıllık Erişim (1.499 TL).
2. Para birimi TRY, kargo bedeli 0, dijital ürün ve satışa uygun stok kullanın. Ürünlere varyant/seçenek veya fiyatı değiştiren indirim eklemeyin. Her siparişte tek öğrenci için tek paket alınır.
3. Yönetici → Sistem Ayarları → Shopier paketleri bölümüne her ürünün numarası ve gerçek HTTPS Shopier ürün bağlantısını girin. Gerçek bağlantıları uydurmayın.
4. Sunucu erişim anahtarı yalnızca Vercel proje ortam ayarlarında SHOPIER_ACCESS_TOKEN olarak saklanır. İstemci koduna, yönetici ürün formuna veya sohbete yazılmaz.
5. İşletmeci bilgileri ve ticari hazırlık kontrolleri tamamlanınca ürünler Shopier API üzerinden fiyat/para birimi/dijital teslimat/stok/bağlantı açısından doğrulanır. Satış ve ücretli erişim anahtarları ancak bu aşamada açılır.
6. Veli, kendi doğrulanmış hesap e-postasıyla ürünü satın alır; veli panelinde bağlı öğrenciyi seçip sipariş numarasını doğrular. Siparişin gerçekten ödendiği sunucudan kontrol edilir. Sipariş başka aileye/öğrenciye aktarılamaz. İade durumu erişim hesabında yeniden kontrol edilir.

Ürün bağlantıları sağlanmadığından bu geliştirme satış veya ücretli erişim anahtarlarını açmaz. Ticari işletmeci bilgileri ve gerçek ödeme kabul testi ayrıca tamamlanmalıdır.

## Teknik doğrulama

- Aylık/3 aylık/yıllık planlar ve fiyatlar tek uygulama kataloğunda tanımlı; yönetici formu, veli kartları ve açık paket sayfası bu katalogdan üretilir. İki ürünlü eski ayarlar okunabilir; yıllık ürün eksikse satışa hazır sayılmaz.
- Yeni claim_shopier_access_v2 RPC yalnızca service_role tarafından çağrılır. Kullanıcıdan tutar veya süre alınmaz; sunucu Shopier kanıtını doğrulayıp sabit paket fiyatını gönderir. Veritabanı plan/fiyat/süre eşleşmesini tekrar kontrol eder.
- Eski 799 TL/90 gün aktive edilmiş makbuzlar korunur ve kendi kayıtlı tutarlarıyla yeniden doğrulanır. Yeni siparişler 699 TL fiyatı gerektirir. Eski RPC, önceki sunucu sürümü geçişi için tutulmuştur.
- SQL dosyası CLI ile oluşturuldu; canlı migration geçmişindeki gerçek sürümle eşlendi: 20261014220748_shopier_three_access_plans.sql. Veri silinmedi, ödeme kaydı oluşturulmadı.
- Tam yerel kontrol: 307 test, TypeScript ve üretim derlemesi başarılı. Ek gerçek Express API regresyonuyla toplam test sayısı 308; yıllık ödeme kanıtı, yetki, tutar/süre kurcalaması, tekrar ve 365 gün erişim yalıtılmış verilerle doğrulandı.
- PostgreSQL testi eski makbuzun migration sonrası korunmasını, üç yeni planı, yanlış tutarı, aynı siparişin tekrarını, başka öğrenci/aileyi ve istemci rolü engelini doğrular.
- Telefon/tablet: 320/360/390/768/1024 px × satış kapalı/açık örnekleri olmak üzere 10 kontrol; üç kartta fiyat, taşma ve dokunma alanları doğrulandı. Gerçek Shopier satın alması yapılmadı.
- Supabase güvenlik danışmanında sunucuya özel RLS tablolarının politikası olmamasına dair mevcut bilgi kayıtları ve önceden var olan sızmış parola koruması uyarısı görüldü. Bu değişiklik istemci erişimi veya Auth ayarlarını genişletmez.
