import { EDUCATION_PROFILES, gradeDifficulty, type QuestionQualityReport, type GenerationAttempt } from '../../features/questions/quality-policy';
import { QuestionQualityPanel } from './QuestionQualityPanel';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Brain,
  Target,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  Sliders,
  Cpu,
  Zap,
  ShieldCheck,
  BarChart3,
  Clock,
  Eye,
  Filter,
  X,
  ChevronRight,
  ArrowRight,
  Award,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../../lib/sound';
import { authenticatedFetch } from '../../lib/api-client';
import {
  CognitiveCategory,
  DifficultyLevel,
  QuestionType,
  COGNITIVE_CATEGORY_LABELS,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  ALL_COGNITIVE_CATEGORIES,
  BaseQuestion
} from '../../types';
import { ALL_QUESTION_TYPES, STUDENT_CATEGORY_TYPES } from '../../features/questions/generators';
import { topicAllowedForGrade } from '../../features/questions/topic-catalog';

export interface AdminAiQuestionEngineProps {}

interface GenerationJobStatus {
  id: string;
  status: 'queued' | 'planning' | 'generating' | 'validating' | 'completed' | 'failed';
  progress: number;
  total: number;
  completed: number;
  approved: number;
  rejected: number;
  failed: number;
  averageQuality: number;
}

interface GeneratedQuestionResult {
  id: string;
  prompt: string;
  type: QuestionType;
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  qualityScore: number;
  status: 'queued' | 'planning' | 'generating' | 'validating' | 'approved' | 'draft' | 'rejected' | 'failed';
  solverVerified: boolean;
  validationWarnings: string[];
  options: { id: string; label: string; text?: string }[];
  correctOptionId: string;
  explanation: { summary: string; steps: string[] };
  distractorNotes: Record<string, string>;
  qualityReport?: QuestionQualityReport;
  attempts?: GenerationAttempt[];
  rawOutput?: BaseQuestion;
}

