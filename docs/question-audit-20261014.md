# ZekaPark soru doğruluğu denetimi — 14 Ekim 2026

**Sonuç:** Canlı Türkçe bankadaki 4.000 sorunun tamamı, denetlenen kural aileleri kapsamında cevap/şık/görsel/çözüm kontrollerini geçti. Yanlış cevap anahtarı, birden fazla uygun şık, aynı çizilen seçenek veya çelişkili sayısal eşitlik bulunmadı. Bu sonuç bireysel eğitmen onayı değildir.

## Sınıf sonuçları

| Sınıf | Denetlenen | Geçen | Hata |
|---|---:|---:|---:|
| 1. sınıf | 1,000 | 1,000 | 0 |
| 2. sınıf | 1,000 | 1,000 | 0 |
| 3. sınıf | 1,000 | 1,000 | 0 |
| 4. sınıf | 1,000 | 1,000 | 0 |

## Yapılan kontroller

1. **Canlı kayıt eşleşmesi:** Üretimdeki yayımlanmış kayıtların tür, tohum, zorluk ve sınıf bilgileri alındı. İlgili sürümlü motorla içerik yeniden oluşturuldu. Yönerge, görsel, dört şık, cevap anahtarı, açıklama ve diğer öğretim alanlarının PostgreSQL JSONB parmak izi her kayıt için canlı içerikle karşılaştırıldı: 4.000/4.000 eşleşti. Eşleşmeyen kayıtlar denetimden geçmiş sayılmaz.
2. **Cevap doğruluğu:** Birincil hesaplama ve ayrı aday/tahta çözücüsü karşılaştırıldı. Desteklenen kural ailesinde tam olarak bir şıkkın uygun olması ve cevap anahtarıyla eşleşmesi istendi.
3. **Görünen seçenekler:** Her sorunun dört seçeneği gerçek React çizicisiyle ayrı oluşturuldu. Şık harfleri aynılaştırıldıktan sonra çizim çıktıları da birbirinden farklıydı. Toplam 16.000 seçenek kontrol edildi.
4. **Eksik kareyi görünür verilerden çıkarma:** 140 mozaik sorusunda saklanan eksik hücre rengi okunmadan, görünen tekrarlayan veya kayan satırlar kullanılarak tek şık hesaplandı.
5. **Açıklama hesabı:** Çözüm metinlerindeki 3,684 açık tam sayı eşitliği ayrıca hesaplandı. Çarpma önceliği ve negatif terimler dikkate alındı. Bu sayı soru sayısı değildir; özet/adımlarda tekrar eden eşitlikleri içerir.
6. **Açıklama ve yönerge:** Güncel sürümün çözüm şablonu, görseli ve metni birebir eşleştirildi; sınıf/yaş politika kontrolleri uygulandı. Denklem sistemleri, Latin kareleri, sıralama kısıtları ve küp açılımlarının bağımsız çözüm yolları ayrıca kod üzerinden incelendi.
7. **Tekrarlar:** 4.000 soru kökü ve 4.000 görsel-seçenek bileşimi farklıydı. Bu, pedagojik açıdan birbirine benzeyen sorular olmadığı anlamına gelmez.
8. **Denetleyiciyi bozarak sınama:** 4.000 yanlış cevap anahtarı ve 4.000 aynı içerikli şık ekleme denemesi reddedildi. Görünür mozaik denetimi ayrıca gizli cevap değeri değiştirilerek test edildi; görünen satırlardan bulduğu sonuç değişmedi.
9. **Öğrenci görünümü:** 4.000 soru görseli sunucu tarafında oluşturuldu. Tanımsız görünüm/sembol, nesne metni ve özel cevap metaverisi sızıntısı kontrol edildi. Bu çalışma tüm cihazların piksel bazında incelemesi değildir.

## Soru türleri

