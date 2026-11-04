# Bilsem Junior — her gün 19.00 Instagram Reels

## Durum
Kod, yayın izni verilmeden çalışmaya başlayan bir paylaşım botu değildir. GitHub iş akışı
**REELS_ENABLED=true** değişkeni ayarlanmadığı sürece zamanlanmış günlerde devreye girmez.
Manuel çalıştırma ("Run workflow") **yalnız önizleme** üretir ve Instagram'a göndermez.

Hedef: Her gün **19:00 Europe/Istanbul** (Türkiye saati).
GitHub Actions, videoyu 18:40'ta hazırlamaya başlar; resmi Instagram API'sinin
video kapsayıcısını hazırlamasından sonra 19:00'a kadar bekler. GitHub'ın zamanlanmış
çalıştırmaları gecikebildiğinden tam saniye garantisi yoktur. 19:15 sonrası yayın
otomatik olarak iptal edilir ve iş başarısız bildirilir.

## Üretilen video
- Orijinal, algoritmik soru: mevcut Bilsem Junior "perceptual-engine".
- Bağımsız denetim: auditQuestion() ve solveQuestion() hatasız, tek doğru seçenekli
  soruyu doğrulamak zorundadır; doğrulanmayan sorular yayınlanmaz.
- Sınıflar 1–4 arasında günlük dönüşümlü. Görsel örüntü, analoji, sınıflandırma,
  Raven benzeri matris ve sınıf/düzeye izin verilen konular.
- Video: 1080×1920, H.264/AAC, 30 FPS, 19 saniye. Logo yazısı, dört şık,
  geri sayım, cevap animasyonu ve tamamen özgün sinyal sesleri.
- Yalnız sentetik soru verisi kullanılır. Öğrenci, veli, profil, sınav sonucu,
  e-posta veya başka kişisel veri Reels'e aktarılmaz.
- Küp, gölge, ayna, fark bulma, tangram ve kağıt katlama için ayrı Reels
  görselleştiricileri henüz yazılmamıştır.

## Gereken bağlantılar (GitHub'a asla parola / token dosyası koyma)

1. Instagram sayfası **Business** veya **Creator** olmalıdır. Mevcut yayıncı,
   **Meta Facebook Login API** kullanır. Instagram hesabını yönettiğin
   Facebook Page'e bağla, Meta uygulamasını ve gerekli izinleri hazırla.
   Önemli izinler: instagram_basic, instagram_content_publish,
   pages_show_list, pages_read_engagement. Meta'nın şartlarına göre ek onay
   gerekebilir. Instagram Login token'ı bu Facebook Login akışıyla uyumlu değildir.
2. Bilsem Junior'ın mevcut Supabase projesinde yalnız pazarlama videolarına
   ayrılmış, PUBLIC bir Storage bucket oluştur: instagram-reels.
   Burada sadece herkese açık paylaşılacak özgün videolar barınmalı.
   Öğrenci verilerini veya gizli dosyaları bu bucket'a koyma.
3. GitHub -> Bilsem-Junior -> Settings -> Environments altında
   **production-reels** adlı bir environment oluştur; deployment branches
   kuralını **main** ile sınırla. Günlük otomasyonun durmaması için
   zorunlu manuel reviewer onayı ekleme.
   Ardından Settings -> Secrets and variables -> Actions -> Repository secrets
   bölümüne (veya production-reels Environment secrets alanına) şu değerleri ekle:
   - REELS_SUPABASE_URL: aktif Supabase proje URL'si
   - REELS_SUPABASE_SERVICE_ROLE_KEY: sadece Actions secret; tarayıcıya asla verme
   - INSTAGRAM_ACCOUNT_ID: profesyonel Instagram hesap ID'si
   - INSTAGRAM_ACCESS_TOKEN: Meta Facebook Login akışından yetkili Page token'ı
4. Aynı sayfada Actions Variables bölümünde istersen:
   - IG_REELS_BUCKET = instagram-reels
   - META_GRAPH_VERSION = v25.0 (kullandığın Meta API sürümüne göre kontrol et)
