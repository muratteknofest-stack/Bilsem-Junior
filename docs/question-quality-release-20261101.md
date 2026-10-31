# Soru kalitesi ve yenileme paketi · 1 Kasım 2026

Kullanıcı isteği: soru motorunun mantık ve görsel kalitesini artırmak, soruları yeniden oluşturmak ve yayımlamak.

## İçerik ve görsel değişiklikleri

- `curriculum-2`, eski `curriculum-1` kayıtlarının kanıt şablonunu koruyan ayrı motor sürümüdür.
- Sayı örüntüleri: dönüşümlü artış, çarpma ve büyüyen farklar. Soruda kural ailesi açıkça belirtilir; çeldiriciler son adımı karıştırma gibi gerçek işlem hatalarından seçilir.
- Şekil ve renk sıraları ayrı döngülerle ilerleyen iki özellikli diziler.
- Üç örneği görünen, son girişin sorulduğu ters işlem makinesi. Gizli giriş öğrenci DTO'suna gönderilmez.
- Sınıf sınırları içinde genişletilmiş sayı piramidi havuzu.
- Elma, armut ve portakalın fotoğraf gerçekçiliğinde, şeffaf arka planlı görselleri. Her sembol tam bir meyvedir. Nesne boyutu veya fiziksel ağırlık çıkarımı istenmez.
- Daha canlı, koyu sınırları belirgin altı renk. Dört temel zemin için beyaz metin; sarı ve turuncuda koyu metin kontrastı korunur.

## Otomatik doğrulama

Paket: `owner-20261101-realism-v2`. Tam veri ve cevap anahtarları herkese açık kaynaklara eklenmez.

- 8.000 yeni soru; 1–4. sınıfların her birinde 2.000 soru.
- Her sınıfta 44 konu; toplam 660 sınıf–konu–izinli zorluk hücresi.
- 8.000 benzersiz görünür soru kökü ve 8.000 benzersiz görsel. Yayındaki önceki 8.000 kaydın karmalarıyla karşılaştırıldı; çakışan 896 üretim adayı elendi.
- Her soruda ana çözücü ve bağımsız aday yerine koyma kontrolü; tam bir doğru cevap ve dört farklı çizilmiş seçenek.
- 4.128 açık aritmetik eşitliği ayrıca hesaplandı.
- 8.000 yanlış cevap anahtarı ve 8.000 eş seçenek mutasyonu reddedildi.
- Yerel tam uygulama testleri: 640/640.
- Tarayıcı kontrolü: 320, 390, 768 ve 1440 pikselde yedi temsilî yeni soru; görsel yükleme, taşma ve sayfa hataları. Ayrıca 48 farklı ve kırpılmamış mevcut siluet kontrol edilir.

Kaynak banka SHA-256: `16a2e86ec703aa1ca855551e8b8f192c19bf31354342d6e00c590314b65374d9`.

## Yayın ve sürüm uyumluluğu

Önce yeni motor uygulamaya dağıtılır. Hazırlanan kayıtlar `review` durumunda tam veri karmasıyla doğrulanır; ardından tek işlemde `published` durumuna geçirilir ve yetkilendirme kaydı tutulur.

Önceki 8.000 yayımlanmış soru korunur. Yeni paket yayımlandığında toplam 16.000 soru olur. Yeni istemci `reasoning-lab-2` biçimini ister; yeterli yeni soru varsa konu çalışmalarında yenilenen motoru kullanır. Önceki istemciler uyumlu havuzu kullanmaya devam eder. Eski kaydedilmiş oturumlar yeni istemcide açılabilir. Yeni çizim eski istemciye gönderilmez.

Bu kullanıcı tarafından yetkilendirilmiş otomatik yayındır. Bireysel eğitimci değerlendirmesi yapılmış gibi işaretlenmez: `individualHumanReview:false`, `editorReview:pending`. Otomatik kanıtlar belirtilen kural ailelerini doğrular; bütün soruların pedagojik uygunluğunu veya her öğrenci için erişilebilirliğini sertifikalandırmaz.

Görsel üretim kaydı: [question-object-assets-20261101.md](question-object-assets-20261101.md).
