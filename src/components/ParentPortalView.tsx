import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  SkillMastery, 
  StudyReminderConfig, 
  WeeklyQuestionProgressData,
  CognitiveCategory 
} from '../types';
import { dataService } from '../services/data-service';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Brain,
  TrendingUp,
  KeyRound,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  BarChart2,
  Bell,
  Settings,
  ChevronRight,
  Target,
  Mail,
  Sparkles,
  Flame,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  Check,
  BookOpen,
  Layers,
  Compass,
  Copy,
  Zap,
  Award
} from 'lucide-react';
import { reminderService } from '../services/reminder-service';
import { StudyReminderSettingsModal } from './StudyReminderSettingsModal';
import { StudentSettingsModal } from './StudentSettingsModal';
import { NotificationPreferences } from './NotificationPreferences';
import { useAuth } from '../contexts/AuthContext';
import { sound } from '../lib/sound';

interface ParentPortalViewProps {
  student?: UserProfile | null;
  masteries: SkillMastery[];
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ student: parentOrStudent, masteries }) => {
  const [currentStudent, setCurrentStudent] = useState<UserProfile>({
    id: 'demo',
    name: 'Demir Yılmaz',
    level: 4,
    avatar: '🦊',
    role: 'student',
    xp: 340,
    streak: 5,
    streakFreezeCount: 1,
    dailyGoalMinutes: 15,
    todayMinutesSpent: 12,
    totalQuestionsSolved: 148,
    todayQuestionsSolved: 16,
    soundEnabled: true,
    studentCode: 'DEMIR2026',
    lastActiveDate: new Date().toISOString()
  });

  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'preferences'>('overview');
  const [chartViewMode, setChartViewMode] = useState<'radar' | 'momentum'>('radar');
  const [skillFilter, setSkillFilter] = useState<'all' | 'strengths' | 'weaknesses'>('all');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showStudentSettingsModal, setShowStudentSettingsModal] = useState(false);
  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { userProfile: parentProfile, sendPasswordResetEmail } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyQuestionProgressData | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSendStatus, setReportSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchStudent = async () => {
      if (!parentOrStudent) return;
      
      if (parentOrStudent.role === 'parent' && parentOrStudent.linkedStudentIds && parentOrStudent.linkedStudentIds.length > 0) {
        setIsLoadingStudent(true);
        try {
          const docRef = doc(db, 'users', parentOrStudent.linkedStudentIds[0]);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setCurrentStudent(snap.data() as UserProfile);
          }
        } catch(e) {
          console.error(e);
        } finally {
          setIsLoadingStudent(false);
        }
      } else if (parentOrStudent.role === 'student') {
        setCurrentStudent(parentOrStudent as UserProfile);
      }
    };
    fetchStudent();
  }, [parentOrStudent]);

  useEffect(() => {
    const wd = dataService.getWeeklyQuestionProgressData(currentStudent || undefined);
    setWeeklyData(wd);

    return reminderService.subscribeToConfig(() => {});
  }, [currentStudent]);

  // Sort masteries
  const sorted = useMemo(() => {
    return [...masteries].sort((a, b) => b.mastery - a.mastery);
  }, [masteries]);

  const strengths = useMemo(() => sorted.slice(0, 3), [sorted]);
  const needsAttention = useMemo(() => sorted.slice(-3).reverse(), [sorted]);
  const accuracy = strengths.length > 0 ? strengths[0].accuracy : 78;

  // Real or simulated weekly activity
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const activityData = weeklyData?.thisWeekDays || [12, 18, 15, 22, 14, 25, 19];
  const maxQuestions = Math.max(...activityData, 25);

  // Radar Data for 8 Cognitive Dimensions
  const radarData = useMemo(() => {
    return masteries.map((m) => ({
      category: m.categoryName.split(' ')[0], // short label
      fullName: m.categoryName,
      mastery: m.mastery,
      accuracy: m.accuracy,
      fullMark: 100
    }));
  }, [masteries]);

  // 30-Day Momentum Data (Stable via useMemo)
  const monthlyMomentumData = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const day = 30 - i;
      const date = new Date();
      date.setDate(date.getDate() - day);
      const score = 45 + (i * 1.4) + Math.sin(i * 0.8) * 6;
      return {
        date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        score: Math.min(Math.max(Math.round(score), 20), 100),
      };
    });
  }, []);

  const monthlyCategoryData = [
    { name: '1. Hf', 'Matris': 60, 'Görsel Algı': 65, 'Dikkat': 70, 'Sayısal': 55, questions: 45, minutes: 120 },
    { name: '2. Hf', 'Matris': 65, 'Görsel Algı': 70, 'Dikkat': 72, 'Sayısal': 58, questions: 52, minutes: 135 },
    { name: '3. Hf', 'Matris': 72, 'Görsel Algı': 75, 'Dikkat': 78, 'Sayısal': 64, questions: 68, minutes: 150 },
    { name: '4. Hf', 'Matris': 80, 'Görsel Algı': 82, 'Dikkat': 85, 'Sayısal': 70, questions: 85, minutes: 190 },
  ];

  const handleSendWeeklyReport = async () => {
    setIsSendingReport(true);
    setReportSendStatus('idle');
    try {
      const response = await fetch('/api/send-weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: parentProfile?.email || 'test@zekapark.com',
          studentName: currentStudent?.name || 'Öğrenci',
          weeklyData: {
            totalMinutes: weeklyData?.thisWeekTotal || 45,
            totalQuestions: currentStudent.todayQuestionsSolved ? currentStudent.todayQuestionsSolved * 4 : 42,
            accuracy: accuracy,
            streak: currentStudent?.streak || 5
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setReportSendStatus('success');
        sound.playSuccess();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.3 } });
        setTimeout(() => setReportSendStatus('idle'), 3500);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setReportSendStatus('error');
      sound.playError();
      setTimeout(() => setReportSendStatus('idle'), 3000);
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleCopyCode = () => {
    if (currentStudent.studentCode) {
      navigator.clipboard.writeText(currentStudent.studentCode);
      setCodeCopied(true);
      sound.playClick();
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const filteredMasteries = useMemo(() => {
    if (skillFilter === 'strengths') return strengths;
    if (skillFilter === 'weaknesses') return needsAttention;
    return masteries;
  }, [skillFilter, masteries, strengths, needsAttention]);

  // Daily goal calculation for circular progress
  const targetMins = currentStudent.dailyGoalMinutes || 15;
  const spentMins = currentStudent.todayMinutesSpent || 0;
  const goalProgressPct = Math.min(100, Math.round((spentMins / targetMins) * 100));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      {/* Animated Subtle Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.35, 0.5, 0.35]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 1, 1.1],
            x: [0, -25, 0],
            y: [0, 35, 0],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-96 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Top Header Hero */}
      <div className="relative z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 pt-8 pb-10 px-4 sm:px-6 md:px-12 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Student Profile Card */}
          <div className="flex items-center gap-5 w-full md:w-auto">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-4xl shadow-md border border-indigo-200/50 dark:border-zinc-700/60 shrink-0"
            >
              <span className="select-none">{currentStudent.avatar || '🦊'}</span>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-4 ring-white dark:ring-zinc-900 shadow-sm">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                  Veli Portalı
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <Sparkles className="w-3 h-3" /> Canlı Takip
                </span>
              </div>

              {isLoadingStudent ? (
                <div className="text-zinc-500 text-sm mt-1.5 animate-pulse">Öğrenci verileri senkronize ediliyor...</div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {currentStudent.name}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                      <Award className="w-4 h-4" /> Seviye {currentStudent.level || 1}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                      <Flame className="w-4 h-4 animate-bounce" /> {currentStudent.streak || 0} Günlük Seri
                    </span>
                  </div>

                  {currentStudent.studentCode && (
                    <motion.button
                      onClick={handleCopyCode}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3 py-1 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer group"
                      title="Öğrenci giriş kodunu kopyala"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
                      <span>Giriş Kodu: <strong className="tracking-widest font-mono text-zinc-900 dark:text-white">{currentStudent.studentCode}</strong></span>
                      {codeCopied ? (
                        <span className="text-emerald-500 flex items-center gap-1 font-bold"><Check className="w-3 h-3" /> Kopyalandı</span>
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                      )}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendWeeklyReport}
              disabled={isSendingReport}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-sm border transition-all cursor-pointer ${
                reportSendStatus === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-600' 
                  : reportSendStatus === 'error' 
                  ? 'bg-rose-500 text-white border-rose-600' 
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 border-transparent'
              }`}
            >
              {isSendingReport ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : reportSendStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {isSendingReport ? 'Gönderiliyor...' : reportSendStatus === 'success' ? 'Rapor Gönderildi!' : 'Haftalık Raporu Gönder'}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sound.playClick();
                setShowStudentSettingsModal(true);
              }}
              className="px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-indigo-500" />
              Giriş Bilgileri
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sound.playClick();
                setShowReminderModal(true);
              }}
              className="px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              Hatırlatıcı
            </motion.button>
          </div>

        </div>
      </div>

      {/* Main Dashboard Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pt-8 space-y-8 relative z-10">
        
        {/* Modern Fluid Segmented Tabs */}
        <div className="flex p-1.5 bg-zinc-200/60 dark:bg-zinc-900/80 rounded-2xl w-fit border border-zinc-200/70 dark:border-zinc-800/80 backdrop-blur-md shadow-inner gap-1">
          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('overview');
            }}
            className={`relative px-5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'overview' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Gelişim Analizi & Bilişsel Radar
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('skills');
            }}
            className={`relative px-5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'skills' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'skills' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Brain className="w-4 h-4" /> 8 Bilişsel Boyut Haritası
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('preferences');
            }}
            className={`relative px-5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'preferences' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'preferences' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Bildirim & E-posta
            </span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="tab-overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Bento KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Bugünkü Çalışma & Dairesel İlerleme */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30">
                      Hedef: {targetMins} dk
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                        {spentMins} <span className="text-sm font-semibold text-zinc-400">dk</span>
                      </h3>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Bugünkü Odak Süresi</p>
                    </div>

                    {/* Circular Mini Progress */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 -rotate-90">
                        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" className="text-zinc-100 dark:text-zinc-800" fill="transparent" />
                        <motion.circle 
                          cx="24" 
                          cy="24" 
                          r="18" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          className="text-blue-500" 
                          fill="transparent" 
                          strokeDasharray={113}
                          initial={{ strokeDashoffset: 113 }}
                          animate={{ strokeDashoffset: 113 - (113 * goalProgressPct) / 100 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-blue-600 dark:text-blue-400">%{goalProgressPct}</span>
                    </div>
                  </div>
                </motion.div>

                {/* 2. Toplam Çözülen Soru */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Aktif Pratik
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                      {currentStudent.totalQuestionsSolved || 148}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Toplam Çözülen BİLSEM Sorusu</p>
                  </div>
                </motion.div>

                {/* 3. Genel Doğruluk */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
                      Başarı Oranı
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                      %{accuracy}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">En Güçlü Alanlar Ortalaması</p>
                  </div>
                </motion.div>

                {/* 4. Öğrenme Serisi */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 border border-amber-100 dark:border-amber-900/30">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-indigo-500" /> {currentStudent.streakFreezeCount || 1} Kalkan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                      {currentStudent.streak || 5} <span className="text-sm font-semibold text-zinc-400">Gün</span>
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Kesintisiz Öğrenme Disiplini</p>
                  </div>
                </motion.div>

              </div>

              {/* Main Visuals Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Charts & Visuals */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Innovative Chart 1: Switchable Radar vs 30-Day Momentum */}
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <Compass className="w-5 h-5 text-indigo-500" />
                          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {chartViewMode === 'radar' ? 'Bilişsel Yetenek Radar Haritası' : '30 Günlük Gelişim İvmesi'}
                          </h2>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {chartViewMode === 'radar' 
                            ? 'Öğrencinin 8 temel bilişsel zeka alanındaki yetkinlik dağılımı' 
                            : 'Tüm pratiklerden elde edilen kümülatif zeka gelişim skoru'}
                        </p>
                      </div>

                      {/* Switcher Toggle */}
                      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto border border-zinc-200/50 dark:border-zinc-700/50">
                        <button
                          onClick={() => {
                            sound.playClick();
                            setChartViewMode('radar');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            chartViewMode === 'radar'
                              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          Bilişsel Radar
                        </button>
                        <button
                          onClick={() => {
                            sound.playClick();
                            setChartViewMode('momentum');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            chartViewMode === 'momentum'
                              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          30 Günlük Eğri
                        </button>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-[320px] w-full flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {chartViewMode === 'radar' ? (
                          <motion.div 
                            key="radar-chart"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#e4e4e7" strokeDasharray="3 3" className="dark:stroke-zinc-800" />
                                <PolarAngleAxis 
                                  dataKey="category" 
                                  tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} 
                                />
                                <PolarRadiusAxis 
                                  angle={30} 
                                  domain={[0, 100]} 
                                  stroke="#a1a1aa" 
                                  tick={{ fontSize: 10, fill: '#a1a1aa' }} 
                                />
                                <Radar 
                                  name="Ustalık Puanı" 
                                  dataKey="mastery" 
                                  stroke="#6366f1" 
                                  fill="#6366f1" 
                                  fillOpacity={0.35} 
                                  strokeWidth={2.5}
                                />
                                <RechartsTooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                          <p className="font-bold text-sm text-indigo-300">{data.fullName}</p>
                                          <p>Ustalık Seviyesi: <strong className="text-white">%{data.mastery}</strong></p>
                                          <p>Doğruluk Oranı: <strong className="text-emerald-400">%{data.accuracy}</strong></p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="momentum-chart"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={monthlyMomentumData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorMomentum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                                <XAxis 
                                  dataKey="date" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} 
                                  dy={12}
                                  minTickGap={25}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                                  domain={[0, 100]}
                                  ticks={[0, 25, 50, 75, 100]}
                                  tickFormatter={(val) => `%${val}`}
                                />
                                <RechartsTooltip 
                                  contentStyle={{ 
                                    borderRadius: '12px', 
                                    backgroundColor: '#18181b', 
                                    border: 'none', 
                                    color: '#fff', 
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', 
                                    fontWeight: 'bold' 
                                  }}
                                  cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '3 3' }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="#10b981" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#colorMomentum)" 
                                  name="Gelişim Skoru"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Animated Weekly Solved Questions Bar Chart */}
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          Haftalık Çözülen Soru Dağılımı
                        </h2>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                        Toplam: {activityData.reduce((a, b) => a + b, 0)} Soru
                      </span>
                    </div>

                    <div className="flex items-end justify-between h-44 pt-6 gap-2 sm:gap-4 px-2">
                      {weekDays.map((day, i) => {
                        const count = activityData[i];
                        const heightPct = Math.max(8, (count / maxQuestions) * 100);
                        const isToday = i === (new Date().getDay() + 6) % 7;

                        return (
                          <div key={day} className="flex flex-col items-center gap-3 flex-1 group">
                            <div className="w-full max-w-[44px] h-32 flex flex-col justify-end relative">
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl absolute inset-0 -z-0" />
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                                className={`w-full rounded-2xl relative transition-all duration-300 ${
                                  isToday 
                                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-500/20' 
                                    : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-indigo-500/80'
                                }`}
                              >
                                {/* Floating Number Tooltip */}
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-20">
                                  {count} soru
                                </div>
                              </motion.div>
                            </div>
                            <span className={`text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Categorical Progression Chart */}
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          Haftalık Alan Bazlı Başarı Eğrisi
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-zinc-400">Son 4 Hafta</span>
                    </div>

                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} 
                            dy={12}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            tickFormatter={(val) => `%${val}`}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              backgroundColor: '#18181b', 
                              border: 'none', 
                              color: '#fff', 
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', 
                              fontSize: '12px' 
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, marginTop: '16px' }} />
                          <Line type="monotone" dataKey="Matris" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Görsel Algı" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Dikkat" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Sayısal" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Right 1 Col: AI Coach & Strengths */}
                <div className="space-y-6">
                  
                  {/* AI Recommendation Card with Ambient Shimmer */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 md:p-7 shadow-xl relative overflow-hidden border border-zinc-700/60"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/15 blur-3xl rounded-full" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                          <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white font-['Outfit',sans-serif]">Yapay Zeka Bilişsel Koçu</h3>
                          <p className="text-[11px] text-zinc-400">Pedagojik Gelişim Analizi</p>
                        </div>
                      </div>

                      <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6">
                        Öğrencimiz <strong className="text-amber-300 font-bold">{strengths[0]?.categoryName || 'Örüntü Analizi'}</strong> kategorisinde %{strengths[0]?.accuracy || 85} doğruluk ile üstün kavrama gösteriyor. 
                        Buna karşın <strong className="text-rose-300 font-bold">{needsAttention[0]?.categoryName || 'Matris'}</strong> alanında hata tekrarı mevcut. Hafta sonu 10 dakikalık odak egzersizi önerilir.
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          sound.playClick();
                          setShowStudyPlanModal(true);
                        }}
                        className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Özel Çalışma Programı Oluştur
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Top Strengths Box */}
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-emerald-500" />
                        En Güçlü Yetenekler
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        İlk 3
                      </span>
                    </div>

                    <div className="space-y-4">
                      {strengths.map((m, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                              {m.categoryName}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              %{m.mastery}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${m.mastery}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                            <span>{m.attemptCount} soru çözüldü</span>
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <ArrowUpRight className="w-3 h-3" /> %{m.accuracy} doğruluk
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Areas Needing Attention */}
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Geliştirilmesi Gerekenler
                      </h3>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                        Öncelikli
                      </span>
                    </div>

                    <div className="space-y-4">
                      {needsAttention.map((m, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                              {m.categoryName}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              %{m.mastery}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${m.mastery}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                            <span>{m.attemptCount} soru çözüldü</span>
                            <span className="flex items-center gap-0.5 text-rose-500 font-medium">
                              Pekiştirilmeli (%{m.accuracy})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: DETAILED 8 COGNITIVE DOMAINS */}
          {activeTab === 'skills' && (
            <motion.div 
              key="tab-skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                    8 Bilişsel Boyut Haritası
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    BİLSEM sınavında ölçülen tüm zihinsel yetenek alanlarının anlık seviyesi ve performans metrikleri.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 self-start sm:self-auto">
                  <button
                    onClick={() => setSkillFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      skillFilter === 'all'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tümü ({masteries.length})
                  </button>
                  <button
                    onClick={() => setSkillFilter('strengths')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      skillFilter === 'strengths'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Güçlü Alanlar
                  </button>
                  <button
                    onClick={() => setSkillFilter('weaknesses')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      skillFilter === 'weaknesses'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Destek Alanları
                  </button>
                </div>
              </div>

              {/* Grid of Skill Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredMasteries.map((skill, idx) => {
                  const isHigh = skill.mastery >= 75;
                  const isMedium = skill.mastery >= 60 && skill.mastery < 75;

                  return (
                    <motion.div
                      key={skill.category}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`p-2 rounded-xl ${
                            isHigh 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' 
                              : isMedium 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' 
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                          }`}>
                            <Brain className="w-5 h-5" />
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isHigh 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : isMedium 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {isHigh ? 'İleri Seviye' : isMedium ? 'Gelişmekte' : 'Pekiştirilmeli'}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                          {skill.categoryName}
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          {skill.attemptCount} soru çözüldü • %{skill.accuracy} doğruluk
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Yetkinlik</span>
                          <span className="font-black text-zinc-900 dark:text-zinc-100">%{skill.mastery}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.mastery}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${
                              isHigh 
                                ? 'bg-emerald-500' 
                                : isMedium 
                                ? 'bg-blue-500' 
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 3: NOTIFICATION & REPORT PREFERENCES */}
          {activeTab === 'preferences' && (
            <motion.div 
              key="tab-prefs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <NotificationPreferences 
                currentStudent={currentStudent} 
                weeklyData={weeklyData} 
                accuracy={accuracy} 
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* MODAL 1: AI Custom Study Plan Modal */}
      <AnimatePresence>
        {showStudyPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowStudyPlanModal(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white font-['Outfit',sans-serif]">
                    Yapay Zeka Çalışma Programı
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {currentStudent.name} için kişiselleştirilmiş 7 günlük takviye planı
                  </p>
                </div>
              </div>

              {/* Plan Recommendations */}
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    <span>1. Odak Alanı: {needsAttention[0]?.categoryName || 'Matris'}</span>
                    <span>10 Soru / Gün</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Örüntü ve matris tamamlama algoritmalarında görsel parçaları birleştirme hızını artıracak 5 dakikalık seanslar.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                    <span>2. Odak Alanı: {needsAttention[1]?.categoryName || 'Uzamsal Zeka'}</span>
                    <span>5 Soru / Gün</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    3 boyutlu döndürme ve küp sayma sorularında şekil algısını pekiştiren hafif egzersizler.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    <span>3. Güçlü Alan Pekiştirme: {strengths[0]?.categoryName || 'Örüntü'}</span>
                    <span>5 Soru / Gün</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Motivasyonu yüksek tutmak adına başarılı olduğu alanda hızlı başarı rozetleri.
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowStudyPlanModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    sound.playSuccess();
                    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
                    setShowStudyPlanModal(false);
                  }}
                  className="flex-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Öğrenci Paneline Gönder & Başlat
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Study Reminder Settings Modal */}
      <StudyReminderSettingsModal 
        user={currentStudent}
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onConfigSaved={() => {}}
      />
      
      {/* MODAL 3: Student Login & Security Modal */}
      <StudentSettingsModal
        isOpen={showStudentSettingsModal}
        onClose={() => setShowStudentSettingsModal(false)}
        student={currentStudent}
        parentEmail={parentProfile?.email}
        onSendResetEmail={sendPasswordResetEmail}
      />

    </div>
  );
};
