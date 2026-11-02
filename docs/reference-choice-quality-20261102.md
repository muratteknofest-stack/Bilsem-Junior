# Görünür ipucunu koruyarak çeldirici kalitesini artırma

`reference-lab-2`, bir önceki sürümdeki aynı tohumun verilenlerini aynen korur. Sorunun yalnız ilk rakamını veya boşluğun yalnız ilk hücresini inceleyerek doğru şıkkı tek başına ayırma kusuru giderilir. Kodlarda iki yanlış aday farklı konumlarda hata yapar; diğer aday ters sıra veya yanlış anahtar uygulamasıdır. Eksik desende iki ayrı hücre yanılgısı ile yön/işaret sırası hatası kullanılır. Her konumun doğru değeri en az iki şıkta bulunur; tek hücre veya karakter yeterli olmaz.

Hafıza eşleştirmesindeki bütün seçenekler daha önce gösterilmiştir. Sayı hafızasında mümkün olan bütün yanlışlar gösterilen dizinin başka konumlarından seçilir; üç sayılık çalışmada dördüncü farklı seçenek için bir dış sayı gerekir. Benzeşimde bütün seçenekler ilişki yönünün aynı tarafındadır. Parça birleşiminde tam hedefe en yakın üç yanlış birleşim seçilir; eksik/fazla hücre sayıları ayrıca açıklanır. Katmanlarda sıra, şekil ve renk yanılgıları ayrılır. Yanlış şık açıklamaları belirli konumu, çifti veya hatayı belirtir.

Sınıf yükü, görsel verilenler ve tek doğru çözüm değişmez. Bu, psikometrik zorluk kalibrasyonu değildir; seçeneklerdeki kestirme yolları kaldıran bir yazılımsal iyileştirmedir. Yeni konu veya farklı soru sayısı olarak sayılmaz.

## Uyumluluk

`generateReferenceQuestionV1` eski üretimi değiştirmeden yeniden kurar. Dokuz sabit içerik hash'i ve ilk 1.070 sorunun tam yeniden doğrulaması eski yolu denetler. Kalite kontrolü motor sürümüne göre doğru üreticiyi kullanır; bilinmeyen motor sürümü reddedilir. Sunucu iki motoru da kabul eder. Çizim şeması değişmediği için aktarım biçimi `reference-lab-1` olarak kalır. Kaydedilmiş oturumların özgün soru/şık anlık görüntüleri korunur. Yeni şıklar eski bir verilenin yeni soru gibi sayılmasına veya geçmiş tekrar filtresinden kaçmasına izin vermez.

## Banka yükseltmesi

`scripts/prepare-reference-choice-upgrade.ts` ağ bağlantısı kurmaz. Kaynak 1.070 soruluk dosyanın tam SHA-256'sını doğrular, yayımlanan eski içeriği yeniden kurar, yeni soruları bağımsız olarak çözer ve aynı verilenin korunduğunu denetler. PostgreSQL JSONB biçimindeki eski/yeni içerik hash'leri yerel PGlite ile hesaplanır. İlk deneme planının eski sınıf hash'leri canlı veritabanıyla aynı bulunmuştur.

Üretim sürümü hazır olduktan sonra en fazla 20 bağımsız soruluk işlemlerle revizyon 2'den 3'e geçilir. Her işlem kendi grubunu kilitler; eski tam içerik hash'i, revizyonu ve inceleyici durumu ile yeni tam içerik hash'i, kaynak commit'i, verilenlerin eşitliği ve bekleyen insan/editör incelemesi denetlenir. Bir satır uyuşmazsa o grubun tamamı yazılmadan reddedilir. Bütün 1.070 soru tek işlemde değiştirilmiş gibi gösterilmez. Kesinti durumunda eski ve yeni motor aynı anda geçerlidir; başarılı grupların yeni hash'leri doğrulanarak devam edilir. Aynı revizyon tekrar uygulanamaz.

Yeni soru kimliği eklenmez ve eski oturumlara yazılmaz; yayımlanmış toplam 21.170 olarak kalır. İnsan eğitmen/editör incelemesi tamamlanmış sayılmaz. Kayıt/satış/RLS ayarları bu kapsamda değiştirilmez.

## Kontroller

Her desteklenen mekanik/sınıf/seviyede bağımsız tek çözüm, değiştirilmiş soru reddi ve dört farklı seçenek denetlenir. Ek testler her kod/desen konumunda kestirme olmamasını, hafıza seçeneklerinin çalışılan öğelerden gelmesini, aynı ilişki rolünü, en yakın yanlış birleşimleri, eski hash'leri ve soru kimliğinin değişmemesini sınar. Gerçek PostgreSQL motorundaki korumalı yükseltme testinde bir bozuk satır bütün grubu engeller; eksik inceleme metaverisi reddedilir; geçerli geçiş sonrası tekrar yazım yapılamaz. Tarayıcıdaki mevcut 35 kart yeni üreticiyi de kullanır.
