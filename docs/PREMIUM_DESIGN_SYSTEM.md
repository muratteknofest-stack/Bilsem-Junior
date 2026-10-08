# ZekaPark / Public Design System

Sürüm 1 · 7 Ekim 2026 · Kapsam: ana sayfa ve genel navigasyon. ZekaPark’ın merak ve oyun duygusunu koruyan, sakin ve güvenilir bir premium görünüm. Oyuncu yüzeyler sınırlı; okunabilirlik, açıklık ve etkileşim öncelikli.

## 1. Temel ilkeler

1. **Az ama belirgin:** Her bölüm bir odak noktası taşır. Güçlü mor yalnızca ana eylem, seçili durum ve marka vurgusunda kullanılır.
2. **Sakin zemin, canlı keşif:** Sıcak kırık beyaz zemin ve koyu yazı; ada illüstrasyonu ve keşif kartları kontrollü renk sağlar.
3. **Anlaşılır etkileşim:** Süsleme bilgi hiyerarşisini gölgelemez; içerik barındıran kartlar opaktır.
4. **Tek kaynak:** `src/components/landing/design-system.css` içindeki `--zp-*` değişkenleri ve `PremiumUI.tsx` bileşenleri yeni sayfalar için başlangıçtır. Mevcut çizimlerin yüzey geometrisi `landing.css` içinde kalır.

## 2. Tipografi

| Kullanım | Yazı tipi | Boyut | Satır yüksekliği | Ağırlık |
|---|---|---:|---:|---:|
| Hero | Outfit | 52–88 px desktop; 36–64 px telefon | 1.025–1.05 | 600 |
| Bölüm başlığı | Outfit | 36–58 px desktop; 32–44 px telefon | 1.08 | 600 |
| Kart başlığı | Outfit | 24–32 px | 1.12 | 600 |
| Gövde | Plus Jakarta Sans | 16–18 px | 1.65–1.75 | 400–500 |
| Etkileşim / etiket | Plus Jakarta Sans | 13–14 px | 1.3–1.6 | 600–800 |
| Mikro etiket | Plus Jakarta Sans | 11–12 px | 1.5 | 700–800 |

Başlıklar `-.045em` sıkılıkta; hero `-.065em`. Başlıkları yalnızca dekoratif yazı karakteriyle değil, anlamsal `h1–h3` yapısıyla kullan. Metin olarak görüntü dışa aktarma; gerçek DOM metni kullan. Fontlar `index.html` içinde mevcut; sistem fontları yedek.

## 3. Renk ve kontrast

| Token | Değer | Amaç | Örnek kontrast |
|---|---|---|---:|
| `--zp-ink` | `#1D2036` | Başlık, gövde, koyu buton | kırık beyaz üzerinde 14.93:1 |
| `--zp-ink-muted` | `#52566B` | İkincil metin | kırık beyaz üzerinde 6.75:1 |
| `--zp-violet` | `#5434BA` | Ana buton, marka vurgusu, odak | beyaz ile 8.15:1 |
| `--zp-violet-deep` | `#39217D` | Hover ve küçük bağlantı | beyaz ile 12.44:1 |
| `--zp-canvas` | `#F8F7F3` | Sayfa zemini | — |
| `--zp-paper` | `#FFFFFF` | Okuma ve form yüzeyi | — |
| `--zp-lilac` | `#F0E9FB` | Örüntü kartı | mor ile 6.89:1 |
| `--zp-sage` | `#E6ECDC` | Mantık / aile yüzeyi | koyu yeşil `#2F6258` ile 5.78:1 |
| `--zp-peach` | `#F7EAE1` | Dikkat kartı | koyu kiremit `#815044` ile 5.63:1 |
| `--zp-gold` | `#D9C29C` | Yalnızca ince vurgu / süsleme | metin rengi olarak kullanılmaz |
| `--zp-line` | `#D8D8E0` | Ayrım / kontur | tek başına anlam taşımaz |

Başarılı/uyarı durumunda sözel açıklama ve ikon da bulunmalı; renk tek sinyal olmamalı. Yarı saydam yüzeylerde canlı arka plan okunurluğu bozuyorsa opak yüzey kullan.

## 4. Boşluk, grid ve köşeler

