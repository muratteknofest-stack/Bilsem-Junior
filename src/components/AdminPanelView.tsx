import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  BrainCircuit,
  FileQuestion,
  Activity,
  Settings,
  ShieldCheck,
  TrendingUp,
  BarChart4,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Search,
  Plus,
  MoreVertical,
  Filter,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  X,
  Cpu,
  Zap,
  HardDrive,
  Compass,
  Layers,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Building,
  Target,
  Brain,
  HelpCircle,
  Play,
  ArrowRight,
  Sliders,
  Check,
  Award,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../lib/sound';
import { questionBankService } from '../services/question-bank-service';
import { dataService } from '../services/data-service';
import {
  BaseQuestion,
  CognitiveCategory,
  QuestionType,
  DifficultyLevel,
  COGNITIVE_CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  ALL_COGNITIVE_CATEGORIES
} from '../types';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../features/questions/generators';
import { validateQuestion } from '../features/questions/validator';

// Modular Admin Components
import { AdminQuestionManager } from './admin/AdminQuestionManager';
import { AdminQuestionStudio } from './admin/AdminQuestionStudio';
import { AdminQuestionAnalyticsDashboard } from './admin/AdminQuestionAnalyticsDashboard';
import { AdminCurriculumMatrix } from './admin/AdminCurriculumMatrix';
import { AdminSystemSettings } from './admin/AdminSystemSettings';
import { AdminStressTest } from './admin/AdminStressTest';
import { AdminDiagnosticsModal } from './admin/AdminDiagnosticsModal';
import { AdminBulkQuestionGenerator } from './admin/AdminBulkQuestionGenerator';
import { CreateQuestionWizard } from './CreateQuestionWizard';
import { QuestionAuthoringWorkbench } from './admin/QuestionAuthoringWorkbench';
import { AdminAiQuestionEngine } from './admin/AdminAiQuestionEngine';
import { AdminSocialContent } from './admin/AdminSocialContent';

type AdminTab =
  | 'dashboard'
  | 'questions'
  | 'bulk_generator'
  | 'ai_engine'
  | 'social_content'
  | 'studio'
  | 'analytics'
  | 'curriculum'
  | 'stresstest'
  | 'settings';

