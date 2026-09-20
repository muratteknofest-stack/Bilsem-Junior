# Ticari Yayın Hazırlığı

Bu belge, “çalışıyor” ile “gerçek çocuk verisiyle ticari olarak yayınlanabilir”
arasındaki farkı görünür kılar. Puanlar kod incelemesi ve yerel kalite kapısına
dayanır; dış servislerin gerçekten yapılandırıldığı anlamına gelmez.

## Mevcut durum

| Alan | Kod hazırlığı | Ticari yayın ölçütü |
|---|---:|---|
| Kimlik doğrulama ve rol güvenliği | 8.5/10 | Claim, MFA, parola döndürme ve kural dağıtımı doğrulanmalı |
| Soru üretimi ve kalite kapısı | 8/10 | Her motor için bağımsız çözücü ve uzman içerik kabul testi tamamlanmalı |
| Sınav deneyimi | 8/10 | E2E, cihaz matrisi, erişilebilirlik ve süre/geri yükleme testleri tamamlanmalı |
| Adaptif öğrenme | 7.5/10 | Gerçek veriyle kalibrasyon, yanlılık ve öğrenme kazanımı analizi yapılmalı |
| Yönetim paneli | 8/10 | Rapor iş akışı, sunucu taraflı arama ve operasyon rolleri tamamlanmalı |
| Veli/öğrenci verisi | 6/10 | Deneme ve ilerleme kayıtları sunucu-otoriteli olmalı |
| PWA ve dağıtım | 8/10 | Gerçek cihaz testi, izleme ve geri alma provası gerekli |
| CI ve bağımlılık güvenliği | 8.5/10 | Dal koruması ve zorunlu başarılı kontroller GitHub'da etkinleştirilmeli |
| Gözlemlenebilirlik ve operasyon | 4/10 | Hata izleme, metrik, alarm, yedek ve geri yükleme provası gerekli |
| Hukuk, gizlilik ve ticari süreç | 3/10 | KVKK/çocuk verisi incelemesi, sözleşmeler ve ödeme modeli gerekli |

Kod seviyesi genel hazırlık yaklaşık **7/10** düzeyindedir. Aşağıdaki dış ve
mimari kapılar kapanmadan “10/10” veya “yayına hazır” beyanı yapılmamalıdır.

## Bu sertleştirme fazında tamamlananlar

- Sabit yönetici parolası, e-posta allowlist'i, anonim/yedek yönetici girişi ve
  tarayıcıdan profil yükseltme kaldırıldı.
- Yönetici erişimi istemcide ve API'de Firebase `role=admin` claim'i ile
  doğrulanıyor; Firestore profili ikinci kontrol olarak kullanılıyor.
- Aile kaydı App Check korumalı sunucu işlemine taşındı; kısmi tarayıcı hesabı
  oluşturma yedeği kaldırıldı.
- Yayınlanmamış sorular öğrenci sorgularından ve Firestore okuma kurallarından
  ayrıldı; soru yayınlama iyimser revizyon kontrolü kullanıyor.
- Mantıksal dizi seçenek çakışması giderildi; doğrulama başarısızsa jeneratör
  artık hatalı soru döndürmek yerine kapanarak hata veriyor.
- Kısıtlı sınav modunda soru sırasında ses, konfeti ve görsel doğruluk sızıntısı
  kaldırıldı.
- Adaptif hedef seçimi; zorluk, bilgi açığı, belirsizlik, yakın hata ve aralıklı
  tekrar zamanını birlikte değerlendiriyor.
- Yönetim özetleri ve öğrenci listesi demo verisi yerine korumalı API'den gerçek
  Firestore verisi alıyor.
- Öğrenci dizini 100 kayıtlık güvenli cursor sayfalamasıyla devam yükleyebiliyor.
- Sahte rekabet sırası kaldırıldı; sunucu-otoriteli sıralama kurulana kadar yalnızca
  kişisel ilerleme gösteriliyor.
