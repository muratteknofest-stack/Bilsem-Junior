# Adaptif soru sayısı ve karışık yeni testler — 15 Ekim 2026

Öğrenci adaptif çalışmada 1–50 arasında tam sayı seçer; varsayılan 10 sorudur. Girdi tarayıcıda ve API şemasında doğrulanır. Seçilen konu/sınıf/zorluk havuzu daha küçükse yalnızca uygun yayımlanmış sorular kullanılır ve gerçek soru sayısı test başlığında gösterilir. Seçilen sayının son cevabı kaydedildiğinde test biter, sonuç ve çözümler açılır. Sonsuz tek-soruluk oturum zinciri kaldırıldı. Yeni çalışma ile sayı tekrar değiştirilebilir.

Pratik, adaptif ve deneme başlangıçları artık aynı ayardaki yarım oturumu otomatik döndürmez. Ortak sunucu seçicisi her başlangıçta yeni bir oturum oluşturur, soruları rastgele sıralar ve son 30 gündeki en çok 30 oturumda görülmeyen içerikleri önceliklendirir. Yeni sorular hazırlanıp sınıf yeniden doğrulanmadan önceki çalışma bitirilmez. Önceki yanıtlar sunucuda korunur ve yalnızca bir kez puanlanır. Açıkça geçmişten GET/resume ile açılan kayıtların soruları ve cevap indeksleri değişmez. Tek soruluk hata defteri tekrarı özgün yanlış soruyu açmaya devam eder; günlük görev kotası değişmez.

Konu, sınıf, zorluk, soru kalitesi ve cevap gizliliği kontrolleri korunur. Bir havuz tükendiğinde eski sorular yeniden gelebilir; her girişte hiçbir sorunun tekrarlanmaması garanti edilmez. Yeni test başlatmak aynı moddaki eski açık çalışmayı kaydedip tamamlar. Şema değişikliği veya gerçek öğrenci verisiyle deneme yapılmadı.

## Doğrulama

- 305 test, TypeScript kontrolü ve üretim derlemesi geçti.
- Yalıtılmış gerçek Express öğrenme API'si: 44 konu × 4 sınıf kapsamı, küçük havuz sınırı, 1–50 sayı doğrulaması, 50 soruluk ve varsayılan 10 soruluk adaptif oturum; dört sınıfta pratik/adaptif/deneme yeni başlangıçları, görülen sorulardan kaçınma, önceki cevap ve soru sırasının korunması.
- Gerçek React App tarayıcı senaryosu: dört sınıfta soru sayısı alanı, boş/0/51/ondalıklı girişlerin engellenmesi, 3 soruda bitiş ve sonuç, otomatik yeni test açılmaması, yeni çalışmada 2 soru seçimi ve yeni görsel içerik. 320, 390 ve 820 piksel ekranlarda kurulum taşması yok.
- Mevcut doğru/yanlış efekt, ses tercihi, hareket azaltma, kayıt kesintisi ve sınavda cevap gizliliği tarayıcı kontrolleri de geçti. Bu testler örnek Auth/API verisi kullanır; gerçek öğrenci kayıtları değiştirilmez.
