# Bilsem Junior Supabase eşleştirmesi — 21 Ekim 2026

Aktif hedef `vtcsoqohkiagbwatlabk`, yayın adresi `https://bilsemjunior.vercel.app`.
Önceki `vehhvsdkifwstbjhnhao` projesi bu hesapla erişilebilir değildir; bu projeden kayıt aktarımı doğrulanmış değildir.

## Korunan kayıtlar

Tablo istatistikleri yerine gerçek SQL sayımları kullanıldı. Mevcut 9 Auth hesabı, şifre özetleri, e-posta doğrulamaları ve oturum sahipliği değiştirilmedi. Dokuz profil yeni uygulama sözleşmesine aktarıldı; toplam 5.380 XP ve mevcut seriler korundu. Sınıf bilgisi bulunmayan eski profiller 1. sınıftan başlar ve profilinden değiştirilebilir.

Eski şema `bilsem_legacy` özel arşivine taşındı: 9 profil, 4 alan, 56 konu, 284 sınav, 207 soru, 130 sınav sonucu ve 9 satın alma kaydı. Bu kayıtlar yeni soru/abonelik biçimiyle eşdeğer kabul edilmez; geçmiş sonuçlar yeni puan kanıtı veya Google Play aboneliği sayılmaz. Arşiv istemci rollerine kapalıdır. Önceki tablo içerikleri satır sayısı ve içerik parmak izleriyle geçiş içinde doğrulanır.

Eski düzenlenebilir `is_admin` alanından yönetici yetkisi üretilmez. Yönetici yetkisi sağlayıcının koruduğu `app_metadata.role` ve uygulamanın MFA kontrolleriyle verilir. Geçerli eski kullanıcılar öğrenci olarak e-postalarıyla giriş yapabilir; yönetici daveti ayrı, doğrulanmış hesap seçimi gerektirir.

## Şema ve yapılandırma

- CLI kaynak dosyası `20261021060602_align_bilsem_account_project.sql`; sağlayıcı migration kaydı `20261021062001 align_bilsem_account_project`.
- Arşiv işlevlerinin search_path sabitlemesi: kaynak `20261021062258_harden_bilsem_legacy_archive.sql`, sağlayıcı kaydı `20261021062443 harden_bilsem_legacy_archive`.
- Geçiş, `scripts/build-bilsem-alignment.mjs` içindeki 18 uygulama SQL kaynağından oluşturulur; yalnız beklenen eski şemayı kabul eder. Tekrar uygulama reddedilir. Boş veya modern projede topluca çalıştırılmaz.
- Supabase'in yönetilen `auth.users` tablosundaki tetikleyici korunur. Önceki profil ekleme işlevi özel arşivde etkisizleştirilir; özgün kaynak `function_manifest` içinde saklanır. Yeni aile profillerini uygulamanın doğrulanan API'si oluşturur.
- Auth Site URL yayın adresidir; `/reset-password` ve `/login` dönüşleri eklenmiştir. Önceki SMTP bilgileri korunmuştur. Yeni e-posta hesapları doğrulama gerektirir.
- Vercel tarayıcı URL/public key, sunucu URL ve sunucu anahtarı aynı projeyle eşleştirilir. Sunucu anahtarı yalnız Production Secret olarak tutulur. Genel önizlemelere verilmez.
- Android iş akışı, CSP, Auth/REST proxy hedefleri ve işletim kontrolleri aynı proje kimliğini kullanır. Eski yüklenmiş APK kendi eski bağlantısını içeriyorsa yeni Android derlemesi gerekir.

## Doğrulama

Geçiş gerçek PostgreSQL motoruyla test edilir: kimlik ve şifre korunması, XP/seri/seviye aktarımı, tarihsel kayıtların ve FK ilişkilerinin korunması, arşiv erişim reddi, sahte yönetici metadata'sının reddi, puan/RLS/oturum iptali ve tekrar uygulamanın reddi. Aynı öğrenme/RLS işlem testleri Supabase'de rollback ile çalıştırılmıştır; test hesapları kalmaz.

18 yeni public tabloda RLS etkin; korumasız uygulama tablosu yoktur. Gerçek public sağlayıcı kontrolü Auth erişimini, boş parola isteğinin doğrulama reddini, anonim profil izolasyonunu ve geçersiz oturum reddini sınar. E-posta teslimi ayrı bir kabul kontrolüdür; şifre alanının dolu olması teslimat kanıtı sayılmaz.

Yeni yayımlanmış soru bankası bu projeye aktarılmış sayılmaz. Karışık çalışma, mevcut doğrulanan üretim motorunu kullanır; editör kitaplığının ve belirli konu havuzlarının ayrıca inceleme/yayın akışıyla doldurulması gerekir. Bireysel insan incelemesi yapılmış gibi işaretlenmez.