const CATEGORY_ICONS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  matrix: { icon: Layers, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  pattern: { icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  attention: { icon: Target, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  spatial: { icon: Compass, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  logic: { icon: Lightbulb, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  memory: { icon: Brain, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  visual_perception: { icon: Eye, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
  numerical: { icon: Zap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
};

export const AdminPanelView: React.FC = () => {
  const [activeTab, updateActiveTab] = useState<AdminTab>('dashboard');
  const pendingQuestions = useRef(false);
  const onPendingQuestions = useCallback((pending: boolean) => { pendingQuestions.current = pending; }, []);
  const setActiveTab = (tab: AdminTab) => {
    if (tab === activeTab) return;
    if (pendingQuestions.current && !window.confirm('Buluta kaydedilmemiş soru taslakları veya düzenlemeler var. Kaydetmeden bu bölümden çıkılsın mı?')) return;
    pendingQuestions.current = false;
    updateActiveTab(tab);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [questionsSubSection, setQuestionsSubSection] = useState<'manager' | 'workbench'>('manager');
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Studio persistent state
  const [studioType, setStudioType] = useState<QuestionType>('matrix_2x2');
  const [studioSeed, setStudioSeed] = useState<number>(42);
  const [studioDifficulty, setStudioDifficulty] = useState<DifficultyLevel>(2);
  const [studioGeneratedQuestion, setStudioGeneratedQuestion] = useState<BaseQuestion>(() => {
    try {
      return generateQuestionByType('matrix_2x2', 42, 2);
    } catch {
      return questionBankService.getAll()[0];
    }
  });

  const handleStudioGenerate = (type?: QuestionType, seed?: number, diff?: DifficultyLevel) => {
    const t = type ?? studioType;
    const s = seed ?? studioSeed;
    const d = diff ?? studioDifficulty;
    try {
      const q = generateQuestionByType(t, s, d);
      setStudioGeneratedQuestion(q);
    } catch (err) {
      console.error('Failed to generate in studio:', err);
    }
  };

  const handleInspectInStudio = (type: QuestionType, seed: number, diff: DifficultyLevel) => {
    setStudioType(type);
    setStudioSeed(seed);
    setStudioDifficulty(diff);
    handleStudioGenerate(type, seed, diff);
    setActiveTab('studio');
    sound.playClick();
  };

  const handleSelectTypeForStudio = (type: QuestionType) => {
    setStudioType(type);
    handleStudioGenerate(type, studioSeed, studioDifficulty);
    setActiveTab('studio');
    sound.playClick();
  };

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3000);
  };

  const handleExportSystemBackup = () => {
    sound.playClick();
    const backupObj: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        backupObj[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zekapark_admin_snapshot_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sistem yedeği başarıyla JSON olarak indirildi.');
  };

  const tabs: { id: AdminTab; label: string; icon: any; badge?: string }[] = [
    { id: 'dashboard', label: 'Genel Bakış', icon: Activity },
    { id: 'questions', label: 'Soru Bankası & Yönetim', icon: FileQuestion, badge: 'Havuz' },
    { id: 'bulk_generator', label: 'Toplu Soru Motoru', icon: Zap, badge: 'Turbo' },
    { id: 'ai_engine', label: 'Yapay Zeka Soru Üret', icon: Sparkles, badge: 'AI' },
    { id: 'social_content', label: 'Sosyal İçerik', icon: Layers },
    { id: 'studio', label: 'Soru Tasarım Stüdyosu', icon: Cpu, badge: 'Canlı' },
    { id: 'analytics', label: 'Bilişsel Analitik', icon: BarChart4 },
    { id: 'curriculum', label: 'BİLSEM Müfredat Matrisi', icon: Compass },
    { id: 'stresstest', label: 'Motor Stres Testi', icon: Zap },
    { id: 'settings', label: 'Sistem Parametreleri', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative selection:bg-indigo-500 selection:text-white font-sans">
      
      {/* Background Animated Subtle Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 1, 1.1],
            x: [0, -40, 0],
            y: [0, 40, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[130px]"
        />
      </div>

      {/* Modern Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800/80 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider uppercase text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
                <span>ZekaPark</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-400 rounded-md border border-indigo-500/30 font-mono">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">BİLSEM Yönetim Merkezi</p>
            </div>
          </div>

          {/* Online Health Badge */}
          <div className="mt-4 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SİSTEM AKTİF
            </span>
            <span className="text-slate-400 font-mono text-[10px]">%99.98 Uptime</span>
          </div>
        </div>
        
        {/* Navigation List */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all font-semibold text-xs relative group cursor-pointer ${
                  isActive 
                    ? 'text-white bg-indigo-600/20 border border-indigo-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isActive ? 'bg-indigo-500 text-white shadow-xs' : 'bg-slate-800/60 text-slate-400 group-hover:text-white'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="tracking-tight">{tab.label}</span>
                </div>

                {tab.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Diagnostics Action in Footer */}
        <div className="p-4 border-t border-slate-800/60 space-y-2">
          <button
            onClick={() => {
              sound.playClick();
              setShowDiagnosticsModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sistem Tanısı Çalıştır</span>
          </button>
          <div className="text-center text-[10px] text-slate-500 font-mono">
            ZekaPark Engine v2.6.4 • React 18
          </div>
        </div>

      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* Sticky Executive Top Bar */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black text-white font-['Outfit',sans-serif] tracking-tight">
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <p className="text-[11px] text-slate-400">
                Sistem Yönetimi, BİLSEM Motoru ve Analitik Kontrol Paneli
              </p>
            </div>
          </div>
          
          {/* Top Quick Actions */}
          <div className="flex items-center gap-3">
            
            {/* System Snapshot Backup */}
            <button 
              onClick={handleExportSystemBackup}
              title="Tüm sistem verisini JSON olarak yedekle"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700/70 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Yedek Al</span>
            </button>

            {/* Quick Diagnostics */}
            <button 
              onClick={() => {
                sound.playClick();
                setShowDiagnosticsModal(true);
              }}
              title="Soru motoru gecikmesi ve depolama durumunu test et"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700/70 transition-all cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tanı</span>
            </button>

            {/* Toplu Soru Motoru Quick Button */}
            <button 
              onClick={() => {
                sound.playClick();
                setActiveTab('bulk_generator');
              }}
              title="Toplu Soru Oluşturma Motoru"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-all cursor-pointer shadow-sm shadow-amber-500/10"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Toplu Üret</span>
            </button>

            {/* New Question Wizard Button */}
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sound.playClick();
                setShowCreateWizard(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Soru</span>
            </motion.button>

          </div>
        </header>

        {/* Global Toast Alert */}
        {toastNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-500 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{toastNotification}</span>
          </motion.div>
        )}

        {/* Dynamic Tab Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-w-7xl mx-auto space-y-8"
            >
              
              {/* TAB 1: EXECUTIVE DASHBOARD */}
              {activeTab === 'dashboard' && (
                <AdminDashboardOverviewTab 
                  onNavigateToTab={(tab) => {
                    sound.playClick();
                    setActiveTab(tab);
                  }}
                  onNewQuestion={() => setShowCreateWizard(true)}
                  onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
                />
              )}

              {/* TAB 2: QUESTIONS MANAGER & STUDIO */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          sound.playClick();
                          setQuestionsSubSection('manager');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          questionsSubSection === 'manager'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <FileQuestion className="w-4 h-4" />
                        <span>Soru Havuzu & Yönetim (MEB BİLSEM)</span>
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setQuestionsSubSection('workbench');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          questionsSubSection === 'workbench'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <HardDrive className="w-4 h-4" />
                        <span>Editoryal Atölye & Bulut Kütüphanesi</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setShowCreateWizard(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Soru Sihirbazını Aç</span>
                    </button>
                  </div>

                  {questionsSubSection === 'manager' ? (
                    <AdminQuestionManager
                      onInspectInStudio={handleInspectInStudio}
                      onNavigateToAnalytics={() => setActiveTab('analytics')}
                      onNavigateToBulkGenerator={() => setActiveTab('bulk_generator')}
                    />
                  ) : (
                    <QuestionAuthoringWorkbench
                      initialSection="library"
                      onPendingChanges={onPendingQuestions}
                    />
                  )}
                </div>
              )}

              {/* TAB: BULK QUESTION GENERATOR ENGINE */}
              {activeTab === 'bulk_generator' && (
                <AdminBulkQuestionGenerator
                  onInspectInStudio={handleInspectInStudio}
                  onNavigateToQuestionBank={() => {
                    setQuestionsSubSection('manager');
                    setActiveTab('questions');
                  }}
                />
              )}

              {/* TAB: AI QUESTION ENGINE */}
              {activeTab === 'ai_engine' && (
                <AdminAiQuestionEngine />
              )}
              {activeTab === 'social_content' && <AdminSocialContent />}

              {/* TAB 3: QUESTION STUDIO */}
              {activeTab === 'studio' && (
                <AdminQuestionStudio
                  selectedType={studioType}
                  onTypeChange={setStudioType}
                  seed={studioSeed}
                  onSeedChange={setStudioSeed}
                  difficulty={studioDifficulty}
                  onDifficultyChange={setStudioDifficulty}
                  generatedQuestion={studioGeneratedQuestion}
                  onGenerate={handleStudioGenerate}
                  onOpenWizard={() => setShowCreateWizard(true)}
                />
              )}

              {/* TAB 4: DEEP ANALYTICS */}
              {activeTab === 'analytics' && (
                <AdminQuestionAnalyticsDashboard
                  onNavigateToQuestionManager={() => setActiveTab('questions')}
                />
              )}

              {/* TAB 7: CURRICULUM MATRIX */}
              {activeTab === 'curriculum' && (
                <AdminCurriculumMatrix onSelectTypeForStudio={handleSelectTypeForStudio} />
              )}

              {/* TAB 8: STRESS TEST */}
              {activeTab === 'stresstest' && (
                <AdminStressTest onInspectType={handleSelectTypeForStudio} />
              )}

              {/* TAB 9: SYSTEM SETTINGS */}
              {activeTab === 'settings' && (
                <AdminSystemSettings onSyncNeeded={() => showToast('Sistem ayarları güncellendi.')} />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Create Question Modal Wizard */}
      {showCreateWizard && (
        <CreateQuestionWizard
          onClose={() => setShowCreateWizard(false)}
          onSave={(q) => {
            questionBankService.createCustomQuestion(q);
            sound.playSuccess();
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.4 } });
            showToast(`Soru başarıyla eklendi! (ID: ${q.id})`);
            setShowCreateWizard(false);
          }}
        />
      )}

      {/* System Diagnostics Modal */}
      {showDiagnosticsModal && (
        <AdminDiagnosticsModal
          onClose={() => setShowDiagnosticsModal(false)}
        />
      )}

    </div>
  );
};

// ==========================================
// EXECUTIVE OVERVIEW DASHBOARD COMPONENT
// ==========================================
interface AdminDashboardOverviewTabProps {
  onNavigateToTab: (tab: AdminTab) => void;
  onNewQuestion: () => void;
  onOpenDiagnostics: () => void;
}

const AdminDashboardOverviewTab: React.FC<AdminDashboardOverviewTabProps> = ({
  onNavigateToTab,
  onNewQuestion,
  onOpenDiagnostics,
}) => {
  const [questionsPool, setQuestionsPool] = useState<BaseQuestion[]>([]);

  useEffect(() => {
    setQuestionsPool(questionBankService.getAll());
    const unsub = questionBankService.subscribe(() => {
      setQuestionsPool(questionBankService.getAll());
    });
    return unsub;
  }, []);

  // Category counts
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_COGNITIVE_CATEGORIES.forEach(c => { counts[c] = 0; });
    questionsPool.forEach(q => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
  }, [questionsPool]);

  // Target pool
  const targetTotal = 500;
  const poolProgress = Math.min(100, Math.round((questionsPool.length / targetTotal) * 100));

  return (
    <div className="space-y-8">
      
      {/* Executive Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 shadow-xl relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                ZekaPark Soru Motoru v1.0
              </span>
              <span className="text-xs text-slate-400 font-medium">10 Bilişsel Çalışma Alanı</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif] mt-2 tracking-tight">
              Sistem Durumu & Soru Havuzu İzleme
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Soru üreteçlerini, yerel soru havuzunu ve tanı araçlarını tek noktadan yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {questionsPool.length < 24 && (
              <button
                onClick={() => {
                  sound.playSuccess();
                  confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
                  questionBankService.seedDefaultPool();
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
                title="Hemen 32 adet BİLSEM sorusu oluşturup havuza yükle"
              >
                <Sparkles className="w-4 h-4" /> Havuzu Doldur (32 Soru)
              </button>
            )}
            <button
              onClick={() => onNavigateToTab('bulk_generator')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Toplu Soru Motoru
            </button>
            <button
              onClick={onNewQuestion}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni Soru
            </button>
            <button
              onClick={onOpenDiagnostics}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-emerald-400" /> Motor Tanısı
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Question Pool */}
        <motion.div 
          whileHover={{ y: -4 }}
          onClick={() => onNavigateToTab('questions')}
          className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm cursor-pointer group transition-all hover:border-indigo-500/50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Soru</p>
              <h3 className="text-3xl font-black text-white font-['Outfit',sans-serif] mt-1.5">
                {questionsPool.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
              <FileQuestion className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Hedef: {targetTotal}</span>
              <span className="text-indigo-400 font-bold">%{poolProgress}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${poolProgress}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Generator Types */}
        <motion.div 
          whileHover={{ y: -4 }}
          onClick={() => onNavigateToTab('studio')}
          className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm cursor-pointer group transition-all hover:border-emerald-500/50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soru Üreteçleri</p>
              <h3 className="text-3xl font-black text-white font-['Outfit',sans-serif] mt-1.5">
                {ALL_QUESTION_TYPES.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-bold">Parametrik</span>
            <span className="text-slate-400">Kayıtlı Tip</span>
          </div>
        </motion.div>

        {/* Metric 3: Cognitive Categories */}
        <motion.div 
          whileHover={{ y: -4 }}
          onClick={() => onNavigateToTab('analytics')}
          className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm cursor-pointer group transition-all hover:border-amber-500/50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bilişsel Alanlar</p>
              <h3 className="text-3xl font-black text-white font-['Outfit',sans-serif] mt-1.5">
                {ALL_COGNITIVE_CATEGORIES.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-amber-400 font-bold">Kategori Haritası</span>
            <span className="text-slate-400">Kapsam</span>
          </div>
        </motion.div>

        {/* Metric 4: System Health & Zero Errors */}
        <motion.div 
          whileHover={{ y: -4 }}
          onClick={onOpenDiagnostics}
          className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm cursor-pointer group transition-all hover:border-teal-500/50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motor Doğrulaması</p>
              <h3 className="text-3xl font-black text-emerald-400 font-['Outfit',sans-serif] mt-1.5">
                Hazır
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Sonuç için:</span>
            <span className="text-emerald-400 font-bold">Tanıyı Çalıştır</span>
          </div>
        </motion.div>

      </div>

      {/* Cognitive Categories Pool Matrix */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              10 Bilişsel Çalışma Alanı Dağılımı
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Her kategoride yerel soru bankasına kaydedilmiş soru sayısı
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('questions')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Soru Bankasını İncele <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_COGNITIVE_CATEGORIES.map((catKey) => {
            const count = categoryBreakdown[catKey] || 0;
            const targetCat = 60;
            const pct = Math.min(100, Math.round((count / targetCat) * 100));
            const cfg = CATEGORY_ICONS_CONFIG[catKey] || {
              icon: Brain,
              color: 'text-indigo-400',
              bg: 'bg-indigo-950/40'
            };
            const Icon = cfg.icon;

            return (
              <motion.div
                key={catKey}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => onNavigateToTab('questions')}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-white bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700">
                    {count} Soru
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-200 truncate">
                  {COGNITIVE_CATEGORY_LABELS[catKey]}
                </h4>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${count >= targetCat ? 'bg-emerald-500' : 'bg-indigo-500'} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">%{pct}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Col Layout: Live Stream & Quick Admin Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live System Activities (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Sistem Bilgileri
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
              Bu Oturum
            </span>
          </div>

          <div className="space-y-3">
            {[
              { text: `${ALL_QUESTION_TYPES.length} parametrik soru tipi yüklendi.`, time: "Bu oturum", badge: "Üreteç", color: "text-emerald-400" },
              { text: `${questionsPool.length} soru yerel soru bankasında kayıtlı.`, time: "Bu oturum", badge: "Havuz", color: "text-indigo-400" },
              { text: `${ALL_COGNITIVE_CATEGORIES.length} bilişsel çalışma alanı yapılandırıldı.`, time: "Bu oturum", badge: "Kapsam", color: "text-amber-400" },
              { text: "Ayrıntılı sonuçlar için motor tanı veya stres testi çalıştırılabilir.", time: "İsteğe bağlı", badge: "Tanı", color: "text-teal-400" },
            ].map((act, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{act.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold ${act.color} px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/60`}>
                  {act.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launchpad (1 Col) */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Hızlı Yönetim Paneli
          </h3>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateToTab('bulk_generator')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-600/15 to-purple-600/15 hover:from-amber-500/20 hover:to-indigo-600/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer group shadow-sm shadow-amber-500/10"
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Toplu Soru Motoru</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Turbo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400" />
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab('studio')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Soru Tasarım Stüdyosu</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateToTab('stresstest')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Motor Stres Testi</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateToTab('curriculum')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-purple-400" />
                <span>CHC Müfredat Haritası</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateToTab('settings')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Sistem Ayarları & Yedek</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
