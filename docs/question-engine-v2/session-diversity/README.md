# Güncel politika: kesin tarz tekrarı engeli

23 Ekim 2026 güncellemesi `distinct-styles-3`, önceki yumuşak çeşitlendirme politikasının yerini alır. Aşağıdaki %93 karşılaştırması tarihsel rapordur; güncel davranış benzer soru kabul ederek istenen sayıyı doldurmak değildir.

- Başarıyla hazırlanan bir testte hem kural hem geniş soru tarzı kimliği benzersiz olmak zorundadır. Banka, üretilmiş soru, eski istemci ve geçmişi en eski olandan tekrar kullanma politikası bu engeli aşamaz.
- Renk, sayı, sözcük, hücre büyüklüğü, dönüş açısı/ekseni ve motor sürümü aynı görevi yeni bir tarz yapmaz. Katlama/delme/simetri tamamlama, küp açılımı/origami, farklı motorlarda döndürme/ayna, aynı harf kodu, sayı piramidi ve gölge eşleme ortak tarzlarla değerlendirilir. Gerçekten farklı kural aileleri ayrı kalır.
- Uygun farklı tarz bulunamazsa HTTP 422 `INSUFFICIENT_DISTINCT_QUESTIONS` ile istenen sayı ve o hazırlamada bulunabilen sayı döner. Kısmi oturum eklenmez, mevcut oturum bitirilmez, yanıtlar/puanlar değiştirilmez. İstenen uzunluk veya seçilen konu sessizce değiştirilmez.
- Seçim ekranında kullanıcı daha kısa hedefi veya tüm alanlardan karışık testi seçebilir; sonraki başlatma bu tercihi kullanır. Tek konu çalışmalarında o konunun az sayıdaki farklı tarzı aynı testte tekrar kullanılamaz. Tek soru hedefiyle 44 konunun tamamına erişim korunur.
- Kısa pratiğin varsayılanı 5 sorudur. Kullanıcının açıkça seçtiği daha kısa hedef 1–5 arasında sunucu tarafından doğrulanır ve ekranda gösterilir; böylece tek konuyu koruyarak 1 soruluk pratiğe de geçilebilir. Denemelerin uzunluğu hâlâ sunucudaki deneme ayarından gelir.
- Günlük üç görev, misafir demo ve eski yayımlanmış havuz seçicisinde de tekrar engeli vardır. Soru bankası üretimi/yönetici atölyesi çok sayıda alıştırma varyantı oluşturabilir; bunlar öğrenci testinde aynı tarzı tekrar ettiremez.
- İngilizce hesap testleri de aynı kurala tabidir. Sonlu İngilizce havuzunda uzun test hazırlanamazsa tekrarlarla doldurulmaz; beş farklı tarz içeren karışık pratiğe geçme seçeneği gösterilir. Mevcut kaydedilmiş oturumlar ve geçmiş yanıtlar yeniden yazılmaz.

## Yeni soru mekanikleri — reasoning-lab-1

Sekiz yeni görev ailesi eklendi: domino uçlarını bağlama, kutular arasında sıralı aktarım, lamba durumlarını değiştirme, kartları yer değiştirme, birim karelerin dış kenarlarını sayma, sağ/aşağı yollarını sayma, bölüm uzunluklarından en düşük yol toplamını bulma ve geri koymadan çekişte kesin sonucu belirleme. Her ailenin görünür verilenleri ve sorgusu farklıdır. Tohum, renk, sayı, sınıf veya zorluk değişikliği aynı aileyi ikinci kez seçilebilir yapmaz.

- Her mekanik birincil çözüm ve farklı bir bağımsız yöntemle doğrulanır: dinamik yol sayımı/arama, uç eşleme/aday tarama, sıralı aktarım/korunum, anahtarlama/tek-çift basış, ileri değiştirme/geriye izleme, dış kenar taraması/ortak kenar hesabı, sınırlı toplam/çekiş kombinasyonları, yol toplamı/ikili farklar.
- 1.200 sınıf/zorluk/tohum örneği; bozuk verilenler, yanlış cevap anahtarı, değiştirilmiş yönerge, gizli seçenek alanı, çizim ve öğrenci DTO kontrolleriyle sınandı. Mevcut motorların kanonik sürümleri değiştirilmedi.
- Yeni çizimler yalnız `reasoning-lab-1` biçimini bildiren istemcilere gönderilir. `professional-v2`, `reasoning-8` ve daha eski istemciler destekledikleri motorlarla devam eder; yeni bir çizim içeren kaydedilmiş oturuma uyumsuz istemciyle cevap yazılamaz. Yeni APK dağıtımı bu sürümün kapsamında değildir.
- Yeni aileler Türkçe karışık testlerin doğrulanmış üretim havuzuna eklendi. Yayımlanmış banka sorularının statüsü ve tek konu çalışmalarının onaylı banka sınırı değişmedi.
- Erken sınıflarda matris alanının yalnız döndürme tarzı bulunabildiği için karışık uzun testin ilk matris kotası esnek uzamsal sorulardan önce ayrılır. Böylece aynı tarzı iki alanda tekrarlatmadan bütün alanların ilk temsili korunur.

## Güncel denetim

`strict.json`: 8.000 bank sorusu kalite kapısından geçti. Dört sınıf, tüm 44 konu, alan filtreleri, banka/üretim, zorluk planları, oturum geçmişi, İngilizce hesap pratiği, günlük görev ve demo için 500 hazırlama isteği denetlendi.

| Sonuç | Sayı |
|---|---:|
| İstenen uzunlukta oluşturulan test | 289 |
| Yeterli farklı tarz bulunmadığı için açıkça reddedilen istek | 211 |
| Oluşturulan testlerde kontrol edilen soru | 2.005 |
| Tekrarlanan kural / tarz | 0 / 0 |
| Tamamlanan 20 soruluk macera senaryosu | 16 / 16 |
| Beklenmeyen doğrulama hatası | 0 |

Banka ve üretimle, ardışık geçmişli tüm sınıflarda 5/15/20/30 soruluk karışık örnekler tamamlandı; 20 soruluk 16 maceranın tamamı on alanı da içerdi. 2–4. sınıflardaki 45 soruluk 12 örneğin tamamı hazırlandı. 1. sınıftaki 45 soruluk dört örnek, 15 soruluk tek konu örnekleri ve kısıtlı alan/havuz örneklerinin bir kısmı bilerek reddedildi. Bu 211 istek için kısaltılmış veya benzer tarzlarla doldurulmuş bir oturum oluşturulmadı. 1. sınıfın 45 soruluk kapsamı ve dar konu/İngilizce havuzları için daha fazla gerçek mekanik gerekir. Algoritmik tarz sınıflandırması insan/psikometrik inceleme yerine geçmez.

485 yazılım testi geçti. Gerçek öğrenme rotasının kimlik doğrulama, soru bankası ve oturum DTO zinciriyle yapılan testler, başarısız hazırlığın eski yanıtları koruduğunu ve istemcinin bu engeli kapatamadığını doğrular. Yeni politika için biçim/metin kimlikleri aynı sayılan gerçek motor örnekleri ve kullanıcıya gösterilen kurtarma seçenekleri de kontrol edilir.

```sh
npm run audit:strict-test-diversity -- /path/to/owner-bank.json /path/to/strict-report.json
```

---

## Önceki sürümün tarihsel incelemesi

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