| Tür | Denetlenen | Geçen |
|---|---:|---:|
| 02. Görsel Örüntü & Dizi | 136 | 136 |
| 03. 2x2 Matris Tamamlama | 136 | 136 |
| 04. Şekil Döndürme | 136 | 136 |
| 05. Ayna Simetrisi & Yansıma | 136 | 136 |
| 06. Simetri Tamamlama | 20 | 20 |
| 07. Parça Bütün İlişkisi | 140 | 140 |
| 08. Uzamsal Konum & İlişki | 137 | 137 |
| 09. Görsel Analoji | 136 | 136 |
| 10. Şekil Sayma | 136 | 136 |
| 11. Yön ve Rota Takibi | 136 | 136 |
| 12. Görsel Bellek | 135 | 135 |
| 13. Sembol Şifreleme | 135 | 135 |
| 15. Görsel Dikkat & Odak | 135 | 135 |
| 16. Sayısal Örüntü | 95 | 95 |
| 18. 3x3 Matris Tamamlama | 98 | 98 |
| 19. Şekil Denklemleri | 49 | 49 |
| 20. Görsel Sudoku (Latin Karesi) | 139 | 139 |
| 21. Gölge Eşleştirme | 32 | 32 |
| 25. Kümeler ve Venn Şeması | 139 | 139 |
| 26. Küp Sayma (3 Boyut) | 139 | 139 |
| 27. Küp Açılımı | 138 | 138 |
| 28. Şifreli Sözcükler | 136 | 136 |
| 29. İşlem Makinesi | 95 | 95 |
| 30. Üstten Görünüş | 135 | 135 |
| 31. Şekil Birleştirme | 135 | 135 |
| 33. Sayı Piramidi | 93 | 93 |
| 34. Hikayeli Mantık | 138 | 138 |
| 36. Labirent & Rota Kodlama | 62 | 62 |
| 37. Mantık Tablosu & Çıkarım | 135 | 135 |
| 40. Ağırlık Sıralama & Kütle Dengesi | 136 | 136 |
| 41. 3B Perspektif & Çok Yönlü Görünüm | 133 | 133 |
| 42. Raven İleri Mantık Matrisi | 93 | 93 |
| 43. Şifreli Anagram & Kelime Mantığı | 92 | 92 |
| 44. Zihinsel Kutu & Açılım Eşleme | 134 | 134 |

## İngilizce sürüm

İngilizce sürümün ayrıca 13 testi geçti. Bunlar sunucu bankasında her seviyede 1.000 olmak üzere 4.000 soru ve 300 misafir sorusunu kapsıyor; İngilizce yönerge/çözüm şablonları, doğru cevap eşleşmesi, benzersiz kökler ve öğrenciden gizlenen cevap alanları kontrol edildi. İngilizce banka dağıtılmış kaynak kodundan çalışma anında üretilir; Türkçe canlı veritabanı parmak izi kontrolünden ayrı bir kapsamdır.

## Kanıt ve tekrar çalıştırma

- Denetim zamanı (UTC): `2026-10-14T06:07:11.906Z`.
- Kaynak sürümü: `e0081fc4dbce427ab60fc94d02f76322983e21ef`.
- Canlı kayıt parmak izi: `0a312b20a3d0525dc91672d5d7c2ebc8`. Denetim sonunda yeniden okunmuş ve değişmediği görülmüştür. MD5 burada tutarlılık karşılaştırmasıdır, kimlik doğrulama imzası değildir.
- Makine tarafından okunabilir sonuç: `docs/question-audit-20261014.json`; özel soru gövdeleri veya cevap anahtarları bu dosyaya eklenmez.
- Yeniden denetim: `npm run audit:live-questions -- private-metadata.json private-report.json`. Metadata, yayımlanan 4.000 kaydın ID/sınıf/tür/tohum/zorluk/motor ve JSONB parmak izleriyle baştaki veri kümesi parmak izini içermelidir. Önce/sonra parmak izleri eşleşmiyorsa sonuç mevcut banka için geçerli sayılmamalıdır.
- Tam soru gövdeleri ve tohum içeren metadata özel kalmalıdır; `public/`, `dist/` veya tarayıcı paketlerine konulmamalıdır. Denetim betiği uygulama yayınına veya öğrenci akışına eklenmez.

## Sınırlar ve karar

**Bulunan teknik soru/cevap hatası: 0.** Bu nedenle cevap anahtarları veya üretim soruları değiştirilmedi; kullanıcı ilerlemesi ve inceleme kayıtları korunmuştur.

Otomatik kanıt, tanımlı dönüşüm/denklem/sıralama kural aileleri için geçerlidir. Sonlu sayı dizilerinin bu aileler dışında farklı matematiksel devamları olabilir. Açıklamayı sürümlü şablonla eşleştirmek ve sayısal eşitlikleri hesaplamak, bütün cümleleri bir eğitmenin bağımsız olarak okumasıyla aynı değildir.

**Canlı bankada bireysel eğitmen incelemesi kayıtlı soru sayısı: 0/4.000.** Yaşa uygun dil, gerçek öğrencilerin yanlış anlama ihtimali, görsel erişilebilirlik ve ölçme geçerliliği için eğitmen incelemesi gerekir. Bu denetim inceleme alanlarını tamamlandı olarak işaretlemez.
