# Bilsem Junior — Aşama 4 üretim güvenliği ve yayın rehberi

Hazırlanma: **26 Ekim 2026, Türkiye saati**. Hedef: React/Vite + Express API, Vercel `bilsemjunior`, Supabase `vtcsoqohkiagbwatlabk`, Android `com.quantumtech.bilsemjunior`.

**Bu bir uygulama rehberidir. Bu aşamada deployment, DNS, WAF, Auth ayarı, anahtar iptali veya canlı SQL değişikliği yapılmadı.** Aşama 2 ve 3 çalışmaları yerel git kayıtlarında hazırdır. Aşağıdaki işlemler tamamlanıp kanıtları kaydedilmeden üretim güvenliği onayı verilmez.

## 1. Önce mevcut durumu bilin

| Kontrol | Bu çalışmada gözlenen durum | Yayın için gereken |
|---|---|---|
| Canlı `/api/health` | HTTP 200, `status: ok`, doğru Supabase projesi; commit `01dfb1450889c1d8e6074e0136e7ca7d78eef973` | Yeni güvenlik sürümünün tam commit SHA'sı ile eşleşmeli; mevcut health başarısı yamaların yayında olduğunu göstermez |
| Hazırlanan veritabanı kalkanı | Yerel commit `d63871c`; canlıya uygulanmadı | İzole gerçek Supabase provası, yedek, kontrollü uygulama ve SQL doğrulaması |
| Vercel çalışma zamanı | Node.js `24.x`; Vite | Aynı hedef ve lockfile ile başarılı build |
| Bağlı alan adları | `bilsemjunior.vercel.app`, eski `zekapark.vercel.app` | Kanonik adres kararı; Cloudflare için sahip olduğunuz özel alan adı |
| Preview sırları | `codex/question-engine-v2-20261021` dalına özel sunucu anahtarı kaydı ve genel preview Supabase kayıtları hâlâ var | Üretimle ortak sırların/DB erişiminin kaldırılması, eski deployment'ların kapatılması |
| Eski ayarlar | Vercel'de `VITE_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_ID` kayıtları var | Aktif kullanım olmadığı doğrulanıp kaldırılmalı; eski Firebase erişimi ayrıca kapatılmalı |
| Supabase doğrudan signup | Salt okunur kontrol `DIRECT_SIGNUP_DISABLED` için başarısız | `disable_signup=true` |
| Sızdırılmış parola koruması | Advisor `auth_leaked_password_protection` WARN döndürdü; Management API ile etkinlik doğrulanmadı | Sağlayıcı HIBP açık ve doğrulanmış olmalı |
| Eski sunucu anahtarı | Önceden ifşa edilen anahtarın iptali doğrulanmış değil | İfşa kaynağını kapatma, kontrollü değiştirme ve eski anahtarı devre dışı bırakma |
| Storage | Eski `exam-images` public; inceleme sırasında 933 nesne, aktif beş veri alanında referans sayısı 0 | Dış kullanımları inceleme, private yapma, ayrı Storage politikası ve doğrulama |

Bu tablo anlık ve salt okunur sonuçları kaydeder. Şifreler, JWT'ler, anahtar değerleri, dosya içerikleri ve kullanıcı satırları rapora alınmadı. Ortam değişkeninin listede bulunması doğru değere sahip olduğunu kanıtlamaz. Sağlayıcı planı, WAF kurallarının aktifliği ve eski Firebase projesinin yayındaki durumu bu aşamada doğrulanmadı.

## 2. Vercel Production ortam değişkenleri

Vercel → `bilsemjunior` → Settings → Environment Variables. Gerçek değerleri doğrudan panele/kurumsal parola kasasına girin; sohbete, GitHub dosyalarına veya loglara koymayın. Özel anahtar/parolalar için panelin gizli/sensitive/Secret türünü seçin. `VITE_` ile başlayan her değer derlenen tarayıcı ve Android paketinde görülebilir.

### Zorunlu bağlantı ve kaynak ayarları

| Değişken | Production hedefi | Gizlilik / dikkat |
|---|---|---|
| `SUPABASE_URL` | `https://vtcsoqohkiagbwatlabk.supabase.co` | Sunucu yapılandırması; proje adresi gizli değil |
| `VITE_SUPABASE_URL` | Yukarıdaki aynı adres | Açık istemci yapılandırması |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Bu projenin `sb_publishable_…` anahtarı | Açık anahtar; burada service/secret anahtar kullanmayın |
| `SUPABASE_SERVICE_ROLE_KEY` | Bu projenin yalnız sunucu anahtarı; kontrollü geçişte yeni `sb_secret_…` kullanılabilir | Kod bu ortam değişkeni adını okuyor; adı değiştirmek tek başına destek eklemez. Yeni anahtar ile Auth/REST/RPC/Storage provası şart |
| `APP_BASE_URL` | Şimdilik `https://bilsemjunior.vercel.app` | E-posta içindeki portal bağlantısı; localhost/eski marka adresi kalmamalı |
| `PUBLIC_SITE_URL` | Aynı kanonik HTTPS origin | Sunucu, yasal sayfa ve doğrulama dönüşleri |
| `VITE_PUBLIC_SITE_URL` | Aynı kanonik HTTPS origin | Android parola kurtarma için de doğru olmalı |
| `VITE_API_BASE_URL` | Web aynı origin ise boş; Android derlemesinde `https://bilsemjunior.vercel.app` | Yerel Android dosyası kendi `/api` sunucusunu barındırmaz. Panelde boş değer gerekiyorsa mevcut dolu override'ı temizleyin |
| `CORS_ALLOWED_ORIGINS` | `https://bilsemjunior.vercel.app,https://localhost` | Mevcut Capacitor Android origin'i `https://localhost`. Özel alan adı eklenirse tam origin olarak ekleyin; `*`, `null`, rastgele preview wildcard'ı veya HTTP localhost eklemeyin |

`VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` gibi sistem değişkenlerini Vercel sağlar; elle `production` diye taklit etmeyin. Dashboard override'larının `vercel.ts` içindeki `npm run vercel-build`, `dist`, API function ve güvenlik kurallarını gölgelemediğini kontrol edin. Bölge `fra1`, API `maxDuration:60` kaynak yapılandırmasındadır; değişiklik gerekmiyorsa koruyun.

