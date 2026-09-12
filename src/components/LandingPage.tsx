import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  LogIn,
  Brain,
  Shapes,
  Grid,
  Compass,
  Cpu,
  Eye,
  BookOpen,
  Calculator,
  Trophy,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Flame,
  Star,
  Users,
  Play,
  RotateCcw,
  Check,
  HelpCircle,
  Lightbulb,
  BarChart2,
  GraduationCap,
  HeartHandshake,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  MousePointerClick,
  Timer,
  ShieldCheck,
  Quote,
  ArrowUpRight,
} from 'lucide-react';
import { generateQuestionByType } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../lib/sound';
import { UserRole } from '../types';
import { Footer } from './Footer';

interface LandingPageProps {
  onStartDemo?: (role: UserRole) => void;
  onNavigateToLogin: (role: UserRole) => void;
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDemo,
  onNavigateToLogin,
  onNavigate,
}) => {
  // Hero Visual vs. Interactive Mode Toggle
  const [heroView, setHeroView] = useState<'visual_deck' | 'live_solver'>('visual_deck');

  // Live Interactive Question Player on Landing Page
  const [sampleSeed, setSampleSeed] = useState(4281);
  const [activeCategoryType, setActiveCategoryType] = useState<
    'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  >('visual_sequence');
  const [sampleQuestion, setSampleQuestion] = useState(() =>
    generateQuestionByType('visual_sequence', 4281, 2)
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  // Active Category Detail Modal / Selector
  const [selectedCatIdx, setSelectedCatIdx] = useState<number>(0);

  // Interactive FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSelectOption = (id: string) => {
    if (isSubmitted) return;
    sound.playClick();
    setSelectedOptionId(id);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isSubmitted) return;
    const isCorrect = selectedOptionId === sampleQuestion.correctOptionId;
    setIsSubmitted(true);
    if (isCorrect) {
      sound.playSuccess();
      setFeedback({ isCorrect: true, message: 'Harika! Süper bir zihinsel muhakeme!' });
    } else {
      sound.playError();
      setFeedback({ isCorrect: false, message: 'Birlikte inceleyelim: İşte görsel çözüm kuralı!' });
    }
  };

  const switchSampleType = (
    type: 'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  ) => {
    sound.playClick();
    setActiveCategoryType(type);
    const nextSeed = sampleSeed + 97;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(type, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
  };

  const handleNextSampleQuestion = () => {
    sound.playClick();
    const nextSeed = sampleSeed + 137;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(activeCategoryType, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
  };

  // 8 Core Cognitive Categories with In-depth Details
  const categories = [
    {
      name: 'Görsel Örüntü',
      sub: 'Algı & Sıralama',
      desc: 'Şekil, renk ve yön dizilimlerinin kuralını keşfederek eksik parçayı bulma.',
      bilsemMatch: 'MEB BİLSEM 1. ve 2. Aşama Soru Tipi',
      icon: Shapes,
      color: 'from-blue-500 to-indigo-600',
      difficulty: 'Seviye 1-4',
      badge: 'Görsel Algı',
      benefits: 'Detay farkındalığı, ardışık mantık kurma ve kural genelleştirme.',
    },
    {
      name: 'Matris Tamamlama',
      sub: '2 Boyutlu Mantık',
      desc: 'Satır ve sütunlar arasındaki çok yönlü ilişkileri çözerek mantığı kavrama.',
      bilsemMatch: 'En Sık Çıkan BİLSEM Soru Formatı',
      icon: Grid,
      color: 'from-purple-500 to-violet-600',
      difficulty: 'Seviye 2-5',
      badge: 'Soyut Muhakeme',
      benefits: 'İki boyutlu analiz, değişkenleri eşzamanlı değerlendirme ve ilişkisel zeka.',
    },
    {
      name: 'Uzamsal Zeka',
      sub: '3B Zihinsel Döndürme',
      desc: 'Şekilleri zihinde saat yönünde ve tersinde döndürme, simetri ve ayna algısı.',
      bilsemMatch: 'Uzamsal Beceri ve Görsel Sanat Taraması',
      icon: Compass,
      color: 'from-pink-500 to-rose-600',
      difficulty: 'Seviye 2-4',
      badge: 'Uzamsal Muhakeme',
      benefits: 'Zihinsel modelleme, açı oryantasyonu ve geometrik sezi.',
    },
    {
      name: 'Mantık & Muhakeme',
      sub: 'Analoji ve Kurallar',
      desc: 'Neden-sonuç zincirleri, şekilsel benzetimler ve gizli kuralları deşifre etme.',
      bilsemMatch: 'Genel Zihinsel Yetenek Alanı',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      difficulty: 'Seviye 2-5',
      badge: 'Analitik Akıl',
      benefits: 'Hızlı hipotez kurma, mantıksal eleme ve tümdengelim yetisi.',
    },
    {
      name: 'Görsel Dikkat',
      sub: 'Tarama & Eşleştirme',
      desc: 'Küçük ayrıntıları yakalama, gizli farkları saniyeler içinde ayırt etme.',
      bilsemMatch: 'Bilişsel Hız ve Süre Yönetimi',
      icon: Eye,
      color: 'from-emerald-500 to-teal-600',
      difficulty: 'Seviye 1-3',
      badge: 'Odaklanma',
      benefits: 'Sınavda dikkat hatalarını sıfıra indirme ve zamanı verimli kullanma.',
    },
    {
      name: 'Görsel Bellek',
      sub: 'Kısa Süreli Hafıza',
      desc: 'Ekranda birkaç saniye görünen konfigürasyonları akılda tutarak canlandırma.',
      bilsemMatch: 'Tablet Değerlendirme Modülü',
      icon: Cpu,
      color: 'from-cyan-500 to-blue-600',
      difficulty: 'Seviye 2-4',
      badge: 'Zihinsel Depolama',
      benefits: 'Çalışma belleği kapasitesini genişletme ve anlık bilgi işleme.',
    },
    {
      name: 'Farklı Olanı Bul',
      sub: 'İstisna Ayırt Etme',
      desc: 'Gruptaki şekillerin ortak geometrik kuralını bozan tekil ögeyi belirleme.',
      bilsemMatch: 'Sınıflandırma ve Tasnif Soruları',
      icon: BookOpen,
      color: 'from-indigo-500 to-purple-600',
      difficulty: 'Seviye 1-4',
      badge: 'Kritik Düşünme',
      benefits: 'Kalıpların dışına çıkabilme, öznitelik karşılaştırma ve kural analizi.',
    },
    {
      name: 'Sayısal Muhakeme',
      sub: 'Geometrik Sayı Dizileri',
      desc: 'Şekiller içine gömülü matematiksel artış kurallarını ve dizileri yakalama.',
      bilsemMatch: 'Sayısal Yetenek Taraması',
      icon: Calculator,
      color: 'from-teal-500 to-emerald-600',
      difficulty: 'Seviye 2-5',
      badge: 'Matematiksel Mantık',
      benefits: 'Sayı hissi, geometrik ritim algısı ve problem çözme stratejileri.',
    },
  ];

  // Real Photo Supported Pillars
  const photoPillars = [
    {
      title: 'Uzamsal Zeka & 3B Zihinsel Döndürme',
      category: 'Uzamsal Algı',
      description:
        'Çocuklar şekilleri sadece iki boyutta değil; derinlik, simetri ve açı eksenlerinde zihninde canlandırarak geleceğin mühendislik ve tasarım refleksini edinir.',
      imageUrl:
        'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80',
      tag: 'BİLSEM Uzamsal Boyut',
      stat: '%94 Görselleşme Oranı',
    },
    {
      title: 'Matris Tamamlama & Analitik Muhakeme',
      category: 'Soyut Mantık',
      description:
        'BİLSEM tablet sınavının kalbini oluşturan satır ve sütun kurallarını çözmek, çocuğunuzun karmaşık problemlere sistemli yaklaşmasını sağlar.',
      imageUrl:
        'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80',
      tag: 'En Kritik Bilişsel Alan',
      stat: '10.000+ Özgün Varyasyon',
    },
    {
      title: 'Görsel Dikkat & Odaklanmış Çalışma',
      category: 'Odaklanma',
      description:
        'Sınav ortamında zaman baskısı altında dikkati dağılmadan, gizli örüntüleri ve kural dışı detayları yakalama alışkanlığı kazandırır.',
      imageUrl:
        'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=800&q=80',
      tag: 'Dikkat & Bilişsel Hız',
      stat: '1.4 sn Ortalama Reaksiyon',
    },
    {
      title: 'Sayısal Muhakeme & Geometrik Sezgi',
      category: 'Problem Çözme',
      description:
        'Ezbere formüller yerine şekillerle modellenmiş örüntü mantığı, ilkokul çağında sağlam bir analitik düşünce temeli inşa eder.',
      imageUrl:
        'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      tag: 'Matematiksel Zeka',
      stat: 'Tam MEB Uyumlu',
    },
  ];

  // Testimonials with Real Portrait Photos
  const testimonials = [
    {
      name: 'Merve Yılmaz',
      role: '2. Sınıf Velisi • İstanbul',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      badge: 'BİLSEM Genel Zihinsel Kazandı',
      comment:
        'Kızım tablet sınavında en çok matris ve döndürme sorularında tereddüt ediyordu. ZekaPark ile her gün 15 dakika pratik yaptı. Soruların her defasında farklı gelmesi ezberi tamamen yıktı!',
      rating: 5,
    },
    {
      name: 'Burak Karaaslan',
      role: 'İlkokul Zümre Başkanı & BİLSEM Danışmanı',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      badge: 'Pedagojik Danışman Onaylı',
      comment:
        'Piyasadaki kitapların en büyük sorunu soruların bitmesi ve çocuğun cevapları ezberlemesidir. ZekaPark’ın parametrik soru motoru tam bir devrim. Öğrencilerime güvenle öneriyorum.',
      rating: 5,
    },
    {
      name: 'Selin Aksoy',
      role: '3. Sınıf Velisi • Ankara',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      badge: 'Ön Değerlendirme 98 Puan',
      comment:
        'Hata Defteri özelliği muazzam. Çocuğumun yanlış yaptığı soru tipleri otomatik kaydediliyor ve birkaç gün sonra benzer kuralla tekrar karşısına çıkıyor. Eksik bırakmadan ilerledik.',
      rating: 5,
    },
  ];

  // FAQs
  const faqs = [
    {
      q: 'BİLSEM 1., 2. ve 3. Sınıf Ön Değerlendirme Sınavı nasıl uygulanır?',
      a: 'BİLSEM ön değerlendirme sınavları MEB tarafından belirlenen sınav merkezlerinde tablet bilgisayarlar üzerinden yapılır. Sorular seslendirilmez, metin içermez; tamamen görsel ve şekilsel mantık muhakemesine dayanır. ZekaPark tam da bu tablet sınav ortamını ve mekaniklerini simüle eder.',
    },
    {
      q: 'ZekaPark soruları diğer test kitaplarından nasıl farklıdır?',
      a: 'Test kitapları 300-400 statik soru içerir ve çocuk cevap şıkkını ezberler. ZekaPark ise parametrik soru motoru kullanır. Her soru matematiksel bir algoritma ve tohum (seed) ile sıfırdan SVG vektör olarak çizilir. Bu sayede çocuğunuz sınırsız sayıda benzersiz soruyla pratik yapar.',
    },
    {
      q: 'BİLSEM tablet sınavında yanlışlar doğruyu götürür mü?',
      a: 'Hayır, BİLSEM ön değerlendirme tablet sınavında yanlış cevaplar doğru cevapları götürmez. Bu nedenle çocukların boş soru bırakmaması ve süre baskısı altında mantıklı eleme stratejilerini kullanması gerekir. Platformumuz zaman yönetimi ve eleme becerilerini geliştirir.',
    },
    {
      q: 'Günde kaç dakika ve kaç soru çözmek idealdir?',
      a: 'Pedagoglar ve BİLSEM eğitmenleri zihinsel yorgunluk oluşmaması için günde 15-20 dakika (ortalama 8-12 kaliteli soru) çalışılmasını tavsiye eder. ZekaPark günlük çalışma hedefi sistemiyle bu istikrarı oyunlaştırarak sağlar.',
    },
    {
      q: 'Veli olarak çocuğumun zayıf ve güçlü alanlarını nasıl takip ederim?',
      a: 'Veli Portalı üzerinden 8 bilişsel kategoriye özel doğruluk yüzdelerini, soru başına geçen ortalama süreyi, Hata Defteri telafi oranlarını ve haftalık gelişim grafiklerini anlık olarak raporlayabilirsiniz.',
    },
  ];

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Top Notification / Official Disclaimer Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 border-b border-amber-200/80 px-4 py-2.5 text-xs md:text-sm text-amber-950 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              <strong>2026 BİLSEM Rehberi:</strong> Bilişsel yetenek ve tablet değerlendirme sınavına hazırlık için parametrik yeni nesil zeka platformu.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className="text-amber-800 hidden md:inline">Bağımsız Eğitim Aracı</span>
            <button
              onClick={() => onNavigateToLogin('student')}
              className="bg-amber-900 text-amber-100 hover:bg-amber-950 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs"
            >
              Hemen Başla →
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section: Modern, Dynamic with Authentic High-Impact Photo */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Value Proposition & Interactive Trust */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/90 text-indigo-700 text-xs sm:text-sm font-bold ">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Yapay Zeka Destekli Parametrik Bilişsel Soru Motoru</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.2rem] font-extrabold text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-[1.18]">
              Çocuğunuzun Zekasını{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Bilimsel Metotlarla
              </span>{' '}
              Zirveye Taşıyın
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Ezberci test kitaplarını unutun. BİLSEM tablet sınavına birebir uyumlu 18 bilişsel kategori, sınırsız parametrik soru varyasyonu ve yapay zeka destekli adaptif koçluk ile çocuğunuzun potansiyelini keşfedin.
            </p>

            {/* Live Trust Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2 border-y border-zinc-200/80">
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-black text-indigo-900 font-['Outfit',sans-serif]">
                  %91.4
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Sınav Aşama Başarısı</div>
              </div>
              <div className="text-center lg:text-left border-x border-zinc-200/80 px-2 sm:px-4">
                <div className="text-xl sm:text-2xl font-black text-purple-900 font-['Outfit',sans-serif]">
                  35.000+
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Çözülen Özgün Soru</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-black text-emerald-900 font-['Outfit',sans-serif]">
                  4.9 / 5
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Veli & Öğretmen Puanı</div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                id="hero-student-start"
                onClick={() => onNavigateToLogin('student')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-base   active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Öğrenci Olarak Başla</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setHeroView(heroView === 'visual_deck' ? 'live_solver' : 'visual_deck');
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border-2 border-zinc-200 text-slate-700 font-bold text-base hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-900 transition-all flex items-center justify-center gap-2 cursor-pointer "
              >
                {heroView === 'visual_deck' ? (
                  <>
                    <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                    <span>Canlı Soru Çöz</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Fotoğraf & Deneyimi Gör</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Role Login Portal Selectors */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-slate-600">
              <span className="text-slate-400 font-medium">Giriş Yap:</span>
              <button
                onClick={() => onNavigateToLogin('student')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>🦊 Öğrenci Girişi</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('parent')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>👩‍🏫 Veli Portalı</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('admin')}
                className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>👨‍💻 Yönetici & Eğitmen</span>
              </button>
            </div>
          </div>

          {/* Right Column: High-Impact Real Photography Deck OR Live Interactive Question */}
          <div id="canli-soru" className="lg:col-span-6 relative scroll-mt-24">
            {heroView === 'visual_deck' ? (
              <div className="relative group">
                {/* Real Photograph with Modern Rounded Styling & Glassmorphic Badges */}
                <div className="relative overflow-hidden rounded-xl border-2 border-indigo-100   bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80"
                    alt="BİLSEM sınavına tablet ile zevkle hazırlanan meraklı öğrenci"
                    referrerPolicy="no-referrer"
                    className="w-full h-[380px] sm:h-[460px] object-cover object-center group-hover:scale-103 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  {/* Caption & Context overlay on photo */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                      <span className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        BİLSEM 2026 Tablet Sınavı Standartları
                      </span>
                      <span className="bg-indigo-600/90 text-white px-2 py-0.5 rounded-md font-extrabold text-[11px]">
                        Canlı Simülasyon
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium">
                      Çocuklar karmaşık şekil matrislerini eğlenceli bir bulmaca gibi çözerken, süre baskısı olmadan refleks kazanır.
                    </p>
                  </div>
                </div>

                {/* Floating Real-time Telemetry Card 1: Top Right */}
                <div className="absolute -top-4 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-indigo-100   max-w-[210px] hidden sm:block animate-bounce-slight">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                    <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                      <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Günlük Çalışma Serisi</div>
                      <div className="font-extrabold text-slate-900">7 Gün Kesintisiz! 🔥</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="bg-orange-500 h-full w-[85%] rounded-full" />
                  </div>
                </div>

                {/* Floating Real-time Telemetry Card 2: Bottom Left */}
                <div className="absolute -bottom-4 -left-2 sm:-left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-indigo-100   max-w-[240px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0  ">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold">Son Çözülen Kategori</div>
                      <div className="font-extrabold text-xs text-slate-900">Matris Tamamlama (9/10)</div>
                      <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <span>+50 XP Kazanıldı</span>
                        <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Interactive CTA pill to switch to question */}
                <div className="absolute top-4 left-4">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setHeroView('live_solver');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer "
                  >
                    <MousePointerClick className="w-3.5 h-3.5 text-amber-300" />
                    <span>Canlı Soruyu Test Et</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Interactive Question Sandbox */
              <div
                id="hero-live-question-box"
                className="bg-white rounded-xl p-4 sm:p-6 border-2 border-indigo-200   relative transition-all"
              >
                {/* Interactive Question Header with Category Pills */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 font-['Outfit',sans-serif]">
                      Canlı BİLSEM Soru Laboratuvarı
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={handleNextSampleQuestion}
                      title="Yeni Soru Üret"
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Yeni Tohum</span>
                    </button>
                    <button
                      onClick={() => setHeroView('visual_deck')}
                      className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Sub-category Quick Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-[11px] font-bold">
                  <button
                    onClick={() => switchSampleType('visual_sequence')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeCategoryType === 'visual_sequence'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Görsel Örüntü
                  </button>
                  <button
                    onClick={() => switchSampleType('matrix_2x2')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeCategoryType === 'matrix_2x2'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    2x2 Matris
                  </button>
                  <button
                    onClick={() => switchSampleType('figure_rotation')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeCategoryType === 'figure_rotation'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Şekil Döndürme
                  </button>
                  <button
                    onClick={() => switchSampleType('odd_one_out')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeCategoryType === 'odd_one_out'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Farklı Olan
                  </button>
                </div>

                {/* Prompt */}
                <div className="mb-3 text-center">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {sampleQuestion.prompt}
                  </h3>
                  {sampleQuestion.secondaryPrompt && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sampleQuestion.secondaryPrompt}
                    </p>
                  )}
                </div>

                {/* Question Canvas */}
                <div className="mb-4">
                  <QuestionRenderer question={sampleQuestion} />
                </div>

                {/* Option Choices */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  {sampleQuestion.options.map((opt) => (
                    <OptionRenderer
                      key={opt.id}
                      option={opt}
                      isSelected={selectedOptionId === opt.id}
                      onSelect={() => handleSelectOption(opt.id)}
                      disabled={isSubmitted}
                      showCorrect={isSubmitted}
                      isCorrectOption={opt.id === sampleQuestion.correctOptionId}
                    />
                  ))}
                </div>

                {/* Feedback or Submit */}
                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOptionId}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedOptionId
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white   active:scale-98'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{selectedOptionId ? 'Cevabı Kontrol Et' : 'Bir Seçenek İşaretle'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {feedback && (
                      <div
                        className={`p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 ${
                          feedback.isCorrect
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    <VisualExplanationOverlay
                      explanation={sampleQuestion.explanation}
                      correctOptionId={sampleQuestion.correctOptionId}
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleNextSampleQuestion}
                        className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Yeni Bir Soru Dene</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToLogin('student')}
                        className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
                      >
                        Tüm Sınavı Çöz →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real Photos Showcase: 4 Key Cognitive Pillars */}
      <section id="bilissel-alanlar" className="py-16 bg-white border-y border-zinc-200 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Bilişsel Pedagoji & Gerçek Hayat
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 font-['Outfit',sans-serif]">
              Gerçek Becerileri Geliştiren 4 Temel Zeka Alanı
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Çocuklar ZekaPark'ta sadece bir sınava değil; gelecekteki analitik problem çözme, fen, kodlama ve tasarım hayatına zihinsel temel atar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {photoPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl border border-zinc-200 overflow-hidden hover: hover:border-indigo-300 transition-all flex flex-col group"
              >
                {/* Real Photograph with Category Badge */}
                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-200">
                  <img
                    src={pillar.imageUrl}
                    alt={pillar.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <span className="absolute top-3 left-3 bg-white/95 text-slate-900 px-2.5 py-1 rounded-full text-xs font-extrabold ">
                    {pillar.category}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-indigo-600/90 text-white px-2 py-0.5 rounded-md text-[11px] font-bold">
                    {pillar.stat}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      {pillar.tag}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mt-1 font-['Outfit',sans-serif]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-zinc-200/80 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                    <span>Egzersizleri Keşfet</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Core Categories Detailed Interactive Grid */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Müfredat ve Soru Çeşitliliği
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-['Outfit',sans-serif]">
              Tüm Bilişsel Becerileri Kapsayan 8 Temel Kategori
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              BİLSEM tablet sınavında karşılaşılacak soru kategorilerinin ayrıntılı dökümü.
            </p>
          </div>
          <button
            onClick={() => onNavigate('glossary')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <span>Bilişsel Sözlüğü Aç</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCatIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  sound.playClick();
                  setSelectedCatIdx(idx);
                }}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-indigo-500   ring-2 ring-indigo-500/20'
                    : 'bg-white border-zinc-200 hover:border-indigo-300 hover:'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center `}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-zinc-200">
                      {cat.badge}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                    {cat.name}
                  </h4>
                  <div className="text-[11px] font-bold text-indigo-600 mt-0.5">{cat.sub}</div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cat.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>{cat.difficulty}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-700 font-semibold">{cat.bilsemMatch}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Category Deep Dive Panel */}
        {categories[selectedCatIdx] && (
          <div className="mt-6 p-5 sm:p-6 rounded-xl bg-indigo-50/80 border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Seçili Kategori İncelemesi
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  {categories[selectedCatIdx].name}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                {categories[selectedCatIdx].name}: {categories[selectedCatIdx].sub}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 max-w-3xl">
                <strong>Pedagojik Kazanım:</strong> {categories[selectedCatIdx].benefits}
              </p>
            </div>

            <button
              onClick={() => onNavigateToLogin('student')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs  transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>Bu Kategoriyi Çöz</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Innovative Learning Loop with Real Mother-Child Photo */}
      <section id="nasil-calisir" className="py-16 bg-white border-y border-zinc-200 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Authentic Photo of Mother and Daughter studying */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-xl overflow-hidden border-2 border-zinc-200  bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80"
                alt="Anne ve çocuk birlikte zeka egzersizlerini inceleyip başarıyı kutluyor"
                referrerPolicy="no-referrer"
                className="w-full h-[400px] object-cover object-center"
              />
            </div>

            {/* Overlaid Floating Testimonial Pill */}
            <div className="absolute -bottom-5 right-4 left-4 sm:left-auto bg-white/95 backdrop-blur-md p-4 rounded-xl border border-zinc-200  max-w-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <span>Veliler İçin Tam Şeffaflık</span>
              </div>
              <p className="text-xs text-slate-600">
                "Artık çocuğumun hangi kategoride zorlandığını tahmin etmek zorunda değilim; Veli Portalı her gün net istatistik veriyor."
              </p>
            </div>
          </div>

          {/* Right: The 4-Step Innovative Methodology */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                ZekaPark Metodolojisi
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 font-['Outfit',sans-serif]">
                Nasıl Başarıya Ulaşıyoruz?
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2">
                Çocuğun seviyesine anlık adapte olan 4 aşamalı bilimsel öğrenme döngüsü.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-base shrink-0 ">
                  1
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                    Parametrik Sonsuz Soru Motoru
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Statik resimler yerine matematiksel tohumlarla anlık üretilen SVG vektör sorular. Çocuk şıkları ezberleyemez; her zaman mantık yürütmek zorundadır.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-base shrink-0 ">
                  2
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                    Sokratik 3 Kademeli İpucu Sistemi
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Çocuk takıldığında cevabı hemen vermez. Önce nereye bakması gerektiğini fısıldar, ardından kural ilişkisini hatırlatır, en son çözümü görselleştirir.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-pink-600 text-white font-black flex items-center justify-center text-base shrink-0 ">
                  3
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                    Algoritmik Adaptif Antrenman
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Sistem çocuğun zayıf olduğu alanları saptar. Antrenman sorularının %50'sini zorlandığı alanlardan seçerek bilişsel açıkları hızla kapatır.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-zinc-200 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-base shrink-0 ">
                  4
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                    Akıllı Hata Defteri & Telafi Modu
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Yanlış yapılan sorular otomatik olarak Hata Defteri'ne eklenir. Çocuk aynı matematiksel tohumla soruyu tekrar çözene kadar unutulmaz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Geleneksel Kitaplar vs. yapyap */}
      <section id="karsilastirma" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            Geleneksel Test Kitapları vs. ZekaPark
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Neden binlerce veli ve eğitimci dijital parametrik modeli tercih ediyor?
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl border border-zinc-200  overflow-hidden text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-zinc-200">
                <th className="p-4 sm:p-5">Özellik & Kriter</th>
                <th className="p-4 sm:p-5 text-slate-500">Geleneksel Test Kitapları</th>
                <th className="p-4 sm:p-5 bg-indigo-50/70 text-indigo-900 border-l border-indigo-100">
                  ✨ ZekaPark Bilişsel Motoru
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Soru Sayısı & Çeşitlilik</td>
                <td className="p-4 sm:p-5 text-slate-500">300-400 statik soru; bitince biter</td>
                <td className="p-4 sm:p-5 bg-indigo-50/40 font-bold text-indigo-950 border-l border-indigo-100">
                  Sınırsız parametrik tohum; asla ezberlenemez
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Çözüm İzahı</td>
                <td className="p-4 sm:p-5 text-slate-500">Sadece "Doğru Cevap: C" anahtarı</td>
                <td className="p-4 sm:p-5 bg-indigo-50/40 font-bold text-indigo-950 border-l border-indigo-100">
                  Adım adım görsel açıklama ve mantık şeması
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Bireyselleştirme</td>
                <td className="p-4 sm:p-5 text-slate-500">Her çocuk aynı sayfaları sırayla çözer</td>
                <td className="p-4 sm:p-5 bg-indigo-50/40 font-bold text-indigo-950 border-l border-indigo-100">
                  Yapay zeka zayıf alanları tespit edip ona göre soru üretir
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Sınav Formatı Uyumu</td>
                <td className="p-4 sm:p-5 text-slate-500">Kağıt üzerinde kalemle işaretleme</td>
                <td className="p-4 sm:p-5 bg-indigo-50/40 font-bold text-indigo-950 border-l border-indigo-100">
                  MEB BİLSEM tablet arayüzüyle %100 birebir uyumlu
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Hata Takibi</td>
                <td className="p-4 sm:p-5 text-slate-500">Kitap sayfalarında kaybolur, unutulur</td>
                <td className="p-4 sm:p-5 bg-indigo-50/40 font-bold text-indigo-950 border-l border-indigo-100">
                  Otomatik Hata Defteri ile kalıcı telafi mekanizması
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Real Testimonials with Real Portrait Photographs */}
      <section id="veli-yorumlari" className="py-16 bg-white border-y border-zinc-200 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Kullanıcı Deneyimleri
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-['Outfit',sans-serif]">
              Veliler ve Eğitimciler Ne Diyor?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              BİLSEM aşamalarını başarıyla geçen öğrenci velilerimizin samimi tecrübeleri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-6 rounded-xl border border-zinc-200 flex flex-col justify-between hover: transition-all"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-200 flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-300 shrink-0"
                  />
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm font-['Outfit',sans-serif]">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{t.role}</div>
                    <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {t.badge}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern High-Tech Classroom & STEM Atmosphere Banner */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative rounded-xl overflow-hidden  bg-slate-950 text-white p-8 sm:p-12 md:p-16">
          <img
            src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80"
            alt="Modern bilişsel öğrenme ve BİLSEM sınıf ortamı"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/80" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-indigo-300" />
              <span>Geleceğin Yetenekleri ZekaPark ile Yetişiyor</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-['Outfit',sans-serif] leading-tight">
              BİLSEM Sınavına Bugün Başlayın, Farkı İlk Haftada Hissedin
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Öğrenci, Veli ve Eğitmen portalları tam izolasyon ile hizmet verir. Çocuğunuzun bilişsel gelişimini güvenle takip edin.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigateToLogin('student')}
                className="px-6 py-3.5 rounded-xl bg-white text-indigo-950 font-extrabold text-sm hover:bg-slate-100 transition-all cursor-pointer  active:scale-98 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4 text-indigo-600" />
                <span>Öğrenci Girişi</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('parent')}
                className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm border border-emerald-400/40 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Veli Portalı Girişi</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('admin')}
                className="px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Yönetici & Soru Mimarı</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (Accordion) */}
      <section id="sss" className="py-16 bg-white border-t border-zinc-200 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Aklınıza Takılanlar
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-['Outfit',sans-serif]">
              BİLSEM Hazırlık Sıkça Sorulan Sorular
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              Sınav süreci, değerlendirme kriterleri ve platform işleyişi hakkında merak edilenler.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 bg-slate-50 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      sound.playClick();
                      setExpandedFaq(isOpen ? null : idx);
                    }}
                    className="w-full p-4 sm:p-5 text-left font-extrabold text-slate-900 text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-white shrink-0 text-slate-600">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-zinc-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comprehensive Modern Footer */}
      <Footer onNavigate={onNavigate} onStartDemo={onStartDemo || onNavigateToLogin} />
    </div>
  );
};

