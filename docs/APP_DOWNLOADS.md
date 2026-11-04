# Web uygulaması indirme kartları

Ana sayfanın giriş bölümünde, `#uygulamayi-indir` alanında ve sayfa altında Google Play / App Store kartları bulunur. Masaüstü ve mobil menüdeki “Uygulamayı indir” bağlantısı ilgili başlığa gider ve klavye odağını taşır. `/paketler` sunucu sayfasında da aynı kartlar kullanılır.

Mağaza bağlantıları `/api/public/membership` yanıtından bir kez okunur ve ana sayfadaki üç alana paylaşılır. Google Play yayını mevcut `GOOGLE_PLAY_STORE_PUBLISHED` ayarıyla yönetilir. Ücretli satışın açık olması indirme bağlantısının koşulu değildir.

iOS için yalnızca gerçek App Store sayfası yayımlandıktan sonra `APP_STORE_URL=https://apps.apple.com/tr/app/uygulama-adi/idGERCEK_SAYISAL_KIMLIK` ve `APP_STORE_PUBLISHED=true` ayarlanır. Bu örnek bir gerçek indirme adresi değildir. Ayarlar yoksa kart “İndirme bağlantısı yakında” der ve tıklanabilir bağlantı oluşturmaz. Ağ hatasında yayın durumuna dair tahminde bulunulmaz.

URL doğrulaması yalnızca HTTPS ve doğrudan mağaza sayfalarına izin verir; arama, yönlendirme, kimlik bilgisi veya ek sorgu içeren Apple adreslerini reddeder. Hiçbir indirme kartı üyelik erişimi veya satın alma başlatmaz.

Yerel CSS `/app-downloads.css` üzerinden servis edilir. Hareketler cihazın azaltılmış hareket tercihine ve ana sayfanın hareketi durdur düğmesine uyar. Dar ekranlarda kartlar taşmadan yeniden düzenlenir. Native Android başlangıç sayfasına indirme çağrısı eklenmez.

Doğrulama: `npm run lint`, `npm run build`, `node --import tsx --test tests/play-membership.test.tsx tests/footer-security.test.tsx tests/landing-design-system.test.ts tests/homepage-preview.test.ts tests/google-play-ui.test.tsx` ve CI içindeki `node scripts/check-bilsem-brand.mjs`. Tarayıcı kontrolü 320–1440 px, hareket tercihi, mobil menüden odağın taşınması, yayınlanmış/yayınlanmamış mağaza ve ağ hatası durumlarını kapsar.
