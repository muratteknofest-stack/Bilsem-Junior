# İstek sınırları ve maliyet koruması — Aşama 2, grup 5

Bu grup kaynak kodunu değiştirir. Canlı veritabanı, Supabase Auth ayarları,
Vercel/Cloudflare güvenlik duvarı ve ücretli servis planları değiştirilmez.

## İşlem başlamadan önceki sınırlar

`createApiApp` artık JSON gövdesi ayrıştırılmadan, oturum sağlayıcıda
doğrulanmadan ve dağıtık kota RPC'si çağrılmadan önce IP tabanlı yerel sınırlar
uygular. Mevcut kaynak/Content-Type kontrolleri önce çalışır; CORS preflight
yanıtları dış servise gitmez.

| Kapsam | Varsayılan sınır | Aşıldığında |
| --- | --- | --- |
| `/api`, Node üzerindeki `/bilgi` ve `/paketler` yolları | IP başına 600/dakika | `429`, `Retry-After`, `no-store`; arka uç işlemine geçilmez |
| `/api/public`, `/api/health` ve aynı Node HTML yolları | IP başına 120/dakika; aynı ortak sayaç | Aynı yanıt; yol veya query değiştirmek yeni kota açmaz |

Bu değerler bir uygulama örneği içindir. Sayaçlar kullanıcı tarafından
gönderilen bearer token'a göre ayrılmaz. IPv6 adresleri yerel limitlerde ve
kimliği doğrulanmamış isteklerin mevcut dağıtık kotalarında `/56` ağına göre
gruplanır. Kimliği doğrulanmış kullanıcılara ait mevcut dağıtık kotalar kullanıcı
kimliğini kullanmaya devam eder. HMAC nedeniyle kota tablosuna ham IP yazılmaz.
Kota RPC'si hata veya boolean dışında bir değer döndürürse istek `503` ile
reddedilir; belirsiz yanıt izin sayılmaz.

## Sağlık ve herkese açık durum sorguları

- Sağlık kontrolünün eşzamanlı çağrıları, örnek başına tek ölçümü paylaşır.
  Ölçüm üç tabloya yalnızca `HEAD` yapar; müşteri satırları döndürülmez.
  Üç sorgu aynı 3 saniyelik süre sınırını kullanır, otomatik tekrar yapmaz.
  Başarılı ölçüm 10 saniye, başarısız ölçüm 1 saniye paylaşılır.
- `/api/public/platform` ve API üzerindeki üyelik görünümü aynı, tek yuvalı
  sunucu önbelleğini kullanır. Başarı 5 saniye, hata 1 saniye tutulur. Sorgu
  parametreleri önbellek anahtarı değildir. Bu okumada 5 saniyelik süre sınırı
  ve kapatılmış otomatik tekrar vardır.
- Süresi dolan başarılı veri, yenileme başarısız olursa geri verilmez.
  Yönetici ayarı kaydedildiğinde o örneğin public önbelleği temizlenir; önceki
  isteğin geç dönen sonucu yeni önbelleği ezemez. Diğer örnekler en fazla kendi
  kısa TTL sürelerini bekler.
- **Kayıt, ödeme ve yetki kararları bu public önbelleği kullanmaz.** Güncel
  `readPlatformSettings` okuması korunur. Eski bir public ekranda kayıt açık
  görünse bile sunucuda kapanmış kayıt yeniden açılmaz.
- Yasal metinler bu önbelleğe alınmaz; mevcut veritabanı hatası davranışı
  korunur. Bilinmeyen politika slug'ı veritabanına sorgu göndermeden reddedilir.
- HTTP yanıtlarında `Cache-Control: no-store` kalır. Sağlık yanıtının mevcut
  release/izleme şeması ve ölçüm zamanı korunur; başarılı yanıt en fazla 10
  saniye önce yapılmış ölçümü temsil edebilir.

## Oturum ve güvenilir IP

