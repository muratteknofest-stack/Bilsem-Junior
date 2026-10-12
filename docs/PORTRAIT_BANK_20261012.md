# Dikey ekran ve 4.000 soruluk yenileme

Telefon ve tablet dikey kullanımı için soru ekranı tek sütun ve 2×2 cevap düzenini korur. VisualViewport değişimleri tarayıcı çubukları açılıp kapandığında kullanılabilir yüksekliği günceller. Güvenli alanlar korunur; destekleyen tarayıcılarda kullanıcı araç menüsünden tam ekranı açabilir. İlerleme çubuğu alt kontrollerle birlikte görünür. Küçük dikey ekranlarda boşluklar azaltılır; metin ve dokunma alanları korunur.

`robot-20261012-colorful-v3` partisi 1–4. sınıflara 1.000'er soru içerir. Önceki 8.000 yayımlı/arşivli sorunun kök ve görsel özetleri üretimden dışlandı. Yeni 4.000 sorunun kimliği, kökü ve görseli tekildir. Sınıf profili, bağımsız çözüm, seçenek tekilliği ve bütün soru/şıkların sunucu tarafında çizimi doğrulandı. Beş yeni renkli aile her sınıfta bulunur; sınırlı gölge varyasyonları sınıf başına sekiz ile dengelenir.

Doğrulama: 208 test, TypeScript, Vercel üretim derlemesi; 507 gerçek Chromium yerleşim/etkileşim senaryosu başarılı. Bunlar yerel bileşen testleridir, fiziksel cihaz veya oturum açılmış canlı kullanıcı testi değildir. Bireysel eğitmen incelemesi yapılmadı; yayın metadatası bunu açıkça ayrı tutar.

Yayın sırası: yeni parti `review` olarak yüklenir; veritabanındaki miktar, sınıf dağılımı, özet tekilliği ve önceki bankalarla çakışma kontrol edilir. Yeni kodun üretim commit'i ve veritabanı bağlantısı sağlık uç noktasında doğrulanır. Ardından tek transaction içinde eski 4.000 soru arşivlenir ve yeni 4.000 soru yayımlanır. Eski kayıtlar ve geçmiş oturum verileri silinmez. Commit/banka geçişi başarısızsa yayımlı eski banka korunur.

Üretim komutu: `node --import tsx scripts/generate-grade-bank.ts --existing empty.json --existing-hashes existing-hashes.json --output private-bank.json --batch robot-20261012-colorful-v3 --per-grade 1000 --seed 2026101214 --profile professional --at 2026-10-12T11:10:00.000Z`.

Doğrulama komutu: `node --import tsx scripts/verify-grade-bank.tsx private-bank.json`. Cevap anahtarlarını içeren banka public varlıklara eklenmez. Manifest, kaynak dosyanın SHA-256 özetini ve içerik dağılımını kaydeder.
