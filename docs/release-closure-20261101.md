# Yayın kapanışı — 1 Kasım 2026

Bu dosya, canlı web ve Android test adayının ticari yayına açılmasından önce kalan açıkların
nasıl kapatılacağını ve hangi kanıtın kabul edileceğini tek yerde tanımlar:

1. Yedekleme (veritabanı kurtarması doğrulandı; dosya, proje ayarları ve saklama kanıtları ayrıca izlenir)
2. İşletim hazırlığı (işletmeci, sözleşme/saklama kayıtları, ticari barındırma)
3. Gerçek kullanım testleri (e-posta, şifre sıfırlama, satın alma/geri yükleme/iptal)
4. İçerik (gerçek insan sesi, tek tek eğitmen incelemesi)
5. Android üretim imzası ve Google Play yayını

Makine tarafından doğrulanabilen işler kodda tamamlandı. İnsan, sağlayıcı veya hukuk uzmanı
gerektiren işler **tamamlanmış gibi işaretlenmedi**; boş kanıt alanları bilinçli olarak boştur.
Bu dosya bir uygunluk sertifikası değildir.

## Tek komutla durum

```bash
npm run release:closure
```

`ops/release-closure.json` kaydını okur, varsa makine kanıtlarını doğrular, yoksa **HAZIR DEĞİL**
der ve 1 koduyla çıkar. Kişisel veri, parola veya satın alma tokenı rapora yazılmaz.

Kanıt dosyalarını vererek çalıştırma:

```bash
npm run release:closure -- \
  --backup-receipt backup-restore-verification.json \
  --storage-receipt backup-storage-verification.json \
  --email-receipt ops/evidence/email-acceptance.json \
  --play-receipt ops/evidence/play-acceptance.json \
  --voice-coverage ops/evidence/voice-coverage.json \
  --educator-review ops/evidence/educator-review.json \
  --android-receipt android-signed/release-verification.json
```

Kurallar:

- Otomatik denetlenen bir kayıt **yalnız makine kanıtıyla** doğrulanır. Beyan tek başına geçmez.
- Beyan "doğrulandı" diyor ama geçerli kanıt yoksa kayıt `INCONSISTENT` olarak işaretlenir ve
  yayın kapısı kapanır.
- Kanıt referansı en az 12 karakterdir; e-posta adresi, uzun rakam dizisi, token veya yer tutucu
  metin (`TODO`, `örnek`, `kanıt yok`) reddedilir.
- Kanıtların tazelik sınırı vardır: yedek 30 gün, diğer kabul kayıtları 90 gün.
- Bir iş gerçekten kapsam dışıysa kayıt `not_applicable` yapılır; en az 12 karakterlik **gerekçe
  referansı** ve karar tarihi zorunludur. Rapor bunu `BEYAN (N/A)` olarak ayırır, "yapıldı" gibi
  göstermez. Makine denetimli kayıtlar (veritabanı/dosya yedeği, e-posta, dört Play akışı, ses, inceleme, imza)
  hiçbir zaman `not_applicable` yapılamaz; makbuz yoksa kapı kapalı kalır.

## 1. Yedekleme

### Bugüne kadarki durum

İlk incelemede `.github/workflows/backup.yml` zamanlanmış çalışmalarda başarısızdı. O günkü çalışma (1 Kasım 2026,
02:00 UTC) "Create and encrypt backup" adımında durdu ve ardından "Retain encrypted archive" adımı
dosya bulamadığı için ikinci bir hata üretti. Günlüklerde yalnız hangi adımın düştüğü görünüyordu;
hangi aşamanın (anahtar kapsamı, sağlayıcı erişimi, TLS, döküm) engellediği okunamıyordu.

