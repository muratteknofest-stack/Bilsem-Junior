# Soru kalitesi ve görsel netlik — verified-3

## Davranış

Yeni üretim 11 desteklenen türde verified-3 kullanır. Çeldiriciler işlem sırasını değiştirme, eklenen sabiti unutma, tekrarlanan sembolü atlama, yanlış hedefi sayma veya yanlış dönüşüm uygulama gibi açıklanabilir hatalardan türetilir. Sayısal açıklamalar verilenlerden hesaplanan ara işlemleri ve sonucu içerir. Seçenekler içerik parmak iziyle tekilleştirilir; dört farklı seçenek üretilemiyorsa üretim başarısız olur.

Matrislerde örnek çeşitliliği ve sonuç deseninin okunabilir doluluk sınırı aranır. Deneme sınırı içinde tek kurallı ve okunabilir bir matris oluşmazsa rastgele yedek soru verilmez. Sembol değerleri birbirinden farklıdır; ileri seviyelerde tekrar eden semboller kullanılır. Sayma alanı seviyeye göre 12–36 şekil, sıralama 4–6 kişi içerir.

İki ayrı çözücü, tek doğru seçenek ve kanonik içerik kontrolleri korunmuştur. Eski verified-2 soruları dondurulmuş üreticiyle kendi sürümünde yeniden doğrulanır; yeni sürüme etiketlenerek geçirilmez. Yeni kimliklerde v3 bulunur. Eski uzak banka kayıtları değiştirilmez veya silinmez.

## Görsel yüzey

- Desenler ve dört sembol SVG geometrisidir: raster büyütmeye bağlı piksellenme yoktur. 3D hissi yüzey, kenar ve ışık katmanlarıyla verilir; hücre koordinatları değişmez.
- Sade görünüm gölgeyi kaldırır ve aynı verileri gösterir. Büyütme penceresi aynı soruyu yeniden çizer; cevap veya yeni ipucu içermez.
- Matris satır/sütun ilişkisi korunur. Dört adımlı görsel dizi dar alanda tek satırda kaydırılır; cevap mekanikleri sabit kalır.
- Sayma şekilleri renk ipucu vermeyen ortak palet kullanır. Desenler ekran okuyucuya dolu/boş satırlarıyla açıklanır. Sayısal seçeneklerin erişilebilir adları gerçek değeri içerir.
- Dialog klavye odağını içeride tutar; Escape ile kapanır, odak ve sayfa kaydırmasını geri yükler.

Buradaki “4K” ayrı bir 4K resim veya video üretimi değildir. Çizimlerin çözünürlükten bağımsız olması ve 3840×2160 görüntü alanında doğrulanmasıdır. Gerçek üç boyutlu model/WebGL eklenmedi.

## Doğrulama (7 Ekim 2026)

- `npm test`: 46/46.
- `npm run vercel-build`: 31 soru testi, TypeScript, Vite ve Express Function paketlemesi geçti.
- Mevcut 3.300 üretim ve 1.320 bozma/yeniden sıralama örneğine ek olarak 660 eski/yeni sürüm uyumluluk örneği, 360 matris, 60 işlem çeldiricisi ve seviye sınırı kontrolleri geçti.
- Chromium: 11 tür × 320/390/768/1440/3840 genişlikte 55 düzen, sayfa taşması olmadan görüntülendi. Mobil ve 3840×2160 ekran görüntüleri incelendi.
- SVG kimlik tekilliği, sade/derinlikli/büyütülmüş çizimde aynı hücreler, dialog odağı/Escape/kaydırma, dokunarak yerleştirme/temizleme, gerçek fare sürüklemesi, Enter ile seçim kontrolleri geçti. Tarayıcı çalışma zamanı hatası görülmedi.
- Tarayıcı doğrulaması ortak üretici, QuestionRenderer ve AnswerWorkspace ile yerel bileşen ortamında yapıldı. Fiziksel telefon veya korumalı Vercel önizlemesinde gerçek API/Auth testi değildir.

Otomatik matematiksel denetim pedagojik ölçme geçerliliğinin yerine geçmez; mutlak sıfır hata garantisi değildir. Yeni serbest içerik veya yeni soru türü yine ayrı doğrulama gerektirir.
