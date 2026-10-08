# ZekaPark işletim ve kabul prosedürü

## Her dağıtım
1. CI testleri ve Function derlemesi başarılı olmalı.
2. Yetkili önizlemede /api/health 200 ve database:ready dönmeli. 503 durumunda Function ayarları kontrol edilir; anahtarlar loga yazılmaz.
3. Veli kaydı → e-posta doğrulama → veli girişi → öğrenci etkinleştirme → öğrenci koduyla giriş tamamlanmalı.
4. Aynı veli başka aile verisini okuyamamalı/indirememeli; öğrenci yönetici bildirim kuyruğunu okuyamamalı.
5. Ağ kesilip bir soru çözülür; bekleyen durum görülür; sayfa yenilenip ağ açılınca ilerleme kaybolmadan senkronize olmalı.
6. Soru bildirimi iki kez gönderildiğinde aynı kayıt dönmeli. Yönetici kaynak soruyu ve denetimi inceleyebilmeli.

## Hesap silme talepleri
Veli paneli talebi kaydeder; silme gerçekleştirmez. Yönetici bildirim kuyruğundan incelemeye alır.
Hesap sahibini doğrula, yalnızca karşılıklı aile bağlantısı bulunan öğrenci kimliklerini belirle.
Hukuki saklama/faturalama yükümlülüklerini işletmenin onaylı politikasıyla kontrol et.
Gerekli verileri silme/anonimleştirme, Auth oturumlarını iptal ve Auth kullanıcılarını kaldırma işlemi ayrı,
yetkili bir operasyon olarak yürütülmeli. İçerik bildirimleri ve yedeklerdeki veri kapsamını da kontrol et.
İşlem gerçekten tamamlanmadan talebi tamamlandı olarak bildirme. Otomatik silme uygulanmış değildir.

## Yedek ve geri yükleme
Sağlayıcı planında yedek sıklığı/saklama süresi doğrulanır. Ayrı test projesine geri yükleme tatbikatı yapılır.
Auth/profil bağları, soru sürümleri, ilerleme ve talepler için satır sayısı ve örnek kayıtlar karşılaştırılır.
Tatbikat zamanı, son kurtarılabilen veri zamanı ve geri yükleme süresi kayıt altına alınır.
Yönetici panelinin JSON dışa aktarması veritabanı ve Auth yedeğinin yerine geçmez.

## Olay yönetimi
API hata yanıtında requestId bulunur; aynı kimlikle Function logları aranır. Yanıta anahtar veya ham SQL hatası konmaz.
Sağlık kontrolü, kayıt hataları, SMTP teslim/ret ve maliyet eşiği için alarm servisi sağlanmalı.
Alarm servisi henüz bağlı değildir. Platform derleme başarısı canlı akış doğrulaması sayılmaz.

## Ticari yayın kapısı
npm run release:commercial bilinçli olarak başarısız olur: gerçek tahsilat ve sunucu kullanım hakları henüz yoktur.
Önizleme ücretsiz pilot olarak kalır. Ticari işletmeci, veri işleme sebepleri, yurt dışı aktarım/saklama düzeni,
iptal/iade ve faturalama mali müşavir/hukuk uzmanıyla tamamlanır. Bu alanlarda örnek bilgiler gerçekmiş gibi doldurulmaz.

## Günlük görev ve doğrulanmış puan
`daily_challenge_attempts` yalnızca sunucu tarafından okunup yazılır. `/api/challenges/*` doğrulanmış öğrenci ister.
Puanlı görev günde 3 adet; doğru yanıta 10, yanlış yanıta 0 puan. Hız bonusu ve tekrar cevapla puan yok.
Cevap anahtarı, açıklama ve seed çözüm öncesi API yanıtında bulunmaz. Görev sonrasında çözüm açıklanır.
Bu, sunucu tarafından puanlama kontrolüdür; dışarıdan yardım veya otomatik çözümün kesin engellendiği iddiası değildir.
Kişisel alıştırma XP'si farklıdır. Gün değişimi Europe/Istanbul; önceki günün bitmemiş görevi cevaplanamaz.
`publicChallenge` hem sunum hem cevap kabulünden önce kayıtlı soruyu yeniden denetler. Eski içerik yeni denetimi geçmezse
puanlama durur; hata gizlenmez. Test/staging ortamında `scripts/verify-commercial-db.sql` rollback ile kotayı,
kimlik ayrımını ve tekrar gönderimleri doğrular. Test için o gün görevi olmayan öğrenci ve bir veli profili gerekir.

## Dağıtım sırası ve geri alma
Önce eklemeli Supabase migrations, sonra uyumlu API+istemci dağıtımı. Bu tur iki sunucu tablosu/RPC seti eklendi;
eski içerik veya kullanıcı kayıtları silinmedi. Uygulama geri alındığında yeni tabloları koruyun, talepleri kaybetmeyin.
Vercel erişimi olan yetkili önceki sağlıklı dağıtıma geri dönebilir; mevcut bağlantıyla işlem yapılmış değildir.
Veritabanı testleri gerçek e-posta göndermedi. Supabase Advisor sızmış parola korumasını WARN olarak bildiriyor;
sunucu tablolarında RLS/politikasızlık INFO bulgusu istemci erişimini kapatan bilinçli yapılandırmadır.
