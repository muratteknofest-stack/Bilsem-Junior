import React, { useState, useEffect } from 'react';
import { BaseQuestion, AiMistakeExplanation, VisualOption } from '../types';
import { aiMistakeService } from '../services/ai-mistake-service';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { sound } from '../lib/sound';
import {
  HelpCircle,
  Sparkles,
  Lightbulb,
  X,
  Brain,
  CheckCircle2,
  AlertCircle,
  Volume2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  Scale,
} from 'lucide-react';

interface AiMistakeModalProps {
  question: BaseQuestion;
  selectedOptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AiMistakeModal: React.FC<AiMistakeModalProps> = ({
  question,
  selectedOptionId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<AiMistakeExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const selectedOption: VisualOption | undefined = question.options.find(
    (o) => o.id === selectedOptionId
  );
  const correctOption: VisualOption | undefined = question.options.find(
    (o) => o.id === question.correctOptionId
  );

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    aiMistakeService
      .explainMistake(question, selectedOptionId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching mistake explanation:', err);
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
  }, [isOpen, question.id, question.seed, selectedOptionId]);

  const speakFullExplanation = () => {
    if (!('speechSynthesis' in window) || !data) return;
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const narration = `${data.empatheticIntro}. Neden bu seçenek? ${data.misconceptionTrap}. Doğru seçenek ile arasındaki fark: ${data.differenceAnalysis}. Altın Kural: ${data.goldenRuleTip}. Süper gücün: ${data.bilsemSuperPower}.`;

    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="ai-mistake-modal-container"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-xl border border-rose-100  overflow-hidden animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-900 text-white p-5 sm:p-6 shrink-0">
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-400 to-orange-400 text-slate-950 flex items-center justify-center   shrink-0">
                <HelpCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/25 text-amber-200 font-extrabold text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    {data?.isAiGenerated ? 'Gemini AI Pedagojik Hata Analizi' : 'Bilişsel Hata Analizi'}
                  </span>
                  {data?.modelUsed && (
                    <span className="hidden sm:inline-block text-[10px] text-purple-200/80 font-mono">
                      {data.modelUsed}
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Neden Yanlış? Zihnimiz Nerede Şaşırdı?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {data && (
                <button
                  type="button"
                  onClick={speakFullExplanation}
                  className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                    isSpeaking
                      ? 'bg-amber-400 text-slate-950 animate-pulse'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                  title={isSpeaking ? 'Seslendirmeyi Durdur' : 'Açıklamayı Sesli Dinle'}
                >
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{isSpeaking ? 'Durdur' : 'Dinle'}</span>
                </button>
              )}

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
          </div>

          {/* Reassuring Empathetic Quote */}
          <div className="relative z-10 mt-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-rose-50 flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-amber-300 shrink-0" />
            <p className="leading-relaxed font-medium">
              Yanlış yapmak öğrenmenin en değerli parçasıdır! Zihnimizin takıldığı noktayı fark etmek, bir sonraki soruda bizi durdurulamaz yapar.
            </p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-3 border-rose-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                AI Pedagoji Rehberi hatanın nedenini inceliyor...
              </p>
              <p className="text-xs text-slate-400">
                Çeldirici seçenekler ve görsel ipuçları karşılaştırılıyor.
              </p>
            </div>
          ) : !data ? (
            <div className="py-8 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Analiz yüklenemedi</p>
              <p className="text-xs text-slate-500">Lütfen tekrar deneyin.</p>
            </div>
          ) : (
            <>
              {/* Empathetic Introduction Card */}
              <div className="p-4 rounded-xl bg-indigo-50/90 border border-indigo-100 text-indigo-950 flex items-start gap-3 ">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 font-['Outfit',sans-serif]">
                    Pedagojik Bakış Açısı
                  </h4>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {data.empatheticIntro}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Visual Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Chosen Option Card */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border-2 border-rose-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      Senin Seçimin: {selectedOptionId} Şıkkı
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold">
                      İşaretlenen
                    </span>
                  </div>

                  <div className="max-w-[180px] mx-auto py-1">
                    {selectedOption && (
                      <OptionRenderer
                        option={selectedOption}
                        isSelected={true}
                        onSelect={() => {}}
                        disabled={true}
                        showCorrect={true}
                        isCorrectOption={false}
                      />
                    )}
                  </div>
                </div>

                {/* Correct Option Card */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border-2 border-emerald-300/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Doğru Seçenek: {question.correctOptionId} Şıkkı
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">
                      Kurala Uygun
                    </span>
                  </div>

                  <div className="max-w-[180px] mx-auto py-1">
                    {correctOption && (
                      <OptionRenderer
                        option={correctOption}
                        isSelected={false}
                        onSelect={() => {}}
                        disabled={true}
                        showCorrect={true}
                        isCorrectOption={true}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Misconception Trap Section */}
              <div className="p-4 rounded-xl bg-white  space-y-2">
                <div className="flex items-center gap-2 text-rose-600">
                  <Target className="w-4 h-4 shrink-0" />
                  <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                    1. Gözden Kaçan Çeldirici Tuzak
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {data.misconceptionTrap}
                </p>
              </div>

              {/* Difference Analysis Section */}
              <div className="p-4 rounded-xl bg-white  space-y-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Scale className="w-4 h-4 shrink-0" />
                  <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                    2. İki Seçenek Arasındaki Kritik Fark
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {data.differenceAnalysis}
                </p>
              </div>

              {/* Golden Rule Tip */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80  space-y-2">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                  <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                    BİLSEM Altın Kuralı & Taktik
                  </h4>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">
                  {data.goldenRuleTip}
                </p>
              </div>

              {/* Superpower Badge */}
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase block">
                      Kazanılan Bilişsel Süper Güç
                    </span>
                    <span className="text-xs sm:text-sm font-black text-purple-950 font-['Outfit',sans-serif]">
                      {data.bilsemSuperPower}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-200/80 text-purple-900 text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-purple-700" />
                  Gelişim Kaydedildi
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            <span>Her hata, doğruya giden en sağlam basamaktır!</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Şimdi Çok Daha İyi Anladım!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
