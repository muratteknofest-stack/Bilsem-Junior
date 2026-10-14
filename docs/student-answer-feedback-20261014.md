# Öğrenci testi: cevap geri bildirimi ve ses — 14 Ekim 2026

Doğru cevapta yıldızlı yeşil kutlama, kısa melodi, sunucunun verdiği XP ve ardışık doğru sayısı görünür. Yanlış cevapta destekleyici bir öğrenme mesajı, sıcak renkler ve yumuşak ses kullanılır. Cevap onaylandıktan sonra yaklaşık 620 ms geri bildirim gösterilir ve mevcut otomatik ilerleme devam eder. Hareket azaltma tercihinde animasyon/parçacıklar kapanır ve bekleme 260 ms olur.

Geri bildirim cevap API'sinin başarılı yanıtından üretilir. İstemci cevabı kendisi puanlamaz. Aynı yanıtın tekrarı veya geçmiş soruyu inceleme yeni kutlama/XP oluşturmaz. Cevap kayıt hatasında ses veya kutlama olmaz; kaydedilmiş yanıt, test bitirme isteği hata verse de korunur. İşlem kilidi geri bildirim boyunca ikinci cevap gönderimini engeller.

Deneme sırasında yalnızca Cevabın kaydedildi mesajı ve kısa geçiş sesi vardır; doğru/yanlış veya XP bilgisi sınavın sonunda açılır. Beklenmeyen bir deneme yanıtı doğru/yanlış alanı içerse bile geri bildirim bunu kullanmaz. Sonuç ekranına girişte tamamlanma animasyonu ve kısa ses çalınır; sürekli adaptif çalışmada her tek-soruluk sonuç ayrıca bitiş melodisi üretmez.

Soru girişleri kısa hareketle açılır. Test arka planı, ilerleme ve şık vurguları renklendirildi. Efektler düzenin dışında katman olarak çizilir; soru/şık alanının yüksekliğini değiştirmez. Soru diyagramı ve cevap anahtarları değiştirilmedi.

## Ses kontrolü

Sorular ve çalışma araçları menüsünden Ses: Açık/Kapalı değiştirilebilir. Tercih yerel tarayıcıda saklanır ve üst menüyle eşzamanlıdır. Ses bağlamı cevap/başlatma dokunuşunda, API beklenmeden etkinleştirilir. Kapatma ana ses çıkışını sıfırlar; eski melodiler askıya alınıp daha sonra yeniden başlamaz. Ses kaynağı Web Audio ile cihazda üretilir; dış ses dosyası veya sürekli müzik indirilmez. Kullanılamayan/sesi engellenmiş bir bağlam soru kaydını durdurmaz.

## Doğrulama

- 304 testlik tam yerel kontrol, TypeScript ve üretim derlemesi başarılı. Son ses çıkışı düzenlemesinin dört odaklı regresyon testi ve derlemesi tekrar geçti.
- Sunucu onayı, doğru/yanlış, tekrar, yanlışta seri sıfırlama, deneme gizliliği, beklenen geri bildirim sırasında ilerleme kilidi, sessiz mod ve kullanılamayan ses bağlamı doğrulandı.
- Gerçek App Türkçe tarayıcı senaryosu cevap kayıt kesintisi, sessiz başarısızlık, başarılı tekrar, doğru/yanlış animasyonu, geçmişte yeniden kutlamama, test içi ses kapatma, yeniden yüklemede sessiz tercih, hareket azaltma ve denemede tarafsız geri bildirimi geçti.
- 44 soru türü ve telefon/tablet/dikey/yatay ekranlarda 771 yerleşim kontrolü: sıfır taşma, eksik şık veya kesilen SVG. Doğru/yanlış mobil ekran görüntüleri incelendi.
- Tarayıcı ses testi Web Audio çağrılarını izole bir ses bağlamıyla gözler; fiziksel telefon hoparlörü testi değildir. API cevapları da örnek hesaplardır. Gerçek öğrenci/eğitmen kaydı, soru bankası veya puan verisi bu geliştirmede değiştirilmedi.