Eksik/bozuk JWT biçimi veya 8192 karakterden uzun access token, Supabase'e
gitmeden `401` ile reddedilir. Biçim kontrolü kimlik doğrulaması değildir;
uygun biçimdeki token için mevcut sağlayıcı doğrulaması ve canlı `session_id`
iptal kontrolü her istekte çalışmaya devam eder. Kullanıcı oturumu/yetkisi
önbelleğe alınmaz.

Vercel ortamında sağlayıcının kontrol ettiği son proxy hop'u kullanılır.
`NODE_ENV=production` tek başına proxy başlıklarına güvenilmesine yol açmaz;
Vercel dışında varsayılan kaynak doğrudan soket adresidir. İstemcinin kendi
`X-Forwarded-For`, `X-Real-IP` veya `CF-Connecting-IP` değerleri ek güvenilirlik
sağlamaz. Vercel dışında ters proxy kullanılırsa yalnızca bilinen proxy
ağlarının güvenilir sayılması ayrıca yapılandırılmalıdır. Cloudflare öne
alınırsa gerçek IP zinciri ve origin'e doğrudan erişim Aşama 4'te test edilmelidir.

Mevcut e-posta, parola, öğrenme, ödeme ve yönetici AI işlemlerinin doğrulama ve
dağıtık kotaları korunur. Öğrenci tarafında harici Gemini çağrıları kapalı
kalmıştır; bir anahtar eklenerek kendiliğinden açılmaz.

## Aşama 4'te kalan sınır

Yerel sayaçlar ve bu küçük önbellekler Vercel örnekleri arasında paylaşılmaz;
soğuk başlangıçta yeniden oluşur. Bunlar dağıtık DDoS koruması veya kesin bir
fatura üst sınırı değildir. `429` üretmek için bile Function çalışmış olabilir.
Mevcut maliyetli işlerin kullanıcı bazlı veritabanı kotaları ayrı katmandır.

Vercel'in doğrudan Supabase'e yönlendirdiği `/api/supabase/auth/*` ve REST
geçitleri Express'ten geçmez. Sağlayıcının kendi adresine erişim de bu kodla
sınırlanmaz. Giriş, kurtarma ve yeniden e-posta gönderimi için sağlayıcı
korumaları ve edge/WAF kuralları hâlâ gereklidir. Dağıtık bot trafiği, origin
atlatma ve harici servis harcama limitleri Aşama 4'te ele alınmalıdır. Bu grup
bu kontrollerin canlıda etkin olduğunu iddia etmez.

## Doğrulama yaklaşımı

Yerel HTTP testleri, düşük ama gerçek limitlerle üçüncü isteğin Auth/DB/JSON
işleminden önce reddedildiğini; sahte forwarding başlığının kotayı aşamadığını;
12 paralel sağlık isteğinin yalnızca üç HEAD yaptığını ve public metadata
isteklerinin tek sorguyu paylaştığını doğrular. Kesinti testleri otomatik
tekrarların kapalı olduğunu, hata geri çekilmesini ve ham hata metninin
sızmadığını kapsar. Kayıt kapatıldığında önbelleğin kayıt açmaya izin vermediği
ayrıca test edilir. Canlı sisteme yük testi, e-posta gönderimi veya ücretli
servis çağrısı yapılmaz.

Bu grupta 570 test, TypeScript kontrolü, açık bağlantı ayarlarıyla üretim
derlemesi ve 37 üretim HTTP kontrolü geçti. Derlemenin 158 metin dosyası gizli
anahtar/source-map taramasını geçti. Değişiklikler canlıya dağıtılmadı.

Resmî kaynaklar:

- [Express güvenilir proxy modeli](https://expressjs.com/en/5x/guide/behind-proxies/)
- [Vercel istek başlıkları](https://vercel.com/docs/headers/request-headers)
- [Express Rate Limit çoklu süreç sınırlaması](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/overview.mdx)
