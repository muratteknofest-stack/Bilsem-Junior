# Tam konu kapsamlı Türkçe banka — 14 Ekim 2026

Kullanıcının seçtiği kapsam sınıf başına **2.000**, toplam **8.000** sorudur. Her zorlukta ayrıca 2.000 soru değildir. 1–4. sınıfların her biri 44 konu başlığını kapsar. Konu başına 45 veya 46 soru ayrılmıştır. Bir konunun kotası başka konuya aktarılamaz.

Sınıfın bütün izin verilen zorlukları her konuda en az bir soruyla temsil edilir: 1. sınıf 1–2; 2. sınıf 1–3; 3. sınıf 1–4; 4. sınıf 1–6. Toplam 660 sınıf/konu/zorluk hücresi doludur. İlk turlar kapsamı garanti eder; kalan sorularda mevcut ağırlıklı zorluk politikası kullanılır.

## Motor ve geriye uyumluluk

`complete` üretim profili 23 konuda yeni `curriculum-1` motorunu kullanır. Sayı ve şekil yükleri sınıfa göre sınırlanır. 1. sınıfın 3×3/Raven başlıkları basit kaydırma veya satır-şekil/sütun-renk ilişkisidir; önceki ileri matris kuralları başlangıç sınıfına taşınmaz. Katlama ve simetri renkli işaretlerin yansımalarıyla çeşitlenir. Örüntü ve parça-bütün yeni görünür kalıplar kullanır.

Diğer 21 konuda mevcut sürümlü motorlar korunur. Eski yayımlanmış/arşivli kayıtların çözüm yolları değişmez. İngilizce bankanın üretim profili değişmez. Tangram çalışması yedi gerçek tangram parçasının kontur/yön eşleştirmesidir; serbest sürükle-bırak inşa etkinliği değildir.

## Doğrulama

- 8.000 ayrı kimlik, 8.000 ayrı görünür kök ve 8.000 ayrı görsel/seçenek bileşimi.
- Önceki 12.000 kaydın kök ve görsel özetleri dışlandı; 1.750 çakışan aday reddedildi.
- 8.000 cevap anahtarı kontrolü, dört farklı seçenek ve gerçek React çizim çıktısı.
- 4.082 açık sayısal eşitlik bağımsız hesaplandı.
- 8.000 yanlış anahtar ve 8.000 kopya şık ekleme denemesi reddedildi.
- 289 yerel test ve TypeScript denetimi başarılı.
- Sınıf metadatası görünür soru kimliğine dahil edilmez; aynı soruyu başka sınıfa etiketlemek yenilik sayılmaz.

Bunlar tanımlı kuralların teknik kontrolleridir. Gerçek öğrencilerle zorluk kalibrasyonu ve bireysel eğitmen incelemesi yapılmış sayılmaz. `editorReview: pending` ve `individualHumanReview: false` korunur.

## Stüdyo

Sınıf artık üreticiye gönderilir ve zorluk sınıfın sınırına göre daraltılır. Her konu yanında gerçek yayımlanan adet, üstte sınıfın toplamı ve konu kapsamı görünür. Yıldızlar öneri işaretidir. Kayıtlı soru incelenirken asıl nesne yüklenir. Bulut kaydı tamamlanmadan başarı gösterilmez. Yayımlanan bir soru üzerinde taslak kaydetmek yeni kimlikli bir kopya oluşturur; canlı kaydı taslağa düşürmez.

## Üretim ve yayın

```sh
npm run generate:complete-bank -- --per-grade 2000 --batch robot-20261014-complete-v1 --seed 2026101414 --at 2026-10-14T11:45:00.000Z --existing-hashes private-hashes.json --output private-bank.json
node --import tsx scripts/verify-complete-bank.tsx private-bank.json private-report.json
```

Özel banka gövdeleri ve cevap anahtarları GitHub, public varlıklar veya test çıktısı olarak yayımlanmaz. Manifest yalnızca doğrulama ve dağılım özetidir. Önce `review` olarak veritabanına yüklenir; gerçek kayıtların özetleri ve 44 konu/sınıf/zorluk kapsamı kontrol edilir. Kodu sunabilen üretim commit'i doğrulandıktan sonra tek transaction ile yeni parti yayımlanır, önceki 4.000 kayıt arşivlenir. Eski sorular, kullanıcılar, ilerleme ve çalışma oturumları silinmez.