Özel alan adına geçerken bu tabloda bulunan üç site URL'sini, CORS'u, Android API hedefini, Supabase redirect allowlist'ini, Google RTDN push endpoint/audience'ını ve Google WIF izin koşullarını birlikte inceleyin. Kullanıcıdaki eski Android paketlerinin eski API adresini kullanmaya devam edeceğini hesaba katın. Sadece alan adını yönlendirmek mobil POST ve Authorization davranışını doğrulamaz.

### E-posta

| Değişken | Kullanım |
|---|---|
| `SMTP_HOST`, `SMTP_PORT` | Uygulamanın haftalık veli raporları; mevcut kod 587/STARTTLS veya 465/TLS destekler |
| `SMTP_USER`, `SMTP_PASS` | Sağlayıcının ayrı SMTP kimliği/parolası; Production'a özel gizli değer |
| `SMTP_FROM` | Doğrulanmış gönderen adresi |

Vercel SMTP değişkenleri **Supabase Auth SMTP ayarını değiştirmez**. Hesap doğrulama ve parola sıfırlama e-postaları için Supabase Auth → SMTP ayarını ayrıca tamamlayın. Gönderen alan adında sağlayıcının SPF/DKIM/DMARC kayıtlarını kullanın; MX/TXT kayıtlarını Cloudflare'a geçişte koruyun. Test veli hesabıyla doğrulama, yeniden gönderme, kurtarma ve haftalık raporu ayrı ayrı deneyin; yalnız “SMTP bağlı” sonucunu yeterli saymayın.

### Google Play abonelik — mevcut sırları koruyun

| Değişken | Hedef / kontrol |
|---|---|
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.quantumtech.bilsemjunior` |
| `GOOGLE_PLAY_PRODUCT_ID` | Mevcut ürün `zekapark_uyelik`; marka değişti diye ürün ID'sini yeniden adlandırmayın |
| `GOOGLE_PLAY_AUTH_MODE` | Mevcut üretim tasarımına uygun `workload_identity` |
| `GOOGLE_PLAY_WIF_PROVIDER` | Gerçek `projects/…/locations/global/workloadIdentityPools/…/providers/…` kaynak adı |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | Play API için yetkilendirilmiş servis hesabı |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | WIF modunda gerekmiyor; yeni JSON özel anahtar oluşturmayın. Eski anahtar varsa kullanımını doğrulayıp kontrollü kaldırın |
| `GOOGLE_PLAY_BINDING_SECRET` | Mevcut veli/öğrenci bağlama HMAC sırrı; en az 32 karakter |
| `GOOGLE_PLAY_TOKEN_KEY` | Mevcut satın alma token'ı şifreleme anahtarı; tam 64 hex karakter (32 bayt) |
| `GOOGLE_PLAY_RTDN_AUDIENCE` | Şimdilik `https://bilsemjunior.vercel.app/api/google-play/notifications`; Pub/Sub OIDC audience ile birebir eşleşmeli |
| `GOOGLE_PLAY_RTDN_EMAIL` | İmzalı Pub/Sub push kimliğinin beklenen servis hesabı e-postası |
| `GOOGLE_PLAY_BILLING_ENABLED` | Gerçek katalog/WIF/RTDN testi başarılı olduğunda `true`; doğrulanana kadar mevcut güvenli durumu koruyun |
| `GOOGLE_PLAY_ENFORCE_PAID_ACCESS` | Ücretli yayın hazır ve test edilmişse `true`; hazırlık sırasında mevcut kullanıcıları yanlışlıkla kilitlemeyin |
| `GOOGLE_PLAY_STORE_PUBLISHED` | Mağaza gerçekten yayımlandıysa `true`; incelemeye gönderilmiş olması yeterli değil |
| `GOOGLE_PLAY_ALLOW_TEST_PURCHASES` | Genel üretim satışında `false`; lisans testlerini ayrı kontrollü yayın düzeninde yapın |

`GOOGLE_PLAY_BINDING_SECRET` ve `GOOGLE_PLAY_TOKEN_KEY` listede zaten mevcut. **Bunları rastgele yeniden üretmeyin:** ilki mevcut mağaza hesap eşleştirmelerini, ikincisi veritabanındaki şifreli satın alma kayıtlarının okunmasını etkiler. Rotasyon ayrı bir veri/anahtar geçişidir; mevcut kod tek token şifreleme anahtarı kullanır. Şifreli yedekleri ve gereken eski anahtarı erişimi kısıtlı kasada tutun.

GCP Workload Identity koşulları Vercel'in tam ekip/proje/production kimliğiyle sınırlandırılmalı; herhangi bir preview'nin üretim Play servis hesabını kullanmasına izin vermeyin. Play Console yetkisini gereken uygulama ve abonelik işlemleriyle sınırlayın; Owner/Editor gibi genel proje yetkilerini otomatik vermeyin. Pub/Sub push'ta Google imzası, issuer, audience ve doğrulanmış servis e-postası backend'de denetleniyor; WAF istisnası bunların yerine geçmez.

### Yapay zekâ, yedekleme ve kullanılmayan değişkenler

`GEMINI_API_KEY`, gerekiyorsa `OPENAI_API_KEY` / `QWEN_API_KEY` yalnız sunucuda kalmalı; Preview'da ayrı ve düşük bütçeli proje/anahtar kullanın. Sadece kullanılan sağlayıcıyı etkinleştirin. `AI_PROVIDER_DESIGNER/SOLVER/PEDAGOGUE`, karşılık gelen `AI_MODEL_*`, eski `AI_MODEL_QUESTION_PLANNER/GENERATOR/VALIDATOR`, isteğe bağlı `OPENAI_TEXT_MODEL`, `AI_IMAGE_MODEL`, `AI_MODEL_PRICES_JSON` mevcut onaylı modellerle eşleşmeli. `QWEN_BASE_URL` kullanılıyorsa operatörün kontrol ettiği doğru sağlayıcı hedefi olmalı; kullanıcı girdisine bağlanmamalı.

Öğrenci Gemini akışı kaynakta kapalıdır; bu rehber onu açmaz. Yönetici üretiminde maliyetli gerçek çağrı yapmadan önce sağlayıcı kota/bütçesi ve alarmını ayarlayın. Bütçe alarmı her sağlayıcıda harcamayı otomatik durdurmaz; destekleniyorsa sert harcama sınırı, değilse düşük kota ve anahtarı devre dışı bırakma prosedürü gerekir. Uygulamanın token fiyat tablosu bir fatura kesme anahtarı değildir.