- Üretim yapılandırması eksik/HTTP CORS/App Check kapalı olduğunda sunucu kapanarak
  güvenli hata veriyor.
- TypeScript hataları kapatıldı; CI, test, üretim derlemesi, npm audit ve OSV
  taraması eklendi.
- PWA kabuğu API ve kimlik yanıtlarını hiçbir zaman önbelleğe almıyor.
- 192×192 ve 512×512 maskable PNG uygulama ikonları üretildi.

## P0 — ticari yayından önce zorunlu

- [ ] Geçmişte istemciye yazılmış yönetici parolasını değiştir ve tüm token'ları
  iptal et; MFA'yı etkinleştir.
- [ ] Doğru yönetici UID'sine Admin SDK üzerinden özel claim ver; yetkisiz hesapla
  yönetim API'sinin 403 döndürdüğünü kanıtla.
- [ ] Güncel `firestore.rules` dosyasını üretime dağıt ve Emulator Suite ile
  öğrenci/veli/yönetici negatif yetki testlerini çalıştır.
- [ ] reCAPTCHA Enterprise App Check anahtarını tanımla, enforcement'ı Auth,
  Firestore ve özel API için doğrula.
- [ ] API'yi Cloud Run'a dağıt; kesin HTTPS CORS origin'leri, Secret Manager ve en
  düşük yetkili servis hesabı kullan.
- [ ] Yayınlanan soru gövdesi ile cevap/çözüm anahtarını ayır. Puanlanan sınavlarda
  değerlendirmeyi güvenilir sunucuda yap.
- [ ] Deneme, XP, seri, ustalık ve sıralama girdilerini değişmez sunucu olaylarından
  üret; istemcinin yazdığı sayaçları rekabet/raporlama için güvenilir sayma.
- [ ] KVKK, çocuk verisi/veli rızası, aydınlatma metni, kullanım koşulları, veri
  saklama-silme ve MEB'den bağımsızlık ifadelerini hukuk uzmanına onaylat.
- [ ] Hata izleme, güvenlik günlüğü, uptime alarmı, bütçe alarmı, günlük yedek ve
  geri yükleme provasını tamamla.

## P1 — genel kullanıma açılmadan önce

- [ ] Kalan tüm soru motorlarına bağımsız çözücü/kanıtlayıcı ekle; her sınıf ve
  zorluk için uzman örneklemesi yap.
- [ ] “Soruyu bildir” uçtan uca akışını, SLA durumlarını ve yönetici çözümleme
  günlüğünü tamamla.
- [ ] Yönetim öğrenci listesine sunucu taraflı arama ve dışa aktarma yetki
  kontrolleri ekle.
- [ ] Playwright ile kayıt, giriş, pratik, sınav, veli ve yönetici kritik yol E2E
  testlerini gerçek emulator üzerinde çalıştır.
- [ ] WCAG 2.2 AA klavye, ekran okuyucu, kontrast, azaltılmış hareket ve çocuk
  kullanılabilirlik testlerini kapat.
- [ ] Maskable ikonları ve çevrimdışı/yenileme senaryolarını iOS ve Android gerçek
  cihazlarda doğrula.
- [ ] Yük, kota, yapay zekâ maliyeti, kuyruk lease/idempotency ve sağlayıcı kesinti
  testlerini gerçekleştir.
- [ ] Abonelik/ödeme, fatura, iptal/iade ve yetki yaşam döngüsünü seçilen ödeme
  sağlayıcısıyla uygula; ödeme verisini uygulama sunucusunda saklama.

## Yayın kararı

Ticari **GO** kararı için bütün P0 maddeleri kanıt bağlantısıyla kapanmalı,
`npm run check`, npm audit ve OSV taraması temiz geçmeli, üretim smoke testi
başarılı olmalı ve geri alma sorumlusu belirlenmelidir. Herhangi bir P0 açıkken
karar **NO-GO**'dur.
