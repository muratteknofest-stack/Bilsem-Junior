# Görsel deneme yapıları — 2 Kasım 2026

Kullanıcının gönderdiği 18 ekran görüntüsünde 47 sorunun tamamı ve cevap anahtarı görüldü. İnceleme yalnız yapısaldır; soru görselleri, metinler, seçenekler ve yayınevi varlıkları uygulamaya kopyalanmaz. Yeni örnekler özgün, keskin SVG desenleridir; kaynakta bulunan tüm serbest eğrili çizimleri yeniden ürettikleri iddia edilmez.

| Kaynak soru grubu | Yeni mekanik | Uyarlama |
|---|---|---|
| 1–5 | detail-mirror | Ayrıntılı renk/konum yansıması; yönü görünen ayna |
| 6–14 | context-patch | Görünen tekrar gruplarından eksik bölgeyi çıkarma; aday yerleştirme |
| 15–19 | overlap-rule | İki örnekten birleşim, kesişim veya ortak bölgeleri silme kuralı |
| 20–24 | transform-pairs | İki örnekten yansıma/çeyrek tur/yarım tur dönüşümü |
| 25–30, 33–34, 36, 38–40, 44, 46–47 | cyclic-matrix | Satır ve sütunda aynı görsel bileşenleri birer kez kullanma |
| 31–32, 35, 37, 41–43, 45 | composition-matrix | Satır ve sütunlarda ortak birleşim/kesişim/fark kuralı |

Bu eşleme birebir soru yeniden üretimi değildir. Özellikle şekil konturlarının kesilmesi, çizgi uçlarının birleşmesi ve yıldızların katman sırası kaynakta farklı özel yükler taşır; ilk yeni sürüm bu aileleri hücre desenleriyle modeller. Mevcut küp, hafıza, sayı, şifre ve diğer motorlar da korunur.

## Sınıf ve zorluk

Birinci sınıf: 2×2 desenli yansıma ve dönüşüm, dikey ayna, 1 hücrelik boşluk, 2×2 döngüsel matris; örtüşmede yalnız birleşim. Bileşim matrisi verilmez. İkinci sınıf: 3×3 ayrıntılı yansıma, 2 hücrelik boşluk, küçük kartlarla 3×3 matris; kesişim ve fark örnekleri. Üçüncü sınıf: 3×3 bileşenli kartlar, iki boyutlu eksik parça ve iki yönden işlem. Dördüncü sınıf: en çok 4×4 yansıma, üst zorluklarda 6×6 tekrar alanı ve 2×2 boşluk. Yazılım sınırları psikometrik kalibrasyon değildir; gerçek öğrencilerle eğitmen incelemesi gerekir.

## Doğruluk ve uyumluluk

Yalnız görünür verilenler gönderilir; işlemin adı veya gizli tamamlanmış desen öğrenci çizim verisinde bulunmaz. Birincil çözüm kuralı örneklerden çıkarır; ikinci çözüm her seçeneği hücre koordinatları, doğruluk tabloları veya tüm satır/sütun gruplarıyla denetler. Çelişkili/belirsiz örnekler ve dört farklı seçeneği olmayan sorular reddedilir. Yayınlanan adayların insan incelemesi bekliyor olarak kalır.

Yeni aktarım `exam-lab-1`; önceki `reference-lab-1` ve diğer biçimler desteklenmeye devam eder. Eski APK yeni çizim alamaz. Kaydedilmiş çalışmalar değiştirilmez. Karma çalışmalarda yeni motor seçenekleri değerlendirilir; konu pratiğinde yayımlanmış yeni havuz kullanılır. Yeni motor mantık hatası olmayan tüm içerikler için mutlak garanti veya resmî sınav eşdeğerliği olarak sunulmaz.