`SUPABASE_DB_URL` ve `BACKUP_ENCRYPTION_KEY`, `.github/workflows/backup.yml` için GitHub **production-backup** environment secret'larıdır; Vite değişkenleri değildir. Anahtar mevcut betikte 32 rastgele baytın Base64 gösterimidir. Yedeğin kilidini açan anahtarı yedekle aynı artifact'e koymayın; eski yedekler için gerekli anahtarı koruyun. Yalnız main, korunan environment, sabit action SHA ve sınırlı artifact erişimi kullanın. Yedekleme/geri yükleme provası için Docker/CLI hazırlığını doğrulayın; mevcut scriptin başarılı gerçek çalışmasını ayrıca kanıtlayın. Storage nesneleri ayrı yedeklenmelidir.

Eski Firebase değişkenlerini aktif referans olmadığı doğrulandıktan sonra tüm target/dal override'larından kaldırın. Değişken silmek eski Firebase projesini, eski APK'ları veya dağıtımları kapatmaz. Gerçek eski projede deny-all Firestore/Storage kurallarını hedefi açıkça seçerek uygulama ve doğrulama ayrı kontrollü iştir; kimlik, veri veya faturalama kaynaklarını gelişigüzel silmeyin.

## 3. Preview izolasyonu, Auth ve anahtar değiştirme

### Preview ve eski deployment'lar

1. Preview ve Development için ayrı, kanonik `https://<20-karakter-ref>.supabase.co` projesi kullanın. Sunucu URL'si, istemci URL'si, publishable ve server key bu projeye ait olmalı. Müşteri verisi yerine sentetik aile/soru verileri kullanın.
2. Genel preview kayıtlarını ve özellikle `codex/question-engine-v2-20261021` dalındaki `SUPABASE_SERVICE_ROLE_KEY` override'ını gözden geçirin. `feature/supabase-fresh-start-20261006` dalına özel API hedefini de inceleyin; üretim API'sine yönlenmemeli.
3. Yeni kod yanlış preview DB hedefinde build'i durdurur; bu koruma eski deployment'a geriye dönük eklenmez. Üretim sırrıyla oluşturulan eski preview'leri envanterleyip erişimini kapatın/kaldırın. Paylaşım ve bypass bağlantılarını da değerlendirin.
4. Preview Deployment Protection açık olmalı. Bu çalışmada Vercel metadata'sı SSO için `all_except_custom_domains` bildirdi; erişim davranışını gerçek preview URL'sinde oturumsuz deneyin. Ana web adresi, eski alias, Android API ve RTDN endpoint'inin yanlışlıkla Vercel giriş sayfasına yönlenmediğini ayrıca doğrulayın.

### Supabase Auth

Supabase → Authentication ayarlarında hedefler:

- Allow new users to sign up **kapalı** (`disable_signup=true`); Email provider **açık**. Yeni aileyi sunucu Admin API oluşturur. İzole provada bu akışın e-posta yeniden gönderme dahil tamamını doğrulayın.
- Confirm Email **açık** (`mailer_autoconfirm=false`), anonymous sign-in **kapalı**.
- Sızdırılmış parola koruması **açık** (`password_hibp_enabled=true`). Sağlayıcı belgesinde Pro ve üstü gerekir; plan uygun değilse bu bulgu kapanmış sayılmaz. Ücretli plan satın alma bu rehber kapsamında yapılmadı.
- Yeni parola politikası en az 12 karakter gibi güçlü bir hedefe yükseltilecekse uygulama şemasıyla birlikte test edin; var olan giriş parolalarını topluca sıfırlamayın. Yeniden doğrulama/MFA ve kurtarma davranışını gerçek test hesabında görün.
- JWT erişim süresi için başlangıç hedefi 3600 saniyeyi aşmamak; refresh rotation/reuse detection ve canlı oturum kontrolünü korumak. Daha kısa süreye geçiş ayrı mobil refresh testi gerektirir; süresi dolmamış JWT'yi sırf istemciden silmek sunucuda oturumu iptal etmez.
- Site URL kanonik site; redirect allowlist yalnız kullanılan tam HTTPS dönüş adresleri. Parola kurtarma yolu `/reset-password`; mevcut akışın kök adrese dönen doğrulama bağlantısı da korunmalı. Production için `https://*.vercel.app/**` gibi genel wildcard kullanmayın. Preview callback'leri izole projede olsun.
- Supabase'in Auth hız limitlerini panelde inceleyin; e-posta kotasını sağlayıcı teslim limitiyle uyumlu tutun. Doğrudan `<ref>.supabase.co` trafiği sizin Cloudflare/Vercel WAF'ınızdan geçmez. Uygulama geçidindeki `410` kuralları sağlayıcıdaki açık signup'ı tek başına kapatmaz.
- Admin için AAL2/MFA zorunlu; rol yalnız korunan app metadata ve mevcut DB profilinde. Güncel rol kaldırıldığında eski JWT'nin yetki vermediğini test edin.

`config/supabase-auth-security.json` hedef değerleri belgeler; otomatik uygulanmaz. `npm run security:auth` salt okunur doğrular; Management erişimi yoksa HIBP için bilinmiyor/başarısız döner. Gerekli scoped `SUPABASE_ACCESS_TOKEN` yalnız yetkili operatör oturumuna verilir; uygulamanın Vercel runtime'ına eklenmez. Yönetim API'si yanıtı SMTP sırları içerebildiği için tam yanıtı paylaşmayın.

Mevcut istemci Supabase bearer oturumunu localStorage/sessionStorage içinde tutar; sunucuda HttpOnly oturum çerezi varmış gibi doğrulama yapmayın. CSP ve XSS önlemleri bu nedenle önemlidir. API'deki Origin/JSON denetimleri bearer yetkilendirmesine ek katmandır; CORS tek başına CSRF veya kimlik doğrulama değildir. İleride çerezle otomatik gönderilen kimlik bilgisine geçilirse `HttpOnly`, `Secure`, uygun `SameSite` ve açık CSRF tasarımı ayrıca gerekir; yalnız hosting panelinde bir seçenek açarak mevcut mimari dönüşmez.

### Önceden ifşa edilen sunucu anahtarı

