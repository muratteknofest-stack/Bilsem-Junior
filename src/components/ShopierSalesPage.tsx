import React from 'react';
import { ShopierPackageCards, type ShopierPlanView } from './ShopierPackageCards';

function DiscoveryArtwork() {
  return <div className="zp-sales-art" aria-hidden="true">
    <div className="zp-art-orbit"/><span className="zp-art-star">✦</span><span className="zp-art-spark">✳</span>
    <div className="zp-art-note"><span>HER KÜÇÜK ADIM</span><strong>Yeni bir keşif!</strong><div className="zp-art-progress"><i/><i/><i/><i/><i/></div></div>
    <div className="zp-art-board"><div className="zp-art-tile zp-tile-lilac"><i className="zp-shape-circle"/></div><div className="zp-art-tile zp-tile-peach"><i className="zp-shape-triangle"/></div><div className="zp-art-tile zp-tile-yellow"><i className="zp-shape-cross"/></div><div className="zp-art-tile zp-tile-mint"><i className="zp-shape-diamond"/></div></div>
    <div className="zp-art-bubble">Merak et. Dene. Keşfet. <span>↗</span></div>
  </div>;
}

export function ShopierSalesPage({ready,brand,plans}:{ready:boolean;brand:string;plans:ShopierPlanView[]}) {
  return <div className="zp-sales-page">
    <header className="zp-sales-header zp-sales-wrap"><a className="zp-sales-brand" href="/" aria-label="ZekaPark ana sayfa"><img src="/logo.svg" alt="" width="36" height="36"/>Zeka<span>Park</span></a><nav aria-label="Paket menüsü"><a className="zp-sales-nav-link" href="#paketler">Paketleri keşfet</a><a className="zp-sales-login" href="/login?role=parent">Veli girişi <span aria-hidden="true">↗</span></a></nav></header>
    <main>
      <section className="zp-sales-hero zp-sales-wrap" aria-labelledby="sales-heading"><div className="zp-sales-hero-copy"><p className="zp-sales-eyebrow"><span aria-hidden="true">✦</span> MERAKLI ZİHİNLERİN OYUN ALANI</p><h1 id="sales-heading">Biraz oyun.<br/>Bolca <span>keşif.</span></h1><p className="zp-sales-lead">Düşünmek, denemek ve öğrenmek için renkli bir dünya. Çocuğunuz kendi hızında ilerlesin, siz her adımına eşlik edin.</p><a className="zp-sales-button zp-sales-hero-cta" href="#paketler">Bize uygun paketi bul <span aria-hidden="true">↓</span></a><div className="zp-sales-proof"><span>1–4. sınıflar</span><span>44 konu</span><span>Telefon & tablet</span></div></div><DiscoveryArtwork/></section>
      <div className="zp-sales-benefits zp-sales-wrap"><div><span className="zp-benefit-icon zp-benefit-mint" aria-hidden="true">↗</span><p><strong>Kendi hızında</strong><span>Seçtiği konular, kendi çalışma ritmi.</span></p></div><div><span className="zp-benefit-icon zp-benefit-peach" aria-hidden="true">✳</span><p><strong>Oynayarak keşfetsin</strong><span>Renkli testler, animasyonlar ve sesler.</span></p></div><div><span className="zp-benefit-icon zp-benefit-lilac" aria-hidden="true">♡</span><p><strong>Siz de yanında olun</strong><span>Gelişimini veli panelinden takip edin.</span></p></div></div>
      <section id="paketler" className="zp-sales-packages zp-sales-wrap" aria-labelledby="packages-heading"><div className="zp-sales-section-heading"><p className="zp-sales-eyebrow">KÜÇÜK ADIMLAR, RENKLİ KEŞİFLER</p><h2 id="packages-heading">Aynı renkli dünya.<br/><span>Size uygun bir süre.</span></h2><p>Tüm özellikler her pakette. Sadece birlikte geçireceğimiz süreyi seçin.</p></div>
        {!ready&&<p className="zp-sales-notice" role="status"><span aria-hidden="true">☀</span><span><strong>Yeni bir yolculuğa hazırlanıyoruz.</strong> Ücretli satış henüz açılmadı. Fiyatlar planlanan lansman fiyatlarıdır; mevcut ücretsiz kullanım devam eder.</span></p>}
        <ShopierPackageCards plans={plans} ready={ready} checkout="parent"/>
        <p className="zp-sales-payment-note"><span aria-hidden="true">✓</span> Bir öğrenci hesabı için erişim. Süre, siparişin ilk doğrulanmış aktivasyonunda başlar.</p>
      </section>
      <section className="zp-sales-steps zp-sales-wrap" aria-labelledby="steps-heading"><div><p className="zp-sales-eyebrow">BAŞLAMAK KOLAY</p><h2 id="steps-heading">Üç küçük adım.<br/>Yepyeni bir dünya.</h2><p>Satış açıldığında paketiniz veli panelinden öğrenci hesabına tanımlanır.</p><a href="/login?role=parent" className="zp-sales-text-link">Veli paneline git <span aria-hidden="true">↗</span></a></div><ol><li><span>01</span><div><h3>Veli hesabınıza girin</h3><p>Çocuğunuzun bağlı olduğu hesabı açın.</p></div></li><li><span>02</span><div><h3>Sürenizi seçin</h3><p>Shopier’de veli hesabınızdaki e-postayla tek paket satın alın.</p></div></li><li><span>03</span><div><h3>Keşfe başlayın</h3><p>Sipariş numaranızı veli panelinde doğrulayın. Erişim seçtiğiniz öğrenciye açılsın.</p></div></li></ol></section>
      <section className="zp-sales-faq zp-sales-wrap" aria-labelledby="faq-heading"><div><p className="zp-sales-eyebrow">AKLINIZDA KALMASIN</p><h2 id="faq-heading">Küçük sorular,<br/>açık cevaplar.</h2><span aria-hidden="true" className="zp-faq-flower">✳</span></div><div className="zp-sales-faq-list">
        <details><summary>Paketler arasında özellik farkı var mı?</summary><p>Hayır. Tüm paketlerde 1–4. sınıf düzeylerinde 44 konuda test, adaptif çalışma, denemeler ve veli takibi bulunur. Paketler yalnızca erişim süresine göre farklılaşır.</p></details>
        <details><summary>Her ay otomatik ücret alınır mı?</summary><p>Hayır. Tüm paketler tek seferlik ödemedir; otomatik yenileme yoktur. Yeni bir paket almak sizin seçiminizdir.</p></details>
        <details><summary>Mevcut paketim bitmeden yenisini alabilir miyim?</summary><p>Evet. Doğrulanan yeni paket süresi kalan erişimin sonuna eklenir. Bir sipariş yalnızca bir öğrenciye tanımlanabilir; iade edilen siparişler sayılmaz.</p></details>
        <details><summary>Çocuğum sınıf değiştirirse ne olur?</summary><p>Öğrenci sınıfını değiştirebilir ve 1–4. sınıf düzeylerinde çalışabilir. Erişim aynı öğrenci hesabında devam eder.</p></details>
      </div></section>
    </main>
    <footer className="zp-sales-footer"><div className="zp-sales-wrap"><div className="zp-sales-footer-top"><a href="/" className="zp-sales-brand">Zeka<span>Park</span><span aria-hidden="true">✦</span></a><p>Merakla başlayan her adım kıymetli.</p></div><div className="zp-sales-footer-bottom"><p>{brand} · Birlikte keşfedelim.</p><nav aria-label="Yasal bilgiler"><a href="/bilgi/kullanim-kosullari">Kullanım koşulları</a><a href="/bilgi/gizlilik-ve-veriler">Gizlilik</a><a href="/bilgi/iletisim-ve-destek">İletişim</a></nav></div><p className="zp-sales-disclaimer">Sınav başarısı, resmî BİLSEM bağlantısı, zekâ tanısı veya canlı ders vaat edilmez.</p></div></footer>
  </div>;
}