5. Değişiklik main dalına alındıktan sonra Actions -> "Bilsem Junior - daily Instagram Reels at 19:00 TR" ->
   Run workflow. Çıkan artifact içindeki "reel.mp4" ve soru dosyasını incele.
   Bu manuel test Instagram'a göndermez.
6. Hesap yayını, token geçerliliği, herkese açık video URL'si ve onaylanan
   içerik doğruysa **REELS_ENABLED=true** Repository Variable değerini ekle.
   Bundan sonraki takvim çalıştırmaları günün videosunu yayınlamayı dener.

## Güvenlik ve tekrar yayınlama
- Sırları yalnız GitHub Actions'ın sunucu tarafında sakla. Google Play APK ve
  web istemcisi içinde asla Meta token veya Supabase service key bulunmaz.
- Kayıtlı MP4 dosyaları ve sorular 7 gün Actions artifact olarak kalır.
- Her gün Storage'a 'daily/YYYY-MM-DD.mp4' yoluyla **upsert=false**
  yükleme yapılır. Aynı gün yeniden çalıştırma, ikinci kez otomatik paylaşım
  riskini azaltmak için güvenli biçimde hata verir; bu durumda önce Instagram
  sayfasını kontrol et.
- Meta token geçersiz kalırsa, Page bağlantısı koparsa, Storage public değilse,
  soru doğrulaması başarısız olursa veya GitHub çalıştırması çok geç başlarsa
  otomasyon hata verir, içerik paylaşılmayabilir. GitHub Actions hata
  bildirimlerini açık tut. Access token sürelerini takip et.
- Sistemin kendi başına soru üretip yayınlayabilmesi, Instagram API
  yetkilendirmesinin tamamlandığı anlamına gelmez. Metricool hesabının bu sohbette
  bağlı olması, GitHub Actions'a otomatik olarak Meta API anahtarı sağlamaz.

## Yerel test
npm ci
npx --no-install tsx scripts/reels/select-daily-question.ts
python3 -m venv .reels-venv
.reels-venv/bin/pip install 'Pillow==11.3.0'
.reels-venv/bin/python scripts/reels/render_reel.py
# Video dosyası: reels-out/reel.mp4

## Kaynaklar
- Meta resmi Reels collection:
  https://www.postman.com/meta/instagram/folder/830j7my/reels-publishing
- GitHub Actions zamanlanmış iş akışları:
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Yönetici panelinden manuel Reels videosu oluşturma

- Yönetici giriş adresi: `https://bilsemjunior.vercel.app/admin/giris`
- Yönetici ekranında sol menü: **Instagram Reels Stüdyosu**
- Burada 1–4. sınıf, zorluk ve desteklenen konu seçilir. **Şimdi Video Oluştur**
  düğmesi, GitHub Actions'a sadece bir video üretim görevi gönderir.
  **Manuel iş akışı Instagram'a kesinlikle paylaşım yapmaz.**
- **Yenile** düğmesiyle durum görülür. Başarılı üretimde MP4 tarayıcıda
  görüntülenir, videoyu yeni sekmede açıp indirebilirsiniz.
- Üretim GitHub sunucusunda çalışır; kuyruk/süre, video üretimi ve upload
  nedeniyle anlık/saniyelik garanti yoktur. Ekranda "başlatıldı" yazması,
  videonun tamamlandığı veya Instagram'da yayınlandığı anlamına gelmez.

### Bir defalık güvenli bağlantı ayarları

1. Vercel'deki Bilsem Junior projesinin **server-only** environment
   variable bölümüne `GITHUB_REELS_TOKEN` ekleyin. Bu, yalnız
   `muratteknofest-stack/Bilsem-Junior` deposuna erişebilen, fine-grained
   bir GitHub token'ı olmalı: **Actions: Read and write**, **Metadata: Read**.
   Günlük yayın GitHub Actions üzerinden yapılır; Vercel'deki bu anahtar
   yalnızca yönetici isteğini başlatır ve üretim durumunu okur.
   Token'ı asla `VITE_` ile başlayan bir değişkene, GitHub koduna,
   APK'ya veya bu sohbetin içine koymayın.
2. GitHub -> Settings -> Environments -> `production-reels`
   korumalı ortamını oluşturun. **Deployment branches** kuralını
   yalnızca `main` olarak belirleyin. Manuel önizleme tamamlandıktan
   sonra upload adımı bu korumalı ortamda çalışır.