1. Önce ifşa kaynağını ve üretim sırrına erişebilen preview/build yollarını kapatın.
2. Supabase Settings → API Keys üzerinden ayrı adlandırılmış yeni server secret oluşturun. Mevcut değişken adı `SUPABASE_SERVICE_ROLE_KEY` olsa da istemci SDK'sına verilen yeni değer `sb_secret_…` olabilir. İsim, değer türünü otomatik dönüştürmez.
3. Doğru Production scope'una koyup yeni sürümü oluşturun; Auth Admin, parola değişimi, REST, RPC, Storage, e-posta ve ödeme arka plan işlemlerini doğrulayın. Tüm script/cron/integrasyonları ve kullanıcıdaki eski APK'ların publishable/legacy anon kullanımını envanterleyin. Yeni secret JWT değildir; elle HTTP çağrılarında `apikey` başlığı gerekir, onu kullanıcı `Authorization: Bearer` JWT'sinin yerine koymayın.
4. Tüm bağımlılar taşındıktan sonra eski secret'ı silin veya legacy `anon/service_role` anahtarlarını panelde devre dışı bırakın. Yalnız yeni anahtar oluşturmak eskisini iptal etmez. Legacy anahtarları kapatma eski istemciyi etkileyebilir; envanter/prova atlanmamalı.
5. İptalin sağlayıcı panelinde ve yetkili operatörün kontrollü denemesinde doğrulandığını kaydedin; eski anahtarı rapora veya sohbete geri kopyalamayın. JWT imzalama anahtarı rotasyonu ayrı, daha geniş etkili bir işlemdir; rastgele onunla başlamayın.

Sunucu anahtarı değişimi rate-limit anahtar özetlerini değiştirebilir; yayın aralığında sayaç davranışını izleyin. RLS, service/secret anahtarının çalınmasına karşı tek başına koruma değildir.

## 4. Cloudflare kurulumu — bu altyapıda sınırlar ve ayarlar

`bilsemjunior.vercel.app` size ait DNS zone'u değildir; bu adresin nameserver'ını Cloudflare'a taşıyamazsınız. Şu anda projeye bağlı özel alan adı yoktur. Sahip olduğunuz alan adını Vercel Domains'e ekleyip doğrulayın; Vercel'in o alan adı için verdiği DNS hedefini kullanın. Rastgele örnek IP/CNAME'i kopyalamayın. Cloudflare'da zone'u ekleyip registrar'da verilen nameserver'ları ayarlayın; e-posta DNS kayıtlarını koruyun.

Vercel ek reverse proxy'yi varsayılan olarak önermiyor; Verified Proxy desteği Cloudflare'ı tanıyor. Cloudflare seçilirse orijinal istemci IP'sinin Vercel ve uygulama tarafında doğru görüldüğü provada doğrulanmalı; istemciden gelen sahte `CF-Connecting-IP`/`X-Forwarded-For` başlığını güven kaynağı yapmayın. Mevcut Express `trust proxy` ayarını rastgele artırmayın.

| Alan | Ayar |
|---|---|
| DNS | Uygulama hostname'i, Vercel özel domain/TLS doğrulaması tamamlandıktan sonra Proxied (turuncu bulut) |
| SSL/TLS | **Full (strict)**; origin'in geçerli, süresi dolmamış, hostname ile eşleşen HTTPS sertifikası olmalı. Flexible kullanmayın |
| Edge TLS | Minimum TLS 1.2, TLS 1.3 açık; Android'in desteklenen en eski sürümünde gerçek giriş/çalışma testi |
| HTTPS yönlendirme | Normal uygulama trafiğinde HTTPS; Vercel'in `/.well-known/acme-challenge/` doğrulaması için gerekli HTTP erişimini engellemeyin |
| Sertifika/alan doğrulama | `/.well-known/vercel/` cache, challenge ve özel block kurallarına takılmamalı; dar yol istisnası kullanın |
| Cache | `/api/*`, `/admin*`, `/reset-password*`, `/bilgi/*`, `/paketler*` için bypass; Authorization ve kişiselleştirilmiş içerikte Cache Everything yok |
| Statik cache | Yalnız sürümlenmiş statik asset'ler; HTML/boot recovery kaynaklarının mevcut no-cache davranışını bozmayın |
| Managed WAF | Free'de Free Managed Ruleset; uygun ücretli planda Cloudflare Managed Ruleset ve OWASP Core Ruleset. Yeni kuralları trafik/prova ile ayarlayın |
| Bot koruması | Aşağıdaki API/webhook ayrımını uygulayın; bütün domain'e körlemesine JS challenge eklemeyin |
| HSTS ve başlıklar | Kaynaktaki CSP, HSTS, X-Frame-Options, nosniff, referrer ve permissions başlıklarını koruyun; Cloudflare'da çelişen ikinci CSP eklemeyin |

HSTS başlığındaki `preload` direktifi alan adının gerçekten preload listesine kaydedildiğini kanıtlamaz. Yeni özel alan adının tüm alt alanları HTTPS olmadan preload başvurusu yapmayın.

### Somut WAF ve bot kuralları

Önce gözlem/log, sonra izole preview, son olarak production'da uygulanacak kural taslağıdır. Log eylemi planınızda yoksa Security Events ve preview testleriyle gözlemleyin; desteklenmeyen plan özelliğini varsaymayın.

1. **Açık tarama yolları:** yalnız `/.env`, `/.git`, `/wp-login.php`, `/phpmyadmin` gibi uygulamada bulunmayan yolları hedefleyin; doğrulamadan sonra Block. `/api/` veya `/admin` tamamına deny vermeyin. Bu uygulamada PATCH, PUT ve CORS OPTIONS gerekli; küresel yöntem yasağı eklemeyin.
2. **API ve webhook için HTML challenge yok:** `/api/*`, Auth/REST proxy, Android API ve `/api/google-play/notifications` için challenge yerine şema/kimlik/RLS + uygun rate-limit kullanın. Authorization başlığının bulunması kullanıcıyı otomatik güvenilir yapmaz.
3. **Free Bot Fight Mode:** endpoint bazlı Skip ile aşılamaz. Mobil veya RTDN trafiğine yanlış challenge veriyorsa bu mod kapalı tutulmalıdır; bunun yerine dar custom kurallar ve rate-limit kullanın. SBFM/Bot Management planında gerekiyorsa yalnız bot katmanı için dar API istisnası oluşturun; tüm WAF/rate-limit kontrollerini atlatmayın.
4. **HTML sayfası botları:** riskli tarayıcı navigasyonuna Managed Challenge uygulanacaksa API, webhook, doğrulama yolları ve doğrulanmış arama motoru erişimini ayrı değerlendirin. Sırf User-Agent'ta `Google` yazıyor diye allow vermeyin. Bot score alanı (`cf.bot_management.score`) ilgili plan yoksa kullanılamaz.
5. **Ödeme bildirimi:** RTDN endpoint'ini bot challenge'dan ayırın; Google OIDC imzası/audience/e-posta ve Play API kontrolü backend'de zorunlu kalır. Dinamik Google IP'leri için geniş IP allowlist veya “bu yola gelen her şeyi bypass et” kuralı oluşturmayın.

