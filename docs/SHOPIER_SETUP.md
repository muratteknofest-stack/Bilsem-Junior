# Shopier kurulumu

## Mevcut durum

Hesap yok; satış ve ücretli erişim zorunluluğu kapalı. Site hazır akışları gösterir, geçici/sahte ödeme hakkı oluşturmaz. Quantum tech marka olarak tutulur.

## İşletmecinin kendi hesabında yapacağı adımlar

1. Shopier'de bireysel hesap aç ve gerçek başvuru/kimlik/banka bilgilerini kendi panelinde tamamla.
2. İki **dijital** ürün oluştur: Başlangıç / 30 gün / 299 TRY; Düzenli çalışma / 90 gün / 799 TRY. Tek öğrenci, tek adet; varyant/seçenek, indirim ve kargo bedeli olmamalı. Otomatik yenileme yok; ilk doğrulanmış aktivasyondan başlayan erişim açıkça belirtilmeli.
3. Developer panelindeki güncel rehbere göre API erişimini aç. Kendi hesabını bağlamak için PAT gerekiyorsa 2FA'yı tamamla. Token'ı sohbetten gönderme; yalnız barındırma sağlayıcısının güvenli **sunucu** ortamına SHOPIER_ACCESS_TOKEN olarak ekle. VITE_ öneki kullanma. Ürün/sipariş okuma için gereken en dar izinleri seç; token'ı düzenli döndür. Paylaşımlı uygulama için kapsamlı OAuth entegrasyonu ayrı çalışmadır.
4. Yönetici sistem ayarlarına iki ürünün gerçek kimliğini ve HTTPS shopier.com ürün URL'sini gir. Gerçek bireysel satıcı/veri sorumlusu adı ve tam adresi tamamla; yasal dayanak/saklama/aktarım metinleri ve kabul kontrollerini uygulanan sürece göre doğrula.
5. Önce gerçek küçük pilot siparişiyle alıcı e-postası, ürün ve tutarı dene. Yönetici satış açılışında API'den ürünün dijital, stokta, doğru fiyat ve bağlantıda olduğunu doğrular. Site hesabının ve Shopier alıcı e-postasının aynı olması gerekir. Satış ve ücretli erişim zorunluluğunu ayrı değerlendir.
6. Veli panelinde öğrenciyi seç, Shopier sipariş numarasını doğrula. Tek sipariş tek öğrenciye bağlanır. Tekrar deneme aynı aktivasyon tarihini korur. İade veya ödenmemiş sipariş erişim oluşturmaz.
7. Hizmet erişimini sağladıktan sonra Shopier panelinin güncel dijital ürün/hizmet teslimat sürecine göre siparişi kapat. Bu sürüm otomatik teslimat/para aktarımı API'si kullanmaz. İade sürecini Shopier panelinden yönet.

## Doğrulama sınırı

API sözleşmesi, kötüye kullanım ve gerçek PostgreSQL yetki/idempotans testleri otomatik test kapsamındadır. Gerçek Shopier hesabı/token'ı bulunmadığı için sağlayıcı uçtan uca satın alma, iade ve teslimat testi yapılmış sayılmaz. API alanları değişirse sistem erişim açmadan hata döner; sessizce uyumsuz sipariş kabul etmez.

## Teknik kayıt

- Migration: 20261013150111_shopier_verified_access.sql
- Sunucu: shopier-client.ts, shopier-model.ts, shopier-access.ts, routes/shopier-routes.ts
- Genel sayfa: /paketler; veli uçları: /api/parent/shopier/access, /api/parent/shopier/claim
- Yalnız service_role ledger okuyup yazar; istemci RPC çağrısı yetkisizdir.
- Ürün kimliği değişse bile eski sipariş kendi kaydedilen ürününe göre denetlenir.
- Yeni çalışma erişimi kontrol edilir; devam eden sınav/çalışmanın bitirilmesi korunur.
