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

- Yeni çalışma seçimi son 30 günün en fazla 30 öğrenci oturumunda atanmış soru görsellerini dikkate alır. Opaque soru kimlikleri ve şık sıralaması yerine görsel parmak izi kullanılır. Önce geçmişte atanmamış yayımlanmış içerik, sonra yeni doğrulanmış varyasyon denenir. Sonlu bir havuzda çeşit biterse aynı kategori içinde en eski atanan içerik kullanılabilir. Hata defteri tekrarları bu yenilik politikasından ayrı kalır.
- Karışık 15/30/45 soruluk denemelerde on kategorinin kota farkı en fazla birdir; karışık beş soruluk pratikte beş farklı kategori kullanılır. Böylece bankanın büyüklük dağılımı deneme dağılımını belirlemez. Bu kota bir resmî sınav ağırlığı veya pedagojik akreditasyon iddiası değildir.
- Süre sonu geçişi ilgisiz UI hata metinlerinden bağımsızdır; aktif cevap kaydı bitmeden sonuç isteği gönderilmez. Başarısız otomatik bitişler artan bekleme aralığıyla en fazla üç kez denenir. Manuel sonuç yükleme düğmesi kullanılabilir. Sunucu süre ve puan otoritesi korunur.

- Başlatma/tekrar açma istekleri 45 saniye; cevap, bitiş, sınıf değişimi ve bildirim istekleri 20 saniye içinde yanıt bekler. Süre sınırı kimlik doğrulama beklemesini ve JSON gövdesini de kapsar. Yanıt gelmezse istemci kilidi bırakılır ve yeniden deneme açılır; sunucuya ulaşmış kayıt iptal edilmiş sayılmaz. Arka plan yenileme beklemesi 20 saniyede sonlanır; geç gelen iptal edilmiş okumalar profil/ilerleme/rozet durumunu değiştirmez.
- Süre dolunca cevap alanı devre dışı kalır; olay işleyicileri de güncel saati kontrol eder. Ekranda doğrudan sonuç yükleme düğmesi görünür. Son cevap kaydedilip bitiş isteği başarısız olduğunda yeniden deneme bitişi çağırır; kilitli pratik cevabını tekrar göndermeye çalışmaz.

## Doğrulama

- TypeScript başarılı.
- `npm test`: 241/241 başarılı; 30 yeni regresyon testi dahil.
- `npm run test:student`: 7/7 başarılı.
- Gerçek yerel Postgres motoru testi: eski editör revision'ının yeni içeriği değiştiremediği ve güncel revision'ın kaydedildiği doğrulandı. Fixture'lar rollback edilir.
- `npm run vercel-build`: soru testleri, TypeScript, istemci ve API paketlemesi başarılı.
- `npm run security:http`: 23 üretim HTTP kontrolü başarılı.
- `git diff --check` başarılı. Yeni bağımlılık yok.

Testler gizli hücrenin JSON/DOM'da olmaması, sunucu puanlamasının değişmemesi, 500. satır sonrasındaki tekrarların bulunması, sağlayıcı sayfa boyutu sınırı, kısmi okuma reddi, kompakt yanıtların sınav gizliliği, hesap izolasyonu, arka plan hata/yeniden deneme ve editör sürüm kontrolünü kapsar. AI testinin kör çözücüsü eksik hücreyi artık gizli değerden değil, görünür diğer satırlardaki ilişkiden çıkarır. Yeni seçim testleri aynı görselin farklı kimlikle tekrarını, eski/yeni atama önceliğini, kategori kotalarını ve 15 sınıf/zorluk kombinasyonunda 675 bağımsız doğrulanmış deneme sorusunu kapsar. Deadline testi erken bitişi, kayıt sırasındaki beklemeyi, yeniden deneme aralıklarını ve üç deneme sınırını doğrular.

Ağ testleri yanıt vermeyen/iptali dikkate almayan taşıma, geciken JSON gövdesi, anlaşılır süre aşımı hatası, kaydı gerçekleşmiş fakat yanıtı kaybolmuş cevabın güvenli tekrarı, arka plan sırasının toparlanması ve iptal edilen eski okumanın yeni sonucu ezmemesini kapsar. Süre sınırında cevap kilidi, denemede bitiş öncesi cevap değişimi ve erişilebilir sonuç düğmesi de doğrulanır.

## Yayın ve kalan işler

Bu dal üretime alınmadan istemci/API birlikte yayımlanmalıdır. AI paneli açık eski sekmelerde inceleme isteği yapmadan önce yenilenmelidir. Mevcut veritabanında `save_question` RPC'si vardır; bu değişiklik yeni schema veya migration gerektirmez. Canlı veritabanında içerik, soru durumları, kullanıcı hesapları ve kayıt ayarları değiştirilmedi.

Yeni renkli bankanın 4.000 sorusu mevcut durumda incelemededir. Bu değişiklik soruları otomatik yayımlamaz veya pedagojik inceleme yerine geçmez. İşletmeci bilgileri, e-posta/aile pilotu, yedekten geri yükleme ve mobil gerçek cihaz kabulü hâlâ tamamlanmalıdır. Kayıt açma tercihi değiştirilmedi. Müfredat/kazanım ağırlıklarının uzman tarafından belirlenmesi ve uzun dönem başarıya göre aralıklı tekrar takvimi sonraki çalışma kapsamındadır.

Tarayıcı kurulumu önceki analizde çalışmadığından bu tur gerçek Android/iOS/tablet görsel kabulü geçti denmez. Arka plan yenilemede profil ve rozet verileri kısa süre sonra güncellenir; hız kazanımı gerçek cihaz gecikmesi olarak ölçülmedi. Karşılaştırma sayfalaması tek veritabanı transaction snapshot'ı değildir; farklı soru kimliklerinin eşzamanlı aynı görselle yayımına karşı veritabanı seviyesinde fingerprint tekilliği sonraki güçlendirmedir. Bu dal aynı soru kimliğinin revision yarışını kapatır.

Vercel önizlemesinin içinden kabul testi bu tur yapılamadı: dağıtım ayrıntısı servisi ekip erişiminde 403 döndürdü ve yerel Vercel CLI mevcut değil. GitHub dağıtım durumu, uygulama içi kabul testinin yerine geçmez.
