# Android yayın hazırlığı — 4 Kasım 2026

## Tamamlanan düzeltmeler

- Yapımcı künyesi etkin olduğunda onaylı veri işleme/dayanak, saklama ve aktarım bölümleri gizlenmez. Kamuya açık kimlik eksikliği ayrı ve doğru biçimde açıklanır; özel işletmeci adresi veya telefonu yayımlanmaz. Onaysız açıklamalar tamamlanmış gösterilmez.
- Gizlilik içeriği sürümü 2026-11-04 olarak yenilendi. Önceki metin sürümüyle kayıt isteği POLICY_UPDATED döndürür ve yeniden okuma gerekir.
- Abonelik gerektiren çalışmada satış kapalıysa kullanıcı satın almaya yönlendirilmez. Bekleyen ödeme, ödeme sorunu ve duraklatılmış üyelik için mevcut aboneliği yönetme açıklamaları gösterilir.
- Ücretli erişim şartı, eski hesap politikası, aktif hakların doğrulanması ve ücretsiz günlük görevler aynı kalır. Gerçek satın alma, insan eğitmen veya hukuki kabul kaydı oluşturulmaz.

## CI engeli

GitHub Android koşusu 41844907865 üzerinde görülen resmî açıklama: iş hesap ödemelerinin başarısız olması veya harcama limitinin artırılması gerekmesi nedeniyle başlatılmadı. Bu durumda bir derleme veya uygulama testi başarısızlığı kanıtlanmış değildir. Hesap sahibinin Billing & plans durumunu düzeltmesi gerekir; bu değişiklik ödeme veya limit ayarını değiştirmez.

## Yayın kabulünde açık kalanlar

Üretim AAB imzası ve Play sertifikası eşleşmesi; gerçek cihaz, e-posta ve satın alma/geri yükleme/yenileme/iptal testleri; tamamlanmış kamuya açık veri sorumlusu açıklaması; Play Console beyanları ve üretim erişimi; insan eğitmen incelemesi ve insan seslendirmesi. Bu kaynak düzeltmeleri Google Play üretim yayınının tamamlandığı anlamına gelmez.
