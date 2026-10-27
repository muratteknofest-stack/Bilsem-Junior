# Bilsem Junior konu anlatımları

18 özgün konu, her biri dört öğretim adımı ve kısa bir pekiştirme sorusu içerir. Öğrenci çalışma alanından **Konu Anlatımları** açılır. Konu arama ve alan filtreleri, animasyonu durdurma, cihazın hareket azaltma tercihi, önceki/sonraki adım, sesli okuma ve ilgili konu pratiğine geçiş vardır.

## Erişim

`visual_sequence` ücretsiz örnek anlatımdır. Diğer anlatımlar ve insan kayıtları sunucuda mevcut `requireLearningAccess` kuralını kullanır: yeni öğrencilerin doğrulanmış üyeliği gerekir; mevcut geçiş tarihinden önceki hesapların politikası korunur. Anahtar kapatma veya kayıt açma ayarları değiştirilmez. Tam anlatım metinleri genel istemci paketine eklenmez. Öğrenci kimliği istekten değil doğrulanmış oturumdan alınır.

Yerel tamamlanma listesi yalnız bu cihaz ve öğrenci kimliği için tutulur. Mini soruyu doğru yanıtlamak XP veya resmî beceri puanı üretmez. Bu ilerleme cihazlar arası eşitlenmiş bir eğitim ölçümü olarak sunulmaz.

## İnsan seslendirmesini ekleme

Bu değişiklik hazırlanırken gerçek insan kayıtları **0** adettir. Metinlerin yazılması ve oynatıcının bulunması, ses kaydı üretildiği anlamına gelmez. Cihazın yerel Türkçe yapay sesi varsa ayrı etiketle kullanılabilir; uygun yerel ses yoksa metinle devam edilir. Çocuk sesi üçüncü taraf ses üretim servisine gönderilmez; ses klonlaması yapılmaz.

1. `/admin/giris` üzerinden yönetici oturumu ve MFA tamamlanır.
2. **Sistem ayarları → Konu anlatımı ses stüdyosu** açılır.
3. Konu ve adım seçilir. O adıma ait kesin metin ekranda bulunur.
4. Gerçek anlatıcı bu metni çocuklara uygun, açık ve doğal Türkçeyle okur. Web/mobil yayın hakkı ve anlatıcı adı için gerekli izin alınır; sözleşme özel işletim kaydında saklanır.
5. Her adım ayrı MP3 veya WAV olarak, en fazla **3 MB** yüklenir. Dosya seçildikten sonra yönetici önizlemeyi dinler; metin/adım ve insan kaydı/kullanım hakkı beyanını doğrular. Belgenin kendisi yerine tarih ve kayıt referansı yazılır.
6. Öğrenci anlatımı yeniden açınca o adım “İnsan kaydı · anlatıcı adı” gösterir. Boş kalan adımlar cihaz sesi olarak etiketlenmeye devam eder. Dört adımın tamamı için kayıt gerekir; toplam 72 ses parçası vardır.

Önerilen kayıt üretimi: sakin ve sıcak anlatım, anlaşılır vurgu, çocukları acele ettirmeyen tempo; sessiz ortam, patlama/kırpılma ve arka plan müziği olmadan; eşit ses seviyesi. Tüm metinler `server/lesson-content.ts` içinde sürümlenir. Metin değiştiğinde ders sürümü artırılmalı ve yeni metinle eşleşen sesler aynı sürüme yeniden yüklenmelidir.

## Güvenlik ve yayın

- `public.lesson_audio`: RLS açık, `anon`/`authenticated` için bütün doğrudan haklar kapalı. Yalnız sunucu rolü okuma/yükleme yapar.
- `bilsem-lesson-audio` Storage bucket'ı özeldir. Kısıtlayıcı politika, başka bir geniş Storage politikası eklense bile istemcinin bu bucket'a doğrudan erişimini reddeder.
- Her ses indirmesinde doğrulanmış öğrenci ve konu erişimi kontrol edilir. Genel veya uzun ömürlü imzalı URL dönülmez. Lisans kaydı ve özel nesne yolu öğrenci yanıtında bulunmaz.
- Yükleme yalnız MFA doğrulanmış admin içindir. MIME imzası, 3 MB sınırı, hak bilgisi ve insan kaydı beyanı denetlenir. Her yükleme yeni nesne oluşturur; eski kayıt hemen kalıcı silinmez. Başarısız manifest yazımında yalnız yeni başarısız yükleme temizlenir.
- JSON zorunluluğunun tek istisnası tam `/admin/lesson-audio/:id/:step` PUT yolu için `application/octet-stream` yüklemesidir. Origin ve kimlik/rol/MFA kontrolleri korunur.
- Cihaz sesli okuması adım değişince, geri dönünce, sayfa gizlenince ve bileşen kapanınca durur. Otomatik ses başlatılmaz.

Web arayüzü dağıtımla güncellenir. Android uygulamasının paket içindeki yeni ekranları alması için yeni AAB gerekir; eski 1.0.33 AAB bu arayüzü kendiliğinden içermez. Sonradan yalnız mevcut metne eşleşen insan sesinin yönetici tarafından eklenmesi yeni AAB gerektirmez; kayıtlar sunucudan gelir. Bu çalışma Play Console'a otomatik yükleme yapmaz.

## Doğrulama

- `npm run test:lessons`: öğretim belgeleri/sahneler, gerçek Postgres izinleri, özel Storage koruması, oturum/rol/MFA/üyelik ve yükleme akışı.
- `npm run test:lessons:browser`: 320/390/768/1440 genişlikte dört adım, 18 mini soru, yanlış/doğru geri bildirimi, pratiğe konu aktarımı, arama, Android geri ve ses temizliği, hareket azaltma ve üyelik kapısı.
- `npm run lint`, `npm test`, web/Android istemci derlemesi. Yerel otomatik kontroller pedagojik uzman incelemesi veya gerçek cihazda insan ses kalitesi kabulü yerine geçmez.
