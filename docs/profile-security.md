# Profil güncelleme güvenliği — Aşama 2, grup 4

Bu grupta sunucu uç noktaları ve web/Android istemcisi güncellenir. Canlı
veritabanına DDL, yetki/RLS değişikliği veya kullanıcı verisi mutasyonu
uygulanmaz. Aşama 1'deki doğrudan Data API güncelleme bulgusu, Aşama 3'te
veritabanı kısıtları uygulanıp doğrulanana kadar tamamen kapanmış sayılmaz.

## Sunucu sınırı

`PATCH /api/account/profile` yalnızca doğrulanmış ve iptal edilmemiş oturumu,
doğrulanmış e-postası ve mevcut uygulama profili olan kullanıcılara açıktır.
Yönetici için mevcut `app_metadata` ve MFA doğrulaması da gerekir. Sahip kimliği
gövde, sorgu filtresi veya istemci profilinden değil, doğrulanmış oturumdan alınır.

| Alan | Sunucu doğrulaması |
| --- | --- |
| `name` | Kırpılmış 2–50 karakter; kontrol karakteri yok |
| `avatar` | 1–32 karakter; kontrol karakteri yok; metin olarak gösterilir |
| `dailyGoalMinutes` | Tam sayı, 5–180 |
| `dailyGoalQuestions` | Tam sayı, 5–200 |
| `dailyGoalSessions` | Tam sayı, 1–10 |
| `soundEnabled` | Boolean |
| `featuredBadgeIds` | En çok 3 farklı, uzunluğu/biçimi sınırlı rozet kimliği |
| `reminderConfig` | Katı iç şema: saat, sıklık, boolean ayarlar, en çok 120 karakter mesaj ve sınırlı bildirim zamanları |

Boş güncellemeler ve bilinmeyen alanlar reddedilir. `id`, rol, e-posta, aile
bağlantıları, onaylar, XP, seri, çözüm sayaçları ve zaman damgaları bu API ile
değiştirilemez. Rozet görünümünü seçmek XP kazandırmaz veya ödülün kazanıldığını
kanıtlamaz; ödül kazanımı ayrı sunucu işlemlerinde kalır.

Sınıf yalnızca mevcut `/api/learning/grade` ve `change_student_grade` işlemiyle
değişir. Bu işlem sınıfı doğrular, XP'yi korur ve önceki sınıfın devam eden soru
oturumlarını geçersiz kılar. Genel profil güncellemesi `grade` alanını reddeder.

Veritabanına yalnızca izin verilen değişen sütunlar ve sunucunun `updated_at`
değeri yazılır. `id` oturum sahibine eşit olmalı ve `deletion_pending` false
olmalıdır. Eşleşen satır yoksa başarı dönülmez. Yanıt yalnızca normalleştirilmiş
değişiklikler ve sunucu zamanı içerir; tam profil, aile veya dahili durum satırı
döndürülmez. Hatalarda sağlayıcının ham SQL/yanıt metni istemciye aktarılmaz.

`POST /api/account/profile/activity` boş JSON ister ve `last_login_at` değerini
sunucuda üretir. Bu alan gözlenen oturum etkinliği içindir; güvenlik denetim
günlüğü veya kimlik doğrulama kanıtı değildir.

Uç noktalarda Auth sorgularından önce IP başına dakikada 60 istek, doğrulama
sonrasında kullanıcı başına 10 dakikada 120 istek sınırı vardır. İkinci sınır
Vercel örnekleri arasında paylaşılan mevcut veritabanı limit mekanizmasını
kullanır; limit doğrulanamazsa yazma yapılmaz.

## İstemci geçişi

`supabase-data` profil `setDoc`/`updateDoc` yollarını artık doğrudan Data API
UPDATE yerine yetkili uygulama API'sine gönderir. Profil dışındaki belge
akışları değişmez. AuthContext giriş etkinliği ve profil düzenlemesi de bu yolu
kullanır. Demo/başka hesap profili, oturumdaki hesabın ayarlarını arka planda
sunucuya yazamaz. Yanıt beklerken hesap değişirse eski isteğin sonucu yeni
hesabın yerel durumuna uygulanmaz. Yanıt şeması da fazladan/korunan alanları
reddeder. Android aynı API'ye Capacitor aktarımıyla JSON ve Bearer token gönderir.

Bu kod yalnızca kendisinden oluşturulan yeni web/Android sürümlerinde geçerlidir.
Önceden dağıtılmış APK'lar ve doğrudan Supabase istemcileri eski Data API yolunu
kullanabilir. Aşama 3 veritabanı koruması, mevcut Android sürümlerinin geçerli
tercih güncellemeleri de değerlendirilerek tasarlanmalı ve test edilmelidir.

## Aşama 3'te kalan veritabanı işi

2026-10-25 salt okunur `pg_constraint` incelemesinde `profiles` tablosunda yalnızca
PK, Auth FK, rol CHECK ve öğrenci kodu UNIQUE bulundu. Profil boyutları, günlük
hedefler, hatırlatma içeriği ve doğrudan sınıf değiştirmeye karşı kısıtlar henüz
uygulanmış değildir. RLS'nin satır sahipliğini doğrulaması tek başına sütun
değerlerini doğrulamaz.

Aşama 3, doğrudan Data API istemcilerinin de bu kontrolleri atlayamamasını;
kimlik/ilerleme alanlarının korunmasını; sınıf değişikliğinin özel işleme
bağlanmasını ve eski istemci zaman damgalarının sunucu tarafından yönetilmesini
ele almalıdır. Bu dosya bir SQL yaması içermez ve mevcut yetkileri kaldırmaz.

Referans: [Supabase sütun yetkileri ve RLS ayrımı](https://supabase.com/docs/guides/database/postgres/column-level-security).

## Bu gruptaki doğrulama

557 test, TypeScript kontrolü ve 37 üretim HTTP kontrolü geçti. Yapılandırılmış
web ve Android web derlemeleri tamamlandı; yeni profil API'sinin ve beklenen
açık bağlantı ayarlarının her iki çıktıda bulunduğu ayrıca doğrulandı. Webde
158, Android web çıktısında 105 metin dosyası gizli anahtar/source-map taramasını
geçti. Testler gerçek PostgreSQL motorunda mevcut sınıf değiştirme işleminin XP
korumasını ve eski soru oturumlarını sonlandırmasını da kapsar. Canlıda kullanıcı
hesabı değiştirilmedi; yeni APK/AAB oluşturulmadı veya dağıtım yapılmadı.
