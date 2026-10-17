import React, { useState, useEffect } from 'react';
import { BaseQuestion, QuestionAiHint } from '../types';
import { aiHintService } from '../services/ai-hint-service';
import { sound } from '../lib/sound';
import {
  Lightbulb,
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
  CheckCircle2,
  X,
  Brain,
  Compass,
  Layers,
  ArrowRight,
  HelpCircle,
  Zap,
  Volume2,
} from 'lucide-react';

interface AiHintModalProps {
  question: BaseQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSelectOption?: (optionId: string) => void;
}

export const AiHintModal: React.FC<AiHintModalProps> = ({
  question,
  isOpen,
  onClose,
}) => {
  const [hintData, setHintData] = useState<QuestionAiHint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unlockedSteps, setUnlockedSteps] = useState<number>(1);
  const [speakingStep, setSpeakingStep] = useState<number | null>(null);

  const speakText = (text: string, stepId: number = -1) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingStep === stepId) {
      setSpeakingStep(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.92;
    utterance.onend = () => setSpeakingStep(null);
    utterance.onerror = () => setSpeakingStep(null);
    setSpeakingStep(stepId);
    window.speechSynthesis.speak(utterance);
  };

  // Load hint when modal opens or question changes
  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingStep(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setUnlockedSteps(1);

    aiHintService
      .getHintForQuestion(question, 1)
      .then((res) => {
        if (isMounted) {
          setHintData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load AI hint:', err);
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
  }, [isOpen, question.id, question.seed]);

  const handleUnlockNextStep = () => {
    sound.playSuccess();
    const nextStep = Math.min(3, unlockedSteps + 1);
    setUnlockedSteps(nextStep);
    if (hintData) {
      setHintData({
        ...hintData,
        unlockedSteps: nextStep,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="ai-hint-modal-container"
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-xl border border-indigo-100  overflow-hidden animate-scaleUp"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 sm:p-6 shrink-0">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 flex items-center justify-center   shrink-0">
                <Lightbulb className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-extrabold text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {hintData?.isAiGenerated ? 'Gemini AI Düşünme Rehberi' : 'Sokratik Düşünme Rehberi'}
                  </span>
                  <span className="text-xs text-indigo-200 font-mono">
                    Adım {unlockedSteps} / 3
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold font-['Outfit',sans-serif] tracking-tight">
                  Takıldın mı? Birlikte Çözelim!
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Socratic Encouragement Message */}
          <div className="relative z-10 mt-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-indigo-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-300 shrink-0" />
              <p className="line-clamp-2 leading-relaxed">
                {hintData?.introEncouragement ||
                  'Cevabı hemen söylemek yerine, ipuçlarıyla doğru cevabı kendin bulmana yardımcı olacağız!'}
              </p>
            </div>
            {hintData?.introEncouragement && (
              <button
                type="button"
                onClick={() => speakText(hintData.introEncouragement, 0)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  speakingStep === 0 ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Sesli Dinle"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                AI Asistan sorunun mantığını inceliyor...
              </p>
              <p className="text-xs text-slate-400">
                Görsel parçalar ve dönüşüm kuralları analiz ediliyor.
              </p>
            </div>
          ) : !hintData ? (
            <div className="py-8 text-center space-y-2">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">İpucu hazırlanamadı</p>
              <p className="text-xs text-slate-500">Lütfen tekrar deneyin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hintData.steps.map((step, idx) => {
                const stepNum = step.stepNumber;
                const isUnlocked = stepNum <= unlockedSteps;

                return (
                  <div
                    key={stepNum}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isUnlocked
                        ? 'bg-white border-indigo-200 '
                        : 'bg-slate-50 border-zinc-200/80 opacity-75'
                    }`}
                  >
                    {/* Step Header */}
                    <div
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b ${
                        isUnlocked
                          ? 'bg-indigo-50/70 border-indigo-100'
                          : 'bg-slate-100/70 border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isUnlocked
                              ? 'bg-indigo-600 text-white '
                              : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {stepNum}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 font-['Outfit',sans-serif]">
                          {step.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnlocked && (
                          <button
                            type="button"
                            onClick={() =>
                              speakText(
                                `${step.title}. ${step.content}. ${
                                  step.keyObservation ? `Püf noktası: ${step.keyObservation}.` : ''
                                } ${step.suggestedAction ? `Şimdi dene: ${step.suggestedAction}.` : ''}`,
                                stepNum
                              )
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              speakingStep === stepNum
                                ? 'bg-indigo-600 text-white animate-pulse'
                                : 'bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title="Bu adımı sesli oku"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isUnlocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            Açık
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            Kilitli
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Body */}
                    <div className="p-4 space-y-3 text-xs sm:text-sm">
                      {isUnlocked ? (
                        <>
                          <p className="text-slate-700 leading-relaxed">
                            {step.content}
                          </p>

                          {step.keyObservation && (
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block text-xs text-amber-900 mb-0.5">
                                  Püf Noktası:
                                </span>
                                <span className="text-xs">{step.keyObservation}</span>
                              </div>
                            </div>
                          )}

                          {step.suggestedAction && (
                            <div className="text-xs text-indigo-700 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                              <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-medium">
                                <strong>Şimdi Dene:</strong> {step.suggestedAction}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-4 text-center space-y-2">
                          <p className="text-xs text-slate-500">
                            Önce önceki adımı düşün! Eğer hala takılırsan bu ipucunu açabilirsin.
                          </p>
                          <button
                            onClick={handleUnlockNextStep}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs  transition-all cursor-pointer active:scale-95"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>{stepNum}. İpucunu Aç</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <span>Pedagojik İpucu: Kendi bulduğun cevap kalıcı öğrenmeyi sağlar!</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {unlockedSteps < 3 && (
              <button
                onClick={handleUnlockNextStep}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sonraki İpucunu Aç ({unlockedSteps + 1}/3)</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs  transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <span>Soruya Dön ve Çöz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
