# Çok aşamalı soru kalite sistemi

## Sözleşme ve sınırlar

AI destekli üretim artık `3.0-profile-gated` hattını kullanır. Matematiksel doğruluk ve yaş/sınıf profili zorunludur. Kalite skoru, geçen aşamaların ağırlıklarının toplamıdır; başarı olasılığı değildir. Bir zorunlu aşamanın reddi, toplam puan yüksek olsa bile kabulü engeller. Tamamlanan bütün zorunlu kontroller 100 kontrol puanı verir; bu, pedagojik geçerlilik veya sıfır hata garantisi anlamına gelmez.

1. Veri ve seçenek yapısı (10)
2. İki bağımsız çözüm ve tek doğru cevap (25)
3. Yönerge, açıklama ve çeldirici tutarlılığı (15)
4. Yaş ve sınıf profili (15)
5. Zorluk ve işlem yükü (10)
6. Görsel yoğunluk ve çizim verisi (10)
7. Karşılaştırılan havuzda tekrar denetimi (5)
8. Cevap anahtarı/açıklama gizlenerek AI çözümü (5)
9. Ayrı AI editör çağrısında yaş, sınıf, zorluk, açıklama ve çeldirici denetimi (5)

Matematiksel çözücüler farklı uygulamalardır. AI incelemeleri ayrı çağrılardır, varsayılan olarak aynı yapılandırılmış sağlayıcı/modeli kullanırlar; bağımsız insan paneli olarak sunulmazlar. Görsel denetim veri/yoğunluk sınırını ölçer; her soru için ekran görüntüsü analizi yaptığı iddia edilmez. Çizimler önceki SVG/3D yüzey, sade görünüm ve büyütme bileşenini kullanır.

## Ürün içerik profili `education-1`

| Sınıf | Yaş aralığı | En yüksek seviye | En büyük sayı | Sayma alanı | Sembol adedi | Sıralama kişi sayısı | Desen ızgarası | Yönerge kelimesi |
|---|---|---|---|---|---|---|---|---|
| 1 | 6–8 | 2 | 30 | 16 | 3 | 4 | 3×3 | 30 |
| 2 | 7–9 | 3 | 100 | 24 | 5 | 5 | 3×3 | 35 |
| 3 | 8–10 | 4 | 250 | 30 | 5 | 5 | 4×4 | 45 |
| 4 | 9–11 | 6 | 1000 | 36 | 6 | 6 | 4×4 | 55 |

Bu sınırlar sürümlenmiş ZekaPark editoryal politikasıdır; MEB müfredatı veya çocuk gelişimi normu olarak doğrulanmış değildir. Gerçek öğrenci yaşından çıkarım yapılmaz. Yönetici hedef yaşı seçmezse sınıfın yaş aralığıyla değerlendirme yapılır. Birinci sınıfta işlem makinesi ve 3×3 birleşim matrisi desteklenmez. Sayı sınırına verilenler ve yanlış seçenekler de dahildir. Düşük seviyeli tekrar çalışmasına izin verilir.

Öğrenci alıştırması/adaptif çalışma/sınav soruları artık sınıf profiliyle üretilir. Yüksek seviye istekleri sınıf tavanıyla sınırlandırılır; adaptif XP gerçek sorunun seviyesine dayanır. Sınıfsız keşif demoları genel doğruluk kontrolünü kullanır ve kişisel yaşa uygunluk onayı olarak değerlendirilmez.

## Güvenli yeniden üretim

- Varsayılan 3, yönetici tarafından 1–4 aday denemesi. Her aday yeni seed ve kimlik taşır.
- Aynı hedef sınıf/yaş/seviye ve tür korunur. Başarısız sorunun cevabı değiştirilmez; eşikler düşürülmez; sahte onay verilmez.
- Sayı/görsel yükü, yinelenen içerik veya AI içerik reddinde yeni varyasyon bütün aşamalardan yeniden geçer.
- Uyumsuz üretim ayarı AI çağrısından önce reddedilir. Sağlayıcı hatası içerik sorunu sayılmaz; işlem incelemeye düşer.
- Hat başına 85 saniye bütçe; AI çağrısında 12 saniye zaman aşımı ve iptal. Yalnız geçici ağ/429/503 hatalarında en fazla iki sağlayıcı denemesi. Yanıt vermeyen çağrı Promise.race ile sınırlandırılır.
- Son başarısız aday `review`, geçen aday `draft` olarak kalır. Otomatik yayın yapılmaz. Başarılı yeni aday kaydedilmeden eski soru arşivlenmez.

## Rapor, kalıcılık ve yayın

Her adayın seed'i, türü, kimliği, süresi, aşama raporu, ret gerekçeleri ve sonraki eylemi `generationAttempts` içinde; son adayın ölçümleri `qualityReport` içinde tutulur. Soruların mevcut JSON veri alanı kullanılır; şema değişikliği yoktur. Üretim günlüğünde kısa deneme özetleri kaydedilir. Yeni rapor içerik/audience/seviye ile eşleştirilir; sonradan değiştirilmiş soru eski raporla geçemez. Rapor bir kriptografik imza değildir; erişim güvenliği mevcut yönetici yetkilerine ve sunucu kontrollerine dayanır.

Tekrar denetimi, sunucunun okuyabildiği ilk 500 soru ve aynı üretimdeki önceki adaylarla sınırlıdır. Havuz okunamazsa denetim başarılı sayılmaz. Yayın isteğinde havuz tekrar okunur. Bu sınırlı kontrol bütün banka veya eşzamanlı işlemler için küresel tekillik garantisi değildir.

Yayın ve öğrenciye sunma kapısı yaş/sınıf kurallarını yeniden hesaplar; yeni AI hattında tüm aşamaları geçmiş ve içerikle eşleşen rapor ister. Önceki verified-2/verified-3 deterministik kanıtları korunur; hedef sınıfa aykırı eski sorular öğrenci havuzundan elenir ve veri silinmez.

Yönetici arayüzü sınıfa bağlı seviye/yaş seçenekleri, deneme sınırı, 9 aşama, sayısal ölçümler, geçmiş ret nedenleri ve gerçek soru/cevap görsellerini gösterir.

## Doğrulama

- `npm test`: 57 test geçti. 11 yeni test; ret sonrası yeniden üretim, editör vetosu, yaş/sınıf uyumsuzluğu, deneme sınırı, sıfır eşik ile atlatma girişimi, tekrar, sağlayıcı kesintisi, eski raporla değiştirilmiş içerik ve JSON veri dönüşümü senaryoları.
- 504 sınıf/kategori/seviye isteğinde öğrenci üretimi profil sınırlarını geçti.
- `npm run vercel-build`: 42 soru testi, TypeScript ve istemci/Function derlemeleri geçti.
- Yerel Chromium: 320/390/768/1440/3840 px, sınıfa bağlı seviye tavanı, yaş seçimi/sıfırlama, deneme sınırı, 9 aşama ve ilk reddedilen denemenin ayrıntısı; taşma ve çalışma zamanı hatası yok. Raporun ekran görüntüsü incelendi.
- AI sağlayıcısı testlerde kontrollü sahte yanıtlar kullandı. Gerçek sağlayıcı, Supabase yazımı ve korumalı Vercel API akışının uçtan uca doğrulaması mevcut erişim/sunucu anahtarı eksikliği nedeniyle yapılamadı. Sadece yerel veri dönüştürme ve kontrol akışları doğrulandı.