Boşluk ölçeği 4 tabanlıdır: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px` (`--zp-space-*`). Yeni arayüzlerde rastgele aralık üretme. Kart içi standart 24–32px, bölüm arası 96px desktop / 64px telefon. Köşeler: 12px küçük kontrol, 20px buton/yüzey, 28px kart, 36px büyük sahne. Gölgeler yalnızca yükseltiyi anlatır.

| Görünüm | Sütun | Dış pay | Davranış |
|---|---:|---:|---|
| >1000px | 12 | 48px | Hero 5/7; demo 5/7; keşif kartları 4/4/4 |
| 681–1000px | 6 | 32px | Hero ve demo 3/3; kartlar 3/3, son kart 6 |
| ≤680px | 4 | 20px | Ana içerik, kartlar ve demo tek sütun |
| ≤360px | 4 | 14px | Buton metni ve hero tipografisi sıkışır, dokunma alanı küçülmez |

Maksimum içerik genişliği 1216px. `.zp-ui-grid` tokenlarla yeni kompozisyonlar için kullanılabilir. 200% büyütmede ve 320px CSS genişliğinde yatay taşma oluşmamalı.

## 5. Yüzey ve cam etkisi

Cam etkisi yalnızca gezinti yüzeyi ve sahnedeki küçük yüzen notlarda bulunur: `blur(16–20px)`, yüksek opaklıklı beyaz, belirgin kenarlık. Tarayıcı desteklemezse opak kırık beyaz görünür. Uzun metin, soru çözme alanı ve formlar düz beyaz yüzey taşır. Bu karar sınıf ortamında değişken arka plan ve düşük güçlü cihazlarda okunurluğu korur.

## 6. Bileşen kütüphanesi

`PremiumUI.tsx`:

- `PremiumButton`: `primary`, `quiet`, `dark`, `lime`; normal, hover, focus, active ve disabled. Yerel `<button>` semantiği ve `onClick`/`type`/`disabled` korunur. Bir bölümde tercihen tek bir baskın ana eylem.
- `PremiumField`: görünür `label`, isteğe bağlı `hint`, doğrulama `error`, `aria-describedby`, `aria-invalid` ve `role="alert"`. Hata metni alanın yanında kalır. Placeholder tek etiket olarak kullanılmaz.
- `.zp-ui-card`: opak kontur, 28px köşe ve hafif gölge; kartın tamamı eylemse `button`, sadece bilgi veriyorsa `article`/`div`. Keşif kartları tam yüzey butondur; soru ve aile panelleri bilgi yüzeyidir.
- `.zp-ui-grid`, `.zp-kicker`, `.zp-container`: yerleşim ve metin hiyerarşisi. Kart üst etiketleri 12px; metinlerde koyu mürekkep ve ikincil ton.

Örnek:

```tsx
<PremiumButton onClick={openDemo}>Keşfe başla</PremiumButton>
<PremiumField label="E-posta" type="email" autoComplete="email" hint="Veli hesabındaki adres" error={emailError} />
```

Bu form bileşeni, hazır kayıt akışını değiştirmek için henüz kullanılmıyor; yeni genel formlara uygulanabilir. Demo içindeki mevcut giriş alanı aynı odak/yüzey kurallarını alır.

Giriş, kayıt ve şifre sıfırlama yüzeyleri `src/features/auth/auth-design-system.css` içinde aynı `--zp-*` tokenlarına bağlanır. Form alanları opak beyazdır; rol ve odak seçimi `aria-pressed` ile ifade edilir. Hata metni alanla `aria-describedby` üzerinden eşleşir. Dekoratif keşif sahnesi formdan ayrı tutulur ve azaltılmış hareket tercihinde sabit kalır.

Öğrenci ve veli panelleri `src/components/dashboard-design-system.css` katmanını kullanır. `.zp-dashboard-page`, `.zp-dashboard-hero`, `.zp-dashboard-surface`, `.zp-dashboard-tabs` ve `.zp-dashboard-kpis` işlevsel sınıfları, iki panelde aynı yüzey ve gezinme dilini sağlar. Öğrenci oyun alanındaki koyu mor yüzeyler bilinçli vurgu; rapor, çalışma listesi ve form yüzeyleri opaktır. Koyu tema açık temanın hiyerarşisini korur. Sekmeler `aria-pressed` durumunu, şifre yenileme alanları görünür etiket ve ilişkili hata açıklamalarını taşır.

## 7. Navigasyon ve ikonografi

Tek yapışkan başlık: marka → keşif / nasıl / aileler / yardım → hesap eylemleri. Masaüstünde açıklamalı popover; ≤1000px yerel `dialog` tabanlı mobil menü. Menü ve açılır yüzeylerde `aria-expanded`, `aria-controls`, Esc, kapanınca odağın tetikleyiciye dönmesi ve klavyeyle gezinme korunur. Kayıt ol ana eylem; öğrenci/veli girişleri ayrı ve açık.

Lucide çizgi ikonları `1.8px` stroke; 16px metin içi, 18–22px kontrol, 24–28px öne çıkan kart. Dekoratif ikonlar `aria-hidden`; anlam taşıyan tek ikonlar açıklayıcı ad veya eşlik eden görünür metin alır. Bir simgenin tek başına eylemi açıklamasına güvenme.

## 8. Hareket

| Kullanım | Süre | Eğri | İlke |
|---|---:|---|---|
| Odak / renk | 140ms | ease | Kısa geri bildirim |
| Buton / kart yükselmesi | 240ms | `cubic-bezier(.22,1,.36,1)` | 2–4px ile sınırlı |
| Bölüm görünmesi | 480ms | yumuşak | Tek sefer, içerik okumasını geciktirmez |
| Keşif adası | yavaş döngü | mevcut CSS | Kullanıcı durdurabilir |

`prefers-reduced-motion: reduce` ve sayfa içi hareket ayarı, dönme/yüzme/hover hareketini durdurur. Arka sekmede ve sahne görünmüyorken ada hareketsizdir. İşlemin sonucu animasyon bitimine bağlanmaz.

## 9. Erişilebilirlik ve bakım

Hedef WCAG 2.2 AA: normal metinde en az 4.5:1, büyük metinde 3:1 kontrast; görünür odak; alternatif dokunma/klavye yolu; en az 24×24 CSS piksel hedef. ZekaPark etkileşimlerinde hedef en az 44px tutulur. Kullanıcı hareket tercihi ve durdurma denetimi korunur. Dokunmayla sürüklenen soru seçeneklerinin alternatif tıklama ve klavye yolu ortak soru bileşeninde mevcut.

Bu hedefler otomatik tam uyumluluk iddiası değildir. Büyütme, ekran okuyucu, dinamik form hataları ve gerçek cihaz davranışı ayrıca ölçülmelidir. Yeni bölüm eklerken önce token/bileşen kullan; dekoratif çizim rengi yeni bir semantik renk oluşturmaz. Sınıf/veli/admin ekranları bu public seti kademeli olarak benimseyebilir.

Kaynaklar: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [hareket tercihine uyum tekniği](https://www.w3.org/WAI/WCAG22/Techniques/css/C39).
