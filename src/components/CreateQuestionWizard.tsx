import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Save, Plus, Wand2, Play, Image as ImageIcon, Settings2, Sparkles, CheckCircle2 } from 'lucide-react';
import { 
  CognitiveCategory, 
  QuestionType, 
  DifficultyLevel,
  COGNITIVE_CATEGORY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
  BaseQuestion,
  DIFFICULTY_LABELS
} from '../types';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { QuestionQualityChecker } from './QuestionQualityChecker';

const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'odd_one_out', label: '01 Farklı Olanı Bul' },
  { id: 'visual_sequence', label: '02 Görsel Örüntü' },
  { id: 'matrix_2x2', label: '03 2x2 Matris' },
  { id: 'figure_rotation', label: '04 Şekil Döndürme' },
  { id: 'spatial_relationship', label: '08 Uzamsal İlişki' },
];

interface CreateQuestionWizardProps {
  onClose: () => void;
  onSave: (question: any) => void;
}

export const CreateQuestionWizard: React.FC<CreateQuestionWizardProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form State
  const [category, setCategory] = useState<CognitiveCategory>('visual_perception');
  const [type, setType] = useState<QuestionType>('odd_one_out');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [ageGroup, setAgeGroup] = useState<'1-2' | '3-4' | 'all'>('all');
  const [prompt, setPrompt] = useState('Aşağıdaki örüntüde soru işareti yerine hangi şekil gelmelidir?');
  const [secondaryPrompt, setSecondaryPrompt] = useState('');
  const [seed, setSeed] = useState(1001);

  // Mock Preview Question based on current state
  const mockPreviewQuestion: BaseQuestion = {
    id: `NEW-${Date.now()}`,
    version: 1,
    type,
    category,
    difficulty,
    ageGroup,
    prompt,
    secondaryPrompt,
        options: [
      { id: 'A', label: 'A', fingerprint: 'a', visualData: { type: 'shape', kind: 'triangle', color: '#3b82f6' } },
      { id: 'B', label: 'B', fingerprint: 'b', visualData: { type: 'shape', kind: 'square', color: '#ef4444' } },
      { id: 'C', label: 'C', fingerprint: 'c', visualData: { type: 'shape', kind: 'circle', color: '#10b981' } },
      { id: 'D', label: 'D', fingerprint: 'd', visualData: { type: 'shape', kind: 'star', color: '#f59e0b' } },
    ],
    correctOptionId: 'C',
    explanation: { summary: '', ruleTitle: '', steps: [] },
    estimatedSeconds: 30,
    skills: [],
    seed,
    visualConfig: {
      displayMode: type === 'visual_sequence' ? 'sequence' : type === 'matrix_2x2' ? 'matrix_2x2' : 'default',
      sequenceItems: [
        { kind: 'circle', color: '#3b82f6' },
        { kind: 'square', color: '#ef4444' },
        { kind: 'triangle', color: '#10b981' }
      ],
      matrixItems: [
        [ { kind: 'circle', color: '#3b82f6' }, { kind: 'circle', color: '#ef4444' } ],
        [ { kind: 'square', color: '#3b82f6' }, null ]
      ]
    },
    isCustom: true
  };

  const steps = [
    { num: 1, title: 'Temel Bilgiler' },
    { num: 2, title: 'Yönerge & İçerik' },
    { num: 3, title: 'Parametrik Ayarlar' },
    { num: 4, title: 'Önizleme & Onay' }
  ];

  const handleNext = () => setStep(s => Math.min(4, s + 1));
  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const handleSave = () => {
    setIsGenerating(true);
    setTimeout(() => {
      onSave(mockPreviewQuestion);
      setIsGenerating(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col  overflow-hidden border border-zinc-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-500" /> Yeni Soru Oluştur Sihirbazı
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Parametrik motoru kullanarak yeni bir soru türetin veya özelleştirin.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="bg-white dark:bg-slate-900 px-8 py-6 border-b border-zinc-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  step > s.num ? 'bg-indigo-500 text-white' : 
                  step === s.num ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-500/20' : 
                  'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  step === s.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                }`}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Temel Sınıflandırma</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bilişsel Kategori</label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value as CognitiveCategory)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    >
                      {ALL_COGNITIVE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{COGNITIVE_CATEGORY_LABELS[cat]}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Soru Tipi (Algoritma)</label>
                    <select 
                      value={type}
                      onChange={e => setType(e.target.value as QuestionType)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    >
                      {QUESTION_TYPES.map(qt => (
                        <option key={qt.id} value={qt.id}>{qt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Zorluk Seviyesi</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => setDifficulty(lvl as DifficultyLevel)}
                          className={`py-3 rounded-xl text-sm font-medium transition-all ${
                            difficulty === lvl 
                              ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' 
                              : 'bg-white dark:bg-slate-800 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:border-zinc-200'
                          }`}
                        >
                          {DIFFICULTY_LABELS[lvl as 1|2|3]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hedef Sınıf / Yaş</label>
                    <select 
                      value={ageGroup}
                      onChange={e => setAgeGroup(e.target.value as '1-2'|'3-4'|'all')}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    >
                      <option value="all">Tüm Sınıflar</option>
                      <option value="1-2">1. ve 2. Sınıflar</option>
                      <option value="3-4">3. ve 4. Sınıflar</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Yönerge ve Görev Tanımı</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ana Yönerge (Prompt)</label>
                    <textarea 
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow resize-none"
                      placeholder="Örn: Aşağıdaki şekillerin örüntüsünü bozan hangisidir?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">İkincil Yönerge (Opsiyonel)</label>
                    <input 
                      type="text"
                      value={secondaryPrompt}
                      onChange={e => setSecondaryPrompt(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                      placeholder="Örn: Dikkatlice inceleyin."
                    />
                  </div>

                  <div className="pt-4 space-y-3 border-t border-zinc-200 dark:border-slate-700">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Görsel Kaynağı</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
                        <Sparkles className="w-8 h-8 mb-2" />
                        <span className="font-semibold text-sm">Parametrik Üretim</span>
                        <span className="text-xs opacity-70 mt-1">Motor tarafından otomatik</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-indigo-300 transition-colors opacity-50 cursor-not-allowed">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="font-semibold text-sm">Özel Görsel Yükle</span>
                        <span className="text-xs mt-1">Yakında (v2)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Parametrik Motor Ayarları</h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-zinc-200 dark:border-slate-700 p-6  space-y-6">
                  
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                        <Settings2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-200">Algoritma Değişkenleri</h4>
                        <p className="text-xs text-slate-500">Seed bazlı rastgelelik kontrolü</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <label className="font-medium text-slate-700 dark:text-slate-300">Rastgelelik Tohumu (Seed)</label>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{seed}</span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <input 
                          type="range" 
                          min="1000" 
                          max="9999" 
                          value={seed}
                          onChange={e => setSeed(parseInt(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                        <button 
                          onClick={() => setSeed(Math.floor(Math.random() * 9000) + 1000)}
                          className="p-2 shrink-0 rounded-lg border border-zinc-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                          title="Rastgele Üret"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50 dark:border-amber-700/30 flex gap-3">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Canlı Üretim Aktif</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                          Girdiğiniz tohum değeri (seed) ile sonsuz sayıda benzersiz soru varyasyonu oluşturabilirsiniz. Renkler, şekiller ve doğru cevap lokasyonu otomatik belirlenir.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-3xl mx-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Önizleme ve Onay</h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-500/10 dark:text-emerald-400">
                    Yayına Hazır
                  </span>
                </div>
                
                <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl p-6 ">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{mockPreviewQuestion.prompt}</h2>
                    {mockPreviewQuestion.secondaryPrompt && (
                      <p className="text-slate-500 dark:text-slate-400 mt-2">{mockPreviewQuestion.secondaryPrompt}</p>
                    )}
                  </div>

                  <div className="pointer-events-none">
                    <QuestionRenderer question={mockPreviewQuestion} />
                  </div>
                  
                  <div className="mt-8 border-t border-zinc-200 dark:border-slate-800 pt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pointer-events-none">
                      {mockPreviewQuestion.options.map((opt) => (
                        <OptionRenderer
                          key={opt.id}
                          option={opt}
                          isSelected={opt.id === mockPreviewQuestion.correctOptionId}
                          onSelect={() => {}}
                          showCorrect={true}
                          isCorrectOption={opt.id === mockPreviewQuestion.correctOptionId}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pre-Submission Quality Checker */}
                <div className="mt-4">
                  <QuestionQualityChecker
                    question={mockPreviewQuestion}
                    showAutoFixButton={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <button
            onClick={step === 1 ? onClose : handlePrev}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            {step === 1 ? 'İptal' : <><ChevronLeft className="w-4 h-4" /> Geri</>}
          </button>
          
          <button
            onClick={step === 4 ? handleSave : handleNext}
            disabled={isGenerating}
            className="px-8 py-2.5 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white  hover:shadow transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...
              </span>
            ) : step === 4 ? (
              <><Save className="w-4 h-4" /> Soruyu Kaydet</>
            ) : (
              <>İleri <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
