# Ticari Yayın Hazırlığı

Bu değerlendirme kodun yayın kapılarını ne ölçüde uyguladığını ve canlı ortamda
hangi kanıtların hâlâ gerekli olduğunu ayrı gösterir. Bir özelliğin kodda hazır
olması, Firebase/GCP/Stripe veya hukuki kabulün gerçekten tamamlandığı anlamına
gelmez.

## Güncel skor kartı

| Alan | Kod hazırlığı | Canlı kanıt durumu | 10/10 için kalan |
|---|---:|---|---|
| Kimlik, rol ve yönetici güvenliği | 9.5/10 | Doğrulanmadı | Gerçek UID'de parola/token/MFA/claim olayı ve log incelemesi |
| Soru üretimi ve editoryal kalite | 9.0/10 | Doğrulanmadı | Her motor için bağımsız çözücü ve uzman örnek kabulü |
| Sınav ve pratik bütünlüğü | 9.4/10 | Doğrulanmadı | Gerçek cihaz/E2E, yük ve süre kurtarma kabulü |
| Sunucu-otoriteli XP/ilerleme | 9.5/10 | Doğrulanmadı | Üretim tekrar/yarış koşulu ve analitik mutabakat testi |
| Yönetim ve AI iş akışı | 9.1/10 | Doğrulanmadı | Operatör kabulü, maliyet/kota ve sağlayıcı kesinti provası |
| Firestore ve App Check | 9.6/10 | Emulator 6/6; üretim yok | Rules dağıtımı, web app kaydı ve enforcement kanıtı |
| KVKK ve çocuk verisi araçları | 9.0/10 | Hukuk onayı yok | Veri sorumlusu metinleri, aktarım/saklama ve silme kabulü |
| Ödeme ve abonelik | 8.9/10 | Stripe yapılandırılmadı | Canlı merchant/Price/webhook, vergi-fatura-iade ve ürün paketi |
| İzleme, yedek ve geri alma | 9.1/10 | GCP yapılandırılmadı | Alarm kanalı, günlük yedek, restore ve rollback provası |
| CI ve bağımlılık güvenliği | 9.4/10 | Yerel/CI sonucu gerekli | GitHub dal koruması ve zorunlu başarılı kontroller |
| PWA, erişilebilirlik ve cihaz | 8.5/10 | Kabul testi yok | WCAG 2.2 AA ve iOS/Android gerçek cihaz matrisi |

Kod seviyesi ağırlıklı hazırlık yaklaşık **9.2/10**'dur. Canlı kanıtlar bu
çalışma ortamında uygulanmadığı sürece toplam yayın kararı **NO-GO** kalır.

## Tamamlanan kod kapıları

- Sabit yönetici kimlik bilgileri, e-posta allowlist'i, anonim/yedek yönetici
  girişi ve tarayıcıdan rol yükseltme kaldırıldı.
- Yönetici işlemleri Auth `role=admin` claim'i, eşleşen Firestore profili, yakın
  zamanda TOTP ile açılmış oturum, App Check, hız sınırı ve audit log gerektirir.
- UID'ye bağlı parola döndürme, claim değiştirme, bütün oturumları iptal etme,
  TOTP proje yapılandırması ve olay sonrası otomatik doğrulama araçları eklendi.
- Firestore tarayıcı yazmaları güvenli alanlarla sınırlandı; soru, cevap kasası,
  sınav/pratik, entitlement, ilerleme olayı ve gizlilik iş akışları backend-only.
- Gerçek Firestore Emulator testleri öğrenci, veli, yönetici, MFA, cevap kasası,
  entitlement ve gizlilik negatif yetkilerini kapsıyor.
- Sınav ve pratik soruları opak challenge ID ile, cevap/çözüm/seed/editorial
  metadata olmadan sunuluyor. Puanlama, süre, XP, seri, ustalık ve ilerleme
  kayıtları transaction içinde sunucuda üretiliyor.
- Başlatma, cevap, submit, ödül, aile kaydı, soru yayınlama ve AI işlemleri
  idempotent; istemci belirsiz ağ hatasında aynı istek kimliğini koruyor.
- AI toplu üretim kuyruğu Firestore lease/heartbeat ile çok instance ortamında
  devralınabilir; ham sağlayıcı yanıtları kalıcılaştırılmıyor.
