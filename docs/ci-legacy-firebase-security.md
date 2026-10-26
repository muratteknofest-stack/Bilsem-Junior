# CI ve eski Firebase güvenliği — Aşama 2, grup 6

Bu grup kaynak kodu ve yerel kuralları hazırlar. GitHub'a gönderim, gerçek
workflow tetiklemesi, Firebase/Supabase dağıtımı, veri silme veya IAM değişikliği
yapılmaz. Eski Firebase'in canlı erişimi bu dosyalardan hareketle kapandı
sayılamaz.

## GitHub Actions

Beş workflow içindeki 26 action kullanımı, resmî `actions/*` depolarından
doğrulanan tam commit SHA'larına sabitlenmiştir. Envanter
`config/github-actions.json` içindedir; yorumlarda okunabilir sürüm vardır.

| Action | Doğrulanan sürüm | Kullanım |
| --- | --- | --- |
| `actions/checkout` | v7.0.1 | 10 |
| `actions/setup-node` | v7.1.0 | 8 |
| `actions/upload-artifact` | v7.0.2 | 8 |

Seçilen üç action da kendi metadata dosyasında `node24` kullanır. Bu action
çalışma ortamı, uygulama testlerinin `node-version: 22`/`24` seçimiyle aynı
şey değildir; mevcut uygulama sürüm seçimleri korunmuştur. Yeni sürümlerin
kullanılan input'ları resmî metadata ile karşılaştırılmıştır. Bu depoda npm
registry kimliği tanımlayan `registry-url`/`NODE_AUTH_TOKEN` akışı yoktur;
setup-node v7 geçişinin registry token davranışına bağlı bir işlem yoktur.

Mevcut `contents: read`, checkout `persist-credentials: false`, job süreleri,
branch tetikleyicileri, yedek işinin main koşulu ve `production-backup` ortamı
korunur. Artifact adları/yolları değişmez; gizli dosyaların eklenmemesi açıkça
istenir. Node kurulumu örtük package-manager önbelleği oluşturmaz; açıkça
istenmiş `cache: npm` davranışı sürer. Workflow içindeki `npx` çağrıları
`--no-install` kullanır; araçlar kilit dosyasından `npm ci` ile kurulmuş olmalıdır.

`npm run security:ci` gerçek YAML ayrıştırması yapar ve şunları reddeder:

- Değişebilir action etiketi/branch'i veya envanterde incelenmemiş SHA.
- Yazma yetkisi artışı, kimlik bilgisini kalıcı tutan checkout, gizli artifact
  dosyaları ve örtük package-manager önbelleği.
- İncelenmemiş ayrıcalıklı PR olayları, doğrudan güvensiz shell bağlamı
  yerleştirmesi ve kilit dosyasını atlayan kurulum.
- Main koşulu ve tanımlı ortamı olmayan secret kullanan işler.
- Eski Firebase yapılandırma dosyalarının veya runtime bağımlılıklarının depoya geri eklenmesi.

Kontrol quality işine eklenmiştir. YAML ayrıştırıcısı `yaml@2.9.1`, yalnızca
geliştirme bağımlılığıdır; sürümü ve bütünlük özeti kilit dosyasındadır.
Denetim mesajları workflow gövdesi veya secret ifadesi yazdırmaz.

Bu kaynak kontrolü repository yöneticisi ayarlarının yerine geçmez.
Branch protection/ruleset, zorunlu kontrol ve korunan ortamın gerçekten onay
istemesi Aşama 4'te doğrulanmalıdır. Workflow ve güvenlik envanterini değiştiren
PR'lar da incelenmelidir. Yeni Node 24 action sürümleri için gerçek GitHub-hosted
koşusu kod gönderilene kadar doğrulanmış değildir.

## Firebase'in emekli erişim yüzeyi

Uygulamanın aktif runtime bağımlılıklarında ve `src`/`server` kodunda Firebase
kullanımı bulunmadı; çalışma altyapısı Supabase ve Vercel/Docker'dır. Kök dizindeki
eski yapılandırma ve geliştirme kalıntıları (`.firebaserc`, `firebase.json`,
`firebase.emulator.json`, `firebase-blueprint.json`, `firebase-applet-config.json`,
`firestore.rules`, `firestore.indexes.json`, `.openai/hosting.json`,
`BILSEM_Gemini_Soru_Motoru_Guncelleme_Promptu.txt`) depodan tamamen kaldırılmıştır.
`scripts/check-workflow-security.mjs` bu dosyaların depoda bulunmadığını ve
`package.json` içinde Firebase bağımlılığı yer almadığını doğrular.

Bu değişiklikler eski dağıtımları, projeyi veya Cloud Run servisini silmez.
Aşama 4'te gerçek eski kaynakların envanteri ve gerekli emeklilik işlemleri
ayrı doğrulanmalıdır.

## Resmî kaynaklar

- [GitHub güvenli action kullanımı ve tam SHA sabitleme](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions Node 20 kaldırılması](https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions/)
- [checkout sürümleri](https://github.com/actions/checkout/releases)
- [setup-node sürümleri](https://github.com/actions/setup-node/releases)
- [upload-artifact sürümleri](https://github.com/actions/upload-artifact/releases)
- [Firebase temel kapalı kurallar](https://firebase.google.com/docs/rules/basics)
- [Firebase çoklu veritabanı kural hedefleri](https://firebase.google.com/docs/rules/manage-deploy)
