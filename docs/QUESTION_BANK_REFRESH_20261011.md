# Sınıf ve zorluk seçimi — 11 Ekim 2026

## Tamamlanan değişiklikler

- Kapanan çalışmadan sınıf/zorluk kodu ve parti manifesti kurtarıldı. Veritabanı geçişi önceden uygulanmıştı; soru aktarımı 1.560/4.000 kayıtta kalmıştı.
- Aynı seed, tarih ve eski 4.000 sorunun görsel/gövde parmak izleriyle parti yeniden oluşturuldu. Dağılım manifestle eşleşti; önceden yüklenen 1.560 kaydın tamamı JSONB eşitliğiyle doğrulandı. Eksik 2.440 kayıt tamamlandı.
- Tek veritabanı işleminde eski iki robot partisi ve 330 `q_bulk` kaydı (toplam 4.330) silindi; yeni 4.000 soru yayımlandı. Kullanıcılar, geçmiş cevaplar ve puanlar silinmedi.
- Her sınıfta 1.000 yayımlı soru. Banka genelinde 4.000 farklı soru gövdesi ve 4.000 farklı görsel parmak izi; yapısal hata yok. İnsan editör değerlendirmesi yapılmış gibi işaretlenmedi.
- Kayıtta zorunlu sınıf seçimi; öğrenci profilinde 1–4. sınıf değişikliği. Sunucu yalnız oturum sahibinin öğrenci profilini günceller; açık çalışmaların süresi sona erer, geçmiş cevaplar ve XP korunur.
- Pratik, adaptif çalışma ve denemelerde sınıfa uygun zorluk seçimi: sınıf 1 için 1–2, sınıf 2 için 1–3, sınıf 3 için 1–4, sınıf 4 için 1–6. Seçim sunucuda tekrar doğrulanır. Eski sınıfa veya farklı filtreye ait çalışma yeniden kullanılmaz.
- Çalışma sırasında “Zorluğu değiştir / yeni çalışma” mevcut cevapları kaydeder, çalışmayı bitirir ve seçim ekranına döner. Kaydetme/bitirme hatasında mevcut çalışma korunur.

## Doğrulama

- TypeScript ve 198 otomatik test geçti; Postgres entegrasyon testleri gerçek PostgreSQL motorunda çalıştı.
- Canlı Supabase üzerinde sınıf değişikliği, XP korunması, eski çalışmanın sona ermesi ve fonksiyon erişim izinleri transaction içinde doğrulandı; test verileri rollback edildi.
- React bileşen etkileşimlerinde dört sınıfın zorluk menüleri, seçimin isteğe aktarılması, başarılı/başarısız sınıf kaydı, başarısız bitirmede çalışmanın korunması ve kayıt formunda sınıf zorunluluğu geçti. Bu arayüz testlerinde servis çağrıları taklit edildi.
- `scripts/verify-grade-bank.tsx` bütün banka üzerinde bağımsız mekanik denetimi, eğitim politikası sınırlarını, görünür tekrarları ve soru/şık HTML çizimlerini kontrol eder.
- Yerel Chromium ortamda SIGSEGV ile açılmadı. Oturum açmış gerçek öğrenci hesabıyla uçtan uca tarayıcı testi yapılmış sayılmaz.

Bu kontroller mekanik doğruluğu ve yazılım davranışını kapsar; 4.000 sorunun insan eğitim uzmanı tarafından tek tek değerlendirildiği iddia edilmez.
