import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BaseQuestion,
  CognitiveCategory,
  DifficultyLevel,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  UserProfile
} from '../types';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { StepByStepAiExplanation } from './StepByStepAiExplanation';
import { VisualCountdownTimer } from './VisualCountdownTimer';
import { AiHintModal } from './AiHintModal';
import { AiMistakeModal } from './AiMistakeModal';
import { ComboStreakIndicator, getComboTier } from './animations/ComboStreakIndicator';
import { ComboBurstOverlay } from './animations/ComboBurstOverlay';
import { StreakFloatingFloater } from './animations/StreakFloatingFloater';
import { dataService } from '../services/data-service';
import { answerPractice, startPractice, type IssuedPracticeQuestion } from '../services/practice-api-service';
import { weeklyChallengesService } from '../services/weekly-challenges-service';
import { sound } from '../lib/sound';
import {
  ArrowLeft,
  Star,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Home,
  Trophy,
  Timer,
  AlertTriangle,
  Zap,
  Lightbulb,
  Volume2,
  Mic,
  MicOff,
  HelpCircle,
  Flame,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PracticeSessionViewProps {
  initialCategory?: CognitiveCategory | 'mixed';
  onNavigateHome: () => void;
  onOpenMistakes: () => void;
}

const CATEGORY_OPTIONS: { id: CognitiveCategory | 'mixed'; label: string }[] = [
  { id: 'mixed', label: '🎲 Karışık (Tüm Konular)' },
  { id: 'pattern', label: '🔄 Görsel Örüntü' },
  { id: 'matrix', label: '▦ Matris Tamamlama' },
  { id: 'spatial', label: '🧭 Uzamsal Zeka' },
  { id: 'logic', label: '💡 Mantık & Analoji' },
  { id: 'attention', label: '🎯 Görsel Dikkat' },
  { id: 'visual_perception', label: '👁️ Görsel Algı' },
  { id: 'numerical', label: '🔢 Sayısal Muhakeme' },
  { id: 'memory', label: '🧠 Görsel Bellek' },
];

type TimerPreset = '5m' | '10m' | '15m' | 'untimed';

const STREAK_BADGES: Record<number, { icon: React.ReactNode, title: string, color: string, border: string }> = {
  3: { icon: <Flame className="w-8 h-8 text-white" />, title: '3 Seri! Alev Aldın!', color: 'bg-gradient-to-r from-orange-400 to-orange-600', border: 'border-orange-200' },
  5: { icon: <Zap className="w-8 h-8 text-white" />, title: '5 Seri! Yıldırım Hızı!', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600', border: 'border-yellow-200' },
  10: { icon: <Trophy className="w-8 h-8 text-white" />, title: '10 Seri! Durdurulamaz!', color: 'bg-gradient-to-r from-purple-500 to-indigo-600', border: 'border-purple-200' },
};

export const PracticeSessionView: React.FC<PracticeSessionViewProps> = ({
  initialCategory = 'mixed',
  onNavigateHome,
  onOpenMistakes,
}) => {
  // Setup phase vs active session
  const [inSetup, setInSetup] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CognitiveCategory | 'mixed'>(initialCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'adaptive'>('adaptive');

  // Pacing & Timer configuration
  const [timerPreset, setTimerPreset] = useState<TimerPreset>('10m');
  const [isStrictMode, setIsStrictMode] = useState<boolean>(true);

  // Active session state
  const [questions, setQuestions] = useState<IssuedPracticeQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showAiHint, setShowAiHint] = useState(false);
  const [showAiMistakeModal, setShowAiMistakeModal] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [endedByTimeout, setEndedByTimeout] = useState(false);
  const [consecutiveCorrectCount, setConsecutiveCorrectCount] = useState(0);
  const [activeMilestoneStreak, setActiveMilestoneStreak] = useState<number | null>(null);
  const [lastMilestoneBonus, setLastMilestoneBonus] = useState(50);
  const [showFloater, setShowFloater] = useState(false);
  const [lastEarnedXP, setLastEarnedXP] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Timing state
  const [totalSecondsLimit, setTotalSecondsLimit] = useState(600); // 10m default
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const timerRef = useRef<any>(null);

  // Voice features state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
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

  useEffect(() => {
    setUserProfile(dataService.getCurrentUser());
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakQuestion = () => {
    if (!currentQuestion || !('speechSynthesis' in window)) {
      alert('Tarayıcınız sesli okuma özelliğini desteklemiyor.');
      return;
    }
    
    window.speechSynthesis.cancel();
    const textToSpeak = `${currentQuestion.prompt} ${currentQuestion.secondaryPrompt || ''}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceRecognition = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      alert('Tarayıcınız ses tanıma özelliğini desteklemiyor. (Chrome, Edge veya Safari önerilir)');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      const optionA = ['a', 'adana', 'bir', 'birinci', '1'];
      const optionB = ['b', 'bursa', 'iki', 'ikinci', '2'];
      const optionC = ['c', 'ceyhan', 'ç', 'üç', 'üçüncü', '3'];
      const optionD = ['d', 'denizli', 'dört', 'dördüncü', '4'];

      let matchedId = null;
      if (optionA.some(word => transcript.includes(word) || transcript === word)) matchedId = 'A';
      else if (optionB.some(word => transcript.includes(word) || transcript === word)) matchedId = 'B';
      else if (optionC.some(word => transcript.includes(word) || transcript === word)) matchedId = 'C';
      else if (optionD.some(word => transcript.includes(word) || transcript === word)) matchedId = 'D';

      if (matchedId && !isSubmitted) {
        sound.playClick();
        setSelectedOptionId(matchedId);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch(e) {
      setIsListening(false);
    }
  };

  const getPresetSeconds = (preset: TimerPreset): number => {
    switch (preset) {
      case '5m': return 5 * 60;
      case '10m': return 10 * 60;
      case '15m': return 15 * 60;
      case 'untimed': return 0;
    }
  };

  const startSession = async () => {
    sound.playClick();
    setIsStarting(true);
    setPracticeError(null);
    try {
      const started = await startPractice({ context: 'practice', category: selectedCategory, difficulty: selectedDifficulty, count: 10 });
      const presetSecs = getPresetSeconds(timerPreset);
      setSessionId(started.sessionId);
      setTotalSecondsLimit(presetSecs);
      setRemainingSeconds(presetSecs);
      setOvertimeSeconds(0);
      setQuestions(started.questions);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setCorrectCount(0);
      setWrongCount(0);
      setEarnedXP(0);
      setIsCompleted(false);
      setEndedByTimeout(false);
      setSecondsElapsed(0);
      setInSetup(false);
    } catch (error) {
      setPracticeError(error instanceof Error ? error.message : 'Pratik başlatılamadı.');
      sound.playError();
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!inSetup && !isCompleted) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);

        if (totalSecondsLimit > 0) {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              if (isStrictMode) {
                // Strict mode: session ends immediately!
                clearInterval(timerRef.current);
                handleTimeoutExpiration();
                return 0;
              } else {
                // Non-strict: enters overtime
                setOvertimeSeconds((ot) => ot + 1);
                return 0;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [inSetup, isCompleted, totalSecondsLimit, isStrictMode]);

  const handleTimeoutExpiration = () => {
    sound.playError();
    setIsCompleted(true);
    setEndedByTimeout(true);
  };

  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    sound.playClick();
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isSubmitted || isAnswering || !currentQuestion || !sessionId) return;
    setIsAnswering(true);
    setPracticeError(null);
    try {
      const outcome = await answerPractice(sessionId, currentQuestion.challengeId, selectedOptionId);
      setQuestions((items) => items.map((item) => item.challengeId === currentQuestion.challengeId
        ? { ...item, correctOptionId: outcome.correctOptionId, explanation: outcome.explanation }
        : item));
      setIsSubmitted(true);
      setConsecutiveCorrectCount(outcome.consecutiveCorrect);
      setLastEarnedXP(outcome.xpAwarded);
      setEarnedXP((previous) => previous + outcome.xpAwarded);
      dataService.syncUserFromFirebase(outcome.profile);
      dataService.cacheAuthoritativeProgress({ masteries: outcome.masteries, mistakes: outcome.mistakes });
      weeklyChallengesService.recordCategoryQuestionSolved(currentQuestion.category);
      setUserProfile(outcome.profile);

      if (outcome.correct) {
        setCorrectCount((previous) => previous + 1);
        if ([2, 3, 5, 7, 10, 15, 20].includes(outcome.consecutiveCorrect)) {
          setLastMilestoneBonus(outcome.xpAwarded);
          setActiveMilestoneStreak(outcome.consecutiveCorrect);
          sound.playComboMilestone(outcome.consecutiveCorrect);
        } else if (outcome.consecutiveCorrect >= 2) {
          sound.playCombo(outcome.consecutiveCorrect);
        } else {
          sound.playSuccess();
        }
        setShowFloater(true);
        setTimeout(() => setShowFloater(false), 1200);
        try {
          confetti({ particleCount: outcome.consecutiveCorrect >= 5 ? 160 : 100, spread: 90, origin: { y: 0.5 }, disableForReducedMotion: true, zIndex: 9999 });
        } catch {}
      } else {
        sound.playError();
        setWrongCount((previous) => previous + 1);
        setActiveMilestoneStreak(null);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (error) {
      setPracticeError(error instanceof Error ? error.message : 'Cevap puanlanamadı.');
      sound.playError();
    } finally {
      setIsAnswering(false);
    }
  };

  const handleNextQuestion = () => {
    sound.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setShowAiHint(false);
      setShowAiMistakeModal(false);
      setActiveMilestoneStreak(null); // Clear milestone overlay on next question
    } else {
      // Complete Session
      setIsCompleted(true);
      sound.playLevelUp();
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. SETUP SCREEN
  if (inSetup) {
    return (
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              Pratik & Çalışma Odası
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Kategorini, zorluk seviyeni ve süre/tempo hedefini belirleyerek antrenmana başla.
            </p>
          </div>
        </div>

        {/* Category Picker */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
            1. Çalışma Alanı Seç
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`p-3.5 rounded-xl border-2 text-left font-bold text-sm transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 '
                    : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Picker */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
            2. Zorluk Seviyesi Belirle
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              disabled={!isSubmitted}
              onClick={() => {
                if (!isSubmitted) return;
                sound.playClick();
                setSelectedDifficulty('adaptive');
              }}
              className={`p-3.5 rounded-xl border-2 text-center font-bold text-sm transition-all cursor-pointer col-span-2 sm:col-span-4 ${
                selectedDifficulty === 'adaptive'
                  ? 'border-purple-600 bg-purple-50 text-purple-900  ring-2 ring-purple-500/20'
                  : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Akıllı Seviye (Kademeli Artış: Kolaydan Zora)</span>
              </div>
            </button>

            {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  sound.playClick();
                  setSelectedDifficulty(lvl);
                }}
                className={`p-3 rounded-xl border-2 text-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedDifficulty === lvl
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 '
                    : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                Seviye {lvl} • {DIFFICULTY_LABELS[lvl]}
              </button>
            ))}
          </div>
        </div>

        {/* NEW: 3. Visual Countdown Timer & Strict Mode Setup */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-5 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900">
                  3. Süre & Tempo Hedefi
                </h3>
                <p className="text-xs text-slate-500">
                  Öğrencinin zaman yönetimi ve pacing pratiği yapması için geri sayım sayacı
                </p>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => {
                sound.playClick();
                setTimerPreset('5m');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                timerPreset === '5m'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold '
                  : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block text-sm font-extrabold">5 Dakika</span>
              <span className="text-[11px] text-slate-500">30 sn / soru (Hızlı)</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setTimerPreset('10m');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                timerPreset === '10m'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold '
                  : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="block text-sm font-extrabold">10 Dakika</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded-md font-bold">Öneri</span>
              </div>
              <span className="text-[11px] text-slate-500">60 sn / soru (BİLSEM)</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setTimerPreset('15m');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                timerPreset === '15m'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold '
                  : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block text-sm font-extrabold">15 Dakika</span>
              <span className="text-[11px] text-slate-500">90 sn / soru (Rahat)</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setTimerPreset('untimed');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                timerPreset === 'untimed'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold '
                  : 'border-zinc-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block text-sm font-extrabold">Limitsiz</span>
              <span className="text-[11px] text-slate-500">Süre kısıtı yok</span>
            </button>
          </div>

          {/* Strict Mode Switch */}
          {timerPreset !== 'untimed' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Katı Süre Modu (Strict Mode)</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isStrictMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isStrictMode ? 'AKTİF' : 'PASİF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {isStrictMode
                    ? 'Süre sıfırlandığında pratik oturumu derhal sona erer ve sonuçlar hesaplanır.'
                    : 'Süre dolduğunda oturum kesilmez; ek süre (overtime) sayılarak çalışmaya devam edilir.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsStrictMode(!isStrictMode);
                }}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isStrictMode ? 'bg-amber-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white  ring-0 transition duration-200 ease-in-out ${
                    isStrictMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Start Button */}
        {practiceError && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{practiceError}</p>}
        <button
          onClick={startSession}
          disabled={isStarting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-base hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span>{isStarting ? 'Güvenli sorular hazırlanıyor…' : 'Antrenmanı Başlat (10 Soru)'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // 2. COMPLETION RESULTS SCREEN
  if (isCompleted) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 pb-28 md:pb-12 text-center space-y-6 animate-fadeIn">
        <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center mx-auto  ${
          endedByTimeout
            ? 'bg-amber-100 border-amber-300 text-amber-600 '
            : 'bg-amber-100 border-amber-300 text-amber-600 '
        }`}>
          {endedByTimeout ? <Timer className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {endedByTimeout ? 'Süre Doldu! Oturum Tamamlandı' : 'Tebrikler! Pratiği Tamamladın!'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {endedByTimeout
              ? 'Katı mod süresi dolduğu için oturum sonlandırıldı. İşte tamamlanan soruların özeti:'
              : 'Harika bir zihin egzersiziydi. İşte performans özetin:'}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white ">
            <span className="text-xs text-slate-500 block font-medium">Doğru</span>
            <strong className="text-2xl font-bold text-emerald-600">{correctCount}</strong>
          </div>
          <div className="p-4 rounded-xl bg-white ">
            <span className="text-xs text-slate-500 block font-medium">Yanlış / Boş</span>
            <strong className="text-2xl font-bold text-rose-500">{wrongCount + (questions.length - (correctCount + wrongCount))}</strong>
          </div>
          <div className="p-4 rounded-xl bg-white ">
            <span className="text-xs text-slate-500 block font-medium">Başarı</span>
            <strong className="text-2xl font-bold text-indigo-600">%{accuracy}</strong>
          </div>
        </div>

        {/* XP and Time Box with Pacing Details */}
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between text-sm font-bold text-indigo-950 gap-2">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Kazanılan Ödül: +{earnedXP} XP</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Harcanan Süre: {formatTime(secondsElapsed)}</span>
            </span>
            {overtimeSeconds > 0 && (
              <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-bold">
                +{formatTime(overtimeSeconds)} Ek Süre
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {wrongCount > 0 && (
            <button
              onClick={onOpenMistakes}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Hatalarımı Gör ({wrongCount} Soru)</span>
            </button>
          )}

          <button
            onClick={() => setInSetup(true)}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yeni Pratik Başlat</span>
          </button>

          <button
            onClick={onNavigateHome}
            className="w-full py-3.5 rounded-xl bg-white border-2 border-zinc-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // 3. ACTIVE QUESTION RUNNER
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 space-y-4">
      {/* Animated Combo Milestone Overlay */}
      <ComboBurstOverlay
        streak={activeMilestoneStreak}
        onDismiss={() => setActiveMilestoneStreak(null)}
        bonusXP={lastMilestoneBonus}
      />

      {/* In-Practice Top HUD with Visual Countdown Bar & Level Progress */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200  space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setInSetup(true)}
            title="Pratikten Çık"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Progress Indicator & Combo Streak */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              Soru {currentIndex + 1} / {questions.length}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${DIFFICULTY_COLORS[currentQuestion.difficulty]}`}>
              Sv. {currentQuestion.difficulty}
            </span>
            <ComboStreakIndicator streak={consecutiveCorrectCount} variant="hud" />
          </div>

          {/* XP & Fullscreen Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>+{earnedXP} XP</span>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        {userProfile && (
          <div className="w-full flex items-center gap-3 mt-1">
            <div className="shrink-0 text-[10px] font-bold text-slate-500 w-12 text-right">
              Seviye {userProfile.level}
            </div>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-zinc-200/50">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, ((userProfile.xp - (userProfile.level - 1) * 1000) / 1000) * 100))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="shrink-0 text-[10px] font-bold text-slate-500 w-12">
              Seviye {userProfile.level + 1}
            </div>
          </div>
        )}

        {/* Visual Countdown Progress Bar */}
        {totalSecondsLimit > 0 ? (
          <VisualCountdownTimer
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSecondsLimit}
            isStrictMode={isStrictMode}
            isOvertime={remainingSeconds <= 0 && overtimeSeconds > 0}
            overtimeSeconds={overtimeSeconds}
            label="Kalan Çalışma Süresi"
          />
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Süresiz Rahat Mod</span>
            <span className="font-mono">{formatTime(secondsElapsed)}</span>
          </div>
        )}
      </div>

      {/* Main Question Card with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 40, scale: 0.95, rotateY: -10 }}
          animate={
            isShaking
              ? { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } }
              : { opacity: 1, x: 0, scale: 1, rotateY: 0 }
          }
          exit={{ opacity: 0, x: -40, scale: 0.95, rotateY: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
          className={`bg-white rounded-xl p-4 sm:p-6 border transition-all duration-300  space-y-4 ${
            consecutiveCorrectCount >= 5
              ? 'border-amber-400   animate-combo-aura'
              : consecutiveCorrectCount >= 3
              ? 'border-orange-300  '
              : 'border-zinc-200'
          }`}
        >
          {/* Question Header & Prompt */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div className="text-center sm:text-left space-y-0.5 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </h2>
              <button
                onClick={speakQuestion}
                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Soruyu Sesli Oku"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {currentQuestion.secondaryPrompt && (
              <p className="text-xs text-slate-500">
                {currentQuestion.secondaryPrompt}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSubmitted && (
              <button
                onClick={toggleVoiceRecognition}
                className={`p-2 rounded-xl transition-all  shrink-0 flex items-center justify-center cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Mikrofona bas ve cevabını söyle (Örn: 'A şıkkı')"
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            )}

            {/* AI Hint Button on Header */}
            <button
              onClick={() => {
                sound.playClick();
                setShowAiHint(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm   active:scale-95 transition-all cursor-pointer border border-amber-300 shrink-0 group"
              title={isSubmitted ? 'Bu soruya özel pedagojik AI ipucu al' : 'Cevap anahtarı, teslimden önce istemciye gönderilmez'}
            >
              <Lightbulb className="w-4 h-4 text-slate-950 fill-slate-950 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="font-extrabold tracking-tight">İpucu Al</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/10 text-[10px] font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI</span>
              </span>
            </button>
          </div>
        </div>

        {/* Pedagogical Guidance Strip for Questions */}
        {!isSubmitted && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-400/30 text-amber-900 flex items-center justify-center shrink-0">
                <Lightbulb className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              </div>
              <p className="truncate sm:whitespace-normal">
                <span className="font-bold">Takıldın mı?</span> Doğrudan cevabı söylemeyen, adım adım düşündüren AI rehber hazır.
              </p>
            </div>
            <button
              type="button"
              disabled
              onClick={() => {
                sound.playClick();
                setShowAiHint(true);
              }}
              className="font-extrabold text-amber-700 flex items-center gap-1 shrink-0 cursor-not-allowed text-xs opacity-70"
            >
              <span>Teslimden sonra</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Programmatic Visual Question Canvas */}
        <div className="py-2">
          <QuestionRenderer question={currentQuestion as unknown as BaseQuestion} />
        </div>

        {/* Answer Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {currentQuestion.options.map((opt) => (
            <OptionRenderer
              key={opt.id}
              option={opt}
              isSelected={selectedOptionId === opt.id}
              onSelect={() => handleSelectOption(opt.id)}
              disabled={isSubmitted}
              showCorrect={isSubmitted}
              isCorrectOption={opt.id === currentQuestion.correctOptionId}
            />
          ))}
        </div>

        {/* Action Button & Feedback Banner */}
        {!isSubmitted ? (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 relative">
            <StreakFloatingFloater
              show={showFloater}
              xpEarned={lastEarnedXP}
              streakCount={consecutiveCorrectCount}
            />

            <button
              type="button"
              disabled
              onClick={() => {
                sound.playClick();
                setShowAiHint(true);
              }}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-70 shrink-0"
              title="Güvenli puanlama için ipucu teslimden sonra açılır"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>💡 İpucu teslimden sonra açılır</span>
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOptionId || isAnswering}
              className={`flex-1 w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedOptionId
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white   active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isAnswering ? 'Sunucuda kontrol ediliyor…' : selectedOptionId ? 'Cevabı Kontrol Et' : 'Bir Seçenek İşaretle'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 relative">
            <StreakFloatingFloater
              show={showFloater}
              xpEarned={lastEarnedXP}
              streakCount={consecutiveCorrectCount}
            />

            {/* Instant Friendly Feedback Banner */}
            <div
              className={`p-4 rounded-xl text-sm sm:text-base font-bold  ${
                selectedOptionId === currentQuestion.correctOptionId
                  ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-300 flex items-center justify-center gap-2'
                  : 'bg-gradient-to-r from-amber-50 to-rose-50 text-amber-950 border-2 border-rose-200'
              }`}
            >
              {selectedOptionId === currentQuestion.correctOptionId ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Harika! Süper düşündün! (+{lastEarnedXP} XP)</span>
                  {consecutiveCorrectCount >= 2 && (
                    <span className="ml-2 text-xs font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full animate-bounce">
                      🔥 {consecutiveCorrectCount}x Seri!
                    </span>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full text-center sm:text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="font-extrabold block text-xs sm:text-sm text-slate-900">
                        Bu soru biraz zordu, ama hiç sorun değil!
                      </span>
                      <span className="text-xs text-slate-600 font-normal">
                        Hata Defterine eklendi. AI ile hatanın nedenini öğrenebilirsin.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowAiMistakeModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm   active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer border border-white/20"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Neden Yanlış? (AI Analizi)</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                </div>
              )}
            </div>

            {/* Step-by-step Framer Motion AI Accordion Explanation */}
            <StepByStepAiExplanation
              question={currentQuestion as unknown as BaseQuestion}
              selectedOptionId={selectedOptionId || ''}
            />

            {/* Visual Explanation Overlay */}
            <VisualExplanationOverlay
              explanation={currentQuestion.explanation!}
              correctOptionId={currentQuestion.correctOptionId!}
            />

            {/* Next Question & AI Step Review Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {selectedOptionId !== currentQuestion.correctOptionId && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowAiMistakeModal(true);
                  }}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-gradient-to-r from-rose-50 to-purple-50 hover:from-rose-100 hover:to-purple-100 border-2 border-rose-300 text-rose-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all  shrink-0 active:scale-98"
                >
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>🤔 Neden Yanlış? (AI Pedagojik Açıklama)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowAiHint(true);
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>AI Çözüm İpuçlarını İncele</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="flex-1 w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base  transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{currentIndex + 1 < questions.length ? 'Sonraki Soru' : 'Sonuçları Gör'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
      </AnimatePresence>

      {/* AI Step-by-Step Hint Modal */}
      {currentQuestion && isSubmitted && currentQuestion.correctOptionId && (
        <AiHintModal
          question={currentQuestion as unknown as BaseQuestion}
          isOpen={showAiHint}
          onClose={() => setShowAiHint(false)}
        />
      )}

      {/* AI Mistake Explanation Modal ('Neden Yanlış?') */}
      {currentQuestion && selectedOptionId && isSubmitted && currentQuestion.correctOptionId && (
        <AiMistakeModal
          question={currentQuestion as unknown as BaseQuestion}
          selectedOptionId={selectedOptionId}
          isOpen={showAiMistakeModal}
          onClose={() => setShowAiMistakeModal(false)}
        />
      )}
    </div>
  );
};
