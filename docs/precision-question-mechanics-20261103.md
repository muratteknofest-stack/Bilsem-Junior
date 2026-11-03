# Sekiz soru türünde mantık ve çizim yenilemesi

Yeni üretici: `precision-lab-1`. İstemci biçimi aynı adla sürümlenir; 1.0.42 ve önceki APK'lara yeni çizim gönderilmez. Mevcut motor sürümlerinin yeniden üretimi ve atanmış oturumlar korunur.

| Tür | Yeni mekanik | Ayrı aday kanıtı |
|---|---|---|
| Labirent | Bağlı ve çevrimsiz gerçek koridor ağı, başlangıç/bayrak, dört ok dizisi | Her adımda komşuluk/duvar/sınır/tekrar ve son konum kontrolü |
| Görsel örüntü | Tek veya iç içe iki sıra; yön, renk, 1–4 nokta döngüsü | Aday yerleştirildikten sonra her sırada modüler ikinci farkın sıfır olması |
| Küp | Toplam, istenen katman, blok tamamlama; üst sınıflarda açık üst/yan yüz sayısı | Birim küp doluluğu ve beş komşuluk yönünün bağımsız sayımı |
| Sembol şifreleme | Değişen birebir sembol/rakam anahtarı, tekrarlar, yönlü okuma, baştaki sıfır | Her verilen sembolün ilgili aday konumundaki rakamla eşleşmesi |
| Görsel dikkat | Hedefle tek özelliği değişen yakın çeldiriciler | Şekil/yön/renk/nokta alanlarının tamamını tek tek karşılaştırma |
| Farklı olanı bul | Üç çiftte aynı dönüşüm; bir çiftte bozuk yön/nokta/renk ilişkisi | İstenen kart çıkarıldığında kalan üç ilişkinin aynı, çıkarılanın farklı olması |
| Simetri | Dikey/yatay; üst sınıflarda iki köşegen; renk ve verilen hücreler korunur | Tamamlanan her yansıma çiftinin eşitliği ve verilen hücrelerden fazladan içerik üretmeme |
| Tangram | Gerçek yedi parçalı karenin altı parçası birlikte yerleştirilir; yalnız bir parça eksik | Tam karede her birim alt üçgeninin tam bir kez kaplanması |

Tangramda her parçayı bağımsız döndürme yapılmaz. Tüm yerleşime tek ortak dönüşüm uygulanır. Birincil yöntem dışbükey çokgen kesişim alanlarını, bağımsız yöntem tam bir üçgensel kaplama bölümlemesini kullanır. Seçenekler aynı ölçek ve yöndedir; yalnız öteleme serbesttir. Görünmeyen eksik parça/cevap koordinatı öğrenci verisinde saklanmaz.

Renk sırası şekillerin yanında numaralı bir halka olarak görünür. Noktaların 1–2–3–4–1 döngüsü yönergede belirtilir; çözücüde varsayılan gizli bir renk veya sayı sırası bırakılmaz. Çizimler özgün SVG geometriyle ölçeklenir; ışık ve kenar vurguları küplerin ölçüsünü veya tangram sınırlarını değiştirmez. Telefon şıkları 44 px dokunma sınırını korur.

Yeni uyumlu Türkçe çalışma isteklerinde sınırlı bir taze aday havuzu oluşturulur. Her aday aynı teknik teslim denetimini geçer. Konulu pratikte yeterli yeni aday varsa bunlar tercih edilir; karışık çalışmada alan ve çeşitlilik kuralları sürer. Veritabanındaki yayımlanmış sorular topluca değiştirilmez; cevap/XP hâlâ sunucu oturum anlık görüntüsünden hesaplanır. İngilizce havuz değiştirilmez.

Yerel ilk doğrulama: 2.400 deterministik sınıf/zorluk örneği, elle hesaplanan rota/ters şifre/küp yüzleri, bozma ve örtüşme testleri; 735 genel test ve 37 HTTP güvenlik kontrolü geçti. Taze karışık havuzun 96 adayı bir yerel ölçümde yaklaşık 295 ms sürdü; bu bir hizmet süresi garantisi değildir. Tarayıcı ve APK sonuçları teslim kaydında ayrıca belirtilir.

Bu otomatik kabul, insan eğitmen incelemesi veya psikometrik zorluk kalibrasyonu değildir. Fiziksel cihaz ve Google Play üretim kabulü ayrıca yapılmalıdır.
