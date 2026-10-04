import React, { useState, useEffect } from 'react';
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
  Flame,
  Star,
  Users,
  Play,
  RotateCcw,
  Check,
  Lightbulb,
  BarChart2,
  GraduationCap,
  HeartHandshake,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Timer,
  ShieldCheck,
  Volume2,
  VolumeX,
  Target,
  Rocket,
  Crown,
  Smile,
  XCircle,
  HelpCircle,
  Shuffle,
  Gamepad2,
  Medal,
  TrendingUp,
  Clock,
  Sparkle,
  ArrowUpRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
  // Audio SFX state
  const [soundActive, setSoundActive] = useState(sound.enabled);

  const toggleSound = () => {
    const next = !soundActive;
    sound.enabled = next;
    setSoundActive(next);
    if (next) sound.playClick();
  };

  // Live Activity Ticker Items
  const tickerItems = [
    { name: 'Kerem (2. Sınıf)', action: '10\'lu Matris Tamamlama serisini tamamladı!', reward: '+120 XP', icon: '🚀' },
    { name: 'Elif (3. Sınıf)', action: '14 Günlük Kesintisiz BİLSEM Serisine ulaştı!', reward: '🛡️ Kalkan Kazandı', icon: '🔥' },
    { name: 'Zeynep (1. Sınıf)', action: 'Şekil Döndürme modülünde %100 başarı sağladı!', reward: '+150 XP', icon: '🌟' },
    { name: 'Arda (4. Sınıf)', action: 'BİLSEM Tablet Deneme Simülasyonunu bitirdi!', reward: '96 Puan', icon: '🏆' },
    { name: 'Mina (2. Sınıf)', action: 'Hata Defterindeki 5 zor soruyu telafi etti!', reward: '+100 XP', icon: '🧠' },
  ];
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Hero Mode: Live Question Solver vs. 3D World Preview
  const [heroMode, setHeroMode] = useState<'solver' | 'world'>('solver');

  // Interactive Live Question Generator State
  const [sampleSeed, setSampleSeed] = useState(5821);
  const [activeCategoryType, setActiveCategoryType] = useState<
    'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  >('visual_sequence');
  const [sampleQuestion, setSampleQuestion] = useState(() =>
    generateQuestionByType('visual_sequence', 5821, 2)
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [solverStreak, setSolverStreak] = useState(3);
  const [earnedXpTotal, setEarnedXpTotal] = useState(150);

  // Mascot "Piko" Dialogue & Reaction States
  const [mascotMood, setMascotMood] = useState<'idle' | 'thinking' | 'happy' | 'cheer'>('idle');
  const [mascotBubble, setMascotBubble] = useState<string>(
    'Merhaba şampiyon! 🦉 Ben Piko. MEB BİLSEM tablet sınavına oyun oynar gibi hazırlanmaya hazır mısın?'
  );

  const handleSelectOption = (id: string) => {
    if (isSubmitted) return;
    sound.playClick();
    setSelectedOptionId(id);
    setMascotMood('thinking');
    setMascotBubble('Harika bir seçim! Sence mantık kuralı doğru mu? Hadi kontrol edelim! 🔍');
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isSubmitted) return;
    const isCorrect = selectedOptionId === sampleQuestion.correctOptionId;
    setIsSubmitted(true);

    if (isCorrect) {
      sound.playSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'],
        });
      } catch {}
      setSolverStreak((s) => s + 1);
      setEarnedXpTotal((xp) => xp + 50);
      setMascotMood('cheer');
      setMascotBubble('MÜKEMMELSİN! 🎉 Kuralı tereyağından kıl çeker gibi çözdün! +50 XP kazandın!');
      setFeedback({
        isCorrect: true,
        message: 'Tebrikler! Üstün bir zihinsel muhakeme sergiledin.',
      });
    } else {
      sound.playError();
      setMascotMood('idle');
      setMascotBubble('Hiç üzülme! Yanlışlar en iyi öğretmenimizdir. Aşağıdaki görsel çözümü inceleyelim! 💡');
      setFeedback({
        isCorrect: false,
        message: 'Kuralı birlikte keşfedelim: İşte adım adım görsel çözüm izahı!',
      });
    }
  };

  const switchSampleType = (
    type: 'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  ) => {
    sound.playClick();
    setActiveCategoryType(type);
    const nextSeed = sampleSeed + 113;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(type, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
    setMascotMood('idle');
    setMascotBubble('Yeni bir bilişsel kategori açıldı! Şekilleri dikkatle incele bakalım 🚀');
  };

  const handleNextSampleQuestion = () => {
    sound.playClick();
    const nextSeed = sampleSeed + 181;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(activeCategoryType, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
    setMascotMood('idle');
    setMascotBubble('Yeni bir matematiksel tohumla sıfırdan soru üretildi! Hadi odaklanalım! 🎯');
  };

  // 60-Second Mini Warmup Sprint Game State
  const [warmupActive, setWarmupActive] = useState(false);
  const [warmupStep, setWarmupStep] = useState(0); // 0, 1, 2
  const [warmupScore, setWarmupScore] = useState(0);
  const [warmupTimer, setWarmupTimer] = useState(60);
  const [warmupCompleted, setWarmupCompleted] = useState(false);
  const [warmupSelected, setWarmupSelected] = useState<string | null>(null);

  const warmupQuestions = [
    {
      type: 'visual_sequence' as const,
      seed: 881,
      title: '1. Aşama: Görsel Örüntü Dedektifi',
      desc: 'Şekillerin dizilimindeki mantığı yakala ve soru işaretli kutuyu bul!',
      badge: 'Görsel Algı',
    },
    {
      type: 'figure_rotation' as const,
      seed: 943,
      title: '2. Aşama: Uzamsal Döndürme',
      desc: 'Şekli zihninde saat yönünde 90 derece çevir! Hangi seçenek doğru?',
      badge: '3B Zihinsel Simülasyon',
    },
    {
      type: 'matrix_2x2' as const,
      seed: 712,
      title: '3. Aşama: Matris Şampiyonu',
      desc: 'Satır ve sütunlar arasındaki gizli ilişkiyi çöz, matrisi tamamla!',
      badge: 'Soyut Muhakeme',
    },
  ];

  const [currentWarmupQ, setCurrentWarmupQ] = useState(() =>
    generateQuestionByType(warmupQuestions[0].type, warmupQuestions[0].seed, 2)
  );

  useEffect(() => {
    let t: any;
    if (warmupActive && !warmupCompleted && warmupTimer > 0) {
      t = setInterval(() => {
        setWarmupTimer((prev) => {
          if (prev <= 1) {
            setWarmupCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [warmupActive, warmupCompleted, warmupTimer]);

  const startWarmupGame = () => {
    sound.playLevelUp();
    setWarmupActive(true);
    setWarmupStep(0);
    setWarmupScore(0);
    setWarmupTimer(60);
    setWarmupCompleted(false);
    setWarmupSelected(null);
    setCurrentWarmupQ(
      generateQuestionByType(warmupQuestions[0].type, warmupQuestions[0].seed, 2)
    );
  };

  const handleWarmupAnswer = (optionId: string) => {
    if (warmupSelected) return;
    setWarmupSelected(optionId);
    const isCorrect = optionId === currentWarmupQ.correctOptionId;

    if (isCorrect) {
      sound.playSuccess();
      setWarmupScore((s) => s + 1);
    } else {
      sound.playError();
    }

    setTimeout(() => {
      const nextStep = warmupStep + 1;
      if (nextStep < warmupQuestions.length) {
        setWarmupStep(nextStep);
        setWarmupSelected(null);
        setCurrentWarmupQ(
          generateQuestionByType(warmupQuestions[nextStep].type, warmupQuestions[nextStep].seed, 2)
        );
      } else {
        setWarmupCompleted(true);
        sound.playComboMilestone(3);
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
          });
        } catch {}
      }
    }, 700);
  };

  // 3D Themed World Islands
  const [activeIslandIdx, setActiveIslandIdx] = useState(0);
  const themeIslands = [
    {
      id: 'kale',
      title: 'Kural Kalesi',
      sub: 'Görsel Örüntü & Sıralama',
      desc: 'Şekil, renk ve yön dizilimlerinin gizli algoritmalarını deşifre ederek eksik parçaları tamamla.',
      color: 'from-blue-600 via-indigo-600 to-cyan-500',
      shadowColor: 'rgba(59, 130, 246, 0.35)',
      grade: '1. ve 2. Sınıf MEB Tablet Formatı',
      stat: '10.000+ Benzersiz Varyasyon',
      icon: Shapes,
      modelUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=90',
      badge: 'Görsel Algı',
      challenge: '3 Parçalı Ardışık Ritim Bulmacası',
    },
    {
      id: 'labirent',
      title: 'Kristal Labirent',
      sub: '2B & 3B Matris Analitiği',
      desc: 'BİLSEM sınavının en yüksek puan getiren satır-sütun kurallarını çöz, çok boyutlu düşün.',
      color: 'from-purple-600 via-violet-600 to-pink-500',
      shadowColor: 'rgba(168, 85, 247, 0.35)',
      grade: 'En Çok Soru Çıkan Alan (MEB %35)',
      stat: 'Adım Adım Sokratik Koçluk',
      icon: Grid,
      modelUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=90',
      badge: 'Soyut Muhakeme',
      challenge: 'Raven Progresif Matris Seviye 3',
    },
    {
      id: 'uzay',
      title: 'Uzay Gözlemevi',
      sub: 'Uzamsal Zeka & 3B Döndürme',
      desc: 'Şekilleri zihninde 3 boyutlu canlandır; ayna simetrisi, küp katlama ve açı rotasyonlarında uzmanlaş.',
      color: 'from-pink-600 via-rose-600 to-amber-500',
      shadowColor: 'rgba(244, 63, 94, 0.35)',
      grade: 'Mühendislik & Geometrik Sezgi',
      stat: 'Görselleştirme Refleksi',
      icon: Compass,
      modelUrl: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=1200&q=90',
      badge: 'Uzamsal Algı',
      challenge: 'Zihinsel Küp Açılımı & Ayna Yansıması',
    },
    {
      id: 'arena',
      title: 'Şimşek Arenası',
      sub: 'Görsel Dikkat & Hızlı Tarama',
      desc: 'Zaman baskısı altında dikkati dağılmadan, gizli farkları ve çeldiricileri saniyeler içinde yakala.',
      color: 'from-amber-500 via-orange-600 to-red-500',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
      grade: 'Tablet Hız & Reaksiyon Taraması',
      stat: 'Ortalama 1.2 sn Çözüm Hızı',
      icon: Eye,
      modelUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=90',
      badge: 'Bilişsel Hız',
      challenge: 'Mikro-Detay & Gölge Eşleştirme',
    },
    {
      id: 'atolye',
      title: 'Mimarın Atölyesi',
      sub: 'Sayısal Mantık & Problem Çözme',
      desc: 'Terazi dengeleri, çark rotasyonları ve şekilli sayı denklemleriyle analitik aklını zirveye taşı.',
      color: 'from-emerald-500 via-teal-600 to-blue-600',
      shadowColor: 'rgba(16, 185, 129, 0.35)',
      grade: 'Genel Zihinsel Yetenek Alanı',
      stat: 'MEB BİLSEM 1-4. Sınıf Birebir',
      icon: Calculator,
      modelUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=90',
      badge: 'Analitik Akıl',
      challenge: 'Mekanik Dişli & Terazi Dengesi',
    },
  ];

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqs = [
    {
      q: 'MEB BİLSEM tablet ön değerlendirme sınavı nasıl yapılır?',
      a: 'Sınav, MEB sınav merkezlerinde tablet bilgisayarlar üzerinden gözetmen eşliğinde uygulanır. Sorularda metin veya sesli anlatım bulunmaz; tamamen şekil, matris ve görsel zeka ilişkilerine dayanır. ZekaPark, sınavın tablet dokunma mekaniklerini, süre hissini ve soru yapılarını birebir ekrana taşır.',
    },
    {
      q: 'ZekaPark soruları diğer test kitaplarından neden daha avantajlı?',
      a: 'Geleneksel kitaplar 300-400 statik soru sunar ve çocuk cevapları bir süre sonra ezberler. ZekaPark ise tohum tabanlı (seed) parametrik SVG motoru kullanır. Algoritma her defasında şekilleri, renkleri ve kuralları sıfırdan çizer; çocuk soru ezberleyemez, mantık kurmak zorunda kalır.',
    },
    {
      q: 'Yapay zeka koçu çocuğuma nasıl rehberlik ediyor?',
      a: 'Google Gemini tabanlı pedagojik koçumuz çocuğa doğrudan cevabı söylemez. Sokratik yöntemle 3 aşamalı ipucu verir: Önce nereye bakması gerektiğini (odak), ardından gizli kuralı, en son çeldiricileri eleme yöntemini fısıldar. Yanlış yaptığında ise "Hata Defteri" üzerinden hatanın mantığını şefkatle açıklar.',
    },
    {
      q: 'Günde kaç dakika çalışmak idealdir?',
      a: 'Pedagoglar ve zeka eğitmenleri çocukların bilişsel yorgunluk yaşamaması için günde 15-20 dakika (yaklaşık 10-15 nitelikli soru) çalışılmasını önerir. ZekaPark günlük hedef ve seri (streak) sistemiyle bu istikrarı oyunlaştırarak sevdirir.',
    },
    {
      q: 'Veli olarak çocuğumun gelişimini nasıl görebilirim?',
      a: 'Veli Portalı üzerinden 8 ana bilişsel kategorideki doğruluk yüzdelerini, soru başına çözüm sürelerini, Hata Defteri telafi grafiklerini anlık izleyebilir; ayrıca her pazar akşamı otomatik gelişim özetini e-posta ile alabilirsiniz.',
    },
  ];

  // Real Testimonials with Authenticity
  const testimonials = [
    {
      name: 'Merve Yılmaz',
      role: '2. Sınıf Velisi • İstanbul',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      badge: 'BİLSEM Genel Zihinsel Kazandı',
      comment:
        'Kızım tablet sınavında en çok matris ve döndürme sorularında tereddüt ediyordu. ZekaPark ile her gün 15 dakika pratik yaptı. Soruların her defasında farklı gelmesi ezberi tamamen yıktı!',
      score: '96 Puan',
    },
    {
      name: 'Burak Karaaslan',
      role: 'İlkokul Zümre Başkanı & BİLSEM Danışmanı',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      badge: 'Pedagojik Danışman Onaylı',
      comment:
        'Piyasadaki kitapların en büyük sorunu soruların bitmesi ve çocuğun cevapları ezberlemesidir. ZekaPark’ın parametrik soru motoru tam bir devrim. Öğrencilerime güvenle öneriyorum.',
      score: '5/5 Yıldız',
    },
    {
      name: 'Selin Aksoy',
      role: '3. Sınıf Velisi • Ankara',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      badge: 'Ön Değerlendirme 98 Puan',
      comment:
        'Hata Defteri özelliği muazzam. Çocuğumun yanlış yaptığı soru tipleri otomatik kaydediliyor ve birkaç gün sonra benzer kuralla tekrar karşısına çıkıyor. Eksik bırakmadan ilerledik.',
      score: '98 Puan',
    },
  ];

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 min-h-screen selection:bg-indigo-500 selection:text-white relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background 3D Ambient Light Orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-200/40 via-purple-200/20 to-transparent rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-[800px] -left-48 w-[600px] h-[600px] bg-gradient-to-r from-pink-200/30 to-purple-200/10 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-[1600px] -right-48 w-[700px] h-[700px] bg-gradient-to-l from-cyan-200/30 to-indigo-200/10 rounded-full blur-3xl -z-10" />

      {/* TOP LIVE TELEMETRY & AUDIO TICKER BAR */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-indigo-100/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Live Activity Marquee Pill */}
          <div className="flex items-center gap-2 overflow-hidden text-slate-700">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
              Canlı Akış
            </span>
            <div className="truncate font-medium text-xs flex items-center gap-1.5 transition-all duration-500">
              <span>{tickerItems[tickerIndex].icon}</span>
              <strong className="text-slate-900">{tickerItems[tickerIndex].name}</strong>
              <span className="text-slate-600">{tickerItems[tickerIndex].action}</span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                {tickerItems[tickerIndex].reward}
              </span>
            </div>
          </div>

          {/* Sound Toggle & Quick Access */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleSound}
              title={soundActive ? 'Ses Efektleri Açık' : 'Ses Efektleri Kapalı'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200"
            >
              {soundActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-700">Ses: Açık</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Ses: Kapalı</span>
                </>
              )}
            </button>

            <span className="text-slate-300 hidden md:inline">|</span>

            <button
              onClick={() => onNavigateToLogin('student')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-extrabold text-xs transition-transform active:scale-95 shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>Hemen Başla</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* HERO SECTION: 3D PLAYGROUND & LIVE INTERACTION */}
      <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT: VALUE PROPOSITION & PLAYFUL MASCOT "PIKO" */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            {/* Playful Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 text-indigo-800 text-xs sm:text-sm font-extrabold shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>MEB BİLSEM 2026 Tablet Sınavı Standartları</span>
              <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                40+ Motor
              </span>
            </div>

            {/* Main Punchy Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.35rem] font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-[1.12]">
              Çocuğunuz İçin{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                Oyun Tadında
              </span>{' '}
              Bilişsel Macera! 🚀
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Ezberci test kitaplarını rafa kaldırın. Sonsuz tohum üreten parametrik SVG soru motoru, MEB tablet simülasyonu ve çocuk dostu Sokratik yapay zeka rehberi ile potansiyeli zirveye taşıyın.
            </p>

            {/* MASCOT PIKO'S INTERACTIVE SPEECH CARD */}
            <div
              onClick={() => {
                sound.playClick();
                setMascotMood('cheer');
                setMascotBubble('Harika bir dedektifsin! Soruyu çözdükçe seviyen yükselecek ve yeni rozetler kazanacaksın! 🌟');
              }}
              className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border-2 border-indigo-100 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.15)] flex items-center gap-3.5 cursor-pointer hover:border-indigo-300 hover:shadow-lg transition-all text-left group"
            >
              {/* Mascot 3D Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl relative overflow-hidden">
                  <span className="animate-bounce-slight">🦉</span>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                    ✓
                  </span>
                </div>
              </div>

              {/* Speech Bubble */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-black text-indigo-900 font-['Outfit',sans-serif]">
                    Bilge Piko
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Bilişsel Zeka Rehberi
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-snug">
                  "{mascotBubble}"
                </p>
              </div>
            </div>

            {/* KEY ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                id="hero-student-start"
                onClick={() => {
                  sound.playLevelUp();
                  onNavigateToLogin('student');
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-extrabold text-base shadow-[0_15px_30px_-8px_rgba(79,70,229,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span>Öğrenci Olarak Başla</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  startWarmupGame();
                  const el = document.getElementById('hizli-isinma');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white border-2 border-indigo-200 text-indigo-950 font-extrabold text-base hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Gamepad2 className="w-5 h-5 text-indigo-600" />
                <span>60 Sn Hızlı Isınma</span>
              </button>
            </div>

            {/* Quick Role Portal Selectors */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs">
              <span className="text-slate-400 font-bold">Giriş Yap:</span>
              <button
                onClick={() => onNavigateToLogin('student')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-extrabold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>🦊 Öğrenci</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('parent')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-extrabold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>👩‍🏫 Veli Portalı</span>
              </button>
              <button
                onClick={() => onNavigateToLogin('admin')}
                className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-extrabold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>👨‍💻 Yönetici & Soru Mimarı</span>
              </button>
            </div>
          </div>

          {/* RIGHT: 3D HOLOGRAPHIC TABLET STAGE & LIVE SOLVER */}
          <div className="lg:col-span-6 relative perspective-1200">
            {/* 3D Glassmorphic Floating Tablet Device */}
            <div className="relative preserve-3d transition-all duration-700 hover:rotate-x-0 hover:rotate-y-0 group">
              {/* Outer Glow Halo */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition duration-1000 -z-10" />

              {/* Main Tablet Surface */}
              <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border-2 border-white/80 p-4 sm:p-6 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.25)] relative overflow-hidden">
                {/* Header of Device Screen */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-['Outfit',sans-serif]">
                      BİLSEM 2026 Canlı Soru Laboratuvarı
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live XP and Streak indicators */}
                    <div className="flex items-center gap-1 text-[11px] font-extrabold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                      <span>{solverStreak}x Seri</span>
                    </div>

                    <button
                      onClick={handleNextSampleQuestion}
                      title="Yeni Tohum Üret"
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-indigo-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Yeni Tohum</span>
                    </button>
                  </div>
                </div>

                {/* Subcategory Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-[11px] font-bold">
                  {[
                    { id: 'visual_sequence', label: 'Görsel Örüntü', icon: '🔷' },
                    { id: 'matrix_2x2', label: '2x2 Matris', icon: '🔲' },
                    { id: 'figure_rotation', label: 'Şekil Döndürme', icon: '🔄' },
                    { id: 'odd_one_out', label: 'Farklı Olan', icon: '🔍' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => switchSampleType(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                        activeCategoryType === cat.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Question Prompt */}
                <div className="mb-3 text-center">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                    {sampleQuestion.prompt}
                  </h3>
                  {sampleQuestion.secondaryPrompt && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {sampleQuestion.secondaryPrompt}
                    </p>
                  )}
                </div>

                {/* Dynamic SVG Question Renderer */}
                <div className="mb-4 bg-slate-50/70 p-2 rounded-2xl border border-slate-100 flex items-center justify-center min-h-[160px]">
                  <QuestionRenderer question={sampleQuestion} />
                </div>

                {/* Question Options */}
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

                {/* Submit & Solution Feedback */}
                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOptionId}
                    className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedOptionId
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md active:scale-98'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <span>{selectedOptionId ? 'Cevabı Doğrula ⚡' : 'Bir Seçenek İşaretle'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {feedback && (
                      <div
                        className={`p-3 rounded-xl text-center text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 ${
                          feedback.isCorrect
                            ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300'
                            : 'bg-amber-100/90 text-amber-950 border border-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Step-by-step visual solution breakdown */}
                    <VisualExplanationOverlay
                      explanation={sampleQuestion.explanation}
                      correctOptionId={sampleQuestion.correctOptionId}
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleNextSampleQuestion}
                        className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Sıradaki Soruyu Üret</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToLogin('student')}
                        className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm cursor-pointer shadow-sm"
                      >
                        Tam Sınavı Başlat →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 60-SECOND QUICK COGNITIVE WARMUP (LIVE MINI-GAME) */}
      <section
        id="hizli-isinma"
        className="py-16 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-24"
      >
        <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden border border-white/10 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.3)]">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-10" />

          <div className="max-w-3xl mx-auto text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Canlı Mini-Oyun Arenası</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-['Outfit',sans-serif]">
              60 Saniyelik Bilişsel Hız ve Zeka Isınması
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-medium">
              3 farklı zeka kategorisinden soruyu arka arkaya çözün; refleksinizi ölçüp özel yetenek rozetinizi anında alın!
            </p>
          </div>

          {!warmupActive && !warmupCompleted ? (
            /* WARMUP LOBBY */
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30 animate-bounce-slight mb-6">
                ⚡
              </div>
              <button
                onClick={startWarmupGame}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:scale-105 text-slate-950 font-black text-lg transition-transform active:scale-95 shadow-xl shadow-orange-500/30 cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Meydan Okumayı Başlat (3 Soru)</span>
              </button>
            </div>
          ) : !warmupCompleted ? (
            /* WARMUP GAMEPLAY SCREEN */
            <div className="max-w-2xl mx-auto bg-white text-slate-900 rounded-2xl p-5 sm:p-7 shadow-2xl">
              {/* Game HUD Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-indigo-700 text-sm font-['Outfit',sans-serif]">
                    Soru {warmupStep + 1} / 3
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {warmupQuestions[warmupStep].badge}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 font-mono font-black text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{warmupTimer}s</span>
                  </div>
                  <div className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    Skor: {warmupScore}
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-center mb-3">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {currentWarmupQ.prompt}
                </h4>
              </div>

              {/* Render Question Canvas */}
              <div className="bg-slate-50 p-2 rounded-xl mb-4 border border-slate-100">
                <QuestionRenderer question={currentWarmupQ} />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {currentWarmupQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleWarmupAnswer(opt.id)}
                    disabled={Boolean(warmupSelected)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      warmupSelected === opt.id
                        ? opt.id === currentWarmupQ.correctOptionId
                          ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-300'
                          : 'bg-rose-100 border-rose-500'
                        : 'bg-white border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <OptionRenderer
                      option={opt}
                      isSelected={warmupSelected === opt.id}
                      onSelect={() => handleWarmupAnswer(opt.id)}
                      disabled={Boolean(warmupSelected)}
                      showCorrect={Boolean(warmupSelected)}
                      isCorrectOption={opt.id === currentWarmupQ.correctOptionId}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* WARMUP VICTORY / RESULTS SCREEN */
            <div className="max-w-md mx-auto bg-white text-slate-900 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center text-3xl shadow-lg">
                🏆
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
                Harika Bir Performans!
              </h3>
              <p className="text-slate-600 text-sm font-medium">
                60 saniyelik zeka testini <strong>{warmupScore} / 3 doğru</strong> ile tamamladınız.
              </p>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-left">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 mb-1">
                  <Medal className="w-4 h-4 text-indigo-600" />
                  <span>Kazanılan Bilişsel Rozet:</span>
                </div>
                <div className="text-base font-extrabold text-indigo-950 font-['Outfit',sans-serif]">
                  {warmupScore === 3
                    ? '🌟 Üstün Zihinsel Matris Dedektifi'
                    : warmupScore === 2
                    ? '🎯 Keskin Görsel Gözlemci'
                    : '🌱 Gelişime Açık BİLSEM Kaşifi'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Düzenli günlük 15 dakika antrenmanla doğruluk oranınızı %94'ün üzerine çıkarabilirsiniz.
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={startWarmupGame}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Tekrar Dene
                </button>
                <button
                  onClick={() => onNavigateToLogin('student')}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Giriş Yap & Kaydet →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3D THEMED COGNITIVE WORLDS (INTERACTIVE ADVENTURE PARK) */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full border border-purple-200">
            3D Bilişsel Macera Dünyaları
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
            BİLSEM Yetenek Alanlarını Keşfet
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Her ada MEB tablet sınavının farklı bir bilişsel boyutunu temsil eder. Tıklayarak kazanımlarını inceleyin.
          </p>
        </div>

        {/* 5 Island Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {themeIslands.map((island, idx) => {
            const Icon = island.icon;
            const isSelected = activeIslandIdx === idx;
            return (
              <div
                key={island.id}
                onClick={() => {
                  sound.playClick();
                  setActiveIslandIdx(idx);
                }}
                className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-white border-indigo-600 shadow-xl ring-2 ring-indigo-500/20 scale-[1.02]'
                    : 'bg-white/80 border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Island 3D Art Preview */}
                  <div className="h-32 rounded-xl overflow-hidden mb-4 relative bg-slate-100">
                    <img
                      src={island.modelUrl}
                      alt={island.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-2 text-[10px] font-black text-white bg-slate-900/70 backdrop-blur-md px-2 py-0.5 rounded">
                      {island.badge}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-base font-['Outfit',sans-serif]">
                    {island.title}
                  </h3>
                  <div className="text-[11px] font-bold text-indigo-600 mt-0.5">
                    {island.sub}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {island.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold text-indigo-700">
                  <span>{island.grade}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Island Deep-Dive Showcase */}
        {themeIslands[activeIslandIdx] && (
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">
                  Seçili Ada Görevi:
                </span>
                <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {themeIslands[activeIslandIdx].challenge}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
                {themeIslands[activeIslandIdx].title} — {themeIslands[activeIslandIdx].sub}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {themeIslands[activeIslandIdx].desc} Çocuğunuz bu alanda pratik yaptıkça MEB tablet sınavındaki zorlu çeldiricileri saniyeler içinde ayırt etme refleksi kazanır.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => onNavigateToLogin('student')}
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Bu Adayı Keşfet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* COMPARISON LAB: Geleneksel Kitaplar vs. ZekaPark 3D Motoru */}
      <section className="py-16 bg-white border-y border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Bilimsel Farkımız
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Geleneksel Test Kitabı vs. ZekaPark
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Neden binlerce veli ve ilkokul zümre başkanı ZekaPark'ın dinamik motorunu tercih ediyor?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Traditional Books Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-100/70 border border-slate-200 space-y-5 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                  <span>📖 Geleneksel Test Kitapları</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mt-2 font-['Outfit',sans-serif]">
                  Ezberci ve Sınırlı Sistem
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Kağıt üzerindeki sabit sorular çocukların analitik refleksini değil, şıkları ezberlemesini sağlar.
                </p>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Soru Sayısı:</strong> 300-400 statik soru; kitap bitince tekrar çözülemez.</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Çözüm Desteği:</strong> Yalnızca arkadaki "Cevap: C" anahtarı; mantık anlatılmaz.</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Sınav Uyumu:</strong> MEB tablet sınavı dokunmatiktir; kağıt kalem formatı sınav ortamını yansıtmaz.</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Hata Takibi:</strong> Çocuğun unuttuğu veya takıldığı sorular sayfalarda kaybolur.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-200/60 text-slate-500 text-xs font-semibold text-center">
                Sıkıcı, tekrarı olmayan ve sınav ortamından uzak deneyim
              </div>
            </div>

            {/* ZekaPark Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/10 space-y-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>ZekaPark 3D Bilişsel Motoru</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2 font-['Outfit',sans-serif]">
                  Sonsuz Parametrik Tohum & Sokratik Yapay Zeka
                </h3>
                <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                  Çocuğun seviyesine anlık adapte olan, eğlenceli ve MEB tablet sınavıyla %100 birebir simülasyon.
                </p>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm text-indigo-100 relative z-10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Sonsuz Soru:</strong> Matematiksel tohumlarla anlık üretilen SVG vektörler; asla ezberlenemez.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Sokratik Yapay Zeka:</strong> Direkt cevabı vermeden 3 adımda ipucu verir, mantığı kavratır.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Akıllı Hata Defteri:</strong> Yanlış yapılan sorular otomatik kaydedilir ve telafi edilene kadar hatırlatılır.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Veli Raporlama:</strong> 8 kategoride haftalık doğruluk, hız ve gelişim bülteni veliye e-posta olarak iletilir.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-800/50 border border-indigo-400/30 text-indigo-200 text-xs font-bold text-center relative z-10 flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>%91.4 BİLSEM Aşama Başarı Oranı</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARENT TRUST & REAL TESTIMONIALS */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
            Kullanıcı Deneyimleri
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
            Veliler ve BİLSEM Mentörleri Ne Diyor?
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Ön değerlendirme sınavını başarıyla tamamlayan binlerce ailemizin gerçek görüşleri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {t.score}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-300 shrink-0"
                />
                <div>
                  <div className="font-black text-slate-900 text-sm font-['Outfit',sans-serif]">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{t.role}</div>
                  <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {t.badge}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      <section className="py-16 bg-white border-t border-slate-200 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Merak Edilenler
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
              BİLSEM Hazırlık ve Platform Rehberi
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              Sınav formatı, yaş seviyeleri ve soru işleyişine dair temel bilgiler.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      sound.playClick();
                      setOpenFaq(isOpen ? null : idx);
                    }}
                    className="w-full p-4 sm:p-5 text-left font-black text-slate-900 text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-white shrink-0 text-slate-600 shadow-xs">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer onNavigate={onNavigate} onStartDemo={onStartDemo || onNavigateToLogin} />
    </div>
  );
};
