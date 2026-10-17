# ZekaPark: doğrulanmış güvenlik denetimi ve düzeltmeler

Tarih: 11 Ekim 2026. Hedef: https://zekapark.vercel.app/.
Kapsam: kaynak kodu, kilitli bağımlılıklar, düşük hacimli HTTP kontrolleri ve Supabase yetki metadatası. Bu denetim, kapsamlı bir sızma testi veya hesap güvenliği sertifikası değildir. Gerçek kullanıcı şifreleri değiştirilmedi; kullanıcı verileri dışa aktarılmadı.

## İlk raporun teknoloji varsayımı

Uygulama React 19.3.0, Vite 6.4.3 ve Express 5.2.1 kullanıyor. Kilit dosyasında Next.js veya React Server Components sunucu paketleri bulunmuyor; Next.js App Router, Server Actions ve Image Optimization çalıştırılmıyor.

| Kayıt | Resmî kaydın kapsamı | ZekaPark sonucu |
| --- | --- | --- |
| CVE-2026-44581 | Next.js App Router ve CSP nonce ile ortak önbellek üzerinden XSS; 15.5.16 / 16.2.5 düzeltmeleri | İlgili paket ve mekanizma kullanılmıyor |
| JVNDB-2026-025906 / CVE-2026-64643 | Next.js Server Function uç noktalarının yetkisiz ifşası; 15.5.21 / 16.2.11 düzeltmeleri | İlgili paket ve mekanizma kullanılmıyor |
| CVE-2026-94483 | Next.js 16.x Image Optimization ve remotePatterns ile SSRF; 16.3.8 düzeltmesi | İlgili paket ve mekanizma kullanılmıyor |

