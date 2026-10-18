> Ödeme bölümleri tarihsel kayıttır. Güncel sistem yalnızca Google Play kullanır; [güncel kurulum](GOOGLE_PLAY_BILLING.md).

# ThinkHarbor İngilizce uygulama sürümü

ThinkHarbor, ZekaPark'ın mevcut hesap altyapısını kullanan İngilizce web uygulamasıdır. Türkçe sürüm aynı adres kökünde, İngilizce uygulama `/en/` yolundadır. Ayrı marka/domain tescili yapılmış değildir. MindSprout adı mevcut eğitim ürünlerinde kullanıldığı için tercih edilmedi. ThinkHarbor için yapılan genel internet kontrolü hukuki marka uygunluğu incelemesi yerine geçmez.

## Çalışan kapsam

- Veli e-postası, öğrenci takma adı ve ayrı şifrelerle aile kaydı; gerçek sunucu kayıt doğrulamaları, parola sızıntısı kontrolü ve ebeveyn e-posta doğrulaması korunur.
- Veli ve öğrenci girişi; eski ZekaPark hesapları da aynı kimlik ve ilerlemeyi kullanır.
- Öğrenci için sunucuda doğrulanan beş soruluk pratik ve 15/30/45 soruluk süreli çalışma.
- İngilizce yönergeleri ve açıklamaları bulunan ayrı 4.000 soru: her seviye 1.000. Ayna, eksik şekil, görsel hafıza, gölge ve katman ilişkileri. İngilizce banka sunucu modülünde deterministik ve sürümlüdür; tarayıcıya banka/cevap anahtarı verilmez.
- Orijinal Türkçe 4.000 soru bankası değiştirilmez. Yeni İngilizce havuzun özel sunucu soruları öğrenme oturumlarına kopyalanır. İngilizce sunucu havuzu mevcut kalite ve bağımsız çözücü kapılarından geçer, ayrıca İngilizce şablon tek cevap kanıtıyla kontrol edilir.
- Aynı soru gövdesi ve görsel için tekrarlar reddedilir; sayı sadece farklı tohum veya cevap sırası üzerinden artırılmaz. Kısıtlı gölge çeşitleri seviyede sekizle sınırlanır ve kalan yük diğer kurallara dağıtılır.
- Yanıt ve sonuçların sunucuya kaydı, idempotent XP, oturuma devam etme, bitmiş soruların açıklamalı incelemesi. Sınav sürerken doğru cevaplar ve çözümler gizlidir.
- Son 50 oturumun aile/öğrenci geçmişi. Veli erişiminde karşılıklı öğrenci-veli bağlantısı sunucuda doğrulanır; soru içeriği geçmiş uç noktasından dönmez.
- Güvenli veli→öğrenci geçişi, veli parolasıyla geri dönüş, öğrenci şifresi sıfırlama ve oturum iptali.
- İngilizce parola kurtarma görünümü; mevcut güvenli kurtarma token doğrulaması ve parola değiştirme servisi kullanılır. Kurtarma sayfasında dil seçimi vardır. E-posta sağlayıcısının şablonu ve bağlantı altyapısı mevcut ortak hesaptır.
- Ayrı 300 soruluk misafir denemesi, yerel özetler, yardım ve veri açıklamaları. Misafir puanları hesap XP'sine dönüşmez.

## Doğrulama ve sınırlar

4.000 İngilizce sorunun otomatik tek cevap, farklı gövde, sınıf uyumu, İngilizce metin ve güvenli DTO kontrolleri testlerde çalışır. Bu otomatik doğrulama eğitimci incelemesi yapılmış olduğu iddiası değildir. Yeni banka, soğuk başlangıçta yaklaşık 3,5 saniyede oluşturulup sunucu örneğinde önbelleğe alınır; ilk çalışma buna göre daha yavaş açılabilir.

Hesap tarayıcı senaryosu test kimlikleri ve taklit HTTP servisleriyle çalışır; gerçek sunucu öğrenme modeli bu testte yanıtları puanlar. Gerçek aile hesaplarının parolaları kullanılmaz. Veritabanı yetkileri ve öğrenme RPC testleri mevcut kalite süitinde korunur. Yeni geçmiş uç noktaları sadece yetkili öğrenciye veya doğrulanmış bağlı velisine açıktır.

Bu sürüm ücretsizdir. Shopier/kripto satışları açılmaz. Tam işletmeci kimliği, açık adres, ülkeye özgü ticari/veri gereklilikleri ve marka tescili tamamlanmış sayılmaz. Kullanıcıya IQ skoru, resmî sınav ortaklığı veya başarı garantisi sunulmaz. Mobil mağaza paketi değil, mobil uyumlu web uygulamasıdır.
