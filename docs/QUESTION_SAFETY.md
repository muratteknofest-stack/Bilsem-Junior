# Soru güvenliği incelemesi

## Bulunan sorunlar

- Evrensel çözücü, desteklemediği sorularda mevcut cevap anahtarını tekrar okuyup %95 güvenle başarılı sayıyordu.
- Bazı çözücüler yalnızca ilk eşleşen şıkkı seçiyor; birden çok doğru seçeneği denetlemiyordu. Sayma kontrolü gösterilen nesneler yerine üretilmiş `targetCount` değerine güvenebiliyordu.
- Seçenek kontrolü üreticinin verdiği `fingerprint` alanına güveniyordu. Başarısız üretim sonunda parmak izine ek yapan, şık kimliğini ve cevap anahtarını değiştiren bir kurtarma yolu vardı.
- AI şeması görsel sorunun öncüllerini taşımıyordu. Bir modelin çoğunluk oyu, aynı modelin sistematik hatasını doğruluk gibi gösterebiliyordu.
- AI yönetici ekranı istek alanlarını yanlış gönderiyor; API hatasında yerel üretime geçip rastgele 93–98 puan ve otomatik yayın onayı gösteriyordu.
- Yayın onayı, yerel önbellek ve öğrenci havuzuna seçim yollarında yeniden doğrulama eksikti.
- Eski matris üreticisinde tanımsız `finalCellGrid` kullanılıyordu. Desteklenen matris motoruna yönlendirildi.

## Uygulanan denetim zinciri

1. Veri yapısı, dört seçenek, kimlikler, içerik benzersizliği ve görsel şema kontrol edilir. İçerik parmak izi yeniden hesaplanır; sayı ve metin olarak yazılan aynı sayılar eşdeğer kabul edilir.
2. Soru verilenlerden çözülür. İkinci uygulama üreticinin dönüşüm/birleştirme yardımcılarını kullanmadan ayrıca hesaplar. İki sonuç aynı olmalıdır.
3. Dört seçenek karşılaştırılır. Tam olarak bir eşleşme bulunmalı ve cevap anahtarı o seçeneği göstermelidir.
4. Yönerge, görsel, açıklama ve kategori, soru türü/tohum/zorluktan yeniden oluşturulan doğrulanmış şablonla karşılaştırılır. İçerik değişikliği önceki onayı geçersiz kılar.
5. AI akışında model önce cevap anahtarı ve açıklama gösterilmeden çözüm yapar. Ayrı çağrı açıklamaları, çeldiricileri, dil açıklığını ve sınıf uygunluğunu inceler. Herhangi bir ret, eksik yanıt veya hizmet hatası kabulü engeller. AI sonucu matematiksel kontrolü geçersiz kılamaz.
6. Yeni içerik taslaktır. Reddedilen AI adayı gerekçeleriyle `review` durumuna alınır. Yönetici yayın onayında ve öğrenciye sunmadan önce denetim tekrar çalışır. Başarısız üretim hiçbir zaman cevap anahtarını değiştirerek kurtarılmaz.

## Otomatik doğrulama kapsamı

11 tür: `matrix_2x2`, `matrix_3x3`, `raven_matrix`, `visual_sequence`, `figure_rotation`, `mirror_reflection`, `number_pattern`, `operation_machine`, `symbol_coding`, `shape_counting`, `logic_grid`.

Diğer 33 eski tür yönetici taslağı olarak incelenebilir, ancak öğrenci havuzuna alınmaz. Bellek, görsel algı ve sözel kategoriler için yeni bağımsız çözücüler eklenene kadar ilgili öğrenci seçimleri sınırlandırılmıştır. Mevcut uzak kayıtlar silinmez; yeni istemci uygun olmayanları sunmaz.

Serbest metinli veya elle değiştirilmiş bir sorunun doğruluğu yalnızca bir modelin onayıyla kanıtlanmış sayılmaz. Otomatik kabul, denetlenmiş şablonları kapsar. İncelenen sayı örüntüleri desteklenen kural aileleriyle sınırlıdır; her olası matematiksel yorumun tekilliği iddia edilmez. Eğitimsel geçerlilik ve yaş uygunluğu için öğretmen incelemesi gerekir. Sıfır hata garantisi verilmez.

## Testler ve işletim

- `npm run test:questions`: 3.300 deterministik üretim örneği; 1.320 ek örnekte bağımsız çözüm, seçenek sırası değişikliği ve yanlış anahtar saldırısı; bozuk veri, kopya şık, açıklama değişikliği, sahte onay, başarısız yeniden deneme ve AI veto senaryoları.
- AI sağlayıcı yanıtları testlerde taklit edilir. Bunlar gerçek sağlayıcının dil kalitesini veya canlı hesap yapılandırmasını doğrulamaz.
- `npm run lint`: TypeScript kontrolü.
- `npm run vercel-build`: soru testleri ve tip kontrolü başarısızsa dağıtım derlemesini durdurur.
- `npm run audit:questions -- export.json`: dışa aktarılmış soru bankası için salt okunur inceleme raporu üretir; kayıtları değiştirmez.
- Korumalı Vercel önizlemesinde canlı API ve Supabase kayıt işlemleri henüz uçtan uca doğrulanamadı. Üretim geçişi yapılmadı.

Yeni bir tür açmak için ayrı bir çözücü, elle hesaplanmış referans vakalar, yanlış cevap/çoklu cevap/eksik veri testleri, açıklama bağlama kuralı ve görsel render testleri eklenmelidir. Eski `isVerified` damgası veya modelin verdiği puan yeterli değildir.