Kaynaklar: [CVE-2026-44581](https://github.com/CVEProject/cvelistV5/blob/main/cves/2026/44xxx/CVE-2026-44581.json), [JVN kaydı](https://jvndb.jvn.jp/ja/contents/2026/JVNDB-2026-025906.html), [CVE-2026-94483](https://github.com/CVEProject/cvelistV5/blob/main/cves/2026/94xxx/CVE-2026-94483.json).

## Düzeltilen eksikler

| Alan | Önce | Sonra |
| --- | --- | --- |
| Statik COOP / CORP | Başlıklar yoktu; API kaynak politikası cross-origin idi | Statik içerik ve API için same-origin |
| HSTS | Statik içerikte bir yıl; API başlığı farklıydı | İki yıl, includeSubDomains ve preload belirteci; preload listesine kayıt yapıldığı iddia edilmiyor |
| CSP bağlantıları | Tüm Google API ve Supabase alt alanlarına izin | Yalnızca uygulamanın Supabase HTTPS/WSS adresi ve aynı kaynak |
| CSP stilleri | Tüm inline stillere izin | Inline style etiketleri yasak; React grafik/animasyonlarının style öznitelikleri için dar istisna |
| İstek kaynağı | Origin yalnızca host ile eşleşiyordu | Protokol, host ve port kontrolü; açıkça izin verilen kaynaklar ve Fetch Metadata kontrolü |
| API gövdesi | JSON dışındaki içerik türleri merkezi olarak reddedilmiyordu | Durum değiştiren API istekleri application/json gerektiriyor; boyut sınırı 256 KiB |
| Hatalı isteklerin başlıkları | Origin reddi Helmet'ten önceydi | Reddedilen isteklerde de tüm güvenlik başlıkları ve no-store |
| Ortam değişkenleri | Vite ön ekleri benzer isimli *_SECRET / *_TOKEN değerlerini de kapsayabilirdi | Yalnızca dört tam değişken adı; service_role ve secret anahtarları derleme öncesinde reddediliyor |
| Yayın dosyaları | Otomatik gizli anahtar taraması yoktu | Tanınan özel anahtar, ayrıcalıklı JWT, sunucu paketi veya kaynak haritası bulunduğunda derleme duruyor; değerler loglanmıyor |
| Soru yayınlama limiti | Yalnızca worker içi limit | Ek olarak Supabase üzerinde worker'lar arasında kalıcı kullanıcı limiti |

Script kaynakları yalnızca aynı origin; inline script / eval, object ve uygulamanın iframe içine alınması yasak. Wordwall iframe, izin verilen gerçek fotoğraf kaynakları, Google Fonts ve Supabase Realtime izinleri korunuyor. Harici çalıştırılabilir script eklenmedi.

## Supabase ve uygulama yetkileri

- public/storage şemalarındaki tablolarda RLS kapalı olan tablo yok.
- public şemasında RLS'yi atlayabilecek view bulunmuyor.
- public şemasındaki altı SECURITY DEFINER işlemi anon/authenticated rollerine kapalı; search_path sabitlenmiş.
- Kullanıcı politikaları auth.uid(), nesne sahipliği, aktif oturum ve korunan aile ilişkilerini denetliyor. Profil kimliği ve aile bağları tetikleyiciyle korunuyor.
- Sekiz sunucu tablosunun RLS açık/politikasız uyarısı INFO düzeyinde: istemci erişimi kasıtlı olarak reddediliyor. Uyarıyı temizlemek için tablo erişimi açılmadı.
- API kimliği Supabase ile doğrulanıyor; ayrıca silinen/revoke edilen oturumlar kontrol ediliyor. Veli–öğrenci geçişinde çift yönlü aile ilişkisi ve gerçek hesap kimliği denetleniyor.
- Hassas API yanıtları no-store; hatalar ve provider logları şifre/JWT/istek gövdesi içermiyor. SQL işlemleri parametrik SDK/RPC çağrılarıyla yürütülüyor.
- Aile kaydı, parola işlemleri, AI, çalışma ve yayınlama işlemlerinde kalıcı limitler; soru bildirimlerinde veritabanı kotası mevcut. Giriş ve kurtarma e-postalarının sağlayıcı limitleri bu denetimde yeniden yapılandırılmadı.

## Test kanıtı

- npm audit: geliştirme bağımlılıkları dahil 0 bilinen bulgu.
- OSV: 362 kilitli npm paketi, 0 bilinen bulgu.
- npm test: 170 başarılı test; öğrenci akışı: 7 başarılı test.
- Üretim HTTP smoke: 18 başarılı kontrol; derleme: TypeScript, soru testleri, Vite ve Express paketleme başarılı.
- Public asset taraması: 104 metin dosyası, tanınan özel anahtar veya kaynak haritası yok.
- Yeni canlı sürüm, yayınlandıktan sonra scripts/verify-security-release.mjs ile doğru commit/Supabase projesi, dört sayfanın başlıkları ve sekiz yetkisiz/yanlış kaynak isteği üzerinden doğrulanır. Tarayıcıda ana sayfa, kayıt ve blog görünümleri ayrıca kontrol edilir.

## Hesap düzeyinde doğrulanamayan maddeler

1. Vercel Firewall yapılandırma API'si, doğru takım/proje ile 403 scope yetki hatası verdi; yerel Vercel CLI mevcut değil. WAF özel kuralları, hesap 2FA, platform faaliyet kayıtları ve secret değişkenlerinin Sensitive işareti doğrulanamadı. Bu işlemler uygulanmış sayılmıyor.
2. Supabase Advisor, yerleşik Leaked Password Protection için WARN verdi. [Resmî belge](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) bu özelliği Pro plan ve üstüne bağlıyor. Uygulamanın sunucusunda HIBP hash-önek kontrolü mevcut; bu kontrol sağlayıcının doğrudan Auth API korumasının eşdeğeri değildir. Plan satın alınmadı veya sağlayıcı ayarının etkin olduğu iddia edilmedi.
3. Veritabanı otomatik yedekleri, PITR, saklama süresi ve geri yükleme tatbikatı doğrulanamadı. Git geçmişi veritabanı yedeği değildir. Ortam değişkenleri ve çocuk verileri Git'e veya kamuya açık dosyalara kopyalanmadı.
4. [Vercel Nisan 2026 bülteni](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident) gerçek bir platform olayını anlatıyor. Bu, ZekaPark hesabının etkilendiğine kanıt değildir. Hesaba özel bildirim/faaliyet incelemesi olmadan anahtarların döndürüldüğü veya olaydan etkilenilmediği söylenemez.

Bu maddeler için platform hesabından doğrulama gerekir. Ücretli özellik etkinleştirme, credential rotasyonu ve yedek geri yükleme yapılmadı.