Bu tarihli durum sonradan düzeltildi: [41345872247](https://github.com/muratteknofest-stack/Bilsem-Junior/actions/runs/41345872247)
koşusunda `8b68701` ana dalından şifreli veritabanı arşivi taze Supabase ortamına geri yüklendi;
Auth/profil/aile bütünlüğü doğrulandı. Storage dosyaları bu veritabanı arşivine dahil değildir.

### Bu turda tamamlananlar

- `scripts/backup-doctor.mjs`: Yedek hattını yedi aşamaya ayırır ve **sır göstermeden** hangi
  aşamanın düştüğünü sabit kodla söyler: yapılandırma, CA paketi, PostgreSQL 17 araçları, sağlayıcı
  API'si, süreli kimlik, veritabanı TLS'i. Ağ hatası, zaman aşımı, sertifika, yetki ve sağlayıcı
  hataları ayrı kodlara eşlenir; her kod için operatörün yapacağı iş yazılıdır.
- İş akışı artık dökümden **önce** tanı çalıştırır. Böylece hata, kopyalama sırasında değil, nedeni
  bilinen aşamada ve anlaşılır bir mesajla durur.
- `scripts/backup-status.mjs`: Başarılı ve başarısız çalışmalar için tek bir sanitize durum kaydı
  (`backup-status.json`) üretir, GitHub iş özetine yazar. Artefakt yüklemesi artık "dosya yok"
  hatasıyla ikinci kez düşmez.
- Geri yükleme makbuzu (`backup-restore-verification.json`) artık süre, arşiv oluşturma/sona erme
  tarihi ve anahtar parmak izini taşır; tatbikatın ne zaman ve ne kadar sürdüğü kanıtlanabilir.

### Deneme sırası

1. GitHub → Settings → Environments → `production-backup` sırlarını kontrol edin.
   `SUPABASE_ACCESS_TOKEN` yolu için anahtarın bu projeye ve **`database` yazma** kapsamına sahip
   olması gerekir; süreli oturum kimliği oluşturmak `database:write` ister. Kapsam eksikse tanı
   `TOKEN_PERMISSION` verir. Veritabanı yedeği için alternatif olarak `SUPABASE_DB_URL`
   (session pooler, 5432) kullanılabilir; ayrı Storage dosya yedeği yönetim tokenı gerektirir.
2. Tanıyı yerelde veya iş akışında çalıştırın: `npm run backup:doctor` (çıktı yalnız kod ve mesaj).
3. İş akışını elle başlatın. Beklenen: tanı `ready`, yedek şifreli, izole geri yükleme
   `verified: true`, artefakt `database-backup-<run_id>`.
4. Tatbikat kaydı: `checkedAt`, `durationMs`, `archiveCreatedAt` alanlarını özel işletim kaydına
   yazın; yedeğin gerçekten alındığı ve ayrı ortama döndüğü ancak bu çalıştırmayla kanıtlanır.
5. Kanıtı kapanış kapısına verin:
   `npm run release:closure -- --backup-receipt backup-restore-verification.json --storage-receipt backup-storage-verification.json`.

### Ayrı Storage dosya kurtarması

`npm run backup:storage`, aynı yedek anahtarıyla ayrı AES-256-GCM `zekapark-storage.enc` üretir.
Kaynak yalnız bu projeye sabittir; veritabanı katalog okumaları salt okunur bağlantıyla, dosya
okumaları Storage API ile yapılır. Mevcut yönetim tokenının proje API anahtarlarını okuma yetkisi
gerekir; hizmet anahtarı yalnız süreç belleğinde kullanılır, arşive veya günlüğe yazılmaz.
Token eksik/yetkisizse `STORAGE_ACCESS_TOKEN_REQUIRED` veya `STORAGE_KEY_ACCESS` koduyla durur.

Katalog başta ve sonda karşılaştırılır. Dosya kaybolursa, sürümü/sahipliği değişirse veya
boyut/hash uyuşmazsa başarılı arşiv üretilmez. Her dosya için SHA-256, alan/yol, oluşturulma
zamanı, sahiplik ve kullanıcı metaverisi; alan gizliliği, boyut/MIME sınırları, RLS durumları,
politikalar ve `anon`/`authenticated`/`service_role` tablo yetkileri şifrelenir. Sınırlar:
dosya başına 32 MiB, toplam 128 MiB, 10.000 dosya, 128 alan. Analytics/vector veya sürüm
geçmişi etkin alanlar bu biçimde sessizce atlanmaz; desteklenmeyen kapsam olarak reddedilir.

Geri yükleme yalnız literal loopback Storage API'si ve aynı yerel veritabanıyla yapılır.
Yeni dosyalar API üzerinden yüklenir; özel alanlar başlangıçta özel oluşturulur, son ayarlar
uygulanır. Mevcut yerel `supabase_admin` başlangıç kimliği, Auth yardımcılarına başvuran
Storage politikalarını ve kaynak istemci yetkilerini yeniden kurar. Normal veri kullanıcısına
rol üyeliği veya Auth şema yetkisi eklenmez. Dolu hedefe yazılmaz ve upsert kullanılmaz.
Tüm dosyalar yeniden indirilip hash'leri karşılaştırılır; sahiplik, oluşturulma zamanı ve
erişim ayarları katalogdan doğrulanır. Backend nesne kimliği, fiziksel sürüm ve güncelleme
zamanı yeni depolama sistemine aittir; bunların özgün değerleri değiştirilmiş gibi sunulmaz.

`backup-storage-verification.json` yalnız gerçek arşiv için makine kanıtıdır. CI'nın sentetik
özel/açık alan, boşluklu/iç içe yol, boş dosya, sahiplik ve RLS provası makbuz üretmez ve gerçek
dosya kanıtı sayılmaz. Storage işi başarısız olsa da oluşmuş veritabanı arşivi ayrıca geri
yüklenir; genel durum, gereken Storage kanıtı yoksa `verified` olmaz.

Önceki birleşik "dosyalar ve proje ayarları" kaydı iki açık kapsam olarak ayrıldı:
`backup.storage-objects` gerçek dosya/alan/erişim makbuzuyla, `backup.project-config` ise Auth,
API, Realtime ve diğer sağlayıcı ayarlarının ayrı hedefte yeniden kurulum kanıtıyla kapanır.
Arşivdeki sınırlı, sır içermeyen Auth ayarı kopyası ikinci kaydı kapatmaz. SMTP/OAuth sırları,
JWT/API anahtarları, Edge Functions ve diğer sağlayıcı ayarları bu kopyada tam değildir.

Yollar URL parçası olarak kodlanır; dizin aşımı ve hedef değiştiren yollar reddedilir. Sabit
Storage sürümünün kabul etmediği adlarla karşılaşılırsa dosya sessizce yeniden adlandırılmaz
veya atlanmaz; geri yükleme durur. Taşıma katmanının UTF-8 kodlaması yerel HTTP testinde ayrıca
sınanır; bu, sağlayıcının desteklemediği adları kabul ettiği anlamına gelmez.

30 günlük süre sınırı ve silme talepleriyle mutabakat veritabanı/dosya arşivlerinin ikisi için
geçerlidir; indirilmiş kopyaların temizliği ve anahtarın ayrı kasası insan/işletim kanıtı ister.

## 2. İşletim hazırlığı

`ops/release-closure.json` içindeki `operations` alanı sekiz kaydı tek tek tanımlar: işletmeci
kimliği ve adresi, veri envanteri/dayanak, saklama takvimi, yurt dışı aktarım ve sözleşmeler,
tüketici metinleri, vergi/kamu görevi değerlendirmesi, ticari barındırma uygunluğu, olay ve alarm
kişileri.

Her kayıt için gereken kanıt türü yazılıdır; örneğin `ops.hosting-suitability` için Vercel ve
Supabase planlarının ticari kullanım, yedek saklama, trafik ve veri konumu açısından uygun olduğunu
gösteren yazılı değerlendirme. Hukuki metinler Sistem ayarlarına girildiğinde gizlilik ve iletişim
sayfalarına yansır; ancak bu, uzman incelemesinin yerine geçmez.

Kanıt tamamlandığında yalnız kayıt numarası, tarih ve ortam yazılır:

```json
{"status":"verified","evidence":"BJ-OPS-2026-0007, hukuk incelemesi 2026-11-04","verifiedAt":"2026-11-04T09:30:00Z"}
```

Adres, e-posta, vergi numarası, sözleşme tarafı imzası veya müşteri belgesi bu dosyaya yazılmaz.

## 3. Gerçek kullanım testleri

### E-posta teslimi

```bash
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... \
npm run acceptance:email -- --to veli@gercek-adres.tld --reference "BJ-KABUL-2026-0001" \
  --template confirm-sign-up --template invite-user --template magic-link-or-otp \
  --template change-email-address --template reset-password --template reauthentication \
  --spf-dkim-dmarc --delivery-confirmed
```

- Araç SMTP kimlik doğrulamasını ve sağlayıcının iletiyi kabul ettiğini ölçer.
- Gerçek gelen kutusunda teslimi **operatör** doğrular; `--delivery-confirmed` verilmezse makbuz
  `deliveryConfirmed: false` olur ve kapı açılmaz.
- Altı şablon `--template` ile **adıyla** verilir; `supabase/templates/subjects.json` ile eşleşmeyen
  veya eksik şablon makbuzu geçersiz kılar. SPF/DKIM/DMARC ayrıca bayrakla onaylanır. Makbuzda alıcı
  adresi, parola ve ileti içeriği bulunmaz; yalnız alan adı, şablon adları ve kanıt referansı yazılır.

### Şifre sıfırlama

Otomatik araç yalnız isteğin kabulünü görebilir; bağlantının gerçekten çalıştığını kanıtlamaz.
Bu nedenle kabul elle yapılır ve `accept.password-reset` kaydına işlenir:

1. Geçerli bağlantı ile şifre değişir, eski oturum düşer.
2. Aynı bağlantı ikinci kez kullanılamaz.
3. Süresi dolmuş bağlantı reddedilir (`/reset-password` üzerinden yeni istek gerekir).
4. Öğrenci şifresi veli tarafından değiştirilir ve eski öğrenci oturumu reddedilir.

### Google Play satın alma, geri yükleme, yenileme, iptal

```bash
PLAY_TEST_PURCHASE_TOKEN=... npm run acceptance:play -- \
  --environment license-test --app-version 1.6.0 \
  --device-purchase --restore --renewal --cancellation \
  --purchase-ref "BJ-PLAY-0001" --restore-ref "BJ-PLAY-0002" \
  --renewal-ref "BJ-PLAY-0003" --cancellation-ref "BJ-PLAY-0004"
```

- Araç üç dönemli ürün kataloğunu doğrular, varsa satın alma tokenını sunucuda doğrular ve yalnız
  kısa bir parmak izi bırakır.
- Cihaz akışları (test ödeme yöntemi, doğru öğrencide tam erişim, yeniden kurulum sonrası geri
  yükleme, iptal sonrası erişim) operatör tarafından ayrı referanslarla onaylanır.
- Dört akıştan biri eksikse makbuz geçersizdir ve `accept.play-*` kayıtları kapanmaz.

### Aile pilotu ve mobil/yük

`npm run pilot:e2e` ve `npm run monitor:site` mevcut kabul adımlarını çalıştırır. Sonuçlar
`accept.family-pilot` ve `accept.mobile-load` kayıtlarına tarih ve ortamla işlenir; platform derleme
başarısı bu kayıtların yerine geçmez.

## 4. İçerik

### İnsan sesi

- `npm run voice:kit` 18 dersin 72 adımı için kayıt metnini, dosya adını, süre tahminini ve haklar
  kuralını üretir: `content/voice/recording-kit.json` ve `docs/voice-recording-kit.md`.
- `npm run voice:kit:check` kitin güncel ders içeriğiyle eşleştiğini doğrular; içerik değişip kit
  yenilenmezse test düşer.
- Kayıtlar `/admin → Ses kayıtları` bölümünden yüklenir; anlatıcı ve en az 12 karakterlik haklar
  referansı zorunludur, gerçek insan kaydı olmayan dosya kabul edilmez.
- Kapsam: `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ile `npm run content:coverage`. Yalnız
  sayılar üretir (`ops/evidence/voice-coverage.json`), soru veya kişi verisi içermez.
- Adımların tamamı yüklenmeden `content.voice-recordings` kapanmaz. Yapay ses yedeği çalışmaya
  devam eder; ancak kabul ölçütü gerçek insan kaydıdır.

### Eğitmen incelemesi

- Otomatik denetim (`auditQuestion`, bağımsız çözüm) yayına uygunluk için gereklidir ama bireysel
  eğitmen kaydının yerine geçmez.
- `npm run content:coverage` yayımlanmış sorularda `reviewedBy` ve
  `releaseAuthorization.individualHumanReview` alanlarını sayar.
- İnceleme `/admin` → Eğitmen Onayı kuyruğundan tek tek yapılır. Onay kaydı olmayan soru sayısı
  sıfırlanmadan `content.educator-review` kapanmaz.
- Metin/cevap/görsel editör onayı ayrı kayıttır (`content.editorial-signoff`).

## 5. Android üretim imzası ve Play yayını

İmzalama zaten CI dışında yapılıyor: `scripts/sign-android-release.py` adayı doğrular, yükleme
anahtarını yalnız yerel ortamda kullanır ve Play Console yükleme sertifikasının SHA-256 parmak izini
sabitleyerek AAB ve APK imzalarını doğrular. Bu turda makbuz kendi kendini tanımlar hâle geldi
(`format: bilsem-android-signing-v1`, `signedAt`) ve kapanış kapısına bağlandı:

- `android.signed-release` kaydı yalnız geçerli bir `release-verification.json` ile kapanır:
  paket kimliği `com.quantumtech.bilsemjunior`, `debuggable/testOnly/cleartext/backup` kapalı,
  64 karakterlik sertifika özeti, AAB ve APK imzası doğrulanmış, bağımlılık envanteri dolu,
  90 günden yeni imza.
- İmza makbuzu eksik veya elle düzenlenmişse kapı açılmaz; beyan tek başına geçmez.
- `android.device-tests` gerçek cihaz kurulumu, aile akışları ve lisans testi satın alımını;
  `android.play-listing` hedef kitle, Veri Güvenliği, hesap silme bağlantısı ve abonelik
  açıklamalarını ister. Bu ikisi operatör kanıtıyla kapanır.

```bash
# CI adayı + yerel yükleme anahtarı ile imzala; anahtar depoya girmez
python3 scripts/sign-android-release.py test-artifacts/android <özel-anahtar-dizini> android-signed
npm run release:closure -- --android-receipt android-signed/release-verification.json
```

Üretim yükleme anahtarı, Play Console hesabı ve mağaza incelemesi bu depoya girmez; işletmeci
tarafından yürütülür.

## Bu turda değişen dosyalar

| Dosya | Amaç |
|---|---|
| `.github/workflows/backup.yml` | Tanı önce çalışır; sanitize durum kaydı ve özet her çalışmada üretilir |
| `scripts/backup-doctor.mjs` | Sır göstermeyen aşamalı yedek tanısı |
| `scripts/backup-status.mjs` | Başarı/başarısızlık için tek durum kaydı |
| `scripts/backup-access.mjs` | Pooler ve süreli kimlik doğrulaması tek kaynaktan |
| `scripts/verify-backup-restore.mjs` | Makbuza süre ve arşiv tarihleri |
| `ops/release-closure.json` | Dosya ve proje ayarı kurtarması ayrı olmak üzere 29 kayıtlı yayın kapanış kaydı |
| `scripts/release-closure.mjs` | Kayıt + makine kanıtı kapısı |
| `scripts/voice-recording-kit.mjs` | 72 adımlık kayıt kiti üretimi ve eşitleme kontrolü |
| `scripts/content-coverage.mjs` | Ses ve eğitmen incelemesi kapsamı |
| `scripts/acceptance-email.mjs` | E-posta teslim kabul makbuzu |
| `scripts/acceptance-play.mjs` | Google Play dört akış kabul makbuzu |
| `scripts/sign-android-release.py` | İmza makbuzuna biçim ve imzalama zamanı |

## Kapanmayan işler

Aşağıdakiler bu değişiklikle **tamamlanmadı** ve tamamlanmış sayılmamalıdır:

- Gerçek üretim yedeğinin alınması ve izole ortama dönmesi (sağlayıcı anahtarı ve ilk başarılı
  çalıştırma gerekir).
- İşletmeci kimliği, sözleşmeler, saklama takvimi, vergi/kamu görevi değerlendirmesi.
- Gerçek e-posta teslimi, şifre sıfırlama, Play satın alma/geri yükleme/yenileme/iptal testleri.
- 72 insan sesi kaydı ve yayımlanmış soruların bireysel eğitmen incelemesi.
- Üretim imzasının gerçek anahtarla çalıştırılması, gerçek cihaz testleri, Google Play yayını ve
  mağaza beyanları.

Bu işler tamamlandıkça `ops/release-closure.json` güncellenir ve `npm run release:closure` yeşile
döner. Kapı yeşile dönmeden satış anahtarı ve yeni kayıt açılmaz.
