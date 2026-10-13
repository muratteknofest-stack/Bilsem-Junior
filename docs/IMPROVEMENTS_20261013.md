# Soru güvenliği ve çalışma akışı iyileştirmeleri

13 Ekim 2026. Başlangıç commit'i: `585901de3487754dde4130f811c04e723bafc826`.

## Değişen davranış

- Renkli eksik mozaik hücresi öğrenci çalışma/günlük görev verisinde `null` olarak gönderilir. SVG, tam yönetici önizlemesinde de bu hücrenin motifini çizmez. Sunucu snapshot'ı ve puanlama tam veriyle devam eder. Kör AI incelemesi aynı temizlenmiş görsel veriyi kullanır.
- Çalışma bankası sürümü, gerçekten okunan yayımlanmış soruların içerik parmak izinden hesaplanır. İncelemedeki `colorful-v3` sabit olarak aktifmiş gibi işaretlenmez. Sınıf/kategori/zorluk filtreli havuz tamamı okunur; 1.000 kayıt sınırından dolayı kalan sorular atlanmaz.
- Tekrar karşılaştırması aktif `draft`, `review` ve `published` soruları anahtar üzerinden sayfalar. Arşivdeki ilk 500 soru tüm karşılaştırma havuzunu kaplamaz. Tür biliniyorsa o türün bütün sınıfları karşılaştırılır; açıklama/cevap/AI logları yerine yalnızca görsel karşılaştırma alanları taşınır. Eksik okuma veya 50.000 kayıt güvenlik sınırında işlem durur; kısmi havuz başarılı sayılmaz.
- AI onay/ret/yeniden üretim ve genel editör kaydı aynı `save_question` RPC'sinin revision kontrolünü kullanır. AI paneli ekranda incelenen revision'ı gönderir; eski önizleme veya eşzamanlı düzenleme 409 döndürür. Yeni içerik eski inceleme onayıyla yayımlanmaz.
- Gerçek editör onayında parti inceleme alanı `completed` olur. Taslak düzenleme önceki bireysel inceleme işaretini kaldırır. Mevcut bankaya geriye dönük insan onayı eklenmez.
- Sunucu yanıtı kabul edilince soru geçişi profil/ilerleme/rozet isteklerini beklemez. Arka plan okumaları tek sıra üzerinden yürür; hızlı yanıtlar tek takip yenilemesine birleştirilir. Hesap değişimi eski profil sonucunun uygulanmasını engeller. Yenileme başarısızsa cevap yeniden gönderilmez; araçlar/sonuç ekranında ayrı yenileme uyarısı gösterilir.
- İstemcide oturum snapshot'ı varsa cevap ve bitiş istekleri `?view=update` kullanır. Sunucu immutable soru listesini tekrar taşımaz. Önbellek hesap bazındadır ve en fazla sekiz oturum tutar; önbellek yoksa tam cevap alınır. Eski istemciler query kullanmadığında tam DTO sözleşmesi devam eder. Deneme çözümleri yalnız bitişten sonra açılır.

## Doğrulama

- TypeScript başarılı.
- `npm test`: 223/223 başarılı; 12 yeni regresyon testi dahil.
- `npm run test:student`: 7/7 başarılı.
- Gerçek yerel Postgres motoru testi: eski editör revision'ının yeni içeriği değiştiremediği ve güncel revision'ın kaydedildiği doğrulandı. Fixture'lar rollback edilir.
- `npm run vercel-build`: soru testleri, TypeScript, istemci ve API paketlemesi başarılı.
- `npm run security:http`: 23 üretim HTTP kontrolü başarılı.
- `git diff --check` başarılı. Yeni bağımlılık yok.

Testler gizli hücrenin JSON/DOM'da olmaması, sunucu puanlamasının değişmemesi, 500. satır sonrasındaki tekrarların bulunması, sağlayıcı sayfa boyutu sınırı, kısmi okuma reddi, kompakt yanıtların sınav gizliliği, hesap izolasyonu, arka plan hata/yeniden deneme ve editör sürüm kontrolünü kapsar. AI testinin kör çözücüsü eksik hücreyi artık gizli değerden değil, görünür diğer satırlardaki ilişkiden çıkarır.

## Yayın ve kalan işler

Bu dal üretime alınmadan istemci/API birlikte yayımlanmalıdır. AI paneli açık eski sekmelerde inceleme isteği yapmadan önce yenilenmelidir. Mevcut veritabanında `save_question` RPC'si vardır; bu değişiklik yeni schema veya migration gerektirmez. Canlı veritabanında içerik, soru durumları, kullanıcı hesapları ve kayıt ayarları değiştirilmedi.

Yeni renkli bankanın 4.000 sorusu mevcut durumda incelemededir. Bu değişiklik soruları otomatik yayımlamaz veya pedagojik inceleme yerine geçmez. İşletmeci bilgileri, e-posta/aile pilotu, yedekten geri yükleme ve mobil gerçek cihaz kabulü hâlâ tamamlanmalıdır. Kayıt açma tercihi değiştirilmedi. Öğrenciye özel oturumlar arası tekrar aralığı ve kazanım ağırlıklı deneme planı sonraki çalışma kapsamındadır.

Tarayıcı kurulumu önceki analizde çalışmadığından bu tur gerçek Android/iOS/tablet görsel kabulü geçti denmez. Arka plan yenilemede profil ve rozet verileri kısa süre sonra güncellenir; hız kazanımı gerçek cihaz gecikmesi olarak ölçülmedi. Karşılaştırma sayfalaması tek veritabanı transaction snapshot'ı değildir; farklı soru kimliklerinin eşzamanlı aynı görselle yayımına karşı veritabanı seviyesinde fingerprint tekilliği sonraki güçlendirmedir. Bu dal aynı soru kimliğinin revision yarışını kapatır.
