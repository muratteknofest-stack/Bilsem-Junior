import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BaseQuestion, ExamResult, CognitiveCategory, DifficultyLevel } from '../types';
import { generateQuestion, generateQuestionForGrade } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualCountdownTimer } from './VisualCountdownTimer';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Trophy,
  Brain,
  Target,
  Crown,
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Home,
  RotateCcw,
  Sparkles,
  BarChart3,
  Award,
  Timer,
  Zap,
  AlertTriangle,
  Pause,
  Play,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamSessionViewProps {
  onNavigateHome: () => void;
}

interface ExamMode {
  id: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  iconColor: string;
  qCount: number;
  mins: number;
  grade?: 1 | 2 | 3 | 4;
  category?: CognitiveCategory;
}

const EXAM_MODES: ExamMode[] = [
  // Hızlı & Karışık
  { id: 'warmup', title: 'Hızlı Isınma', desc: 'Zihin Açıcı Egzersiz (5 Soru)', icon: Zap, color: 'from-amber-400 to-orange-500', iconColor: 'text-amber-100', qCount: 5, mins: 5 },
  
  // 1. Sınıf Modları
  { id: 'grade1_mini', title: '1. Sınıf Keşif (Kısa)', desc: 'Isınma Denemesi', icon: Sparkles, color: 'from-emerald-400 to-teal-500', iconColor: 'text-emerald-100', qCount: 10, mins: 10, grade: 1 },
  { id: 'grade1_std', title: '1. Sınıf Genel Deneme', desc: 'Standart BİLSEM Testi', icon: Target, color: 'from-emerald-500 to-teal-600', iconColor: 'text-emerald-100', qCount: 20, mins: 20, grade: 1 },
  { id: 'grade1_pro', title: '1. Sınıf Zor Test', desc: 'İleri Düzey Zorluk', icon: Crown, color: 'from-emerald-600 to-teal-700', iconColor: 'text-emerald-100', qCount: 30, mins: 35, grade: 1 },
  
  // 2. Sınıf Modları
  { id: 'grade2_mini', title: '2. Sınıf Isınma', desc: 'Mantık ve Dikkat', icon: Zap, color: 'from-blue-400 to-indigo-500', iconColor: 'text-blue-100', qCount: 10, mins: 12, grade: 2 },
  { id: 'grade2_std', title: '2. Sınıf Genel Sınav', desc: 'Standart Değerlendirme', icon: Brain, color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-100', qCount: 25, mins: 30, grade: 2 },
  { id: 'grade2_pro', title: '2. Sınıf Maraton', desc: 'Tüm Konulardan Uzun Test', icon: Trophy, color: 'from-blue-600 to-indigo-700', iconColor: 'text-blue-100', qCount: 40, mins: 50, grade: 2 },

  // 3. Sınıf Modları
  { id: 'grade3_mini', title: '3. Sınıf Hızlı Analitik', desc: 'Kısa Analitik Test', icon: Sparkles, color: 'from-purple-400 to-fuchsia-500', iconColor: 'text-purple-100', qCount: 15, mins: 15, grade: 3 },
  { id: 'grade3_std', title: '3. Sınıf Odaklanma Testi', desc: 'Karma Beceriler', icon: Target, color: 'from-purple-500 to-fuchsia-600', iconColor: 'text-purple-100', qCount: 30, mins: 35, grade: 3 },
  { id: 'grade3_pro', title: '3. Sınıf Süper Test', desc: 'İleri Derece Değerlendirme', icon: Crown, color: 'from-purple-600 to-fuchsia-700', iconColor: 'text-purple-100', qCount: 45, mins: 60, grade: 3 },

  // 4. Sınıf Modları
  { id: 'grade4_mini', title: '4. Sınıf Ön Test', desc: 'Kısa Değerlendirme', icon: Zap, color: 'from-rose-400 to-pink-500', iconColor: 'text-rose-100', qCount: 15, mins: 15, grade: 4 },
  { id: 'grade4_std', title: '4. Sınıf Şampiyonlar', desc: 'Standart Tam Sınav', icon: Trophy, color: 'from-rose-500 to-pink-600', iconColor: 'text-rose-100', qCount: 35, mins: 45, grade: 4 },
  { id: 'grade4_pro', title: '4. Sınıf Büyük Maraton', desc: 'Gerçek BİLSEM Provası', icon: Crown, color: 'from-rose-600 to-pink-700', iconColor: 'text-rose-100', qCount: 50, mins: 70, grade: 4 },

  // Konu Odaklı Denemeler
  { id: 'focus_matrix', title: 'Matris Uzmanı', desc: 'Sadece 2D Matrisler', icon: Brain, color: 'from-amber-500 to-orange-600', iconColor: 'text-amber-100', qCount: 20, mins: 20, category: 'matrix' },
  { id: 'focus_spatial', title: 'Uzamsal Algı', desc: 'Sadece 3D ve Yansıma', icon: Target, color: 'from-cyan-500 to-blue-600', iconColor: 'text-cyan-100', qCount: 20, mins: 25, category: 'spatial' },
  { id: 'focus_logic', title: 'Şifre ve Mantık', desc: 'Sembolik Şifreleme ve Zeka', icon: Zap, color: 'from-indigo-500 to-purple-600', iconColor: 'text-indigo-100', qCount: 20, mins: 25, category: 'logic' },
  { id: 'focus_memory', title: 'Görsel Hafıza', desc: 'Kısa Süreli Bellek', icon: Sparkles, color: 'from-fuchsia-500 to-pink-600', iconColor: 'text-fuchsia-100', qCount: 15, mins: 15, category: 'memory' },
  { id: 'focus_pattern', title: 'Örüntü Dedektifi', desc: 'Sıralı Şekil Dizileri', icon: Crown, color: 'from-emerald-500 to-green-600', iconColor: 'text-emerald-100', qCount: 20, mins: 20, category: 'pattern' },
  { id: 'focus_attention', title: 'Pür Dikkat', desc: 'Odaklanma ve Hız Testi', icon: Trophy, color: 'from-rose-500 to-red-600', iconColor: 'text-rose-100', qCount: 25, mins: 20, category: 'attention' },
  { id: 'focus_visual', title: 'Görsel Algı', desc: 'Farkı Bul & Eşleştir', icon: Zap, color: 'from-teal-500 to-cyan-600', iconColor: 'text-teal-100', qCount: 15, mins: 15, category: 'visual_perception' },
  { id: 'focus_numerical', title: 'Sayısal Zeka', desc: 'Sayısal Diziler ve Mantık', icon: Brain, color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-100', qCount: 20, mins: 25, category: 'numerical' }
];

export const ExamSessionView: React.FC<ExamSessionViewProps> = ({ onNavigateHome }) => {
  const [inExam, setInExam] = useState(false);
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isShaking, setIsShaking] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Active Exam Config State
  const [currentExamTitle, setCurrentExamTitle] = useState<string>('Deneme Sınavı');
  const [selectedMode, setSelectedMode] = useState<ExamMode | null>(null);
  
  // Duration & Strict Mode settings
  const [isStrictMode, setIsStrictMode] = useState<boolean>(true);
  const [isRestrictedMode, setIsRestrictedMode] = useState<boolean>(false);

  // Timer & pacing state
  const [totalSeconds, setTotalSeconds] = useState<number>(20 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(20 * 60);
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(0);
  const [endedByTimeout, setEndedByTimeout] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const timerRef = useRef<any>(null);

  // Check if an active exam was stored in LocalStorage
  useEffect(() => {
    const saved = dataService.getActiveExam();
    if (saved && saved.status === 'in_progress' && saved.questions?.length > 0) {
      setQuestions(saved.questions);
      setCurrentIndex(saved.currentIndex || 0);
      setAnswers(saved.answers || {});
      setFlags(saved.flags || {});
      const total = saved.totalSeconds || 20 * 60;
      setTotalSeconds(total);
      setRemainingSeconds(saved.remainingSeconds !== undefined ? saved.remainingSeconds : total);
      setInExam(true);
    }
  }, []);

  // Autosave active exam on state change
  useEffect(() => {
    if (inExam && !examResult && questions.length > 0) {
      dataService.saveActiveExam({
        status: 'in_progress',
        questions,
        currentIndex,
        answers,
        flags,
        totalSeconds,
        remainingSeconds,
      });
    }
  }, [inExam, examResult, questions, currentIndex, answers, flags, totalSeconds, remainingSeconds]);

  // Countdown timer with Strict Mode support
  useEffect(() => {
    if (inExam && !examResult && !isPaused) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (isStrictMode) {
              clearInterval(timerRef.current);
              finishExam(true);
              return 0;
            } else {
              setOvertimeSeconds((ot) => ot + 1);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [inExam, examResult, isStrictMode, isPaused]);

  const resetToModeSelection = () => {
    sound.playClick();
    dataService.clearActiveExam();
    setInExam(false);
    setExamResult(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setFlags({});
    setShowFinishConfirm(false);
  };

  const startNewExam = (mode?: any) => {
    sound.playClick();
    const targetMode: ExamMode = (mode && typeof mode === 'object' && typeof mode.qCount === 'number')
      ? mode
      : (selectedMode || EXAM_MODES[0]);

    setSelectedMode(targetMode);
    setCurrentExamTitle(targetMode.title);
    const categories: CognitiveCategory[] = [
      'pattern',
      'matrix',
      'spatial',
      'logic',
      'attention',
      'visual_perception',
      'numerical',
      'memory',
    ];

    const qList: BaseQuestion[] = [];
    const count = targetMode.qCount || 10;
    for (let i = 0; i < count; i++) {
      if (targetMode.category) {
        const diff = Math.min(6, Math.floor(i / (count / 4)) + 2) as DifficultyLevel;
        qList.push(generateQuestion({
          category: targetMode.category,
          difficulty: diff,
          seed: 700000 + Date.now() + i * 997,
        }));
      } else if (targetMode.grade) {
        const diff = Math.min(6, Math.floor(i / (count / 4)) + 2) as DifficultyLevel;
        qList.push(generateQuestionForGrade(targetMode.grade as any, 700000 + Date.now() + i * 997, undefined, diff));
      } else {
        const cat = categories[i % categories.length];
        const diff = Math.min(6, Math.floor(i / (count / 4)) + 2) as DifficultyLevel;
        const q = generateQuestion({
          category: cat,
          difficulty: diff,
          seed: 700000 + Date.now() + i * 997,
        });
        qList.push(q);
      }
    }

    const initialSecs = (targetMode.mins || 15) * 60;
    setTotalSeconds(initialSecs);
    setRemainingSeconds(initialSecs);
    setOvertimeSeconds(0);
    setEndedByTimeout(false);
    setQuestions(qList);
    setCurrentIndex(0);
    setAnswers({});
    setFlags({});
    setExamResult(null);
    setShowFinishConfirm(false);
    setInExam(true);
  };

  const handleSelectOption = (optId: string) => {
    const q = questions[currentIndex];
    if (!q) return;
    
    const isCorrect = optId === q.correctOptionId;
    if (isCorrect) {
      sound.playSuccess();
      try {
        confetti({ 
          particleCount: 150, 
          spread: 100, 
          origin: { y: 0.5 },
          colors: ['#10b981', '#34d399', '#fbbf24', '#3b82f6'],
          disableForReducedMotion: true,
          zIndex: 9999
        });
      } catch {}
    } else {
      sound.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#ef4444', '#f87171', '#94a3b8'],
          gravity: 1.5,
          ticks: 100,
          disableForReducedMotion: true,
          zIndex: 9999
        });
      } catch {}
    }

    setAnswers((prev) => ({
      ...prev,
      [q.id]: optId,
    }));
  };

  const toggleFlag = () => {
    const q = questions[currentIndex];
    if (!q) return;
    sound.playClick();
    setFlags((prev) => ({
      ...prev,
      [q.id]: !prev[q.id],
    }));
  };

  const finishExam = (timeoutTriggered = false) => {
    sound.playLevelUp();
    dataService.clearActiveExam();

    if (timeoutTriggered) {
      setEndedByTimeout(true);
    }

    try {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        disableForReducedMotion: true,
        zIndex: 9999
      });
    } catch {}

    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    const breakdown: Record<CognitiveCategory, { total: number; correct: number }> = {
      visual_perception: { total: 0, correct: 0 },
      pattern: { total: 0, correct: 0 },
      matrix: { total: 0, correct: 0 },
      spatial: { total: 0, correct: 0 },
      logic: { total: 0, correct: 0 },
      attention: { total: 0, correct: 0 },
      memory: { total: 0, correct: 0 },
      numerical: { total: 0, correct: 0 },
        verbal: { total: 0, correct: 0 },
        coding: { total: 0, correct: 0 },
    };

    questions.forEach((q) => {
      const userChoice = answers[q.id];
      const cat = q.category;
      if (!breakdown[cat]) breakdown[cat] = { total: 0, correct: 0 };
      breakdown[cat].total += 1;

      if (!userChoice) {
        blankCount += 1;
      } else if (userChoice === q.correctOptionId) {
        correctCount += 1;
        breakdown[cat].correct += 1;
        dataService.updateSkillMastery(cat, true, q.difficulty);
      } else {
        wrongCount += 1;
        dataService.addMistake(q);
        dataService.updateSkillMastery(cat, false, q.difficulty);
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    const xpReward = correctCount * 15 + 50; // Exam completion bonus
    dataService.addXP(xpReward);
    dataService.recordPracticeSession(Math.max(5, Math.round((totalSeconds - remainingSeconds + overtimeSeconds) / 60)));

    const result: ExamResult = {
      examId: `exam-${Date.now()}`,
      title: currentExamTitle,
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      blankAnswers: blankCount,
      scorePercentage,
      totalTimeSeconds: Math.max(1, totalSeconds - remainingSeconds + overtimeSeconds),
      categoryBreakdown: breakdown,
    };

    dataService.saveExamResult(result);
    setExamResult(result);
    setShowFinishConfirm(false);

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flags).filter(Boolean).length;
  const remainingQuestionsCount = Math.max(0, questions.length - answeredCount);
  const secondsPerRemainingQuestion =
    remainingQuestionsCount > 0 && remainingSeconds > 0
      ? Math.round(remainingSeconds / remainingQuestionsCount)
      : 0;

  // 1. INTRO / START SCREEN
  if (!inExam && !examResult) {
    const pastResults = dataService.getExamResults();
    return (
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-600" />
              <span>BİLSEM Deneme Sınavı Merkezi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Gerçek sınav formatına uygun, süreli ve tüm bilişsel alanları kapsayan deneme sınavı.
            </p>
          </div>
        </div>

        {/* Hero Card with Duration and Strict Mode Settings */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white rounded-xl p-6 sm:p-8  relative overflow-hidden space-y-6">
          <div className="space-y-2 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
              Resmi Sınav Simülatörü
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif]">
              Test Modunu Seç
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200">
              Kendi seviyene uygun olan testi seç ve zihnini hemen sınırlarına kadar test etmeye başla!
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'grade1', label: '1. Sınıf' },
              { id: 'grade2', label: '2. Sınıf' },
              { id: 'grade3', label: '3. Sınıf' },
              { id: 'grade4', label: '4. Sınıf' },
              { id: 'focus', label: 'Konu Odaklı' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sound.playClick();
                  setActiveFilter(f.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-white text-indigo-900 '
                    : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Exam Mode Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAM_MODES.filter((mode) => {
              if (activeFilter === 'all') return true;
              if (activeFilter === 'focus') return !!mode.category;
              if (activeFilter === 'grade1') return mode.grade === 1 || mode.id === 'warmup';
              if (activeFilter === 'grade2') return mode.grade === 2 || mode.id === 'warmup';
              if (activeFilter === 'grade3') return mode.grade === 3 || mode.id === 'warmup';
              if (activeFilter === 'grade4') return mode.grade === 4 || mode.id === 'warmup';
              return true;
            }).map((mode) => {
              const IconComponent = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => startNewExam(mode)}
                  className={`relative p-5 rounded-xl bg-gradient-to-br ${mode.color} text-left overflow-hidden  hover:scale-105 active:scale-95 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center backdrop-blur-md">
                      <IconComponent className={`w-6 h-6 ${mode.iconColor}`} />
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-black/20 text-white text-[10px] font-bold backdrop-blur-md">
                      {mode.mins} Dk • {mode.qCount} Soru
                    </div>
                  </div>
                  
                  <div className="relative z-10 mt-4">
                    <h3 className="text-lg font-black text-white drop-">{mode.title}</h3>
                    <p className="text-xs text-white/80 font-medium mt-1">{mode.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Strict Mode Toggle */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Kısıtlı Sınav Modu</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isRestrictedMode ? 'bg-indigo-500 text-white' : 'bg-white/20 text-slate-300'
                }`}>
                  {isRestrictedMode ? 'AKTİF' : 'PASİF'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                {isRestrictedMode
                  ? 'Geri bildirim yok: Doğru/yanlış sonuçları ve açıklamalar sadece sınav sonunda gösterilir.'
                  : 'Serbest mod: Seçim yaptıktan sonra anında doğru/yanlış bildirimi gösterilir.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsRestrictedMode(!isRestrictedMode);
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isRestrictedMode ? 'bg-indigo-500' : 'bg-white/30'
              }`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${
                isRestrictedMode ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Katı Süre Modu (Strict Mode)</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isStrictMode ? 'bg-amber-500 text-white' : 'bg-white/20 text-slate-300'
                }`}>
                  {isStrictMode ? 'AKTİF' : 'PASİF'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                {isStrictMode
                  ? 'Resmi kural: Süre bittiğinde sınav otomatik kapanır ve hemen teslim edilir.'
                  : 'Serbest tempo: Süre bitince ek süre sayacı başlar, soruları tamamlayabilirsin.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsStrictMode(!isStrictMode);
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isStrictMode ? 'bg-amber-500' : 'bg-white/30'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white  ring-0 transition duration-200 ease-in-out ${
                  isStrictMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Past Exam Results History */}
        {pastResults.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Önceki Sınav Performansların</span>
            </h3>

            <div className="space-y-3">
              {pastResults.map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{res.title}</h4>
                    <span className="text-xs text-slate-500">{res.date}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-emerald-600">{res.correctAnswers} Doğru</span>
                    <span className="text-rose-500">{res.wrongAnswers} Yanlış</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-mono">
                      %{res.scorePercentage} Başarı
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. EXAM REPORT CARD / RESULTS
  if (examResult) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-12 space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto  ${
            endedByTimeout ? 'bg-amber-100 text-amber-700' : 'bg-amber-100 text-amber-600'
          }`}>
            {endedByTimeout ? <Timer className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {currentExamTitle} Karnen
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">{examResult.date}</p>
        </div>

        {/* Timeout Notification Notice */}
        {endedByTimeout && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Katı Süre Modu Kapsamında: Sınav süresi dolduğu için testiniz otomatik olarak teslim alındı.</span>
          </div>
        )}

        {/* Score Grid */}
        <div className="grid grid-cols-4 gap-2.5 text-center">
          <div className="p-3 bg-white rounded-xl border border-zinc-200 ">
            <span className="text-[11px] text-slate-500 block">Doğru</span>
            <strong className="text-xl font-bold text-emerald-600">{examResult.correctAnswers}</strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-zinc-200 ">
            <span className="text-[11px] text-slate-500 block">Yanlış</span>
            <strong className="text-xl font-bold text-rose-500">{examResult.wrongAnswers}</strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-zinc-200 ">
            <span className="text-[11px] text-slate-500 block">Boş</span>
            <strong className="text-xl font-bold text-slate-400">{examResult.blankAnswers}</strong>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 ">
            <span className="text-[11px] text-indigo-700 block">Puan</span>
            <strong className="text-xl font-bold text-indigo-700">%{examResult.scorePercentage}</strong>
          </div>
        </div>

        {/* Time and Duration Badge */}
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs sm:text-sm font-bold text-indigo-950">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Kullanılan Süre: {formatTime(examResult.totalTimeSeconds)}</span>
          </div>
          <span className="font-mono text-indigo-700">
            Ort. {Math.round(examResult.totalTimeSeconds / examResult.totalQuestions)} sn / soru
          </span>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Bilişsel Kategori Analizi</h4>
          <div className="space-y-2 text-xs">
            {Object.entries(examResult.categoryBreakdown).map(([cat, rawStats]) => {
              const stats = rawStats as { total: number; correct: number };
              if (stats.total === 0) return null;
              const catPct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={cat} className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span className="font-semibold text-slate-700 capitalize">
                    {cat?.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{stats.correct} / {stats.total}</span>
                    <span className="font-bold text-indigo-700 font-mono w-10 text-right">%{catPct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={resetToModeSelection}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm  transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yeni Deneme Modu Seç</span>
          </button>
          <button
            onClick={() => startNewExam(selectedMode || EXAM_MODES[0])}
            className="w-full py-3.5 rounded-xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Aynı Modu Tekrar Çöz (Yeni Sorular)</span>
          </button>
          <button
            onClick={onNavigateHome}
            className="w-full py-3.5 rounded-xl bg-white border-2 border-zinc-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-6 bg-white rounded-xl border border-zinc-200  space-y-4">
          <AlertCircle className="w-12 h-12 text-indigo-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Deneme Hazırlanıyor</h3>
          <p className="text-xs text-slate-500">Yeni bir deneme sınavı başlatmak için lütfen aşağıdaki butona tıklayın.</p>
          <button
            onClick={resetToModeSelection}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm  hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Deneme Modu Seçimine Dön
          </button>
        </div>
      </div>
    );
  }

  // 3. ACTIVE RUNNING EXAM
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 space-y-4">
      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center space-y-6 ">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Pause className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Sınav Duraklatıldı</h3>
                <p className="text-sm text-slate-500 font-medium">Süreniz durduruldu. Hazır olduğunuzda sınava kaldığınız yerden devam edebilirsiniz.</p>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                }}
                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg   active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Devam Et</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD: Visual Countdown Timer, Flag, Finish Button */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200  space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
              Soru {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold hidden sm:inline">
              Cevaplanan: {answeredCount} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Pause Button */}
            <button
              onClick={() => {
                sound.playClick();
                setIsPaused(true);
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ara Ver</span>
            </button>

            {/* Flag for Review */}
            <button
              onClick={toggleFlag}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                flags[currentQ.id]
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-zinc-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flags[currentQ.id] ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{flags[currentQ.id] ? 'İşaretlendi' : 'Bayrak Ekle'}</span>
            </button>

            {/* Finish Exam Button */}
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm  transition-colors cursor-pointer"
            >
              Sınavı Bitir
            </button>
          </div>
        </div>

        {/* Visual Countdown Timer Bar */}
        <VisualCountdownTimer
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          isStrictMode={isStrictMode}
          isOvertime={remainingSeconds <= 0 && overtimeSeconds > 0}
          overtimeSeconds={overtimeSeconds}
          label="Sınav Süresi"
        />

        {/* Live Pacing Assistant Banner */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 border-t border-zinc-200">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {secondsPerRemainingQuestion > 0
                ? `Kalan sorular için önerilen tempo: soru başına ~${secondsPerRemainingQuestion} sn`
                : 'Tüm soruları yanıtladın, bayraklı sorularını kontrol edebilirsin.'}
            </span>
          </div>
          {flaggedCount > 0 && (
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
              {flaggedCount} Bayraklı Soru
            </span>
          )}
        </div>
      </div>

      {/* Question Navigator Palette (1-15) */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200  overflow-x-auto">
        <div className="flex items-center justify-between gap-1.5 min-w-[340px]">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isFlagged = !!flags[q.id];
            const isCurrent = currentIndex === idx;

            let btnStyle = 'bg-slate-100 text-slate-600 border-zinc-200';
            if (isCurrent) {
              btnStyle = 'ring-2 ring-indigo-500 bg-indigo-600 text-white font-extrabold border-indigo-600';
            } else if (isFlagged) {
              btnStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
            } else if (isAnswered) {
              btnStyle = 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
            }

            return (
              <button
                key={q.id}
                onClick={() => {
                  sound.playClick();
                  setCurrentIndex(idx);
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs flex items-center justify-center border transition-all cursor-pointer shrink-0 relative ${btnStyle}`}
              >
                {idx + 1}
                {isFlagged && !isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 40, scale: 0.95, rotateY: -10 }}
          animate={
            isShaking
              ? { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } }
              : { opacity: 1, x: 0, scale: 1, rotateY: 0 }
          }
          exit={{ opacity: 0, x: -40, scale: 0.95, rotateY: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
          className="bg-white rounded-xl p-4 sm:p-6 border border-zinc-200  space-y-4"
        >
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
              Soru {currentIndex + 1} / {questions.length}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQ.prompt}
            </h2>
            {currentQ.secondaryPrompt && (
              <p className="text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50/80 py-1 px-3 rounded-xl inline-block border border-indigo-100">
                {currentQ.secondaryPrompt}
              </p>
            )}
          </div>

          {/* Visual Question Area */}
          <div className="py-2">
            <QuestionRenderer question={currentQ} />
          </div>

          {/* Answer Options Grid (CONFIDENTIAL: No immediate feedback!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currentQ.options.map((opt) => (
              <OptionRenderer
                key={opt.id}
                option={opt}
                isSelected={answers[currentQ.id] === opt.id}
                onSelect={() => handleSelectOption(opt.id)}
                disabled={false}
                showCorrect={false}
              />
            ))}
          </div>

          {/* Bottom Pagination Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-zinc-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Önceki</span>
            </button>

            <span className="text-xs text-slate-500 font-medium">
              {answeredCount} / {questions.length} Cevaplandı
            </span>

            <button
              onClick={() => {
                sound.playClick();
                if (currentIndex + 1 < questions.length) {
                  setCurrentIndex((prev) => prev + 1);
                } else {
                  setShowFinishConfirm(true);
                }
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white  cursor-pointer hover:bg-indigo-700"
            >
              <span>{currentIndex + 1 < questions.length ? 'Sonraki' : 'Sınavı Bitir'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4  animate-scaleIn">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Sınavı Tamamlamak İstiyor musun?</h3>
              <p className="text-xs text-slate-500 mt-1">
                {questions.length - answeredCount > 0 ? (
                  <strong className="text-amber-600">
                    Henüz cevaplamadığın {questions.length - answeredCount} soru var!
                  </strong>
                ) : (
                  'Tüm soruları cevapladın. Sonuçlarını görmek için onayla.'
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Sınava Dön
              </button>
              <button
                onClick={finishExam}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs  cursor-pointer"
              >
                Evet, Bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
