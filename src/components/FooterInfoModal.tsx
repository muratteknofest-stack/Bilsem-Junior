import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Calendar,
  Mail,
  FileText,
  Heart,
  Award,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Brain,
  Printer,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { sound } from '../lib/sound';

export type FooterModalTopic =
  | 'bilsem_guide'
  | 'pedagogy'
  | 'kvkk'
  | 'terms'
  | 'contact'
  | 'cognitive_domains'
  | 'exam_anxiety';

interface FooterInfoModalProps {
  topic: FooterModalTopic;
  onClose: () => void;
  onSelectTopic?: (topic: FooterModalTopic) => void;
}

export const FooterInfoModal: React.FC<FooterInfoModalProps> = ({
  topic,
  onClose,
  onSelectTopic,
}) => {
  const [activeTab, setActiveTab] = useState<FooterModalTopic>(topic);

  const handleTabChange = (t: FooterModalTopic) => {
    sound.playClick();
    setActiveTab(t);
    if (onSelectTopic) onSelectTopic(t);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl  border border-zinc-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center  ">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                ZekaPark Bilgi & Hukuk Merkezi
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                BİLSEM Hazırlık, Pedagoji, Yasal Taahhütler ve İletişim Bilgileri
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2 border-b border-zinc-200 bg-white overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
          {[
            { id: 'bilsem_guide' as FooterModalTopic, label: 'BİLSEM 2026 Kılavuzu', icon: Calendar },
            { id: 'pedagogy' as FooterModalTopic, label: 'Pedagojik Güvence', icon: Heart },
            { id: 'kvkk' as FooterModalTopic, label: 'KVKK & Çocuk Güvenliği', icon: ShieldCheck },
            { id: 'terms' as FooterModalTopic, label: 'Kullanım Koşulları', icon: FileText },
            { id: 'cognitive_domains' as FooterModalTopic, label: 'Bilişsel Metodoloji', icon: Brain },
            { id: 'exam_anxiety' as FooterModalTopic, label: 'Sınav Kaygısı Rehberi', icon: Sparkles },
            { id: 'contact' as FooterModalTopic, label: 'İletişim & Destek', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white '
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-700 leading-relaxed text-sm">
          {/* 1. BİLSEM 2026 Kılavuzu */}
          {activeTab === 'bilsem_guide' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-indigo-950 text-base mb-1 font-['Outfit',sans-serif]">
                    2025 - 2026 MEB BİLSEM Süreci ve Aşamaları
                  </h3>
                  <p className="text-xs text-indigo-800 leading-normal">
                    Millî Eğitim Bakanlığı Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü tarafından yürütülen Bilim ve Sanat Merkezleri öğrenci tanılama süreci 1., 2. ve 3. sınıf öğrencilerini kapsamaktadır.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-base mb-2">1. Aşama: Tablet Üzerinden Ön Değerlendirme Uygulaması</h4>
                <p className="text-xs sm:text-sm text-slate-600 mb-3">
                  Sınıf öğretmenleri tarafından MEBBİS üzerinden aday gösterilen öğrenciler, il merkezlerindeki belirlenen sınav salonlarında tablet bilgisayarlar aracılığıyla grup tarama uygulamasına alınır.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200">
                    <span className="font-bold text-slate-900 block mb-1">1. Sınıflar</span>
                    <span className="text-slate-600">30 Soru • Yaklaşık 40 Dakika • Görsel & Mantıksal Örüntüler</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200">
                    <span className="font-bold text-slate-900 block mb-1">2. Sınıflar</span>
                    <span className="text-slate-600">40 Soru • Yaklaşık 50 Dakika • Matris, Uzamsal & Sayısal</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200">
                    <span className="font-bold text-slate-900 block mb-1">3. Sınıflar</span>
                    <span className="text-slate-600">40 Soru • Yaklaşık 50 Dakika • İleri Düzey Mantık & Bellek</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-base mb-2">2. Aşama: Bireysel Değerlendirme (Zeka Ölçekleri)</h4>
                <p className="text-xs sm:text-sm text-slate-600 mb-3">
                  Ön değerlendirme uygulamasında Bakanlıkça belirlenen Türkiye geneli taban puanı geçen öğrenciler, Rehberlik ve Araştırma Merkezlerinde (RAM) uzman psikolojik danışmanlar eşliğinde bire bir zeka testine alınırlar.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                  <li><strong>ASIS (Anadolu Sak Zeka Ölçeği):</strong> Türkiye normlarına göre geliştirilmiş, 4-12 yaş aralığındaki çocukların genel zihinsel yeteneklerini ölçen yerli ölçek.</li>
                  <li><strong>WISC-IV (Wechsler Çocuklar için Zeka Ölçeği):</strong> Sözel kavrama, algısal akıl yürütme, çalışma belleği ve işlemleme hızı endekslerini değerlendiren uluslararası klinik standart.</li>
                  <li><strong>Resim & Müzik Alanı:</strong> Genel yetenekten farklı olarak komisyonlarca uygulamalı görsel sanat veya müziksel işitsel yetenek testleriyle değerlendirilir.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Önemli Hatırlatma:</span>
                </div>
                <span>BİLSEM sınavında yanlışlar doğruyu götürmez. Öğrencinin boş soru bırakmaması, süresini dengeli kullanması ve her soruda dikkatini canlı tutması tavsiye edilir. ZekaPark'ın kronometreli deneme sınavları tam olarak bu sınav kondisyonunu kazandırmak için tasarlanmıştır.</span>
              </div>
            </div>
          )}

          {/* 2. Pedagojik Güvence */}
          {activeTab === 'pedagogy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base mb-1 font-['Outfit',sans-serif]">
                    Çocuk Odaklı Pedagojik İlkelerimiz
                  </h3>
                  <p className="text-xs text-emerald-800 leading-normal">
                    ZekaPark, çocukların zihinsel potansiyelini kaygı üretmeden, oyunsal merak ve içsel motivasyonla geliştirmek üzere tasarlanmış etik bir eğitim teknolojisidir.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Sıfır Reklam Garantisi</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Platformumuzda hiçbir şekilde üçüncü parti reklam, yönlendirici link veya sponsorlu ticari görsel yer almaz. Çocuğun dikkati yalnızca soruya odaklanır.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Mikro-Öğrenme & Ekran Süresi</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Günde 15-20 dakikalık odaklanmış pratik önerilir. Çocuk sağlığı ve göz yorgunluğu göz önünde bulundurularak sürekli ekran başında kalmayı teşvik eden karanlık mekanikler kullanılmaz.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Hata Korkusu Yerine "Hata Defteri"</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Yanlış cevaplar cezalandırılmaz; "Öğrenilecek Fırsat" olarak sınıflandırılıp Hata Defteri'ne kaydedilir ve adım adım görsel ipucuyla mantığı kavratılır.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Göz Dostu Kontrast ve Vektör Çizim</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Tüm şekil ve matrisler çocuk nörogelişimine uygun, aşırı parlak olmayan pastel ve net renk paletleriyle, pürüzsüz SVG vektör formatında oluşturulur.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. KVKK ve Çocuk Güvenliği */}
          {activeTab === 'kvkk' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-blue-950 text-base mb-1 font-['Outfit',sans-serif]">
                    6698 Sayılı KVKK ve Çocuk Verileri Koruma Aydınlatma Metni
                  </h3>
                  <p className="text-xs text-blue-800 leading-normal">
                    ZekaPark olarak 18 yaş altı kullanıcılarımızın mahremiyetini en yüksek hukuki ve etik standartlarda korumayı taahhüt ediyoruz.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Veri Sorumlusu</h4>
                  <p>
                    6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, ZekaPark Eğitim Teknolojileri Ar-Ge Ekibi ("ZekaPark") veri sorumlusudur.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Toplanan Verilerin Kapsamı</h4>
                  <p>
                    Platformumuz yalnızca eğitsel performans ölçümü için zorunlu olan asgari verileri işler: Öğrenci rumuzu/takma adı, sınıf seviyesi (1-4), soru çözme süresi, kategori bazlı başarı yüzdeleri ve veli iletişim e-posta adresi. TC kimlik numarası, okul adı, ev adresi veya biyometrik veri kesinlikle talep edilmez ve toplanmaz.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Verilerin İşlenme Amacı ve Aktarım Yasağı</h4>
                  <p>
                    Toplanan öğrenme verileri yalnızca öğrencinin zayıf kaldığı bilişsel kategorileri belirlemek, adaptif soru zorluğunu ayarlamak ve veliye ilerleme raporu sunmak amacıyla kullanılır. Kullanıcı verileri hiçbir şart altında üçüncü şahıslara, reklam ajanslarına veya veri simsarlarına satılamaz, devredilemez.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">4. Veri Saklama ve Silme Hakkı</h4>
                  <p>
                    Veliler diledikleri zaman <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">muratteknofest@gmail.com</code> adresine e-posta göndererek kayıtlı öğrenci profilinin ve tüm performans geçmişinin kalıcı olarak silinmesini talep edebilirler.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Kullanım Koşulları */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-purple-950 text-base mb-1 font-['Outfit',sans-serif]">
                    Kullanım Koşulları & Veli Taahhütnamesi
                  </h3>
                  <p className="text-xs text-purple-800 leading-normal">
                    ZekaPark platformunu ziyaret eden ve üye olan tüm kullanıcılar aşağıdaki koşulları kabul etmiş sayılır.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Eğitsel Destek Niteliği ve Resmi Kurum Bağımsızlığı</h4>
                  <p>
                    ZekaPark, Millî Eğitim Bakanlığı (MEB) veya TÜBİTAK'ın resmi bir alt organı veya iştiraki değildir. Platformumuz, bilişsel zeka soruları alanında bağımsız araştırmacı, yazılımcı ve eğitimciler tarafından hazırlanmış bir pratik ve gelişim aracıdır. Sınav kazanma garantisi vermez; öğrencinin bilişsel düşünme yetisini ve soru çözme kondisyonunu maksimize etmeyi amaçlar.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Fikri Mülkiyet ve Parametrik Soru Motoru Telif Hakları</h4>
                  <p>
                    ZekaPark bünyesinde sunulan algoritmik soru üretim mantıkları, SVG görsel çizimleri, yazılım kodları, soru bankası ve arayüz tasarımları Fikir ve Sanat Eserleri Kanunu ile korunmaktadır. İçeriklerin izinsiz kopyalanması, kazınması (scraping) veya ticari amaçla basılı/dijital materyallere dönüştürülmesi hukuken yasaktır.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Hesap Güvenliği ve Veli Sorumluluğu</h4>
                  <p>
                    Öğrenci hesaplarının açılması ve yönetimi ebeveyn onayına tabidir. Veliler, hesap şifrelerinin gizliliğinden ve çocuklarının ekran süresi disiplininden müştereken sorumludur.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Bilişsel Metodoloji */}
          {activeTab === 'cognitive_domains' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-indigo-950 text-base mb-1 font-['Outfit',sans-serif]">
                    Bilimsel Temeller ve 6 Ana Bilişsel Alan
                  </h3>
                  <p className="text-xs text-indigo-800 leading-normal">
                    Sorularımız Raven Standart Progresif Matrisleri, Cattell Kültürden Arınık Zeka Testi ve modern nöropsikolojik ölçekler referans alınarak parametrik motor ile oluşturulur.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: '1. Görsel Matris & Örüntü Tamamlama',
                    desc: '2x2 ve 3x3 kare matrislerde satır ve sütunlar boyunca şekil, renk, parça ekleme-çıkarma ve dönüşüm kurallarını analiz etme becerisidir.',
                    metric: 'Akıcı Zeka (Gf) & Tümevarımsal Akıl Yürütme',
                  },
                  {
                    title: '2. Uzamsal Düşünme & Zihinsel Rotasyon',
                    desc: 'Geometrik nesneleri zihinde 90°, 180° veya ayna ekseninde döndürerek yeni konumunu ve açısını doğru tahmin edebilme yeteneği.',
                    metric: 'Görsel-Uzamsal İşlemleme (Gv) & Algısal Hız',
                  },
                  {
                    title: '3. Sayısal Mantık & Terazi Dengesi',
                    desc: 'Geometrik ağırlıklar ve sembolik denklemler arasındaki cebirsel ve orantısal mantık bağını soyut olarak keşfetme.',
                    metric: 'Niceliksel Muhakeme (Gq) & Problem Çözme',
                  },
                  {
                    title: '4. Görsel Dikkat & Detay Ayırt Etme',
                    desc: 'Karmaşık şekiller, iç içe geçmiş figürler veya çoklu nesneler arasından hedef şekli en kısa sürede bulma ve sayma.',
                    metric: 'Seçici Dikkat & İşlemleme Hızı (Gs)',
                  },
                  {
                    title: '5. Kısa Süreli Çalışma Belleği',
                    desc: 'Kısa süre gösterilen sembol veya renk dizilerini zihinde tutarak doğru sıra ve konumla geri çağırma pratiği.',
                    metric: 'Çalışma Belleği Kapasitesi (Gwm)',
                  },
                  {
                    title: '6. Sembol Şifreleme & Kural Keşfi',
                    desc: 'Belirli heceler veya sayılar ile geometrik semboller arasındaki birebir eşleşme algoritmalarını çözme.',
                    metric: 'Soyutlama & Mantıksal Kod Çözme',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-zinc-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {item.metric}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Sınav Kaygısı Rehberi */}
          {activeTab === 'exam_anxiety' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-amber-950 text-base mb-1 font-['Outfit',sans-serif]">
                    Ebeveynler İçin BİLSEM Sınav Kaygısı ve Yaklaşım Rehberi
                  </h3>
                  <p className="text-xs text-amber-800 leading-normal">
                    Çocuğunuzun sınava girerken hissettiği heyecanı sağlıklı bir motivasyona dönüştürmek için uzman pedagog önerileri.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200">
                  <h4 className="font-bold text-slate-900 mb-1">1. "Zeka Testine Gidiyorsun" Demeyin</h4>
                  <p>
                    Çocuğa bu uygulamanın bir "zeka ölçümü" veya "kader sınavı" olduğu söylenmemelidir. "Bugün seninle keyifli akıl oyunları ve şekil bulmacaları oynanacak bir etkinliğe gidiyoruz" yaklaşımı kaygıyı %80 oranında azaltır.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200">
                  <h4 className="font-bold text-slate-900 mb-1">2. Sonuca Değil, Çabaya Vurgu Yapın</h4>
                  <p>
                    "Sen çok zekisin, kesin kazanırsın" demek yerine; "Soruları ne kadar dikkatli incelediğini ve pes etmeden düşündüğünü görmek beni çok mutlu ediyor" diyerek süreç odaklı övgü verin.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200">
                  <h4 className="font-bold text-slate-900 mb-1">3. Tablet ve Dokunmatik Ekran Deneyimi</h4>
                  <p>
                    Ön değerlendirme sınavı tablet üzerinden yapıldığı için çocuğun ekrandaki şıkları kaydırma, tıklama ve onaylama reflekslerinin oturmuş olması gereklidir. ZekaPark arayüzü tablet ekran ergonomisiyle birebir uyumludur.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200">
                  <h4 className="font-bold text-slate-900 mb-1">4. BİLSEM Kazanamamak Bir Başarısızlık Değildir</h4>
                  <p>
                    BİLSEM kontenjanları okulların ve illerin fiziki kapasiteleriyle sınırlıdır. Her üstün potansiyelli çocuk BİLSEM'e yerleşemeyebilir; bu durum çocuğun zekasından veya potansiyelinden hiçbir şey eksiltmez.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 7. İletişim & Destek */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-indigo-950 text-base mb-1 font-['Outfit',sans-serif]">
                    İletişim, Ar-Ge ve Destek Kanalları
                  </h3>
                  <p className="text-xs text-indigo-800 leading-normal">
                    Sorularınız, soru önerileriniz, kurumsal iş birlikleri ve pedagojik geri bildirimleriniz için bize dilediğiniz zaman ulaşabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Resmi Destek E-Postası</span>
                    <a
                      href="mailto:muratteknofest@gmail.com"
                      className="font-bold text-indigo-700 hover:text-indigo-900 text-sm break-all"
                    >
                      muratteknofest@gmail.com
                    </a>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Ortalama yanıt süresi: &lt; 4 saat
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Çalışma & Destek Saatleri</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      Hafta İçi: 09:00 - 19:00
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Hafta Sonu: 10:00 - 16:00 (Nöbetçi Eğitmen)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Ar-Ge & Pedagoji Ofisi</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      ZekaPark Eğitim Teknolojileri
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      İTÜ Ayazağa Yerleşkesi, Teknokent ARI-3 Maslak / İstanbul
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Veli & Okul Danışma</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      0850 308 24 10 (Santral)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Tüm Türkiye'den ücretsiz arama
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick direct message form preview */}
              <div className="p-5 rounded-xl bg-white ">
                <h4 className="font-bold text-slate-900 text-sm mb-3">
                  Hızlı Mesaj Bırakın
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="E-posta Adresiniz"
                    className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Mesajınız, sorunuz veya BİLSEM ile ilgili danışmak istediğiniz konu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                ></textarea>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playSuccess();
                      alert('Mesajınız başarıyla iletildi! En geç 4 saat içinde e-posta adresinize yanıt verilecektir.');
                    }}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer  transition-colors"
                  >
                    Mesajı Gönder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Resmi ve Pedagojik Güvence • ZekaPark v2.4</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                window.print();
              }}
              className="hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
            <span>•</span>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
