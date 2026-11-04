# Gerçek fotoğraflarla sorular

`photo-lab-1`, kamera ile çekilmiş altı fotoğrafı dört mekanikte kullanır:

| Mekanik | Öğrenci konusu | Kanıt |
| --- | --- | --- |
| Fotoğraf örüntüsü | Görsel örüntü | En az iki tam tekrar ve benzersiz tekrar birimi |
| Değişen kart | Detay bulma | Aynı numaralı iki panoda yalnızca bir farklı fotoğraf |
| Hedef fotoğrafı sayma | Görsel dikkat | Her kart tek bir fotoğraf; yalnızca hedef fotoğrafın bulunduğu kartlar sayılır |
| Fotoğraf hafızası | Görsel hafıza | İnceleme sırasında şıklar ve sorulacak konum gizlidir; hatırlama sırasında çalışma kartları gizlenir |

İlk havuzda kedi, köpek, penguen, kuş, muz ve limon bulunur. Fotoğraflar Wikimedia Commons üzerindeki CC0/kamu malı kaynaklardan alınır. Orijinallerin SHA-1 değerleri indirme sırasında denetlendi; en fazla 768 piksele küçültülen WebP dosyalarının SHA-256 değerleri, yazarları, kaynakları ve lisansları `public/question-photos/v1/credits.json` içinde tutulur. Görsellerde içerik üretimi veya rötuş yapılmadı. Sorulardaki kaynak bağlantısı bu kayda açılır.

Görseller yerel varlıklardır; soru verisi keyfî URL veya dosya yolu kabul etmez. Görseldeki hayvanın gerçek boyu, muzların sayısı veya fotoğraftan çıkarılamayacak fiziksel özellikler cevap anahtarı yapılmaz. Sayma soruları özellikle **kart sayısını** sorar.

1–4. sınıfta her sınıfın izin verilen zorlukları desteklenir. Kart sayısı, sembol sayısı ve ızgara yoğunluğu sınıfa göre sınırlandırılır. Dört görünür şık, kanonik şablon, bağımsız kart/sıra taraması ve tek doğru cevap kontrolü yayın kapılarıyla bütünleştirilmiştir. Fotoğraf etiketleri değiştirilerek soru yeniliği veya fiziksel muhakeme çeşitliliği iddia edilmez.

Güncel web istemcisi uygun konularda fotoğraflı çalışma başlatır; karışık çalışmalarda fotoğraflı ve diğer doğrulanmış mekanikler birlikte kullanılabilir. Toplu Soru Motoru’nda **Gerçek fotoğraflarla soru üret** seçeneği vardır. Oluşturulan yönetici taslakları mevcut inceleme sürecinden geçer.

İstemci `questionFormat=photo-lab-1` bildirir. Eski APK’lar desteklemedikleri panoları almaz; önceki oturum ve cevaplar korunur. 1.0.45 test APK’sı bu yeni fotoğraf motorunu içermez; yeni bir APK derlemesi gerekir. Soru başlatmak yayımlanmış soru bankasını değiştirmez.

Doğrulama: `tests/photo-lab.test.tsx` kaynak dosyalarını ve izin bilgilerini, 720 sınıf/zorluk/tohum örneğini, tek doğru cevabı, sahte URL/bozuk veri reddini, görsel sunumu ve istemci uyumluluğunu denetler. `tests/student-topic-filter.test.tsx` dört sınıf ve dört mekanikte soru başlatma, cevabı kaydetme ve eski istemciyi koruma akışlarını kapsar.
