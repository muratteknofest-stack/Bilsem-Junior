# Bilsem Junior — Shopier web üyeliği

Webdeki veli paneli Shopier üzerinden tek seferlik ödeme ile süreli üyelik sunar. Android uygulamasındaki Google Play akışı korunur. Sunucu, iki kanaldan herhangi birindeki doğrulanmış aktif üyeliği kabul eder. Shopier otomatik kart yenilemesi uygulamaz.

| Plan | Süre | Fiyat |
| --- | ---: | ---: |
| Aylık | 30 gün | 299 TL |
| 3 aylık | 90 gün | 699 TL |
| Yıllık | 365 gün | 1.499 TL |

Her sipariş tek öğrenci içindir. Yeni paket mevcut sürenin sonuna eklenir; tekrar gönderilen aynı sipariş yeni süre oluşturmaz. İade bekleyen veya iade edilmiş siparişler erişime sayılmaz.

## Üretim kurulumu

1. Üç gerçek Shopier dijital ürününün kimliklerini ve HTTPS ürün bağlantılarını alın. Ürün fiyatları yukarıdaki katalogla eşleşmeli; para birimi TRY, kargo sıfır, ürün stokta ve varyantsız olmalıdır. İndirimli siparişler desteklenmez.
2. `supabase/migrations/20261022181059_restore_shopier_verified_membership.sql` migration'ını uygulayın. Yalnızca sunucunun `service_role` rolüne güncel doğrulama RPC'sini ve makbuz ekleme yetkisini verir. Tarayıcıya ödeme tablosu erişimi açmaz. Eski RPC kapalı kalır.
3. Vercel Production ortamında aşağıdaki sunucu değişkenlerini tanımlayın. Gizli anahtarı `VITE_` ile başlayan bir değişkene veya GitHub'a eklemeyin.

```text
SHOPIER_ACCESS_TOKEN=<gizli kişisel erişim anahtarı>
SHOPIER_ENABLED=true
SHOPIER_ENFORCE_PAID_ACCESS=false
SHOPIER_MONTHLY_PRODUCT_ID=<gerçek ürün kimliği>
SHOPIER_MONTHLY_URL=<gerçek ürün bağlantısı>
SHOPIER_QUARTERLY_PRODUCT_ID=<gerçek ürün kimliği>
SHOPIER_QUARTERLY_URL=<gerçek ürün bağlantısı>
SHOPIER_ANNUAL_PRODUCT_ID=<gerçek ürün kimliği>
SHOPIER_ANNUAL_URL=<gerçek ürün bağlantısı>
```

4. Mevcut yönetici sistem ayarlarındaki ticari yayın hazırlığını tamamlayın. Mevcut `releaseBlockers` kontrolleri satış için geçerlidir. Üç ürün ayrıca Shopier API'den fiyat, para birimi, bağlantı, stok ve dijital ürün türü açısından doğrulanır. Bu kontroller geçmeden satın alma bağlantıları sunulmaz.
5. Yeniden dağıtın. `/paketler` sayfası ve web veli paneli Shopier paketlerini gösterir. Veli, doğrulanmış veli hesabıyla aynı e-postayı kullanarak tek paket satın alır; sipariş numarasını bağlı öğrenci için doğrular.
6. Gerçek ödeme, hesap eşleştirme ve iade kabul testi tamamlandığında `SHOPIER_ENFORCE_PAID_ACCESS=true` yapıp yeniden dağıtın. Doğrulama yapılamayan bir ödeme aktif sayılmaz. Satışın sonradan kapatılması mevcut geçerli üyelikleri iptal etmez.

## Bu değişikliğin doğrulama sınırı

Yerel testler sentetik ödeme cevapları ve yalıtılmış PostgreSQL kullanır; gerçek bir Shopier ödemesi oluşturmaz. Kullanıcının anahtarı kaynak dosyalarına veya testlere yazılmamıştır. Canlı Vercel ayarları ekip erişimindeki 403 nedeniyle değiştirilememiştir. Gerçek Shopier ürün kimlikleri/bağlantıları henüz sağlanmamıştır; satış ve ücretli erişim bu değişiklikle kendiliğinden açılmaz.

Kontroller: `npm run test:shopier`, Google Play ilgili testleri, `npm run lint`, `vite build`, API esbuild derlemesi.
