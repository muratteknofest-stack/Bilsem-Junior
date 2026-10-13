# Quantum tech — ticari yayın kararı

13 Ekim 2026. Kullanıcı diğer yapılandırmaların araştırılıp seçilmesini yetkilendirdi.

## Kaydedilen işletmeci bilgileri

- Unvan: Quantum tech
- Kullanıcının verdiği adres metni: Quantum tech lab
- İletişim: zeka.kupu.test@gmail.com

Canlı platform ayarlarına revision kontrolüyle kaydedildi (revision 3). Adres metni sokak, bina/no, ilçe, il ve posta kodu içermediğinden ödeme kuruluşu başvurusu için tam posta adresi yerine geçmez. Unvanın ticaret/vergi kaydı doğrulanmış sayılmadı. Gerçek bilgiler banka ve sağlayıcı kayıtlarıyla uyuşmalıdır.

## Sağlayıcı seçimi

Türkiye'de kurulmuş bir işletme varsayımıyla ilk tercih iyzico Checkout Form'un yönlendirmeli ortak ödeme sayfasıdır. Kart verilerinin uygulamadan geçmediği, sağlayıcıda işlenen bir akış hedeflenir. Bu entegrasyon henüz kurulmamıştır; gerçek sağlayıcı hesabı olmadan SDK, sahte checkout veya geçici ödeme hakkı oluşturulmaz.

Stripe, Türkiye'yi doğrudan desteklenen işletme ülkelerinde listelemiyor. PayTR Türkiye için uygun alternatif; yayımlanan düşük komisyon başlangıcı yedi gün valör koşuluna bağlı ve kesin teklif işletme/ciro/iş modeline göre verilir. iyzico seçimi en düşük komisyon iddiası değil, belgelenmiş yönlendirmeli ödeme sayfası ve Türkiye'deki onboarding sürecine göre teknik uygunluk kararıdır. Gerçek teklif daha iyi çıkarsa sağlayıcı tercihi yeniden değerlendirilebilir.

Resmî sayfalarda araştırma sırasında görülen koşullar:

| Sağlayıcı | Açıklanan fiyat koşulu | Önemli sınır |
|---|---|---|
| iyzico | %4,29 + 0,25 TL | Açıklanan teklif aylık 20.000 TL üzeri satış koşuluyla; bu işletme için onaylanmış oran değildir |
| PayTR | %2,19'dan başlayan oran | Yedi gün valör; kesin oran sektör, hacim, sepet ve karta göre teklif edilir |

İki sağlayıcıda da başvuru değerlendirmesi ve kimlik/işletme/banka doğrulaması gerekir. Bu adımlar kullanıcı adına kimlik/vergi/IBAN uydurularak tamamlanamaz. Sözleşme imzalanmış veya satış hesabı açılmış sayılmaz.

## Başlangıç paketleri

Seçilen lansman fiyatı hedefleri:

| Paket | Süre | Tek seferlik son kullanıcı fiyatı hedefi |
|---|---:|---:|
| Başlangıç | 30 gün | 299 TL |
| Düzenli çalışma | 90 gün | 799 TL |

Kapsam: bir öğrenci hesabı için sınıfa uygun soru bankası, pratik/deneme, yanlışların tekrarı ve veli ilerleme görünümü. Sınav başarısı, zekâ tanısı, uzman danışmanlığı veya canlı ders vaat edilmez. Otomatik yenileme/kart saklama açılmaz. Bir ödeme için aynı sunucu hakkı yalnız bir kez tanımlanmalı; süre, doğrulanmış ödeme onayından başlamalıdır.

Bunlar piyasada doğrulanmış optimal fiyatlar değil, yeni ürün için seçilen başlangıç fiyatlarıdır. Bilsem Online'ın yayımlanan premium fiyatları 1 ay 4.999 TL, 3 ay 6.999 TL ve 6 ay 9.499 TL; kapsam/uzman raporları farklı olduğundan eşdeğer ürün karşılaştırması değildir. Müşteri geri bildirimi, dönüşüm, gerçek barındırma/AI maliyeti, sağlayıcı komisyonu ve iade oranı sonrası fiyat yeniden değerlendirilmelidir. Vergi/fatura düzeni ve satın alma öncesi koşullar gerçek işletme statüsüne göre tamamlanmalıdır.

Paketler canlı checkout'a eklenmedi ve ücret tahsilatı açılmadı. Ödeme kuruluşu hesabı onaylandıktan sonra katalog ve sunucu hakları gerçek entegrasyona göre uygulanacak.

## Yayın öncesi kalan gerçek bilgiler/erişim

- Tam posta adresi, işletmenin gerçek hukuki/vergi statüsü ve sağlayıcının istediği belgeler; sağlayıcı panelinden girilmeli.
- Kullanıcıya ait ödeme hesabı onayı ve sunucu tarafındaki güvenli entegrasyon değişkenleri; sohbetten gizli anahtar istenmez.
- Veri saklama/silme politikasının uygulanan süreçle eşleşmesi ve mevcut dış sağlayıcıların aktarım şartları. Bir metin doldurmak, sözleşme/teknik silme süreci tamamlamak değildir.
- E-posta ve gerçek aile pilotu, fiziksel cihaz ve geri yükleme kabulü.

KVKK aydınlatması için hukuki dayanak, saklama/silme süreleri ve aktarım koşulları mevcut işletme süreciyle doğrulanmalı. Varsayılan süre veya imzalanmamış sözleşme gerçekmiş gibi yayımlanmadı.

## Araştırma kaynakları

- https://www.iyzico.com/isim-icin/sanal-pos
- https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu
- https://www.paytr.com/paytr-sanal-pos
- https://dev.paytr.com/en/iframe-api
- https://stripe.com/global
- https://bilsemonline.com/paketler
- https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi
- https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu
