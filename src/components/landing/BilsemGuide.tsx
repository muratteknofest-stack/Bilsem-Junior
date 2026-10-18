import { BookOpen, Brain, ScanEye, Shapes, Users, ArrowUpRight } from 'lucide-react';

const areas = [
  { title: 'Görsel düşünme', text: 'Şekiller arasındaki ilişkileri gör. Döndürme, parça–bütün ve uzamsal düşünme alıştırmalarıyla çalış.', icon: Shapes, tone: 'mint' },
  { title: 'Mantık ve örüntü', text: 'İpuçlarını birleştir, kuralları keşfet. Örüntü ve akıl yürütme sorularını kendi hızında çöz.', icon: Brain, tone: 'violet' },
  { title: 'Dikkat ve bellek', text: 'Ayrıntıları fark et, benzerlikleri karşılaştır. Dikkat ve bellek çalışmalarını düzenli tekrar et.', icon: ScanEye, tone: 'coral' },
  { title: 'Birlikte takip', text: 'Çalışma alanlarını seç, cevap açıklamalarına dön. Veli panelinde öğrencinin çalışma kayıtlarını izle.', icon: Users, tone: 'gold' },
];

export function BilsemGuide() {
  return <section id="bilsem-rehberi" className="bj-guide zp-container" aria-labelledby="bj-guide-title">
    <div className="bj-guide-heading"><div><p className="zp-kicker"><BookOpen size={16} /> BİLSEM HAZIRLIK REHBERİN</p><h2 id="bj-guide-title">Ezberden öte,<br /><span>düşünmenin peşinde.</span></h2></div><p>Bilsem Junior, BİLSEM hazırlığına ilgi duyan çocuklar için bağımsız bir düşünme ve alıştırma alanı. Oyunla başlayan merakı düzenli çalışmaya dönüştür.</p></div>
    <div className="bj-guide-grid">{areas.map(area => <article key={area.title} className={'bj-guide-card bj-tone-' + area.tone}><span className="bj-guide-icon"><area.icon size={25} aria-hidden="true" /></span><h3>{area.title}</h3><p>{area.text}</p></article>)}</div>
    <details className="bj-about-bilsem"><summary>BİLSEM nedir? Aileler için kısa bilgi <ArrowUpRight size={17} aria-hidden="true" /></summary><div><p>Bilim ve sanat merkezleri, özel yetenekli öğrencilerin genel zihinsel yetenek, görsel sanatlar ve müzik alanlarında okul eğitimlerine ek destek aldığı kurumlardır. Aday gösterme ve değerlendirme koşulları ilgili yılın MEB kılavuzuyla belirlenir.</p><p>Bilsem Junior’daki 1–4. sınıf alıştırmaları, resmî sürece katılım hakkı anlamına gelmez. Uygulama MEB veya BİLSEM’in resmî hizmeti değildir; sorular özgün alıştırmalardır, tanılama ya da sonuç garantisi sunmaz.</p><a href="https://orgm.meb.gov.tr/www/sss.php?DIL=tr" target="_blank" rel="noopener noreferrer">MEB’in BİLSEM bilgilendirmesini incele <ArrowUpRight size={15} aria-hidden="true" /></a></div></details>
  </section>;
}
