# Öğrenci için 44 konu filtresi — 14 Ekim 2026

Öğrenci panelindeki Konuya göre test çöz alanı, yönetici stüdyosuyla aynı 44 başlıklı konu kataloğunu kullanır. Seçilen konu gerçek App üzerinden pratik hazırlığına aktarılır. Pratik, deneme ve adaptif hazırlık ekranlarında konu ve sınıfa uygun zorluk birlikte seçilebilir. Tüm konular seçeneği önceki karışık çalışma davranışını korur.

Sunucu konuyu izinli katalogdan doğrular. Gerçek öğrencinin kayıtlı sınıfı, seçilen konu ve zorluk yayımlanmış banka sorgusuna uygulanır. Konu seçilince geniş bilişsel kategori o konudan türetilir; adaptif alan seçimi konuyu değiştiremez. Oturum seçimi konu bilgisini içerir, farklı konuya ait yarım test açılamaz. Eski konu bilgisi olmayan karışık oturumlar uyumludur.

Konu testlerinde yalnızca yayımlanmış, bağımsız denetimden geçen, görünür olarak farklı banka soruları kullanılır. Otomatik üretimle veya başka konuyla boşluk doldurulmaz. Küçük sınıf/konu/zorluk havuzlarında test sayısı mevcut uygun soru sayısına daralır; arayüz bu davranışı açıklar. Boş havuzda anlaşılır 422 hatası verilir ve açık oturum bitirilmez. Yakın zamanda görülmüş banka soruları gerekirse aynı konu içinde yeniden seçilebilir.

Öğrenci panelindeki üst menü 820 piksel genişlikte yatay taşıyordu. Masaüstü kontrolleri 1024 pikselden itibaren gösterilir; daha dar tabletlerde mevcut açılır menü kullanılır. Soru konu seçicileri telefon ve tablette genişliğe sığar.

## Kanıt

- 299 testlik tam yerel kontrol, TypeScript ve üretim derlemesi geçti. Eklenen son regresyon ile konu test dosyasının dört senaryosu tekrar geçti; CI toplamı 300 testtir.
- 660 sınıf/konu/zorluk birleşiminde kapsam kontrolü. Dört sınıfta stüdyoyla aynı 44 seçilebilir konu.
- Gerçek Express öğrenme API'si, izole Auth/PostgREST/RPC cevaplarıyla 176 sınıf/konu isteğinde sınandı. SQL filtreleri, yayımlanmış durum, sınıf/konu/zorluk, az soru, taslak dışlama, cevap anahtarı gizliliği ve konu değişiminde oturum ayrılığı doğrulandı.
- Geçersiz konu, uygun olmayan zorluk, değişmiş sınıf, oturumsuz erişim ve boş konu havuzu reddedildi. Pratik/deneme/adaptif konu testi kontrol edildi.
- Gerçek App Türkçe tarayıcı senaryosu dört sınıfta konu aktarımı, konu değiştirme, karışık çalışmaya dönüş ve 320/390/820 piksel ekranlarda taşma kontrolünü geçti. Mobil ekran görüntüleri incelendi. Testler izole örnek veridir; gerçek öğrenci veya eğitmen kaydı değildir.
- Canlı banka salt okunur kontrolünde her sınıfta 2.000 yayımlanmış soru ve 44 konu doğrulandı. Soru gövdeleri, cevap anahtarları ve bireysel eğitmen kayıtları değiştirilmedi.