export const AdminAiQuestionEngine: React.FC<AdminAiQuestionEngineProps> = () => {
  // Config State
  const [selectedCategory, setSelectedCategory] = useState<CognitiveCategory>('matrix');
  const [selectedType, setSelectedType] = useState<QuestionType | 'auto'>('auto');
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(2);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [minQuality, setMinQuality] = useState<number>(85);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('');

  const [targetAge, setTargetAge] = useState<number | undefined>();
  const [maxAttempts, setMaxAttempts] = useState(3);
  const profile = EDUCATION_PROFILES[targetGrade];

  // Runtime State
  const [isApiAvailable, setIsApiAvailable] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus | null>(null);
  const [results, setResults] = useState<GeneratedQuestionResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toResult = (data: any): GeneratedQuestionResult | null => {
    const q = data.question;
    if (!q) return null;
    return { id: q.id, prompt: q.prompt, type: q.type, category: q.category,
      difficulty: q.difficulty, qualityScore: data.qualityScore || 0,
      status: data.success ? 'draft' : 'rejected', solverVerified: data.success === true && data.solverVerified === true,
      validationWarnings: [...(data.validationErrors || []), ...(data.validationWarnings || []), ...(data.rejectionReasons || [])],
      options: q.options, correctOptionId: q.correctOptionId, explanation: q.explanation,
      qualityReport: data.qualityReport || q.qualityReport, attempts: data.attempts || q.generationAttempts,
      distractorNotes: q.authoring?.distractorNotes || {}, rawOutput: q };
  };

  const handleGenerate = async () => {
    sound.playClick();
    setIsGenerating(true); setResults([]); setErrorMessage('');
    let approved = 0, rejected = 0, qualityTotal = 0;
    const id = `request-${Date.now()}`;
    setJobStatus({ id, status: 'generating', progress: 0, total: questionCount, completed: 0, approved: 0, rejected: 0, failed: 0, averageQuality: 0 });
    try {
      // Await each durable request. No simulated AI, invented scores or background
      // in-memory polling that can disappear when a Vercel Function shuts down.
      for (let i = 0; i < questionCount; i++) {
        const response = await authenticatedFetch('/api/admin/ai-generate-question', {
          method: 'POST', body: JSON.stringify({ category: selectedCategory,
            questionType: selectedType === 'auto' ? undefined : selectedType,
            targetGrade, targetAge, maxAttempts, difficulty, minQualityScore: minQuality, aiModel: selectedAiModel || undefined }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Soru servisine ulaşılamadı.');
        setIsApiAvailable(true);
        const item = toResult(data);
        if (item) setResults(previous => [...previous, item]);
        if (data.success) approved++; else rejected++;
        qualityTotal += data.qualityScore || 0;
        setJobStatus({ id, status: i + 1 === questionCount ? 'completed' : 'generating',
          progress: Math.round((i + 1) / questionCount * 100), total: questionCount, completed: i + 1,
          approved, rejected, failed: 0, averageQuality: Math.round(qualityTotal / (i + 1)) });
        if (!item && !data.success) setErrorMessage((data.rejectionReasons || data.validationErrors || ['Soru üretilemedi.']).join(' '));
      }
    } catch (error) {
      setIsApiAvailable(false);
      setErrorMessage(error instanceof Error ? error.message : 'Denetim tamamlanamadı. Tekrar deneyin.');
      setJobStatus(previous => previous ? { ...previous, status: 'failed', failed: previous.failed + 1 } : null);
    } finally { setIsGenerating(false); }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject' | 'regenerate') => {
    setErrorMessage('');
    try {
      const reviewed = results.find(item => item.id === id)?.rawOutput;
      if (!reviewed) throw new Error('Önce soruyu yükleyip inceleyin.');
      const response = await authenticatedFetch('/api/admin/ai-question-review', {
        method: 'POST', body: JSON.stringify({ questionId: id, action, expectedRevision: reviewed.revision ?? 0 }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error([data.error || data.message || 'İşlem tamamlanamadı.', ...(data.details || [])].join(' '));
      if (action === 'regenerate' && data.question) {
        const replacement = toResult({ ...data, solverVerified: data.question.aiMeta?.solverVerified });
        if (replacement) setResults(previous => previous.map(item => item.id === id ? replacement : item));
      } else setResults(previous => previous.map(item => item.id === id ? { ...item,
        status: action === 'approve' ? 'approved' : 'rejected', rawOutput: data.question || item.rawOutput } : item));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'İşlem tamamlanamadı.'); }
  };

  return (
    <div className="space-y-6">
      {errorMessage && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-red-200">{errorMessage}</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Yapay Zeka Soru Üretim Motoru
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gelişmiş AI modelleri ile BİLSEM standartlarında yeni sorular tasarlayın.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Denetimli taslak üretimi</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border border-purple-800/30 rounded-2xl p-4 flex items-center justify-between text-xs text-purple-200">
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>BİLSEM Pedagojik AI Motoru: Belirlediğiniz kategori ve zorluk kurallarına göre deterministik ve doğrulanmış sorular üretilir.</span>
        </span>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-slate-400 text-xs font-bold uppercase">Toplam Üretilen</span>
          <span className="text-2xl font-black text-white mt-1">{jobStatus?.completed || 0}</span>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 flex flex-col">
          <span className="text-emerald-400 text-xs font-bold uppercase">Onaylanan</span>
          <span className="text-2xl font-black text-emerald-300 mt-1">{jobStatus?.approved || 0}</span>
        </div>
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex flex-col">
          <span className="text-red-400 text-xs font-bold uppercase">Reddedilen / Hatalı</span>
          <span className="text-2xl font-black text-red-300 mt-1">{(jobStatus?.rejected || 0) + (jobStatus?.failed || 0)}</span>
        </div>
        <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 flex flex-col">
          <span className="text-purple-400 text-xs font-bold uppercase">Ortalama Kalite</span>
          <span className="text-2xl font-black text-purple-300 mt-1">%{jobStatus?.averageQuality || 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Config Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Bilişsel Kategori</label>
              <select 
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value as CognitiveCategory); setSelectedType('auto'); }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                {ALL_COGNITIVE_CATEGORIES.filter(c => STUDENT_CATEGORY_TYPES[c]).map(c => (
                  <option key={c} value={c}>{COGNITIVE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Soru Tipi</label>
              <select 
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as QuestionType | 'auto')}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="auto">✨ Yapay Zeka Seçsin (Otomatik)</option>
                {(STUDENT_CATEGORY_TYPES[selectedCategory] || []).filter(t => topicAllowedForGrade(t,targetGrade)).map(t => (
                  <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Hedef Sınıf</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(g => (
                  <button
                    key={g}
                    onClick={() => { setTargetGrade(g as 1|2|3|4); setDifficulty(gradeDifficulty(g as 1|2|3|4, difficulty)); setTargetAge(undefined); setSelectedType('auto'); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      targetGrade === g 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {g}. Sınıf
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 flex justify-between">
                <span>Zorluk Seviyesi</span>
                <span className="text-purple-400">{DIFFICULTY_LABELS[difficulty]}</span>
              </label>
              <input 
                aria-label="Zorluk seviyesi" type="range" min="1" max={profile.maxDifficulty} step="1"
                value={difficulty}
                onChange={e => setDifficulty(parseInt(e.target.value) as DifficultyLevel)}
                className="w-full accent-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs font-bold text-slate-400">Hedef yaş
                <select aria-label="Hedef yaş" value={targetAge ?? ''} onChange={e => setTargetAge(e.target.value ? Number(e.target.value) : undefined)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-white"><option value="">Sınıf profili ({profile.ages.join('–')})</option>{Array.from({ length: profile.ages[1] - profile.ages[0] + 1 }, (_, i) => profile.ages[0] + i).map(age => <option key={age} value={age}>{age} yaş</option>)}</select>
              </label>
              <label className="text-xs font-bold text-slate-400">En fazla deneme
                <select aria-label="En fazla deneme" value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-white">{[1,2,3,4].map(n => <option key={n} value={n}>{n} deneme</option>)}</select>
              </label>
            </div>
            <p className="text-xs text-slate-400">Uygun olmayan aday yeni varyasyonla üretilir. Sınıf ve doğruluk kuralları her denemede yeniden denetlenir.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Üretim Sayısı</label>
                <input 
                  type="number" min="1" max="50"
                  value={questionCount}
                  onChange={e => setQuestionCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Min. Kalite Skoru</label>
                <input 
                  type="number" min="60" max="100"
                  value={minQuality}
                  onChange={e => setMinQuality(parseInt(e.target.value) || 85)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Yapay Zeka Motoru (2026 Dual Engine)</label>
              <select
                value={selectedAiModel}
                onChange={e => setSelectedAiModel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Sunucuda yapılandırılan model</option>
                <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro Preview</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isApiAvailable}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all ${
                isGenerating || !isApiAvailable
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25'
              }`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'ÜRETİLİYOR...' : 'AI SORU ÜRET'}
            </button>
          </div>
        </div>

        {/* Right Col: Progress & Results */}
        <div className="lg:col-span-2 space-y-4">
          
          {isGenerating && jobStatus && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  Yapay Zeka Çalışıyor...
                </h3>
                <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {jobStatus.progress}%
                </span>
              </div>
              
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${jobStatus.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {jobStatus.completed} / {jobStatus.total} tamamlandı
              </p>
            </motion.div>
          )}

          <div className="space-y-4">
            <AnimatePresence>
              {results.map((res, idx) => (
                <motion.div 
                  key={res.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[res.difficulty]}`}>
                            {DIFFICULTY_LABELS[res.difficulty]}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {COGNITIVE_CATEGORY_LABELS[res.category]}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[150px]">
                            {QUESTION_TYPE_LABELS[res.type] || res.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mb-2 line-clamp-2">{res.prompt}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold ${
                          res.qualityScore >= 85 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          res.qualityScore >= 70 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          <Award className="w-3.5 h-3.5" />
                          Kalite: {res.qualityScore}
                        </div>
                        
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                          res.solverVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Çok Aşamalı Test: {res.solverVerified ? 'Kontroller geçti' : 'Başarısız'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                      <button 
                        onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}
                        className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        {expandedId === res.id ? 'Detayları Gizle' : 'Detayları İncele'}
                      </button>

                      <div className="flex items-center gap-2">
                        {res.status === 'validating' || res.status === 'generating' ? (
                          <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> İşleniyor...
                          </span>
                        ) : res.status === 'approved' ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Onaylandı
                          </span>
                        ) : res.status === 'rejected' ? (
                          <button onClick={() => handleReview(res.id, 'regenerate')} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300">Yeni varyasyonla tekrar dene</button>
                        ) : (
                          <>
                            <button onClick={() => handleReview(res.id, 'regenerate')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" title="Yeniden Üret">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReview(res.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Reddet
                            </button>
                            <button disabled={!res.solverVerified} onClick={() => handleReview(res.id, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === res.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-slate-800 bg-slate-900/50">
                      <div className="p-4 space-y-4 text-xs text-slate-300">
                        <QuestionQualityPanel report={res.qualityReport} attempts={res.attempts} />
                        {res.rawOutput && <div className="rounded-xl bg-white p-3"><QuestionRenderer question={res.rawOutput} /><div className="grid grid-cols-2 gap-3">{res.rawOutput.options.map(option => <OptionRenderer question={res.rawOutput} key={option.id} option={option} disabled showCorrect isCorrectOption={option.id === res.correctOptionId} />)}</div></div>}
                        {res.validationWarnings && res.validationWarnings.length > 0 && (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                            <strong className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Uyarılar:</strong>
                            <ul className="list-disc list-inside">
                              {res.validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                        
                        {res.explanation && (
                          <div className="bg-indigo-500/5 border border-indigo-500/20 p-3 rounded-xl">
                            <strong className="text-indigo-400 mb-1 block">Çözüm / Açıklama:</strong>
                            <p className="mb-2">{res.explanation.summary}</p>
                            <ol className="list-decimal list-inside space-y-1 text-slate-400">
                              {res.explanation.steps?.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                          </div>
                        )}

                        {res.distractorNotes && Object.keys(res.distractorNotes).length > 0 && (
                          <div>
                            <strong className="text-slate-400 mb-1 block">Çeldirici Notları:</strong>
                            <ul className="space-y-1">
                              {Object.entries(res.distractorNotes).map(([k, v]) => (
                                <li key={k}><span className="font-bold text-slate-500">{k}:</span> {v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {!isGenerating && results.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl border-dashed">
                <Brain className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-slate-400 text-sm font-medium">Soru üretimi başlatmak için sol taraftaki formu doldurun.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};