Custom kural için örnek tarama ifadesi (uygulama hostname'ine scope ekleyin):

```text
(http.request.uri.path eq "/.env"
 or starts_with(http.request.uri.path, "/.git/")
 or http.request.uri.path eq "/wp-login.php"
 or starts_with(http.request.uri.path, "/phpmyadmin"))
```

### Rate-limit başlangıç taslağı

Aşağıdaki eşikler gözleme başlanacak **önerilerdir**, ölçülmüş kullanıcı kapasitesi değildir. IP bazında okul/ev/operatör NAT'ı altında birçok öğrenci bulunabilir. İlk 24 saatte gerçek mobil/okul trafiğine göre ayarlayın. İstemci IP'si ile kullanıcı başına sunucu/DB kotası farklı savunmalardır; WAF tek başına global para harcama üst sınırı değildir.

| Yol grubu | İlk eşik / IP | Eşik aşımında hedef davranış |
|---|---|---|
| `/api/supabase/auth/v1/token`, yalnız password grant ayrılabiliyorsa | 60/dakika | JSON uyumlu 429; refresh'i aynı düşük kotaya yanlışlıkla almayın |
| Aynı token yolu, grant ayrılamıyorsa | 240/dakika | Tüm giriş/refresh için daha geniş limit; provider native login limitleri ayrıca zorunlu |
| `/api/register-family`, `/api/auth/resend-confirmation`, `/api/supabase/auth/v1/recover`, `/api/supabase/auth/v1/resend` | 30/dakika toplu | 429; uygulamadaki 6/saat kontrolleri korunur |
| `/api/health`, `/api/public/*`, `/bilgi/*`, `/paketler*` | 300/dakika toplu | 429; Express public katmanı ayrıca 120/dakika, process bazında |
| `/api/admin/*` | 60/dakika | 429; yönetici/MFA ve AI kullanıcı kotaları korunur |
| Diğer `/api/*`, `/api/index` dahil genel taban | 1200/dakika | 429; öğrenme yanıtlarında gereksiz challenge yok |
| `/api/google-play/notifications` | Ayrı gözlem; hacme göre ilk 300/dakika | 429 ve Pub/Sub retry takibi; öğrenme/girişle ortak çok düşük sayaç değil |

Birden fazla kuralın aynı isteği sayabileceğini ve değerlendirme sırasını inceleyin. Genel API kuralına RTDN için ayrı sayaç/exclusion gerekiyorsa açıkça tanımlayın. `/api/index?__path=…` gibi API function yolları genel tabanın dışında kalmamalı. Vercel tarafında ilk olarak path alanını arayüzde pre-rewrite/raw path ile karşılaştırın; rewrites gerçek gelen URL'yi değiştirebilir.

**Cloudflare Free sınırına uygun tek rate kuralı:** Bu çalışma sırasında resmî tabloda Free için 1 kural, IP sayacı ve 10 saniyelik pencere/engelleme vardı. Free rate ifadelerinde Method/Query/Host alanlarının tamamı yoktur. Uygulamanın bu zone'daki hostname düzeni ayrıca değerlendirildikten sonra tek kuralı öncelikle Auth/e-posta yollarına ayırın:

```text
http.request.uri.path in {
 "/api/supabase/auth/v1/token"
 "/api/supabase/auth/v1/recover"
 "/api/supabase/auth/v1/resend"
 "/api/register-family"
 "/api/auth/resend-confirmation"
}
```

Başlangıç: IP başına **60 istek / 10 saniye**, Block **10 saniye**; gerçek trafikte test edip daraltın. Free ifadede yöntemi ayıramadığı için OPTIONS ve refresh de sayılabilir; toplu okul/Android trafiği provası gerekir. Bu geniş eşik credential stuffing için yeterli tek savunma değildir; Supabase native Auth limitleri ve uygulamadaki hesap kotaları şarttır. Panelde planın izin verdiği block yanıtını kontrol edin; mümkünse API için 429 seçin. HTML challenge kullanmayın. Tek Free kuralın yukarıdaki bütün 7 grubu bağımsız koruduğunu iddia etmeyin. Pro/Business/Enterprise için pencere, ifade alanı ve kural sayısını güncel panelden doğrulayın; ücretsiz özellik varsayımıyla çok kurallı taslak yayımlamayın.

### Vercel tarafındaki karşılık ve bypass sınırı

Cloudflare yalnız proxied özel domain'den geçen trafiği görür. Eski `zekapark.vercel.app`, `bilsemjunior.vercel.app`, deployment URL'leri ve doğrudan Supabase adresi ayrı girişlerdir. Android hâlâ `bilsemjunior.vercel.app` kullanıyorsa o trafik Cloudflare korumasından geçmez. Bu yüzden Vercel Firewall'da host'tan bağımsız ortak API/abuse tabanı ve Supabase'de native kontroller korunmalıdır.

Vercel Firewall → yeni özel kuralları önce Log ile hazırlayın; trafik ve doğru IP görünümünü inceleyin, preview'da engelleme/rate-limit davranışını deneyin. Uygun plan kotası varsa üstteki yol gruplarını Vercel'de de uygulayın; kural sayısı/ücret panelde doğrulanmalı. Vercel bölgesel sayaçları global kesin limit değildir. Sırf istek Cloudflare IP'sinden geldi diye tüm güvenlik katmanlarını bypass etmeyin; `CF-Connecting-IP` başlığı varlığını origin kilidi saymayın.

`vercel firewall` CLI kullanılacaksa önce kurulu sürümde `--help`, ardından overview/rules/diff ile doğrulayın. Bu rehber hiçbir draft oluşturmadı ve Publish çalıştırmadı. Üretim politikası gerçekten hazırlanırsa tam diff gözden geçirilip kontrollü olarak yayımlanmalıdır. Giriş/ödeme bozulursa ilgili kuralı Log'a geri alma planı hazır olsun; DDoS korumasını küresel kapatmayın.

## 5. Yayınlama sırası ve geri dönüş

1. GitHub'da Aşama 2–3 değişiklikleri ve bu rehberi içeren son commit'i inceleyin. Main koruması, gerekli CI kontrolleri ve üretim ortamı yetkileri açık olsun. PR koduna üretim sırrı veren `pull_request_target` veya kontrolsüz workflow eklemeyin.
2. Üretim sırlarını preview'dan ayırın; eski deployment ve ifşa kaynağını kapatın. İzole Supabase/preview kurun. Eski yayınlanan Android sürümüyle aynı anda prova edin.
3. İzole ortamda [veritabanı rehberini](database-shield.md) uygulayın: preflight → ana SQL → referans incelemesi ve Storage API/panel private ayarı → Storage SQL → verify. PGlite testi gerçek Supabase servis izinlerini doğrulamaz. Geçersiz profil guard'ını atlamayın.
4. Üretim yedeğini ve izole geri yüklemeyi kanıtlayın. Anahtar/SMTP/Auth hedeflerini planlayın. Kontrollü pencerede aynı SQL sırasını gerçek projede uygulayın; 933 Storage dosyasını silmeyin. Kanıtları kaydedin.
5. Onaylanan tam commit ile **Production ortamında, domain atamadan** aday deployment oluşturun ve test edin. Preview'yi production'a çevirmek yeniden build edebileceğinden test edilen artifact'in aynı kaldığını varsaymayın. Gerekli geçici test erişimini yalnız yetkili operatör/CI için tutun; bypass sırrını URL'ye/rapora koymayın.
6. Auth hedeflerini, yeni server secret'ı ve e-posta akışını doğrulayın. Aşağıdaki beş testi aday URL'de; promotion sonrasında kanonik web, Android'in API adresi ve webhook adresinde tekrarlayın. Yalnız başarılı derleme veya health ile satış açmayın.
7. Domain promotion, eski anahtarın emekliye ayrılması ve WAF engelleme modunu kontrollü uygulayın. Son 24 saatte 401/403/429/5xx, Auth e-posta teslimi, RTDN retry/backlog, ödeme doğrulaması, AI/hosting harcaması ve öğrenci çalışma hatalarını izleyin. Alarm eşiği ve sorumlu operatör belirleyin.

Yerel Aşama 3 doğrulaması 594 test, 37 HTTP kontrolü, TypeScript ve build başarısıdır; bu gerçek GitHub Actions run'ı, mağaza onayı veya production smoke testi değildir. Güncel commit'in gereken CI sonuçları ayrıca başarılı olmalı. Paket/audit sonuçlarını yayın günü güncelleyin; sır içeren `.env`, `.vercel`, trace/auth state veya source map'i public artifact olarak yüklemeyin.

Geri dönüş: uygulama deployment rollback'i DB grant/RLS, Auth ayarı, key iptali ve Cloudflare politikasını geri almaz. Eski uygulama sürümünün yeni ACL ile uyumunu provada test edin. DB için geniş eski grant'leri otomatik açan rollback kullanmayın; yedek/ACL üzerinden hedefli düzeltme veya doğrulanmış geri yükleme gerekir. Anahtarları veya private bucket'ı eski güvensiz hâline otomatik döndürmeyin. Kayıt/giriş sorunu varsa önce yeni kayıt/satış kapısı ve ilgili WAF kuralını kontrollü durdurun, hata nedenini inceleyin.

## 6. Tarayıcı ve cURL / Postman ile beş doğrulama testi

Önce izole gerçek Supabase + preview kullanın. Production'da yalnız onaylı sentetik test aileleriyle sınırlı tekrar yapın. A ve B adında **birbirine bağlı olmayan iki aile**, her ailede bir öğrenci ve ayrı MFA yöneticisi hazırlayın. Gerçek çocuk hesaplarında saldırı/ödül/silme testi yapmayın. Her testte beklenen durum kodu kadar yanıt gövdesi ve verinin değişmemesi önemlidir.

Postman'da aynı URL/yöntem/body ile istek oluşturabilirsiniz. Gerçek test JWT'sini yerel Vault/secret alanında tutun; koleksiyon export'una, paylaşılan environment'a veya ekran görüntüsüne eklemeyin. cURL örneklerinde `$BJ_BASE`, test ettiğiniz tam HTTPS origin'dir; sondaki `/` olmadan girin. Örnek adresi gerçek izole preview ile değiştirin. `curl -k` ve kimlik bilgisiyle otomatik `-L` kullanmayın.

Yerel Linux/macOS Bash hazırlığı (bu dosyaları git'e eklemeyin):

```bash
BJ_BASE='https://SIZIN-IZOLE-PREVIEW-ADRESINIZ.vercel.app'
BJ_DB='https://IZOLE-PROJE-REF.supabase.co'
umask 077
BJ_TEST_DIR="$(mktemp -d)"
read -r -s -p 'Test A veli JWT: ' BJ_TEST_JWT
printf '\n'
read -r -s -p 'Ayni test projesinin publishable anahtari: ' BJ_TEST_PUBLIC
printf '\n'
printf 'Authorization: Bearer %s\napikey: %s\n' "$BJ_TEST_JWT" "$BJ_TEST_PUBLIC" > "$BJ_TEST_DIR/parent-a.headers"
printf 'apikey: %s\n' "$BJ_TEST_PUBLIC" > "$BJ_TEST_DIR/public.headers"
unset BJ_TEST_JWT BJ_TEST_PUBLIC
```

JWT, o hedefte normal girişle alınmış A veli hesabının erişim token'ıdır; **service/secret key değildir**. Öğrenci testi için ayrı `student-a.headers` dosyasını aynı yöntemle öğrencinin JWT'si ve aynı publishable anahtarla hazırlayın. Production JWT'sini preview'a göndermeyin. Korumalı preview platform giriş sayfası döndürürse önce yetkili test erişimini kurun; HTML 200, API güvenliği başarı sonucu değildir.

### Test 1 — Doğru sürüm, HTTPS, başlıklar ve public sayfalar

```bash
curl --silent --show-error --max-time 15 --dump-header - "$BJ_BASE/api/health"
curl --silent --show-error --max-time 15 --dump-header - --output /dev/null "$BJ_BASE/"
curl --silent --show-error --max-time 15 --dump-header - --output /dev/null "$BJ_BASE/server.cjs.map"
```

Beklenen: health `200`, JSON `status:ok`, `database:ready`, tam beklenen commit ve **o ortama ait** projectRef. Root'ta CSP (`frame-ancestors 'none'`, `object-src 'none'`), HSTS, `X-Frame-Options:DENY`, `X-Content-Type-Options:nosniff`; hassas API'de `Cache-Control:no-store`. Sunucu source map'i `404` ve içerik yok. Kanonik üretim için mevcut betik:

```bash
BJ_EXPECTED_COMMIT='YAYINLANAN_TAM_40_HEX_COMMIT_SHA'
npm run verify:live -- "$BJ_BASE" "$BJ_EXPECTED_COMMIT" vtcsoqohkiagbwatlabk
```

Son komuttaki projectRef yalnız production hedefi içindir; izole preview'da onun ref'ini kullanın. Yanlış commit/ref veya eksik değer başarısız olmalı.

Tarayıcıda ve gerçek Android cihazında giriş/kayıt, veli→öğrenci geçişi ve altı açıklama bağlantısını açın: `/bilgi/gizlilik-ve-veriler`, `/bilgi/kullanim-kosullari`, `/bilgi/iletisim-ve-destek`, `/bilgi/hesap-ve-veri-silme`, `/bilgi/abonelik-iptal-ve-iade`, `/bilgi/cerez-ve-yerel-depolama`. İçerik güncel işletmeci/iletişim/saklama/silme akışıyla eşleşmeli, yanlış ortama gitmemeli. Link bulunması hukuki içeriğin tek başına onaylandığı anlamına gelmez.

### Test 2 — Auth atlatma, doğrulama, kurtarma ve oturum iptali

```bash
curl --silent --show-error --max-time 15 --dump-header - \
  -H 'Content-Type: application/json' --data '{}' \
  "$BJ_BASE/api/supabase/auth/v1/signup"
curl --silent --show-error --max-time 15 --dump-header - \
  -H 'Content-Type: application/json' --data '{}' \
  "$BJ_BASE/api/supabase/auth/v1/otp"
curl --silent --show-error --max-time 15 --dump-header - \
  --request PUT -H 'Content-Type: application/json' --data '{}' \
  "$BJ_BASE/api/supabase/auth/v1/user"
curl --silent --show-error --max-time 15 \
  --header "@$BJ_TEST_DIR/public.headers" "$BJ_DB/auth/v1/settings"
```

Beklenen ilk ikisi `410/FAMILY_REGISTRATION_REQUIRED`, üçüncüsü `410/APP_PASSWORD_CHANGE_REQUIRED`. Boş body ile sağlayıcıda yeni kullanıcı oluşturmaya çalışmayın. Son salt okunur yanıtta signup kapalı, e-posta doğrulama gerekli, email provider açık ve anonymous kapalı olmalı. HIBP için ayrıca yetkili operatör `security:auth` doğrulaması/Advisor kullanmalı; public settings tek başına HIBP'yi kanıtlamaz.

Tarayıcıda test veli kaydını onaylar olmadan tamamlamaya çalışın: reddedilmeli. Onaylı kayıt, doğrulama e-postası, doğrulama sonrası giriş ve öğrenci etkinleştirmesi çalışmalı. Parola kurtarmada bağlantı `/reset-password` akışını açmalı; yeni parola uygulama API'sinden değişmeli. Eski parolayla yeni giriş başarısız, yeniyle başarılı olmalı. İptal edilen test oturumunun **eski JWT'siyle** `/api/account/requests` veya doğrudan profiles sorgusu veri vermemeli. Kullanıcı rolüne göre aynı hata kodunu varsaymayın; RLS boş dizi ile de engelleyebilir.

### Test 3 — Aileler arası IDOR ve sütun/rol yükseltme

```bash
read -r -p 'Sentetik B ogrencisinin UUID: ' BJ_CHILD_B
curl --silent --show-error --max-time 15 --dump-header - \
  --header "@$BJ_TEST_DIR/parent-a.headers" \
  "$BJ_BASE/api/parent/learning-history/$BJ_CHILD_B"
curl --silent --show-error --max-time 15 --dump-header - \
  --header "@$BJ_TEST_DIR/parent-a.headers" \
  "$BJ_DB/rest/v1/profiles?id=eq.$BJ_CHILD_B&select=id,name"
curl --silent --show-error --max-time 15 --dump-header - \
  --header "@$BJ_TEST_DIR/parent-a.headers" --request PATCH \
  -H 'Content-Type: application/json' --data '{"role":"admin","xp":999999}' \
  "$BJ_BASE/api/account/profile"
```

Beklenen: yabancı çocuğun API geçmişi `404`, doğrudan DB sorgusu `200 []` veya açık izin reddi; B'ye ait hiçbir alan dönmemeli. Profil API'si rol/XP payload'ını `400` ile reddetmeli. Kendi profilinde yalnız isim/tercih güncellemesi çalışmalı; öğrenci/admin API'sine rol atlatma denemesi başarısız olmalı.

İzole ortamda A veli JWT'siyle B'nin sentetik profiline doğrudan PATCH yapın; yalnız `name` gibi geri alınabilir alan kullanın ve önceki değeri B hesabıyla kaydedin. Yetki hatası veya sıfır değişen satır beklenir; **B hesabından tekrar okuyarak değişmediğini doğrulayın**. Kendi profiline doğrudan `grade`, `role`, `xp`, aile bağlantısı değişimi reddedilmeli. Uygulamanın sınıf API'si öğrencide 1–4 arasında çalışmalı ve XP'yi korumalı. Gerçek hesap silme veya gerçek aile ilişkilendirme testini bu denemeye eklemeyin.

### Test 4 — Girdi doğrulama, Origin ve rate-limit

```bash
curl --silent --show-error --max-time 15 --dump-header - \
  --header "@$BJ_TEST_DIR/parent-a.headers" --request PATCH \
  -H 'Content-Type: application/json' --data '{"dailyGoalMinutes":-1}' \
  "$BJ_BASE/api/account/profile"
curl --silent --show-error --max-time 15 --dump-header - \
  -H 'Origin: https://attacker.invalid' -H 'Content-Type: application/json' \
  --data '{}' "$BJ_BASE/api/register-family"
```

Beklenen `400` ve `403`; wildcard CORS veya saldırgan origin'e izin başlığı olmamalı. Meşru Android origin'i `https://localhost` ile yapılan OPTIONS isteği `204` ve tam origin + PATCH/Authorization izni almalı. CORS'un cURL gibi native istemciyi kimlik doğrulamadığını unutmayın; bearer/rol denetimi ayrıca gerekir.

Rate-limit için yalnız izole preview'da kendi IP'nizden, e-posta/AI/ödeme çağırmayan invalid veya kimliksiz isteklerle kısa ve sınırlandırılmış deneme yapın. Örneğin yayımlanan profil pre-auth katmanı 60/dakika olduğunda:

```bash
for BJ_N in {1..65}; do
  BJ_CODE=$(curl --silent --show-error --max-time 5 --output /dev/null \
    --write-out '%{http_code}' --request PATCH \
    -H 'Content-Type: application/json' --data '{}' "$BJ_BASE/api/account/profile")
  printf '%s\n' "$BJ_CODE"
  if [ "$BJ_CODE" = '429' ]; then break; fi
done
```

Birden çok serverless instance'a dağıldığında process sayacı 429 üretmeyebilir; bu durumda “limit çalışıyor” demeyin. Aktif **edge/WAF** kuralının kendi eşiği üzerinden aynı test ayrı yapılmalı; Security Events/Firewall Traffic'te kural ID'si ve rate-limit eylemi görülmeli. Cloudflare Free kuralı başka yolları hedefliyorsa bu profil denemesi onu test etmez. Log modunda 429 beklenmez. Üretimde agresif döngü/yük testi çalıştırmayın.

### Test 5 — Ödeme/webhook, özel dosya ve maliyetli işlem sınırı

```bash
curl --silent --show-error --max-time 15 --dump-header - \
  -H 'Content-Type: application/json' --data '{}' \
  "$BJ_BASE/api/google-play/notifications"
curl --silent --show-error --max-time 15 --dump-header - \
  --header "@$BJ_TEST_DIR/student-a.headers" \
  -H 'Content-Type: application/json' --data '{}' \
  "$BJ_BASE/api/admin/question-decoration"
```

Beklenen: imzasız RTDN `401`; öğrenciyle yönetici görsel üretimi `403`. İkisi de HTML challenge/giriş sayfası olmamalı, yeni ödeme/AI maliyeti oluşturmamalı. Google Pub/Sub üzerinden gerçek **test notification** gönderildiğinde doğru OIDC audience/e-posta ile `204` ve retry kuyruğunda başarı görülmeli; gerçek ödeme hakkı açmamalı.

Kontrollü Play test kanalında satın alma → sunucuda doğrulama → yenileme/iptal/iade → üyelik güncellemesi akışını gerçek test ürünüyle doğrulayın. A ailesinin satın alma token'ını B'ye bağlama reddedilmeli; istemcinin gönderdiği fiyat veya “ödendi” bayrağı üyelik açmamalı. Test satın alımını üretim hakkı kabul eden bayrağı genel yayında açık bırakmayın.

İzole Storage'a konan bilinen sentetik dosyayla public URL, anonymous download ve sıradan kullanıcı upload denemelerinin reddedildiğini doğrulayın; tahmin edilen olmayan dosyanın 404 vermesi gizliliği kanıtlamaz. Sunucunun yetkili yönetici görsel erişimi çalışmalı. Özel PNG/WebP bucket'ında yanlış gerçek MIME veya 10 MiB üstü upload API tarafından reddedilmeli. Test dosyası dışında 933 eski nesneyi değiştirmeyin.

Tarayıcı Network ve API JSON'unda doğru cevap anahtarları, password hash, service/secret key, satın alma token'ı, SMTP bilgisi veya stack trace görünmemeli. Kendi verisinin dışa aktarımında beklenen kişisel alanları, yabancı aile sızıntısıyla karıştırmayın. Aynı haftalık ödülü tekrar isteme veya rastgele `grand` ID'siyle XP kazanma başarısız olmalı; bunu sentetik öğrenci hesabında XP/defter öncesi-sonrası ile kontrol edin.

Deneme sonunda token'ları uygulamadan çıkış/oturum iptaliyle geçersizleştirin ve geçici başlık dosyalarını temizleyin:

```bash
rm -f -- "$BJ_TEST_DIR/parent-a.headers" "$BJ_TEST_DIR/student-a.headers" "$BJ_TEST_DIR/public.headers"
rmdir -- "$BJ_TEST_DIR"
unset BJ_TEST_DIR BJ_BASE BJ_DB BJ_CHILD_B BJ_EXPECTED_COMMIT BJ_N BJ_CODE
```

## 7. Yayın karar kaydı

| Zorunlu kanıt | Durum |
|---|---|
| İncelenen son tam commit ve başarılı CI run bağlantısı | Henüz kaydedilmedi |
| Üretimden ayrılmış gerçek Supabase provası; web ve mevcut Android | Bekliyor |
| Yedek + izole geri yükleme + ayrı Storage yedeği | Bekliyor |
| Üretim DB/Storage kalkanı `status:verified` | Bekliyor |
| Auth signup kapalı, HIBP açık/doğrulanmış, SMTP testi | Bekliyor |
| Eski sunucu anahtarı iptali ve eski preview temizliği | Bekliyor |
| WAF kural ID'leri, gözlem, mobil/RTDN yanlış pozitif kontrolü | Bekliyor |
| Beş testin aday ve kanonik adreslerde sonuçları | Bekliyor |
| Test edilmiş geri dönüş sürümü ve 24 saat gözlem sorumlusu | Bekliyor |

Bu çalışma rehberi tamamlar; tablodaki bekleyen işleri yapılmış saymaz. Ödeme mağaza incelemesi, yasal metinlerin işletmeye uygunluğu ve kurum/mağaza onayları ayrı doğrulamalardır.

## Birincil kaynaklar

- [Vercel ortam değişkenleri](https://vercel.com/docs/environment-variables)
- [Vercel WAF rate-limit](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel reverse proxy / Verified Proxy](https://vercel.com/docs/security/reverse-proxy)
- [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare Managed Rules planları](https://developers.cloudflare.com/waf/managed-rules/)
- [Cloudflare rate-limit plan ve alan sınırları](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Cloudflare bot/Skip etkileşimi](https://developers.cloudflare.com/waf/feature-interoperability/)
- [Supabase parola güvenliği / HIBP](https://supabase.com/docs/guides/auth/password-security)
- [Supabase yeni anahtarlara geçiş](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Supabase API anahtarları / ifşa sonrası rotasyon](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase 10 Kasım 2026 ve sonrası TLS değişikliği](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)

Supabase'in 12 Ekim duyurusu en erken **10 Kasım 2026** itibarıyla bazı eski TLS 1.2 CBC şifre takımlarını kaldıracağını bildiriyor. Android minimum destek sürümü ve WebView güncelliğini TLS 1.3 veya desteklenen GCM/ChaCha20 takımlarıyla test edin; bağlantı sorununu çözmek için TLS doğrulamasını kapatmayın.
