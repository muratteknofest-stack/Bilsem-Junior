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
  Sliders,
  Calendar,
  Layers,
  Activity,
  CheckSquare,
  Lock,
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
  // Sound system toggle
  const [soundActive, setSoundActive] = useState(sound.enabled);

  const toggleSound = () => {
    const next = !soundActive;
    sound.enabled = next;
    setSoundActive(next);
    if (next) sound.playClick();
  };

  // Live Activity Stream
  const activityItems = [
    { student: 'Kerem Y. (2. Sınıf)', city: 'İstanbul', action: 'Matris Tamamlama serisinde 10/10 yaptı', time: 'Az önce', badge: '+120 XP' },
    { student: 'Elif D. (3. Sınıf)', city: 'Ankara', action: '14 Günlük Kesintisiz Çalışma Serisine ulaştı', time: '2 dk önce', badge: 'Seri Kalkanı' },
    { student: 'Zeynep K. (1. Sınıf)', city: 'İzmir', action: 'Şekil Döndürme modülünü %100 doğrulukla tamamladı', time: '5 dk önce', badge: '+150 XP' },
    { student: 'Arda T. (4. Sınıf)', city: 'Bursa', action: 'BİLSEM Tablet Deneme Sınavında 96 puan aldı', time: '8 dk önce', badge: 'Derece' },
    { student: 'Mina S. (2. Sınıf)', city: 'Antalya', action: 'Hata Defterindeki 4 soruyu başarıyla telafi etti', time: '12 dk önce', badge: '+100 XP' },
  ];
  const [activeStreamIdx, setActiveStreamIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStreamIdx((prev) => (prev + 1) % activityItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Hero Live Interactive Question Solver
  const [sampleSeed, setSampleSeed] = useState(4829);
  const [activeCategoryType, setActiveCategoryType] = useState<
    'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  >('visual_sequence');
  const [sampleQuestion, setSampleQuestion] = useState(() =>
    generateQuestionByType('visual_sequence', 4829, 2)
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [streakCount, setStreakCount] = useState(4);
  const [totalXp, setTotalXp] = useState(240);

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
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981'],
        });
      } catch {}
      setStreakCount((s) => s + 1);
      setTotalXp((xp) => xp + 50);
      setFeedback({
        isCorrect: true,
        message: 'Doğru Seçenek! Mantık kuralını ve satır ilişkisini kusursuz yakaladınız.',
      });
    } else {
      sound.playError();
      setFeedback({
        isCorrect: false,
        message: 'Farklı bir yaklaşım gerekiyor. Aşağıdaki adım adım görsel izahı inceleyelim.',
      });
    }
  };

  const switchSampleType = (
    type: 'visual_sequence' | 'matrix_2x2' | 'figure_rotation' | 'odd_one_out'
  ) => {
    sound.playClick();
    setActiveCategoryType(type);
    const nextSeed = sampleSeed + 131;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(type, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
  };

  const handleNextSampleQuestion = () => {
    sound.playClick();
    const nextSeed = sampleSeed + 223;
    setSampleSeed(nextSeed);
    setSampleQuestion(generateQuestionByType(activeCategoryType, nextSeed, 2));
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setFeedback(null);
  };

  // Interactive Daily Study Simulator (Parent Estimator Slider)
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const getEstimation = (mins: number) => {
    const questionsPerDay = Math.round(mins * 0.8);
    const monthlyQuestions = questionsPerDay * 30;
    const successRate = mins >= 20 ? 94 : mins >= 15 ? 91 : 84;
    const masteryPace = mins >= 20 ? '4 Hafta' : mins >= 15 ? '6 Hafta' : '8 Hafta';
    return { questionsPerDay, monthlyQuestions, successRate, masteryPace };
  };
  const currentEst = getEstimation(dailyMinutes);

  // Role Showcase Interactive Tabs (Student, Parent, Admin)
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'parent' | 'admin'>('student');

  // 60-Second Cognitive Sprint Mini-Game
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintStep, setSprintStep] = useState(0);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintTimer, setSprintTimer] = useState(60);
  const [sprintFinished, setSprintFinished] = useState(false);
  const [sprintSelected, setSprintSelected] = useState<string | null>(null);

  const sprintQuestions = [
    {
      type: 'visual_sequence' as const,
      seed: 1109,
      title: '1. Aşama: Görsel Örüntü & Sıralama',
      hint: 'Şekillerin dizilim yönünü ve renk değişimini takip edin.',
      tag: 'Görsel Algı',
    },
    {
      type: 'figure_rotation' as const,
      seed: 2403,
      title: '2. Aşama: 3B Zihinsel Döndürme',
      hint: 'Şekli zihninizde saat yönünde 90 derece çevirin.',
      tag: 'Uzamsal Zeka',
    },
    {
      type: 'matrix_2x2' as const,
      seed: 3817,
      title: '3. Aşama: 2x2 Matris Muhakemesi',
      hint: 'Satır ve sütunlar arasındaki ortak değişim kuralını belirleyin.',
      tag: 'Soyut Mantık',
    },
  ];

  const [currentSprintQ, setCurrentSprintQ] = useState(() =>
    generateQuestionByType(sprintQuestions[0].type, sprintQuestions[0].seed, 2)
  );

  useEffect(() => {
    let t: any;
    if (sprintActive && !sprintFinished && sprintTimer > 0) {
      t = setInterval(() => {
        setSprintTimer((prev) => {
          if (prev <= 1) {
            setSprintFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [sprintActive, sprintFinished, sprintTimer]);

  const startSprint = () => {
    sound.playLevelUp();
    setSprintActive(true);
    setSprintStep(0);
    setSprintScore(0);
    setSprintTimer(60);
    setSprintFinished(false);
    setSprintSelected(null);
    setCurrentSprintQ(
      generateQuestionByType(sprintQuestions[0].type, sprintQuestions[0].seed, 2)
    );
  };

  const handleSprintAnswer = (optionId: string) => {
    if (sprintSelected) return;
    setSprintSelected(optionId);
    const isCorrect = optionId === currentSprintQ.correctOptionId;

    if (isCorrect) {
      sound.playSuccess();
      setSprintScore((s) => s + 1);
    } else {
      sound.playError();
    }

    setTimeout(() => {
      const next = sprintStep + 1;
      if (next < sprintQuestions.length) {
        setSprintStep(next);
        setSprintSelected(null);
        setCurrentSprintQ(
          generateQuestionByType(sprintQuestions[next].type, sprintQuestions[next].seed, 2)
        );
      } else {
        setSprintFinished(true);
        sound.playComboMilestone(3);
        try {
          confetti({
            particleCount: 140,
            spread: 90,
            origin: { y: 0.5 },
          });
        } catch {}
      }
    }, 700);
  };

  // 4 Real High-Resolution Photo Pillars
  const photoPillars = [
    {
      title: 'Uzamsal Zeka ve 3B Zihinsel Modelleme',
      category: 'Uzamsal Muhakeme',
      desc: 'Çocuklar şekilleri sadece iki boyutta değil; derinlik, ayna simetrisi ve açı eksenlerinde zihninde döndürerek mühendislik ve tasarım refleksini erken yaşta edinir.',
      imageUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1600&q=90',
      badge: 'BİLSEM Uzamsal Boyut',
      stat: '%94 Görselleşme Başarısı',
      grade: '1, 2, 3 ve 4. Sınıf',
    },
    {
      title: 'Matris Tamamlama ve Analitik Mantık',
      category: 'Soyut Mantık',
      desc: 'BİLSEM tablet sınavında en belirleyici soru türü olan satır ve sütun kurallarını çözmek, çocuğun karmaşık problemleri sistemli parçalara ayırma becerisini geliştirir.',
      imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1600&q=90',
      badge: 'En Sık Çıkan Format (MEB %35)',
      stat: '10.000+ Özgün Varyasyon',
      grade: 'Tüm Seviyeler',
    },
    {
      title: 'Görsel Dikkat ve Odaklanmış Çalışma',
      category: 'Bilişsel Odaklanma',
      desc: 'Tablet sınavında süre kısıtı altında dikkatini dağıtmadan, gizli örüntüleri ve çeldirici detayları saniyeler içinde ayırt etme alışkanlığı kazandırır.',
      imageUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1600&q=90',
      badge: 'Bilişsel Hız ve Reaksiyon',
      stat: '1.2 sn Ortalama Karar Süresi',
      grade: 'Tablet Hız Taraması',
    },
    {
      title: 'Geometrik Sezgi ve Sayısal Muhakeme',
      category: 'Problem Çözme',
      desc: 'Ezberci formüller yerine görsel şekillerle modellenmiş örüntü mantığı, ilkokul çağında sağlam ve esnek bir analitik zihniyet inşa eder.',
      imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1600&q=90',
      badge: 'Analitik Temel',
      stat: 'Tam MEB Uyumlu',
      grade: 'Genel Zihinsel Yetenek',
    },
  ];

  // Verified User Stories with High-Res Real Photos
  const realStories = [
    {
      name: 'Merve Yılmaz',
      role: '2. Sınıf Velisi • Kadıköy, İstanbul',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=90',
      outcome: 'BİLSEM Genel Zihinsel 1. Aşamayı 96 Puanla Kazandı',
      quote:
        'Kızım piyasadaki test kitaplarını 2 haftada bitirip cevap şıklarını ezberlemişti. ZekaPark’ın tohum tabanlı dinamik soruları sayesinde her gün gerçek bir sınav deneyimi yaşadı.',
      rating: 5,
    },
    {
      name: 'Burak Karaaslan',
      role: 'İlkokul Zümre Başkanı & BİLSEM Danışmanı • Ankara',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=90',
      outcome: 'Zümre Onaylı Eğitim Modeli',
      quote:
        'Bir pedagog olarak sistemin en beğendiğim yanı Sokratik rehberlik: Çocuğa hazır cevap sunmuyor; önce nereye bakması gerektiğini, sonra gizli kuralı düşündürüyor. Ezberciliğin tam antitezi.',
      rating: 5,
    },
    {
      name: 'Selin Aksoy',
      role: '3. Sınıf Velisi • Çankaya, Ankara',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=90',
      outcome: 'BİLSEM Tablet Sınavı 98 Puan',
      quote:
        'Akıllı Hata Defteri telafi mekanizması olağanüstü. Yanlış yaptığı döndürme sorularını birkaç gün sonra farklı tohumla tekrar önüne getirdi. Eksik bırakmadan sınava girdik.',
      rating: 5,
    },
  ];

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqs = [
    {
      q: 'MEB BİLSEM tablet ön değerlendirme sınavı nasıl uygulanır?',
      a: 'BİLSEM ön değerlendirme sınavları MEB tarafından belirlenen sınav merkezlerinde tablet bilgisayarlar üzerinden gözetmen eşliğinde yapılır. Sorularda metin veya sesli anlatım bulunmaz; tamamen şekil, matris ve görsel zeka ilişkilerine dayanır. ZekaPark, sınavın tablet dokunma mekaniklerini, süre hissini ve soru yapılarını birebir ekrana taşır.',
    },
    {
      q: 'ZekaPark soruları diğer basılı test kitaplarından neden farklıdır?',
      a: 'Geleneksel test kitapları 300-400 statik soru içerir ve çocuk bir süre sonra doğru şıkkı harf olarak ezberler. ZekaPark ise parametrik SVG soru motoru kullanır. Her soru matematiksel bir tohum (seed) ile sıfırdan vektörel olarak çizilir; böylece sınırsız ve tekrarsız soru ile pratik yapılır.',
    },
    {
      q: 'Yapay zeka koçu çocuğuma nasıl rehberlik ediyor?',
      a: 'Google Gemini destekli pedagojik motorumuz çocuğa doğrudan cevabı fısıldamaz. 3 kademeli Sokratik ipucu sunar: 1. Nereye odaklanmalısın? (Odak), 2. Gizli kuralı keşfet (Kural), 3. Çeldiricileri ele (Eleme). Yanlış cevap verildiğinde ise hatanın mantığını şefkatle açıklar.',
    },
    {
      q: 'Günde kaç dakika ve kaç soru çözmek idealdir?',
      a: 'Pedagoglar ve zeka eğitmenleri çocukların bilişsel yorgunluk yaşamaması için günde 15-20 dakika (yaklaşık 10-15 nitelikli soru) çalışılmasını önerir. ZekaPark günlük hedef ve seri (streak) sistemiyle bu istikrarı oyunlaştırarak sevdirir.',
    },
    {
      q: 'Veli olarak çocuğumun gelişimini nasıl takip edebilirim?',
      a: 'Veli Portalı üzerinden 8 bilişsel kategorideki doğruluk yüzdelerini, soru başına çözüm sürelerini, Hata Defteri telafi grafiklerini anlık izleyebilir; ayrıca her pazar akşamı otomatik gelişim özetini e-posta ile alabilirsiniz.',
    },
  ];

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 min-h-screen selection:bg-indigo-600 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* REAL-TIME TELEMETRY & AUDIO BAR */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Live Activity Stream */}
          <div className="flex items-center gap-2.5 overflow-hidden text-slate-700">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
              Canlı Akış
            </span>
            <div className="truncate font-medium text-xs flex items-center gap-1.5 transition-all duration-300">
              <strong className="text-slate-900 font-bold">{activityItems[activeStreamIdx].student}</strong>
              <span className="text-slate-400">({activityItems[activeStreamIdx].city}):</span>
              <span className="text-slate-600">{activityItems[activeStreamIdx].action}</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-100">
                {activityItems[activeStreamIdx].badge}
              </span>
            </div>
          </div>

          {/* Sound & Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleSound}
              title={soundActive ? 'Ses Efektleri Açık' : 'Ses Efektleri Kapalı'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200"
            >
              {soundActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-700">Ses Açık</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Ses Kapalı</span>
                </>
              )}
            </button>

            <span className="text-slate-200 hidden md:inline">|</span>

            <button
              onClick={() => onNavigateToLogin('student')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold text-xs transition-transform active:scale-95 shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>Giriş Yap</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* HERO SECTION: REAL PHOTOGRAPHY + 3D INTERACTIVE TABLET SIMULATOR */}
      <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT: PUNCHY VALUE PROPOSITION & DIRECT ACTION */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/90 text-indigo-800 text-xs sm:text-sm font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>MEB BİLSEM 2026 Tablet Sınavı Standartları</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-[1.15]">
              Çocuğunuzun Zekasını{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Bilimsel Metotlarla
              </span>{' '}
              Zirveye Taşıyın
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              Ezberci test kitaplarını rafa kaldırın. Sonsuz tohum üreten parametrik SVG soru motoru, MEB tablet arayüzü simülasyonu ve çocuk dostu Sokratik yapay zeka rehberi ile potansiyeli keşfedin.
            </p>

            {/* REAL TRUST METRICS BAR */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 py-3 border-y border-slate-200/90">
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-black text-indigo-950 font-['Outfit',sans-serif]">
                  %91.4
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">1. Aşama Başarı Oranı</div>
              </div>
              <div className="text-center lg:text-left border-x border-slate-200/90 px-2 sm:px-4">
                <div className="text-2xl sm:text-3xl font-black text-purple-950 font-['Outfit',sans-serif]">
                  40+
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Bilişsel Soru Motoru</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-['Outfit',sans-serif]">
                  4.9 / 5
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Veli & Eğitmen Puanı</div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                id="hero-student-start"
                onClick={() => {
                  sound.playLevelUp();
                  onNavigateToLogin('student');
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-base shadow-lg shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Öğrenci Olarak Başla</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  startSprint();
                  const el = document.getElementById('hizli-isinma');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-800 font-bold text-base hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-900 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <Gamepad2 className="w-5 h-5 text-indigo-600" />
                <span>60 Sn Hızlı Deneme</span>
              </button>
            </div>

            {/* DIRECT ROLE SHORTCUTS */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-bold text-slate-600">
              <span className="text-slate-400 font-semibold">Giriş Portalları:</span>
              <button
                onClick={() => onNavigateToLogin('student')}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-colors"
              >
                Öğrenci Girişi
              </button>
              <button
                onClick={() => onNavigateToLogin('parent')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
              >
                Veli Portalı
              </button>
              <button
                onClick={() => onNavigateToLogin('admin')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors"
              >
                Yönetici & Soru Mimarı
              </button>
            </div>
          </div>

          {/* RIGHT: 3D HOLOGRAPHIC REAL TABLET SIMULATOR */}
          <div className="lg:col-span-6 relative perspective-1200">
            {/* Real Tablet Frame with 3D Depth & Shadow */}
            <div className="relative preserve-3d transition-all duration-700 hover:rotate-x-0 hover:rotate-y-0 group">
              {/* Soft Ambient Depth Shadow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl -z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

              {/* Tablet Body */}
              <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-4 sm:p-6 shadow-2xl shadow-indigo-950/10 relative overflow-hidden">
                {/* Device Screen Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-['Outfit',sans-serif]">
                      Canlı BİLSEM Soru Laboratuvarı
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                      <span>{streakCount} Günlük Seri</span>
                    </div>

                    <button
                      onClick={handleNextSampleQuestion}
                      title="Yeni Tohum Üret"
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors cursor-pointer border border-indigo-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Yeni Tohum</span>
                    </button>
                  </div>
                </div>

                {/* Subcategory Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-[11px] font-bold">
                  {[
                    { id: 'visual_sequence', label: 'Görsel Örüntü' },
                    { id: 'matrix_2x2', label: '2x2 Matris' },
                    { id: 'figure_rotation', label: 'Şekil Döndürme' },
                    { id: 'odd_one_out', label: 'Farklı Olan' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => switchSampleType(cat.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                        activeCategoryType === cat.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Prompt */}
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

                {/* Question Canvas */}
                <div className="mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-center min-h-[160px]">
                  <QuestionRenderer question={sampleQuestion} />
                </div>

                {/* Options */}
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

                {/* Submission & Visual Solution */}
                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOptionId}
                    className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedOptionId
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-98'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <span>{selectedOptionId ? 'Cevabı Doğrula' : 'Bir Seçenek İşaretleyin'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {feedback && (
                      <div
                        className={`p-3 rounded-xl text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${
                          feedback.isCorrect
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    <VisualExplanationOverlay
                      explanation={sampleQuestion.explanation}
                      correctOptionId={sampleQuestion.correctOptionId}
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleNextSampleQuestion}
                        className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Sıradaki Soruyu Dene</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToLogin('student')}
                        className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-sm"
                      >
                        Tam Sınavı Çöz →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 REAL HIGH-RESOLUTION EDITORIAL PHOTO PILLARS */}
      <section className="py-16 bg-white border-y border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Bilişsel Pedagoji & Gerçek Beceriler
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Gerçek Yetenekleri Geliştiren 4 Temel Zeka Alanı
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-normal">
              Çocuklar ZekaPark'ta sadece bir sınava değil; gelecekteki analitik problem çözme, fen, kodlama ve tasarım hayatına sağlam bir zihinsel temel atar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {photoPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-xl transition-all flex flex-col group"
              >
                {/* Real High-Resolution Photo */}
                <div className="relative h-52 sm:h-56 overflow-hidden bg-slate-200">
                  <img
                    src={pillar.imageUrl}
                    alt={pillar.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
                  <span className="absolute top-3 left-3 bg-white/95 text-slate-900 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                    {pillar.category}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-indigo-600/90 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                    {pillar.stat}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      {pillar.badge}
                    </span>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg mt-1 font-['Outfit',sans-serif]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                    <span>{pillar.grade}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE STUDY SIMULATOR (SLIDER & BENEFIT CALCULATOR) */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-indigo-950/20 border border-indigo-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Interactive Slider */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/15">
                <Sliders className="w-3.5 h-3.5" />
                <span>İnteraktif Bilişsel Gelişim Simülatörü</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-['Outfit',sans-serif] leading-tight">
                Günde Kaç Dakika Çalışmak İstersiniz?
              </h2>

              <p className="text-sm sm:text-base text-indigo-200 leading-relaxed">
                Pedagoglar günde 15–20 dakikalık odaklanmış pratiklerin, saatler süren yorucu test çözümlerinden 3 kat daha kalıcı zihinsel refleks oluşturduğunu kanıtlıyor.
              </p>

              {/* Slider Component */}
              <div className="bg-white/10 p-5 rounded-2xl border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                    Günlük Hedef Süre
                  </span>
                  <span className="text-2xl font-black text-amber-300 font-['Outfit',sans-serif]">
                    {dailyMinutes} Dakika / Gün
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={dailyMinutes}
                  onChange={(e) => {
                    sound.playClick();
                    setDailyMinutes(Number(e.target.value));
                  }}
                  className="w-full h-2.5 bg-indigo-950/80 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />

                <div className="flex justify-between text-[11px] font-bold text-indigo-300">
                  <span>5 dk (Hafif)</span>
                  <span>15 dk (Önerilen)</span>
                  <span>30 dk (Yoğun)</span>
                </div>
              </div>
            </div>

            {/* Right: Dynamic Computed Metrics */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-['Outfit',sans-serif]">
                  {currentEst.monthlyQuestions}+
                </div>
                <div className="text-xs font-bold text-indigo-100 mt-1">Aylık Çözülen Özgün Soru</div>
                <div className="text-[11px] text-indigo-300 mt-1">Tekrarsız tohum algoritması ile</div>
              </div>

              <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-['Outfit',sans-serif]">
                  %{currentEst.successRate}
                </div>
                <div className="text-xs font-bold text-indigo-100 mt-1">BİLSEM Aşama Tahmini</div>
                <div className="text-[11px] text-indigo-300 mt-1">Düzenli çalışma periyodu ile</div>
              </div>

              <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-black text-purple-300 font-['Outfit',sans-serif]">
                  {currentEst.masteryPace}
                </div>
                <div className="text-xs font-bold text-indigo-100 mt-1">Tam Kategori Hakimiyeti</div>
                <div className="text-[11px] text-indigo-300 mt-1">8 zeka alanında eksiksiz telafi</div>
              </div>

              <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-100">Kişiselleştirilmiş Plan</div>
                  <div className="text-[11px] text-indigo-300 mt-1">Çocuğunuzun temposuna anlık adapte olur</div>
                </div>
                <button
                  onClick={() => onNavigateToLogin('student')}
                  className="mt-3 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer text-center"
                >
                  Planı Başlat →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 60-SECOND COGNITIVE SPRINT (INTERACTIVE MINI-GAME) */}
      <section id="hizli-isinma" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-24">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-xl relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center space-y-2 mb-8">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Canlı Zeka Isınması
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
              60 Saniyelik Hızlı Bilişsel Deneme
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-normal">
              3 farklı zeka kategorisinden soruyu sırayla çözün; sürenizi ve doğruluğunuzu anında test edin.
            </p>
          </div>

          {!sprintActive && !sprintFinished ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <button
                onClick={startSprint}
                className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Denemeyi Başlat (3 Soru)</span>
              </button>
            </div>
          ) : !sprintFinished ? (
            <div className="max-w-2xl mx-auto bg-slate-50 rounded-2xl p-5 sm:p-7 border border-slate-200">
              {/* HUD */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-indigo-900 text-sm font-['Outfit',sans-serif]">
                    Soru {sprintStep + 1} / 3
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {sprintQuestions[sprintStep].tag}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 font-mono font-bold text-sm text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>{sprintTimer}s</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Doğru: {sprintScore}
                  </div>
                </div>
              </div>

              <div className="text-center mb-3">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {currentSprintQ.prompt}
                </h4>
              </div>

              <div className="bg-white p-2 rounded-xl mb-4 border border-slate-200">
                <QuestionRenderer question={currentSprintQ} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {currentSprintQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSprintAnswer(opt.id)}
                    disabled={Boolean(sprintSelected)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      sprintSelected === opt.id
                        ? opt.id === currentSprintQ.correctOptionId
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                          : 'bg-rose-50 border-rose-500'
                        : 'bg-white border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <OptionRenderer
                      option={opt}
                      isSelected={sprintSelected === opt.id}
                      onSelect={() => handleSprintAnswer(opt.id)}
                      disabled={Boolean(sprintSelected)}
                      showCorrect={Boolean(sprintSelected)}
                      isCorrectOption={opt.id === currentSprintQ.correctOptionId}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-slate-50 text-slate-900 rounded-3xl p-6 sm:p-8 text-center border border-slate-200 shadow-md space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl shadow-sm">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
                Deneme Tamamlandı!
              </h3>
              <p className="text-slate-600 text-sm">
                3 soruluk hızlı zeka taramasını <strong>{sprintScore} / 3 doğru</strong> ile tamamladınız.
              </p>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-left">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 mb-1">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Kazanılan Başarı Düzeyi:</span>
                </div>
                <div className="text-base font-extrabold text-indigo-950 font-['Outfit',sans-serif]">
                  {sprintScore === 3
                    ? 'Üstün Zihinsel Matris Yeteneği'
                    : sprintScore === 2
                    ? 'Yetkin Görsel Muhakeme'
                    : 'Gelişime Açık BİLSEM Adayı'}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={startSprint}
                  className="flex-1 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Tekrar Çöz
                </button>
                <button
                  onClick={() => onNavigateToLogin('student')}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Öğrenci Girişi Yap →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3 ROLE SHOWCASE (INTERACTIVE TABS: STUDENT, PARENT, TEACHER) */}
      <section className="py-16 bg-white border-y border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full border border-purple-200">
              Çok Rolü Mimari
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Öğrenci, Veli ve Eğitmen İçin Özel Portallar
            </h2>
            <p className="text-slate-600 text-sm font-normal">
              Her kullanıcı tipi için tamamen özelleştirilmiş, güvenli ve bağımsız kontrol panelleri.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveRoleTab('student');
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeRoleTab === 'student'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Öğrenci Portalı
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveRoleTab('parent');
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeRoleTab === 'parent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Veli Portalı
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveRoleTab('admin');
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeRoleTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yönetici & Soru Stüdyosu
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {activeRoleTab === 'student' && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Öğrenci Deneyimi
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
                    Sıkılmadan, Oyun Oynar Gibi Bilişsel Gelişim
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Öğrenci her gün hedeflerini tamamlar, serisini (streak) korur ve seviye atlar. Yanlış yaptığı sorular otomatik olarak Hata Defteri'ne eklenir ve telafi edilene kadar hatırlatılır.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Günlük Seri, Kalkan ve Rozet Sistemi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Sokratik 3 Kademeli Yapay Zeka İpucu</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>MEB Tablet Sınavı Birebir Simülasyonu</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => onNavigateToLogin('student')}
                    className="mt-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Öğrenci Olarak Giriş Yap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=90"
                    alt="BİLSEM öğrencisi zevkle tablet üzerinden pratik yapıyor"
                    className="w-full h-80 object-cover"
                  />
                </div>
              </>
            )}

            {activeRoleTab === 'parent' && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Veli Portalı & Raporlama
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
                    Çocuğunuzun Gelişimini Bilimsel Olarak İzleyin
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Artık çocuğunuzun hangi kategoride zorlandığını tahmin etmek zorunda değilsiniz. 8 bilişsel kategoriye özel doğruluk yüzdeleri, hız grafikleri ve haftalık e-posta bültenleri parmaklarınızın ucunda.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Haftalık Otomatik Gelişim E-postası</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>8 Bilişsel Kategori Radar Analizi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>%100 Reklamsız, Güvenli ve Pedagojik Alan</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => onNavigateToLogin('parent')}
                    className="mt-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Veli Portalına Giriş Yap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=90"
                    alt="Anne ve çocuk gelişim sonuçlarını birlikte inceliyor"
                    className="w-full h-80 object-cover"
                  />
                </div>
              </>
            )}

            {activeRoleTab === 'admin' && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Eğitmen & Soru Mimarı
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
                    Soru Stüdyosu ve Müfredat Yönetimi
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Eğitimciler ve zeka mentorları için geliştirilmiş soru havuzu paneli. 40+ motorun tohum parametrelerini test edin, toplu soru üretin ve müfredat matrisini doğrudan yönetin.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Soru Kalite Kontrolü & Stres Testi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>MEB BİLSEM Sınıf Seviye Matrisi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dinamik Soru Parametre Ayarlayıcı</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => onNavigateToLogin('admin')}
                    className="mt-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Yönetici Paneline Giriş Yap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=90"
                    alt="Eğitmen modern sınıfta zeka egzersizlerini yönetiyor"
                    className="w-full h-80 object-cover"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* REAL TESTIMONIALS WITH VERIFIED OUTCOMES */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
            Kullanıcı Deneyimleri
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit',sans-serif]">
            Veliler ve BİLSEM Mentörleri Ne Diyor?
          </h2>
          <p className="text-slate-600 text-sm font-normal">
            Ön değerlendirme sınavını başarıyla tamamlayan binlerce ailemizin gerçek görüşleri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {realStories.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-3">
                <img
                  src={item.photo}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shrink-0"
                />
                <div>
                  <div className="font-black text-slate-900 text-sm font-['Outfit',sans-serif]">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{item.role}</div>
                  <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-0.5 border border-emerald-100">
                    {item.outcome}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="py-16 bg-white border-t border-slate-200 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200">
              Merak Edilenler
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
              BİLSEM Hazırlık ve Platform Rehberi
            </h2>
            <p className="text-slate-600 text-sm font-normal">
              Sınav formatı, soru işleyişi ve günlük çalışma sürelerine dair temel bilgiler.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden transition-all"
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
