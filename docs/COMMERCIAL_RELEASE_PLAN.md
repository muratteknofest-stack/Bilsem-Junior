# ZekaPark ticari yayın planı

Tarih: 8 Ekim 2026. Ücretli genel yayın kapalı; test/önizleme aşaması.
İşaretli maddeler kod ve belirtilen yerel/veritabanı test kapsamını ifade eder; gerçek canlı kabulün yerine geçmez.

## Aşama 1 — Veli, veri ve güvenilir kayıt
- [x] Yeni kayıt yalnızca veli üzerinden; ayrı öğrenci takma adı ve şifre.
- [x] Veli e-postası doğrulanıp veli paneli etkinleştirmeyi tamamlamadan yeni öğrenci giriş yapamaz.
- [x] Aydınlatma okundu kaydı, sözleşme kabulü ve velilik beyanı ayrı tutulur.
- [x] Veli panelinde profil/ilerleme/görev verisi indirme, silme talebi ve yönetici incelemesi. Otomatik silme yoktur.
- [x] Hesaba özel bekleyen ilerleme kuyruğu; hata/yeniden deneme ve kalıcı depolama kullanılamıyorsa uyarı.
- [x] Eski isteğin yeni değişikliği silmesi, oturum değişiminde yanlış hesap jetonu kullanımı ve depolama kota hatası ele alındı.
- [ ] Korumalı önizlemede gerçek e-posta, veli/öğrenci giriş ve şifre yenileme kabul testi.

## Aşama 2 — İçerik ve ölçüm
- [x] Alıştırma/adaptif/sınav/günlük görev soru bildirimi; yönetici inceleme kuyruğu.
- [x] Bildirim anındaki soru kopyası ve sunucuda tekrar hesaplanan denetim kaydı. Yayın değişikliği ayrı editör işidir.
- [x] Günlük üç görev: sunucuda üretilen ve yeniden denetlenen soru, gizli cevap anahtarı, ilk yanıta bağlı tekil puan.
- [x] Tekrarlanan başlangıç isteği bitmemiş görevi döndürür; tekrarlanan cevap ilk sonucu döndürür. Kota DB kilidiyle korunur.
- [x] İstemci XP'si görev puanını veya kişiler arası sıralamayı belirlemez. Yanıltıcı sıralama ifadeleri kaldırıldı.
- [x] Haftalık rapor eski haftayı/tarihi bugüne taşımaz; deneme başarı oranı kayıtlı doğru/soru toplamından hesaplanır.
- [ ] Eğitim uzmanı ilk bankayı, sınıf/kazanım dağılımını, yönergeleri ve çeldiricileri inceler.
- [ ] Akran rekabeti: veli tercihi, güvenli takma ad, eşit koşullar ve itiraz süreci tasarlanır; açık sıralama henüz yok.

## Aşama 3 — Ticari işletim
- [ ] İşletmeci unvanı, iletişim, saklama süreleri ve veri işleme/aktarım hukuki sebepleri tamamlanır.
- [ ] Merchant hesabı etkinleştirilir; Türkiye işletmesi için sağlayıcı ve koşullar teyit edilir.
- [ ] Gerçek ödeme bildirimi imzası; yinelenen/sırası değişmiş bildirimler test edilir.
- [ ] Abonelik, iptal, iade, başarısız yenileme ve faturalama akışları tamamlanır.
- [ ] Kullanım hakları ve ücretli kota sunucuda uygulanır. Tarayıcı demo sayacı ücretli erişim kontrolü değildir.
- [ ] Kurumsal alan adı/e-posta, Vercel ticari planı, Supabase yedekleme ve hata alarmı doğrulanır.
- [ ] Paylaşılmış sırlar yenilenir; admin MFA ve Supabase sızmış parola koruması yapılandırılır.

## Aşama 4 — Kabul ve pilot
- [x] TypeScript + tüm testler + istemci/Function derlemesi yerelde doğrulandı.
- [x] Supabase işlem testleri: istemci yetkileri, başka hesaba cevap, tekil puan, günlük kota, bildirim tekilleştirme. Tüm değişiklikler rollback edildi.
- [x] API testi: anonim korumalı erişim, eski çocuk kayıt yolu, bozuk/aşırı JSON, güvenilmeyen Origin.
- [ ] PR için GitHub Actions kalite işinin ilk uzak çalışması doğrulanır.
- [ ] Gerçek yayında veli kaydı → e-posta → giriş → öğrenci etkinleştirme → çözüm → rapor.
- [ ] Süresi dolmuş bağlantı, yanlış rol, başka aile verisine erişim, çoklu sekme/cihaz ve ağ kesilmesi uçtan uca testleri.
- [ ] Ödeme test ortamında satın alma → erişim → yenileme → iptal → iade.
- [ ] Android/iOS ve masaüstü; klavye, odak, dokunma alanı, azaltılmış hareket. Bu tur yerel Chromium SIGSEGV nedeniyle görsel test çalışmadı.
- [ ] Yedekten geri yükleme tatbikatı, hata alarmı ve geri alma prosedürü.
- [ ] 20–30 aile pilotu; kritik sorunlar kapanmadan ücretli genel yayın açılmaz.

## Engeller ve kapsam
Vercel connector ekip kapsamında 403 veriyor; CLI bulunmuyor. Function ortamı ve korumalı gerçek akış doğrulanamıyor.
Merchant hesabı, işletme hukuki bilgileri, alan adı sahipliği ve eğitim uzmanı incelemesi henüz doğrulanmadı.
Bu maddeler kod testlerinin başarısıyla tamamlanmış sayılmaz. Marketplace becerisindeki gerçek sağlayıcı kurulumu
ön koşulu nedeniyle sahte ödeme/checkout üretilmedi. `npm run release:commercial` açık eksikleri bildirip başarısız döner;
bu komut önizleme derlemesine bağlı değildir ve tek başına bir erişim kontrolü oluşturmaz.
