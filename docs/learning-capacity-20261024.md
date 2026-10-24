# Soru hazırlama kapasitesi — 24 Ekim 2026

## Bildirilen sorun

1. sınıfta “Sürpriz karışım”, 20 soru ve karışık zorluk seçildiğinde yalnız 2 soru tarzı hazırlanabildiği bildiriliyor; çalışma başlamıyordu.

## Kök nedenler

1. Adaptif başlangıç rotası, ekranda karışık seçili olsa bile isteği tek bir düşük yeterlilik alanına dönüştürüyordu. Hikâye moduna ait `mixCategories` bayrağı normal çalışma isteğinde bulunmadığından yeni öğrenciler çoğunlukla ilk alana yönlendiriliyordu.
2. Başlangıç rotası, her testte her geniş soru tarzını yalnız bir kez kabul ediyordu. Bu koşul, tek konuda pekiştirme yapmayı ve mevcut tarz sayısından uzun testleri engelliyordu.
3. Üreticiye mevcut oturumun uygunluk koşulları iletilmediği için yeni tohumla üretilen fakat daha önce gösterilmiş bir soruya dönülebiliyor; diğer uygun adaylar aranmadan tekrar deneniyordu.
4. Normal karışık testlerde tanıdık bir beceriye her rastlandığında bütün diğer alanlar yeniden taranıyordu. Uzun testlerde gereksiz üretim maliyeti oluşuyordu.
5. Önerilen bir alan üzerinden açılan ekranda başlık karışık görünebiliyor; “Sürpriz karışım” seçmek önceki alan filtresini temizlemiyordu.

## Uygulanan düzen

- Karışık seçim bütün alanlarda kalır. Adaptasyon geçmiş cevaplara göre zorluk planına uygulanır; seçilen alan gizlice değiştirilmez.
- Normal oturumlarda farklı tarzlar tercih edilir. Uzun testlerde ve tek konuda aynı becerinin farklı örnekleri kullanılabilir. Geniş bir beceriyi yeniden çalışmak, aynı soruyu tekrar sunmakla bir tutulmaz.
- Tam soru ve görsel tekrarları engellenir. Zar/açınım, katlama ve matris gibi eşdeğer konu adları aynı gösterilen soruya dönüyorsa ayrı soru sayılamaz. Bu kimlik geçmiş oturumlarda da kullanılır.
- Oturumun kullanılabilirlik filtresi üreticiye aktarılır. Uygun olmayan veya tekrarlanan bir aday yerine başka tohumlar ve mekanikler aranır. Sınıf, seçilen zorluk, istemci görsel biçimi ve doğruluk denetimleri bütün adaylarda uygulanır.
- Normal karışık oturumlarda alan kotaları korunur. Bir alanda gerçekten uygun yeni soru kalmadığında başka alana geçilebilir. Katı, her tarzı bir kez kullanan iç seçim seçeneği ayrıca korunur.
- Soru sayısı otomatik azaltılmaz. Gerçekten yetersiz bir havuz varsa kısmi test kaydedilmez; hazırlanan farklı ve doğrulanmış soru sayısı bildirilir.
- Tek konu çalışmaları yayımlanmış ve kontrol edilmiş havuzla sınırlı kalır. Sunucu hazır soruların doğruluk ve çözüm denetimlerini atlamaz.
- Arayüz artık seçilen alanı doğru adlandırır. “Sürpriz karışım” önceki alanı temizler ve bütün alanları seçer. Açıklamalar yeni pekiştirme düzenini anlatır.

## Yerel süre ölçümü

Aynı makinede, boş yayımlanmış havuzdan, sabit tohumlarla yapılan ölçümler. Süreler canlı servis için garanti değildir.

| Sınıf | Soru sayısı | Gereksiz alan taramalarıyla | Dengeli seçimle | Son üretici çağrısı |
| --- | ---: | ---: | ---: | ---: |
| 1 | 20 | 1.473 sn | 1.042 sn | 20 |
| 1 | 50 | 19.779 sn | 1.836 sn | 50 |
| 4 | 20 | 0.308 sn | 0.437 sn | 20 |
| 4 | 50 | 11.710 sn | 2.221 sn | 50 |

Bütün ölçümlerde istenen soru sayısı eksiksiz hazırlandı ve gösterilen soru/görsel anahtarları benzersizdi.

## Doğrulama

- Güncellenen dört test dosyasında 39 test başarılı: sınıf, zorluk, farklı soru seçimi, katı çeşitlilik seçeneği, geçmiş, kısmi oturum oluşturmama, konu filtreleri ve API doğrulamaları.
- Gerçek Express başlangıç rotası izole veri kaynağıyla sınandı. 1. sınıfta kolay, zor ve karışık düzeylerde 20 ve 50 soruluk istekler, hikâye bayrağı olmadan ve boş yayımlanmış havuzla tam sonuç verdi.
- Dört sınıfta 50 soruluk planların uzunlukları, zorluk sıraları, alan dengesi, benzersiz görselleri ve bağımsız çözücü sonuçları denetlendi.
- İlk sınıfta art arda üç 20 soruluk oturumun önceki gösterilen soruları tekrar etmediği kontrol edildi.
- Tarayıcıda sayısal alandan “Sürpriz karışım”a geçişin alanı temizlediği, 20/50 hedefini koruduğu ve 51 soruyu engellediği doğrulandı.
- Tür kontrolü ve üretim derlemesi başarılı.

Yerel rapor ve görseller `test-artifacts/question-experience/` altında: `capacity-tests-final.log`, `capacity-regressions.log`, `capacity-performance-before.json`, `capacity-performance-after.json`, `learning-setup-results.json`, `learning-setup-mobile.png`.

Canlı hesap veya üretim veritabanında oturum başlatılmadı. Yayımlanmış bankada veya veritabanı şemasında değişiklik yapılmadı. Değişikliklerin canlıya dağıtımı bu çalışmada yapılmadı.

Son soru kimliği düzenlemesinden sonra 12 hedefli regresyon testi daha çalıştırıldı; tamamı başarılı. Bu çalışma, gerçek Express API akışını, dört sınıfta 50 soruluk planı, art arda üç oturumu, eşdeğer konu adıyla tekrar girişimini ve katı seçim seçeneğini kapsadı. Son tür kontrolü de başarılı.
