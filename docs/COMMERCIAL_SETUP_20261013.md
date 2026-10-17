# Quantum tech — Shopier ile bireysel satış kararı

13 Ekim 2026. Kullanıcı şirketi ve henüz Shopier hesabı olmadığını belirtti; site tarafının hazırlanmasını yetkilendirdi. Önceki iyzico önerisinin şirket varsayımı kaldırıldı.

## Kimlik ve iletişim

Quantum tech **marka adıdır**; doğrulanmış şirket unvanı değildir. Quantum tech lab kullanıcının verdiği adres metnidir; tam posta adresi yerine geçmez. Destek: zeka.kupu.test@gmail.com. Gerçek bireysel satıcı/veri sorumlusu adı verilmediği için boş bırakılır. Kimlik, vergi veya banka bilgisi uydurulmaz.

## Sağlayıcı ve paketler

Shopier resmî sayfasında bireysel hesap ve dijital ürün/hizmet satışını destekliyor. Site kart verisi toplamaz; satın alma gerçek Shopier ürün sayfasında yapılır. Hesap açılmadığından gerçek ödeme testi yapılmadı ve satış açılmadı.

| Paket | Süre | Planlanan tek seferlik fiyat |
|---|---:|---:|
| Başlangıç | 30 gün | 299 TL |
| Düzenli çalışma | 90 gün | 799 TL |

Bir öğrenci için çalışmalar, denemeler, yanlış tekrarı ve veli takibi. Otomatik yenileme yok. Süre ilk doğrulanmış aktivasyonda başlar; yeni paket kalan sürenin sonuna eklenir. Sınav başarısı, resmî BİLSEM bağlantısı, zekâ tanısı veya canlı ders vaat edilmez. Fiyatlar piyasa optimumu iddiası taşımayan lansman tercihleridir.

## Uygulanan sistem

/paketler herkese açık açıklama sayfasıdır. Veli panelinde öğrenciye özel paketler ve sipariş doğrulaması bulunur. Sunucu Shopier REST API'den siparişin gerçekten ödenmiş olduğunu, alıcı e-postasını, tek dijital ürünü, ürün kimliğini, TRY tutarını, adedini ve iadeleri denetler. Teslim edilmiş olması tek başına ödeme kanıtı sayılmaz. Tarayıcıdan bildirilen ödeme sonucu veya paylaşılan kod erişim açmaz.

Sipariş bir veli/öğrenciye yalnız bir kez bağlanır; tekrar doğrulama süreyi uzatmaz. Hesap silinmesi eski siparişin başka hesaba aktarılmasını sağlamaz. Kayıtlar istemcilere kapalı RLS tablosundadır; ham Shopier siparişi, adresi, kart veya token kaydedilmez. Alıcı e-postası yalnız karşılaştırma için SHA-256 olarak saklanır; bu da kişisel veri kapsamında değerlendirilmelidir.

Satış ve ücretli erişim zorunluluğu ayrı ayardır. İkisi de varsayılan kapalıdır; mevcut ücretsiz kullanım sürer. Açılışta yasal yayın kabulü, gerçek ürün bilgisi ve sunucu sağlayıcı doğrulaması zorunludur. Ücretli erişim açılırsa yeni çalışma/yanlış tekrarı sunucuda doğrulanır; başlamış oturumun cevap/bitirme işlemleri mevcut güvenlik sınırları içinde devam eder. İadeler takip eden erişim kontrolünde kapsamdan çıkarılır. Sağlayıcı hatası erişim onayı yerine geçmez. Bir öğrenci için 50'den fazla sipariş kaydı otomatik akış dışında incelenir.

## Hesap açıldığında

Ayrıntılı kurulum: [SHOPIER_SETUP.md](SHOPIER_SETUP.md). Kullanıcının kendi hesabından gerçek kimlik/banka başvurusu, iki dijital ürün ve güvenli sunucu token yapılandırması gerekir. Shopier'de dijital hizmet teslimatının kapatılması ayrı işletmeci adımıdır; site otomatik teslimat bildirimi yapmaz.

Gerçek satıcı adı, tam adres, hukuki dayanaklar, saklama/silme ve dış sağlayıcı aktarım koşulları uygulanmış süreçle tamamlanmalı. Bireysel hesap olanağı bu alanları otomatik tamamlamaz. E-posta/aile pilotu, fiziksel cihaz ve geri yükleme kabulü gerçekleşmiş sayılmaz.

## Resmî kaynaklar

- https://www.shopier.com/
- https://developer.shopier.com/llms.txt
- https://developer.shopier.com/docs/overview
- https://developer.shopier.com/reference/get-orders-id
- https://developer.shopier.com/reference/get-products-id

Endpoint belgelerinin güncel bağlantıları developer portalının llms.txt dizininden kontrol edilir. Entegrasyon /v1/orders/{id} ve /v1/products/{id} kullanır; eski OSB callback sistemi kullanılmaz.
