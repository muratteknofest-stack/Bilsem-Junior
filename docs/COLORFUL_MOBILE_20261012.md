# Renkli soru aileleri ve mobil çözüm ekranı

## İnceleme kapsamı

12 Ekim 2026 tarihinde aşağıdaki platformların herkese açık tanıtım, soru türü ve örnek sayfaları incelendi. Ücretli test hesapları kullanılmadı. Kullanıcının Fedu ekran görüntüleri soru/şık yerleşimi için ayrıca incelendi. Sorular ve görseller kopyalanmadı; çizimler SVG ile özgün oluşturuldu.

- MentalUP/Fedu: https://www.mentalup.net/blog/bilsem-sinav-sorulari — dikkat, hafıza, örüntü ve mantık örnekleri.
- BİLSEM Plus: https://www.bilsemplus.com/blog/bilsem-gorsel-algi-testi — görsel ayırt etme, tamamlama, hafıza ve uzamsal ilişkiler.
- BİLSEM Online: https://www.bilsemonline.com/ — kişiye özel etkinlikler, toplu etkinlik ve atölye yaklaşımı; halka açık ürün anlatımı.
- Altın Çocuklar: https://altincocuklarbilsem.com/bilsem-soru-tipleri — aynalama, gölge, parça-bütün, matris, perspektif ve diğer kategoriler.

## Uygulama

`colorful-1` beş mevcut konuya yeni üretim ailesi sağlar. Eski `verified` ve `workshop` sorularının üreticileri ve doğrulamaları korunur.

| Konu | Yeni içerik | Sınıfa göre değişim |
|---|---|---|
| Ayna | Renk ve ayrı geometrik motif içeren mozaik | 2×2, 3×3, 4×4 |
| Tamamlama | Tek eksik karo; satır tekrarı veya döngüsel kaydırma | Küçük sınıfta tekrar, ileride satırlar arası ilişki |
| Hafıza | Önce gösterilen, kullanıcı hazır olunca gizlenen renkli mozaik | Kare ve motif sayısı artar |
| Gölge | Kupa, roket ve balık çizimleri; yön ve boşluk ayrıntıları | Kolayda farklı nesneler, ileride aynı nesnenin yakın varyasyonları |
| Uzamsal ilişki | Dört numaralı renkli kalemin örtüşmesi | En üst, üstten ikinci veya üçüncü katman |

Mevcut 1–4. sınıf profilleri, yaş aralıkları ve azami zorluk sınırları kullanılır. Bu otomatik sınırlar pedagojik uzman onayı veya resmi sınav geçerliliği anlamına gelmez. Her motif renk dışında şekille, kalemler numarayla da ayırt edilir. Dört seçenek birbirinden farklıdır; birincil hesap ve bağımsız aday denetimi tek cevapta birleşmelidir. Metin, açıklama, seçenek veya görünmeyen alan değişirse sertifikasyon reddedilir.

Aktif testler `FocusedQuestionScreen` üzerinden açılır. Ekran `100dvh` ve güvenli alan boşluklarını kullanır. Soru metni, çizim, dört şık ve ileri/geri kontrolleri aynı ekrandadır. Çizim kendi alanına orantılı ölçeklenir; şıkların dokunma alanı 44 pikselin altına inmez. Yatay telefonda soru ve cevaplar yan yana yerleşir. Soru listesi, ipucu, bitirme, zorluk değiştirme, raporlama ve açıklamalar klavyeyle de kullanılabilen dialog içindedir. Hafıza sorusunda büyütme üzerinden deseni tekrar açma yolu kapalıdır. Önceden farklı cevaplama biçimiyle kaydedilmiş yanıtlar menüde incelenebilir.

## Doğrulama

- 208 birim/entegrasyon testi; yeni 1.200 sınıfa uygun üretim, cevap anahtarı/metadata bozulma kontrolleri ve tarihsel motor uyumluluğu dahil.
- 1.200 soruluk sınıf dağılımı testi dört sınıfta konu kapsamını ve tekilliği doğrular; gerçek veritabanını değiştirmez.
- TypeScript ve Vercel üretim derlemesi.
- Gerçek Chromium ile yerel bileşen düzeyinde 284 senaryo: 44 konu × 6 ekran ölçüsü; ayrıca 5 yeni aile × 4 sınıf. Ekran ölçüleri 320×568, 360×640, 390×844, 667×375, 768×1024, 1024×768. Kart sınırları, SVG taşması, dokunma alanı, cevap olayı, hafıza gizleme ve araç menüsü kontrol edilir.
- Bu tarayıcı testi oturum açılmış canlı API/veritabanı akışı veya fiziksel iOS/Android cihaz testi değildir. Normal metin ölçeğinde sınırlar kontrol edilir; erişilebilirlik için aşırı yakınlaştırmada içerik kaydırılabilir.

Tekrar çalıştırma: `npm ci`, `npx playwright install chromium`, `npm test`, `npm run test:layout`, `npm run vercel-build`. Hazır Chromium kullanmak için `BROWSER_EXECUTABLE` belirtilebilir. Tarayıcı raporu ve ekran görüntüleri varsayılan olarak `/tmp/zekapark-layout` altında üretilir; `LAYOUT_OUTPUT` ile değiştirilebilir. Fixture yalnızca yerel geliştirme testidir, üretim sayfası değildir.

Canlı dağıtım, birleştirme ve yayımlı 4.000 sorunun değiştirilmesi bu değişikliğin parçası olarak yapılmadı. Yeni aileler sonraki üretimlerde kullanılacak; mevcut yayımlı bankanın yenilenmesi ayrı yayın akışını gerektirir. Sesli harf hafızası veya altı seçenekli test formatı eklenmedi; mevcut dört seçenek sözleşmesi korunur.
