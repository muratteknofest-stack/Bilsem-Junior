# Etkileşimli soru çözümü

Alıştırma ve adaptif çalışma aynı kontrollü `AnswerWorkspace` bileşenini kullanır. Kanıtlanmış soru içeriği, yönerge, açıklama ve cevap anahtarı değiştirilmez.

| Biçim | Kullanım | Tamamlanma / doğruluk |
| --- | --- | --- |
| Sürükle bırak | Bütün desteklenen sorular | Kart cevap alanına yerleştirilir; var olan seçenek kimliği kontrol edilir. |
| Sırayı kur | Mantık sıralaması | Her kişi bir kez yerleşir; bütün komşuluk ipuçları sağlanır. |
| Eşleştir | Sembol kodlama | Kullanılan bütün semboller değerleriyle eşleştirilir ve dizinin toplamı yazılır. Aynı değer tekrar kullanılabilir. |
| Cevabı yaz | Sayı örüntüsü, işlem makinesi, şekil sayma | Geçerli tam sayı, bağımsız çözücünün hesapladığı sonuçla karşılaştırılır. |
| Şık seç | Bütün desteklenen sorular | Önceki çoktan seçmeli kullanım korunur. |

Kartlar mouse, dokunma ve kalem için Pointer Events kullanır. Alternatif olarak önce karta, sonra hedefe dokunulabilir; butonlar Tab ve Enter ile de kullanılabilir. Seçim, yerleşim ve temizleme ekran okuyucuya bildirilir. Sıralamada kullanılan kart tekrar taşınabilir; önceki yeri boşalır ve hedefteki kişi kart havuzuna döner.

Biçim değiştirmek cevabı temizler. Eksik cevap gönderilemez. Puan yalnızca gönderimde hesaplanır; eşzamanlı tekrar gönderim ref kilidiyle engellenir. Gönderimden sonra cevap ve biçim kilitlenir. Yeni soruda cevap ve kilit sıfırlanır. Serbest cevap için uydurma seçenek kimliği AI hata analizine gönderilmez; doğrulanmış çözüm açıklaması kullanılır.

Sınavda şık seçme ve sürükleyerek yerleştirme vardır. Mevcut kaydet/devam et biçimi seçenek kimliğini saklar. Doğruluğa bağlı ses, konfeti ve sarsılma seçimden kaldırılmıştır; değerlendirme sınav sonunda yapılır.

## Doğrulama

- `tests/answer-interactions.test.ts`: 11 soru türünde 220 örnek; doğru/yanlış/geçersiz şıklar, 60 sayısal soru, 40 eşleştirme sorusu, eksik/yanlış/tam sıralama, yinelenen isim, değiştirilmiş cevap anahtarı ve desteklenmeyen biçim.
- `npm test`: 42 test geçti. `npm run vercel-build`: soru testleri, TypeScript, istemci ve Function paketlemesi geçti.
- Yerel gerçek tarayıcı testi hazırlanmış ancak çalıştırılamamıştır: ortamda Chromium yoktur ve Playwright tarayıcı indirmesi geçerli arşiv döndürmemiştir. Dokunma/kalem/klavye davranışı gerçek cihazda ve korumalı Vercel önizlemesinde ayrıca doğrulanmalıdır.