- Aile kaydı veli rızasıyla sunucuda atomik; güvenli rastgele öğrenci parolası ve
  kodu üretiliyor, yarım hesap bırakmıyor.
- KVKK veri dışa aktarma ve yakın giriş gerektiren silme talebi eklendi; onay ve
  silme ayrı görevler. Silme Auth, Firestore ve Stripe kapsamını temizliyor ve
  yalnızca takma adlandırılmış uyum kanıtı bırakıyor.
- Saklama işçisi etkinlik, audit, AI, kayıt işlemi ve gizlilik kayıtlarını ayrı
  sürelerle temizliyor. Günlük Scheduler, 14 haftalık günlük yedek ve restore
  doğrulaması otomasyona bağlandı.
- Stripe Checkout, Customer Portal, imza/timestamp doğrulamalı raw webhook,
  tekrar teslim idempotency'si, out-of-order koruması ve abonelik yaşam döngüsü
  entitlement'ları uygulandı. Etkin abonelikte ikinci checkout engelleniyor.
- Cloud Run ayrı en-düşük-yetkili servis hesapları, Secret Manager, commit SHA
  image'i, readiness/5xx/bütçe alarmı, App Check kaydı/enforcement doğrulaması,
  smoke test ve fail-closed üretim yapılandırması otomasyona bağlandı.
- Release validator yanlış proje/veritabanı, placeholder, eksik hukuk/ödeme
  alanı ve tarihsiz/eskimiş kanıtlarla üretim dağıtımını durduruyor.

## Canlı ortamda kapanması gereken P0 kapıları

| Kapı | Beklenen kanıt |
|---|---|
| Yönetici olayı | UID, parola döndürme, token iptali, `role=admin`, TOTP ve log inceleme zamanları |
| Kurallar | Emulator sonucu ve üretim Firestore rules/index deploy zamanı |
| App Check | reCAPTCHA Enterprise app kaydı ve Auth/Firestore enforcement zamanı |
| Cloud Run/Hosting | Commit SHA, revision, release ve health/readiness smoke sonucu |
| Cevap taşıma | Dry-run, onaylı migration ve temiz ikinci dry-run çıktısı |
| KVKK/çocuk verisi | Yetkili hukuk/DPO onayı, veri sorumlusu bilgileri ve silme kabul testi |
| Stripe | Test ve canlı ödeme, webhook, portal iptali, iade/vergi/fatura kabulü |
| Operasyon | Alarm kanalı testi, yedek planı, restore ve rollback prova kaydı |
| İçerik | Pedagog/içerik uzmanı örneklemesi ve yanlış soru raporlama sorumlusu |

Bu adımların sırası ve güvenli komutları
[üretim runbook'unda](PRODUCTION_RUNBOOK.md) tanımlıdır.

## 10/10'a giden kalan ürün kalitesi

- Playwright ile kayıt, giriş, MFA, pratik, sınav, veli, yönetici, KVKK ve ödeme
  kritik yollarını Auth/Firestore emulator ve Stripe test ortamında doğrulamak
- WCAG 2.2 AA klavye, ekran okuyucu, kontrast, odak, azaltılmış hareket ve çocuk
  kullanılabilirlik testlerini uzmanla kapatmak
- iOS Safari ve Android Chrome'da install/update/offline/recovery matrisini
  gerçek cihazlarda çalıştırmak
- Soru motorlarını bağımsız çözücü/kanıtlayıcıyla doğrulamak ve sınıf/zorluk
  başına uzman örneklemesi yapmak
- Cloud Run yük, kota, rate-limit, lease devralma, AI sağlayıcı kesintisi ve
  Stripe gecikmeli webhook testlerini ölçmek
- Premium paketin hangi özellikleri açtığını ürün kararıyla belirleyip her
  premium API'de entitlement kontrolü uygulamak
- GitHub `main` dalında review, zorunlu Quality Gate ve secret scanning koruması
  açmak

## Yayın kararı

`RELEASE_VALIDATION_PHASE=go-live npm run release:validate` başarılı olmadan,
her P0 maddesi gerçek kanıtla kapanmadan ve hukuk/ödeme/içerik sorumluları imza
vermeden **GO verilemez**. Kanıtlanmamış bir alan için `10/10` beyanı yapılmaz.
