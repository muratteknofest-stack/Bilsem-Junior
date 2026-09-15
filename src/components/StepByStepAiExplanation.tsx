import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BaseQuestion, AiStepByStepExplanation, AiExplanationStep } from '../types';
import { aiStepExplanationService } from '../services/ai-step-explanation-service';
import { sound } from '../lib/sound';
import {
  Sparkles,
  ChevronDown,
  Target,
  Compass,
  Layers,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  BookOpen,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';

interface StepByStepAiExplanationProps {
  question: BaseQuestion;
  selectedOptionId: string;
  onOpenGlossary?: () => void;
}

export const StepByStepAiExplanation: React.FC<StepByStepAiExplanationProps> = ({
  question,
  selectedOptionId,
  onOpenGlossary,
}) => {
  const [data, setData] = useState<AiStepByStepExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Set of open step numbers (1-indexed)
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));
  // Currently speaking step number
  const [speakingStep, setSpeakingStep] = useState<number | null>(null);

  const isCorrect = selectedOptionId === question.correctOptionId;

  // Load AI step-by-step explanation
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setOpenSteps(new Set([1])); // Open first step initially

    aiStepExplanationService
      .getStepExplanation(question, selectedOptionId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [question.id, question.seed, selectedOptionId]);

  // Toggle individual step accordion
  const toggleStep = (stepNumber: number) => {
    sound.playClick();
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  // Expand all steps
  const handleExpandAll = () => {
    sound.playClick();
    if (!data) return;
    const all = new Set(data.steps.map((s) => s.stepNumber));
    setOpenSteps(all);
  };

  // Collapse all steps except first
  const handleCollapseAll = () => {
    sound.playClick();
    setOpenSteps(new Set([1]));
  };

  // Reveal next unopened step
  const handleRevealNext = () => {
    sound.playClick();
    if (!data) return;
    for (const step of data.steps) {
      if (!openSteps.has(step.stepNumber)) {
        setOpenSteps((prev) => new Set([...prev, step.stepNumber]));
        break;
      }
    }
  };

  // Speech synthesis for a specific step
  const toggleSpeak = (step: AiExplanationStep, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert('Tarayıcınız sesli okuma özelliğini desteklemiyor.');
      return;
    }

    window.speechSynthesis.cancel();
    if (speakingStep === step.stepNumber) {
      setSpeakingStep(null);
      return;
    }

    const textToSpeak = `${step.title}. ${step.explanation}. ${step.keyObservation ? 'Püf noktası: ' + step.keyObservation : ''}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.93;
    utterance.onend = () => setSpeakingStep(null);
    utterance.onerror = () => setSpeakingStep(null);

    setSpeakingStep(step.stepNumber);
    window.speechSynthesis.speak(utterance);
  };

  // Helper icon per step type
  const getStepIcon = (type: string, stepNumber: number) => {
    switch (type) {
      case 'focus':
        return <Target className="w-4 h-4 text-indigo-600" />;
      case 'rule':
        return <Compass className="w-4 h-4 text-amber-600" />;
      case 'elimination':
        return isCorrect ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <Layers className="w-4 h-4 text-rose-600" />
        );
      case 'tactic':
        return <Zap className="w-4 h-4 text-purple-600" />;
      default:
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
    }
  };

  // Helper color classes per step type
  const getStepTheme = (type: string, isOpen: boolean) => {
    switch (type) {
      case 'focus':
        return {
          border: isOpen ? 'border-indigo-200 bg-indigo-50/40' : 'border-zinc-200 bg-white hover:border-indigo-200',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          numberBg: isOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
          accent: 'bg-indigo-50 border-indigo-100 text-indigo-950',
        };
      case 'rule':
        return {
          border: isOpen ? 'border-amber-200 bg-amber-50/40' : 'border-zinc-200 bg-white hover:border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          numberBg: isOpen ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
          accent: 'bg-amber-50 border-amber-100 text-amber-950',
        };
      case 'elimination':
        return {
          border: isOpen
            ? isCorrect
              ? 'border-emerald-200 bg-emerald-50/40'
              : 'border-rose-200 bg-rose-50/40'
            : 'border-zinc-200 bg-white hover:border-slate-300',
          badge: isCorrect
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-rose-100 text-rose-800 border-rose-200',
          numberBg: isOpen
            ? isCorrect
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-500 text-white'
            : 'bg-slate-100 text-slate-700',
          accent: isCorrect
            ? 'bg-emerald-50 border-emerald-100 text-emerald-950'
            : 'bg-rose-50 border-rose-100 text-rose-950',
        };
      case 'tactic':
        return {
          border: isOpen ? 'border-purple-200 bg-purple-50/40' : 'border-zinc-200 bg-white hover:border-purple-200',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          numberBg: isOpen ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700',
          accent: 'bg-purple-50 border-purple-100 text-purple-950',
        };
      default:
        return {
          border: 'border-zinc-200 bg-white',
          badge: 'bg-slate-100 text-slate-800 border-zinc-200',
          numberBg: 'bg-slate-200 text-slate-700',
          accent: 'bg-slate-50 border-zinc-200 text-slate-900',
        };
    }
  };

  const stepsList = data?.steps || [];
  const totalSteps = stepsList.length;
  const openedCount = stepsList.filter((s) => openSteps.has(s.stepNumber)).length;
  const allOpened = totalSteps > 0 && openedCount === totalSteps;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-xl bg-gradient-to-b from-white to-slate-50/70 border-2 border-indigo-100  overflow-hidden"
    >
      {/* Accordion Top Header */}
      <div className="p-4 sm:p-5 border-b border-indigo-50 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center   shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                Adım Adım AI Çözüm Rehberi
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold font-mono uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                {data?.isAiGenerated ? 'Gemini AI' : 'Pedagojik Çözüm'}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
              {data?.headlineTitle || question.explanation.ruleTitle}
            </p>
          </div>
        </div>

        {/* Step Progress & Accordion Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {totalSteps > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-xs font-bold text-slate-700 ">
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>{openedCount} / {totalSteps} Adım Açık</span>
            </div>
          )}

          {allOpened ? (
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-zinc-200 text-slate-600 font-bold text-xs transition-all cursor-pointer "
            >
              Daralt
            </button>
          ) : (
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer  active:scale-95"
            >
              Hepsini Aç
            </button>
          )}

          {onOpenGlossary && (
            <button
              onClick={onOpenGlossary}
              title="Terim Sözlüğünde İncele"
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-zinc-200 text-indigo-600 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pedagogical Summary Banner */}
      {data?.pedagogicalSummary && (
        <div className="px-4 sm:px-5 py-3 bg-indigo-50/20 border-b border-indigo-50/60 text-xs sm:text-sm text-slate-700 font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{data.pedagogicalSummary}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-xl bg-white animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-3/4">
                <div className="w-7 h-7 rounded-xl bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                  <div className="h-3 bg-slate-100 rounded-md w-3/4" />
                </div>
              </div>
              <div className="w-5 h-5 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Accordion Steps List */}
      {!loading && data && (
        <div className="p-3 sm:p-5 space-y-3">
          {data.steps.map((step, idx) => {
            const isOpen = openSteps.has(step.stepNumber);
            const theme = getStepTheme(step.type, isOpen);
            const isSpeaking = speakingStep === step.stepNumber;

            return (
              <motion.div
                key={step.stepNumber}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${theme.border}`}
              >
                {/* Accordion Trigger Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStep(step.stepNumber)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Step Number Badge */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-transform ${theme.numberBg}`}
                    >
                      {isOpen ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{step.stepNumber}</span>
                      )}
                    </div>

                    {/* Step Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                          {step.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}
                        >
                          {step.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleSpeak(step, e)}
                      title={isSpeaking ? 'Sesli okumayı durdur' : 'Bu adımı sesli dinle'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isSpeaking
                          ? 'bg-purple-600 text-white animate-pulse'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="p-1 text-slate-400"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </div>
                </div>

                {/* Framer Motion Accordion Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`content-${step.stepNumber}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: 'auto',
                        opacity: 1,
                        transition: {
                          height: { duration: 0.32, ease: [0.04, 0.62, 0.23, 0.98] },
                          opacity: { duration: 0.24, delay: 0.08 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: 0.25, ease: 'easeInOut' },
                          opacity: { duration: 0.15 },
                        },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 sm:px-4 pb-4 pt-1 space-y-3 border-t border-zinc-200">
                        {/* Explanation Paragraph */}
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                          {step.explanation}
                        </p>

                        {/* Key Observation / Clue Callout */}
                        {step.keyObservation && (
                          <div
                            className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2.5 border ${theme.accent}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {getStepIcon(step.type, step.stepNumber)}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider block opacity-75">
                                {step.type === 'focus' && 'Görsel İpucu:'}
                                {step.type === 'rule' && 'Kural Detayı:'}
                                {step.type === 'elimination' && 'Eleme Mantığı:'}
                                {step.type === 'tactic' && 'Bilişsel Altın Tavsiye:'}
                              </span>
                              <span>{step.keyObservation}</span>
                            </div>
                          </div>
                        )}

                        {/* Step Navigation Hint inside accordion */}
                        {step.stepNumber < totalSteps && !openSteps.has(step.stepNumber + 1) && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                setOpenSteps((prev) => new Set([...prev, step.stepNumber + 1]));
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all cursor-pointer group"
                            >
                              <span>Sonraki Adımı Göster ({step.stepNumber + 1}. Adım)</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Bottom Reveal Next Step Banner */}
          {!allOpened && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-1 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold">
                  Tüm zihinsel adımları tamamlamak için sıradaki adımı açabilirsin.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRevealNext}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shrink-0 transition-all cursor-pointer  active:scale-95 flex items-center gap-1"
              >
                <span>Sıradaki Adımı Aç</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};
