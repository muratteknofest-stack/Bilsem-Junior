# Test içi soru çeşitliliği — 23 Ekim 2026

Aynı testte benzer görevler görülüyordu. Önceki seçim önce soru türü sayısını dengeliyor, aynı kuralı kullanan başka bir türü yeni görev sayabiliyordu. Sabit alan kotaları da tek tarzı olan bellek/sözel alanlarını tekrar ettiriyordu. Rastgele tohum, değişen sözcük, renk, hücre sayısı veya seçenek sırası bu sorunu çözmüyordu.

## Uygulanan seçim

- Tam soru ve görsel tekrarına karşı mevcut engeller korunur.
- Soru adı yerine çözüm kuralı ve daha geniş görev tarzı sayılır. Küp açılımı/origami, kâğıt katlama/delme ve aynı döndürme/ayna görevleri ortak kimlik taşır. Gerçekten farklı üç şekil analojisi ise ayrılır.
- Kullanılmamış bir kural/tarz, az kullanılmış bir tür adından önce gelir. Bankadaki benzer bir varyant kabul edilmeden farklı türlerde kanıtlanmış üretim de aranır.
- Türkçe çok alanlı karışık testte her alanın ilk temsili korunur. Sonraki kotalarda tekrar gerektiren alanın yerine uygun farklı görevi olan bir alan seçilebilir. Her alanın tam eşit sayıda olması artık bu modda bir zorunluluk değildir.
- Öğrencinin seçtiği tek alan, konu, sınıf, test uzunluğu ve zorluk planı korunur. Konu testleri yalnızca yayımlanmış havuzu kullanır. İngilizce sonlu havuz kendi alan planını korur.
- Oluşan sorular aynı tarz arka arkaya gelmeyecek şekilde, zorluk sırasını bozmadan sıralanır. Son 30 günlük gerçek soru geçmişinden kural ve tarz maruziyeti yeniden hesaplanır.
- Günlük üç görev ve misafir demo seçimi de önceki görevleri ortak çeşitlilik denetimine verir. Açık eski oturumlar yeniden yazılmaz; değişiklik yeni başlatılan testlere uygulanır.

## Denetim

8.000 soruluk son yayın paketi kalite kapısından geçirildi. Tüm 44 konu, dört sınıf, tek alan çalışmaları, 5/15/20/30/45 soruluk karışık testler, ardışık geçmişli oturumlar, İngilizce, demo ve günlük görev yolları denetlendi. Canlı veritabanı veya hesap verisi değiştirilmedi.

Karşılaştırma aynı yeni kural/tarz kimlikleriyle, aynı belirlenmiş rastgele başlangıçlarla yapıldı. `before.json` önceki seçiciyi, `after.json` yeni seçiciyi ölçer. Karışık karşılaştırmanın iki tarafında da 80 oturum ve 1.840 soru vardır; son rapora ayrıca sekiz demo/günlük görev senaryosu eklenmiştir.

| Ölçüm | Önce | Sonra |
|---|---:|---:|
| Karışık testlerde aynı kuralın tekrar sayısı | 347 | 24 |
| Oturumlar içindeki farklı tarz sayılarının toplamı | 1.386 | 1.796 |
| Aynı tarzın yan yana gelmesi | 3 | 0 |

Kural tekrarı bu örneklemde %93,08 azaldı. İncelenen 20 soruluk 16 karışık oturumun tamamında 20 farklı kural ve 20 farklı tarz var. Son denetim: 320 oturum, 5.084 soru seçimi, sıfır kalite/tekrar-görseli/sınıf/zorluk/geçmiş ihlali. Yazılım testleri: 476/476; üretim derlemesi: 74 başlangıç testi, 200 soru testi, TypeScript, gerçek Auth erişimi, 148 varlık taraması ve web/API derlemesi geçti.

## Gerçek sınır

Soru sayısı, farklı görev tarzı sayısı değildir. Aynı konuya özel uzun bir test aynı beceriyi tekrar çalıştırabilir. 1. sınıfın 45 soruluk karışık örneklerinde de sınıf ve zorluk koşullarına uyan farklı kurallar tükenince 5–7 kural tekrarı kaldı; diğer karışık örneklerde kural tekrarı yok. Algoritma bunun için test uzunluğunu azaltmaz, sınıfı/zorluğu değiştirmez veya sayı/renk değişikliğini yeni kural gibi saymaz. Bu sınırın tamamen kaldırılması yeni, bağımsız doğrulanmış pedagojik görevler gerektirir. Bu rapor insan/psikometrik inceleme veya her olası rastgele oturum için sıfır tekrar garantisi değildir.

## Yeniden çalıştırma

```sh
npm run audit:session-diversity -- /path/to/owner-bank.json /path/to/report.json
```

Regresyonlar `tests/test-assembly.test.ts` içinde: takma konu adları, kozmetik değişiklikler, gerçek analoji ayrımı, banka/üretim karşılaştırması, diğer türlerin taranması, alan kotası aktarımı, sınıf/zorluk/uzunluk, sonlu konu havuzunda dengeleme ve günlük/demo tarz seçimi.
