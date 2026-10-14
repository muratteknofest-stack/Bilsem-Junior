# 8.000 soruluk bankanın yönetimi — 14 Ekim 2026

İnceleme ekranı bütün kütüphaneyi render sırasında eşzamanlı denetliyor, seçilen sorunun her düzenlemesinde bütün görselleri tekrar karşılaştırıyordu. Yönetici oturumu ayrıca 12.000 arşiv sorusunu otomatik indiriyordu. Stüdyo, bulut yüklenmeden yerel başlangıç/önbellek adetlerini yayımlanan toplam gibi gösterebiliyordu. Atölye ve bazı önizlemeler eski sınıf üretim kurallarında kalmıştı.

## Yeni davranış

- Denetim 20 kayıtlık gruplarla arka planda yürür; ilk gruptan önce ve gruplar arasında tarayıcıya kontrol verilir. Ekran denetlenen/toplam sayısını gösterir. Henüz denetlenmeyen kayıtlar onaylanmış sayılmaz.
- Kütüphane değişince eski denetim iptal edilir. Geç tamamlanan bir yükleme daha yeni kütüphaneyi değiştiremez.
- Görsel tekrar indeksi kütüphane başına bir kez kurulur. Tek soru denetimi ilgili tekrar adaylarını kullanır; aynı doğrulama fonksiyonu ve sunucu yayın kapısı korunur.
- Genel yönetici önbelleği ve varsayılan atölye kütüphanesi arşivleri indirmez. Arşivlenmiş soruları da yükle seçeneği eski kayıtlara erişimi korur. Eğitmen Onayı yalnızca yayındaki soruları yüklemeye devam eder.
- Canlı adetler yalnızca bulut okuması başarıyla tamamlandığında gösterilir. İlk yükleme ve hata ayrı durumlardır; hata sonrasında yeniden deneme vardır.
- Atölye, sınıf önizlemeleri ve sihirbaz complete üretim profilini kullanır. Sınıf önizlemesinden stüdyoya geçerken gerçek sınıf ve motorun kullandığı tohum korunur. Konu seçenekleri 44 başlığı, zorluk seçenekleri sınıf sınırını kapsar.

## Doğrulama

293 yerel test ve TypeScript geçti. Yeni testler 8.000 kayıtta gruplama/ara verme, iptal edilen denetim, indeksli karşılaştırmanın tam taramayla aynı sonucu vermesi ve yanlış cevap anahtarının reddini kapsar.

Yerel 8.000 kayıt ölçümünde indeks oluşturma 159 ms; bir soru için tam görsel tarama 191 ms, indeksli kontrol 2,6 ms oldu. Bu tek yerel ölçümdür; bütün cihazlar için gecikme garantisi değildir.

Tarayıcı senaryoları soğuk/başarısız önbelleğin gerçek sayı gibi gösterilmemesini, yeniden yüklemeyi, arşivin yalnızca açık istekle indirilmesini ve 1. sınıf 3×3 matris taslağının yeni profil ile üretilmesini kontrol eder. Örnek hesaplar ve izole HTTP cevapları kullanılır; gerçek eğitmen onayı veya kullanıcı hesabı oluşturulmaz.

Bu değişiklik soru gövdelerini, cevap anahtarlarını veya eğitmen onaylarını değiştirmez. Canlı bankanın 8.000 kayıt ve sınıf başına 44 konu kapsamı yayın sonrasında yeniden okunur.