3. `production-reels` ortamında Actions secrets oluşturun:
   `REELS_SUPABASE_URL` (Bilsem Junior proje URL'si) ve
   `REELS_SUPABASE_SERVICE_ROLE_KEY` (yalnızca backend/service rolü).
   Mevcut projedeki, herkese açık **sadece MP4** kabul eden
   `instagram-reels` kovası bu işlemler içindir.
   Normal öğrenci/veli hesaplarına upload hakkı verilmez.
4. Henüz Meta Instagram canlı yayın bağlantısını etkinleştirmediyseniz
   `REELS_ENABLED` değişkenini **açmayın**. Manuel video üretimi
   bu değişkene ihtiyaç duymaz.
5. Yeni Vercel deploy'undan sonra /admin/giris adresinde MFA ile
   oturum açın; önce bir örnek video üretin, test edin.

GitHub Actions'ta doğrudan manuel üretim:
`https://github.com/muratteknofest-stack/Bilsem-Junior/actions/workflows/bilsem-junior-reels.yml`
-> Run workflow -> main -> Run. Bu, Vercel token'ı olmadan da
önizleme oluşturur. Upload için yine GitHub'daki Supabase secrets gerekir;
secrets olmadan MP4, Actions artifact ZIP içinden indirilir.

Manuel ve otomatik işler aynı soru motorunu kullanır ama farklı tetiklenir:
- Manuel: yönetici isteği, özgün istek UUID'si, MP4 kaydı, **yayın yok**.
- Otomatik: günlük 19.00 Türkiye hedef saati; yalnız ayrı yayın
  yetkileri ve `REELS_ENABLED=true` ile Instagram yayını denenir.

## Manuel video — GitHub Actions çalışmasa da

GitHub'da `preview` görevi başarısız olup **hiçbir runner atanmadıysa**
(`runner_name` boş, `steps=[]`, `billable.UBUNTU.total_ms=0`),
sorun video motoruna ulaşmadan oluşmuştur. Bu sinyaller doğrudan
GitHub Actions çalıştırıcısı/hesap kullanımı/izinleri kontrolünü gerektirir.
Depo özel (private) olduğundan Actions plan/kullanım sınırı ve
faturalandırma ayarları GitHub hesabında ayrıca kontrol edilmelidir.
Bu sorun yalnızca iş akışını yeniden denemekle çözülmez.

Yönetici panelinde ikinci yol:
**Instagram Reels Stüdyosu → Şimdi Video Oluştur (Cihazda)**

- Sınıf, zorluk ve BİLSEM soru türünü seç.
- Tarayıcı soru motorundan yeni bir soru alır ve `auditQuestion`,
  bağımsız `solveQuestion` doğrulaması ile tek doğru cevabı kontrol eder.
- Telefon/bilgisayar tarayıcısı **1080×1920** dikey video ve özgün sentetik
  sesleri yaklaşık **19 saniyelik gerçek zamanlı** kayıtta oluşturur.
  Video süresince sayfa açık/ön planda tutulmalıdır.
- Tarayıcı MP4 MediaRecorder destekliyorsa **MP4** dosyası, yoksa **WebM**
  oluşturulur; WebM doğrudan Instagram Reels için uygun değildir,
  MP4 dönüşümü gerektirir. Uygulama biçimi dosya adında ve düğmede gösterir.
- Oluşan dosya **Son oluşturulan video** bölümünde önizlenir;
  indirme düğmesi video dosyasını cihaza kaydeder.
- Bu işlem öğrenci verisi okumaz, Supabase Storage'a video yüklemez,
  hiçbir Instagram yayını oluşturmaz ve GitHub sunucusu gerektirmez.
- Yerel Blob bağlantısı geçicidir: sayfa kapatılmadan indirilmelidir.

GitHub Actions eski (bulut) yöntemi alternatif olarak kalır; özel depo
Actions runner erişimi ve Storage ortam sırları düzeltilmeden bulut yöntemi
videoyu bitiremez ve günlük otomatik Instagram yayını da çalışmayabilir.
