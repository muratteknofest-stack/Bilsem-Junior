# Birleşik gölge soruları

`shadow-lab-1`, büyük renkli birleşik hedef ve dört tek renkli gölgeyle çalışır. İki veya üç üst üste binen parça, 1–3 gerçek iç boşluk, aynı yön ve aynı kadraj kullanılır. Ana hedef ve seçenekler aynı poligonlardan ve bütün katmanları delen aynı SVG maskesinden çizilir. Dekoratif arka plan cevap geometrisinin parçası değildir.

- Kaynak: `src/features/questions/composite-shadow.ts`; çizim: `CompositeShadowBoard.tsx`.
- Sınıf ve zorluk sınırları `EDUCATION_PROFILES` ile korunur. Birinci sınıfta iki parça ve en fazla iki boşluk vardır.
- Yanlış seçeneklerde boşluk kayması, parça kayması, ayna veya çeyrek tur hatası kullanılır. Gösterilmeyen katman ayrıntıları veya yalnız renk değişimi yeni seçenek sayılmaz.
- Görünür birleşim ve boşluklar 64×64 örnekleme üzerinde karşılaştırılır; bağımsız sarım sayısı denetimi tek uygun şıkkı doğrular. Otomatik test, pedagojik uzman onayı olarak kaydedilmez.
- Güncel web istemcisinin gölge çalışmaları bu kanonik motordan, mevcut çok aşamalı doğrulama ve öğrenci oturumu akışıyla üretilir. Yayımlanmış eski bankayı değiştirmez. Diğer odak konularının banka politikası korunur.
- `visual-lab-1` ve önceki APK’lar eski uyumlu soruları almaya devam eder. Yeni birleşik şekil yalnız `shadow-lab-1` biçimini bildiren istemcilere gönderilir; eski bir APK yeni bir web oturumunu yanlış çizmek yerine güncelleme uyarısı alır.

Doğrulama: desteklenen 15 sınıf/zorluk hücresinde 120 örnek, geometri/yanlış anahtar/boşluk/aynı görünür şık testleri; dört sınıf için gerçek kimlik doğrulamalı API fixture’ında yeni ve önceki istemciyle odak çalışması; 20 farklı soruluk banka yazımı gerektirmeyen oturum. Genel test paketi 751 test geçti. Son odak üretimi düzeltmesi ilgili 15 testle ayrıca geçti.

`check-visual-reasoning.mjs`, birleşik gölgeyi 320–768 px, dikey/yatay ekran ve gerçek SVG raster farklılığı kontrollerine dahil eder. Tarayıcı kontrollerinin tanımlı olması çalıştırıldıkları anlamına gelmez; yayın kaydında gerçek sonuç ayrıca belirtilmelidir. Android web derlemesi APK derlemesi veya fiziksel cihaz testi değildir.
