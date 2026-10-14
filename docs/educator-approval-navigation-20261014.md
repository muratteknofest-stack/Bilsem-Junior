# Eğitmen onayına erişim

Telefon ekranında uzun soru listesinin altındaki onay alanını bulmak zordu. Yeni yönetici menüsündeki **Eğitmen Onayı** bölümü veya `/admin?section=review` adresi doğrudan yayındaki soruların bireysel inceleme ekranını açar. Yönetici yetkisi ve iki aşamalı doğrulama korunur.

1. Listeden bir soru seçin. Önizleme görünür alana gelir.
2. Soruyu çözün; **Cevabı ve çözümü göster** ile karşılaştırın.
3. **Onay bölümüne git** ile üç inceleme maddesine geçin.
4. Yönerge, görseller/tek doğru cevap ve çözüm/çeldirici gerekçelerini gerçekten kontrol ettikten sonra işaretleyin.
5. **Onayla ve yayımla** düğmesiyle yalnızca seçilen sorunun onayını kaydedin. Başarılı kayıt, sorunun onaylandığı mesajıyla gösterilir.

Bekleyen inceleme listesi 40'ar kayıtla gösterilir. Onay ekranının inceleme listesinde yayımlanmış sorular yer alır; arşivler gösterilmez. Genel Soru Atölyesi'nde taslaklar ve diğer durumlar erişilebilir kalır. Soru seçimi değiştiğinde üç onay kutusu sıfırlanır. Kayıt başarısız olduğunda tamamlandı mesajı gösterilmez.

Yalıtılmış tarayıcı senaryosu gerçek AdminPortal, MFA kapısı ve editoryal çalışma alanını kullanır; düşük güven seviyesinde panelin açılmaması, onay adresi, mobil menü, sayfalama, görünür alana geçiş, üç kutu zorunluluğu ve kesinti/tekrar kayıt durumunu kontrol eder. API ve hesaplar `.invalid` test adresindedir; gerçek soruların eğitmen onayları bu geliştirme sırasında değiştirilmez.
