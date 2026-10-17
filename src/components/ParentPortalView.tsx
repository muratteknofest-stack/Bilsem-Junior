import { isAndroidApp } from '../lib/native-app';
import { NativeAccessStatus } from './NativeAccessStatus';
import { AccountCenter, FamilyActivation } from './AccountCenter';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  SkillMastery, 
  StudyReminderConfig, 
  WeeklyQuestionProgressData,
  CognitiveCategory 
} from '../types';
import { dataService } from '../services/data-service';
import { db } from '../lib/platform';
import { doc, getDoc } from '../lib/supabase-data';
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
  Award,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { reminderService } from '../services/reminder-service';
import { StudyReminderSettingsModal } from './StudyReminderSettingsModal';
import { StudentSettingsModal } from './StudentSettingsModal';
import { NotificationPreferences } from './NotificationPreferences';
import { useAuth } from '../contexts/AuthContext';
import { sound } from '../lib/sound';
import { shareWeeklyReport } from '../services/weekly-report-service';
import { resetLinkedStudentPassword } from '../services/account-security-service';
import { strongPasswordSchema } from '../lib/validations';
import { NewPasswordFields } from '../features/auth/components/NewPasswordFields';
import './landing/design-system.css';
import './dashboard-design-system.css';

interface ParentPortalViewProps {
  student?: UserProfile | null;
  masteries: SkillMastery[];
  onNavigate?: (route: string) => void;
  isSwitchingStudent?: boolean;
  onOpenStudent?: (studentId: string) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ student: parentOrStudent, masteries, onNavigate, onOpenStudent, isSwitchingStudent = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const [currentStudent, setCurrentStudent] = useState<UserProfile>(() => {
    return parentOrStudent || dataService.getCurrentUser() || {
      id: 'pending',
      name: 'Öğrenci',
      level: 1,
      avatar: '🦊',
      role: 'student',
      xp: 0,
      streak: 0,
      streakFreezeCount: 0,
      dailyGoalMinutes: 15,
      todayMinutesSpent: 0,
      totalQuestionsSolved: 0,
      todayQuestionsSolved: 0,
      soundEnabled: true,
      lastActiveDate: ''
    };
  });
  const [displayMasteries, setDisplayMasteries] = useState<SkillMastery[]>(() => {
    return (masteries && masteries.length > 0) ? masteries : dataService.getSkillMasteries();
  });

  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(parentOrStudent?.linkedStudentIds?.[0] || '');
  const [linkedStudents, setLinkedStudents] = useState<UserProfile[]>([]);
  const [studentLoadError, setStudentLoadError] = useState('');
  const [studentReload, setStudentReload] = useState(0);
  const [passwordResetNotice, setPasswordResetNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'preferences' | 'membership'>('overview');
  const [nativeReportOpen, setNativeReportOpen] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'radar' | 'momentum'>('radar');
  const [skillFilter, setSkillFilter] = useState<'all' | 'strengths' | 'weaknesses'>('all');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showStudentSettingsModal, setShowStudentSettingsModal] = useState(false);
  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [confirmStudentPassword, setConfirmStudentPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const { userProfile: parentProfile } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyQuestionProgressData | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSendStatus, setReportSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const parentId = parentOrStudent?.id;
  const parentRole = parentOrStudent?.role;
  const linkedStudentIds = parentOrStudent?.role === 'parent' ? parentOrStudent.linkedStudentIds : undefined;
  const linkedIdsKey = (linkedStudentIds || []).join(',');

  useEffect(() => {
    let active = true;
    const ids = parentRole === 'parent' ? linkedStudentIds || [] : [];
    setSelectedStudentId(previous => ids.includes(previous) ? previous : ids[0] || '');
    Promise.all(ids.map(async id => {
      const snap = await getDoc(doc(db, 'users', id));
      const child = snap.exists() ? snap.data() as UserProfile : null;
      return child?.id === id && child.role === 'student' && child.linkedParentId === parentId ? child : null;
    })).then(profiles => { if (active) setLinkedStudents(profiles.filter((p): p is UserProfile => !!p)); }).catch(() => {});
    return () => { active = false; };
  }, [parentId, parentRole, linkedIdsKey, studentReload]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchStudent = async () => {
      const activeUser = parentOrStudent || dataService.getCurrentUser();
      if (!activeUser) return;
      
      if (activeUser.role === 'parent') {
        if (!selectedStudentId || !activeUser.linkedStudentIds?.includes(selectedStudentId)) {
          if (isSubscribed) {
            setStudentLoadError('Bu veli hesabına bağlı öğrenci bulunamadı.');
            setIsLoadingStudent(false);
          }
          return;
        }
        setIsLoadingStudent(true);
        try {
          const docRef = doc(db, 'users', selectedStudentId);
          const snap = await getDoc(docRef);
          if (snap.exists() && isSubscribed) {
            const child = snap.data() as UserProfile;
            if (child.id !== selectedStudentId || child.role !== 'student' || child.linkedParentId !== activeUser.id) {
              throw new Error('Linked student unavailable');
            }
            setCurrentStudent(child);
            setStudentLoadError('');
            const progress = await dataService.loadRemoteProgressForUser(child.id);
            if (isSubscribed) {
              const childMasteries = progress.masteries || [];
              setDisplayMasteries(childMasteries);
              setWeeklyData(dataService.getWeeklyQuestionProgressData(child, progress.weeklyQuestions));
              return;
            }
          }
          if (isSubscribed) setStudentLoadError('Öğrenci bilgileri yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
        } catch {
          if (isSubscribed) setStudentLoadError('Öğrenci bilgileri yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
        } finally {
          if (isSubscribed) {
            setIsLoadingStudent(false);
          }
        }
        return;
      }
      
      // Fallback: single-user / student view or parent without distinct remote linked account
      if (isSubscribed) {
        setCurrentStudent(activeUser);
        const effectiveMasteries = (masteries && masteries.length > 0) ? masteries : dataService.getSkillMasteries();
        setDisplayMasteries(effectiveMasteries);
        setWeeklyData(dataService.getWeeklyQuestionProgressData(activeUser));
      }
    };
    fetchStudent();

    return () => {
      isSubscribed = false;
    };
  }, [parentId, parentRole, selectedStudentId, studentReload]);

  useEffect(() => {
    if (parentOrStudent?.role !== 'parent') {
      setWeeklyData(dataService.getWeeklyQuestionProgressData(currentStudent || undefined));
    }

    return reminderService.subscribeToConfig(() => {});
  }, [currentStudent, parentOrStudent?.role]);

  // Sort masteries
  const sorted = useMemo(() => {
    return [...(displayMasteries || [])].sort((a, b) => (b.mastery || 0) - (a.mastery || 0));
  }, [displayMasteries]);

  const strengths = useMemo(() => sorted.slice(0, 3), [sorted]);
  const needsAttention = useMemo(() => sorted.slice(-3).reverse(), [sorted]);
  const accuracy = strengths.length > 0 ? (strengths[0].accuracy ?? 0) : 0;

  // Activity is sourced from the linked student's persisted progress.
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const activityData: number[] = weeklyData?.dailyStats.map((day) => day.thisWeek) || [0, 0, 0, 0, 0, 0, 0];
  const maxQuestions = Math.max(...activityData, 1);

  // Radar Data for 8 Cognitive Dimensions
  const radarData = useMemo(() => {
    return (displayMasteries || []).map((m) => ({
      category: (m.categoryName || '').split(' ')[0], // short label
      fullName: m.categoryName || '',
      mastery: m.mastery || 0,
      accuracy: m.accuracy || 0,
      fullMark: 100
    }));
  }, [displayMasteries]);

  // Only the currently available seven-day history is charted.
  const monthlyMomentumData = useMemo(() => {
    return (weeklyData?.dailyStats || []).map((day) => ({
      date: day.shortDay,
      score: day.thisWeek,
    }));
  }, [weeklyData]);

  const handleSendWeeklyReport = async () => {
    if (!weeklyData) return;
    setIsSendingReport(true);
    setReportSendStatus('idle');
    try {
      const result = await shareWeeklyReport(
        parentProfile?.email,
        currentStudent,
        weeklyData,
        displayMasteries,
      );
      if (result !== 'cancelled') {
        setReportSendStatus('success');
        sound.playSuccess();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.3 } });
        setTimeout(() => setReportSendStatus('idle'), 3500);
      } else {
        setReportSendStatus('idle');
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

  const handleResetStudentPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordResetError(null);
    if (isResettingPassword) return;
    const parsed = strongPasswordSchema.safeParse(newStudentPassword);
    if (!parsed.success) {
      setPasswordResetError(parsed.error.issues[0].message);
      return;
    }
    if (newStudentPassword !== confirmStudentPassword) {
      setPasswordResetError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetLinkedStudentPassword(currentStudent.id, newStudentPassword);
      sound.playSuccess();
      setShowPasswordResetModal(false);
      setNewStudentPassword('');
      setConfirmStudentPassword('');
      setPasswordResetNotice(`${currentStudent.name} için şifre yenilendi. Öğrenci, giriş kodu ve yeni şifresiyle giriş yapabilir.`);
    } catch (error) {
      sound.playError();
      setPasswordResetError(error instanceof Error ? error.message : 'Öğrenci şifresi yenilenemedi.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const filteredMasteries = useMemo(() => {
    if (skillFilter === 'strengths') return strengths;
    if (skillFilter === 'weaknesses') return needsAttention;
    return displayMasteries;
  }, [skillFilter, displayMasteries, strengths, needsAttention]);

  // Daily goal calculation for circular progress
  const targetMins = currentStudent.dailyGoalMinutes || 15;
  const spentMins = currentStudent.todayMinutesSpent || 0;
  const goalProgressPct = Math.min(100, Math.round((spentMins / targetMins) * 100));

  const studentSelector = parentOrStudent?.role === 'parent' && linkedStudents.length > 1 ? (
    <label className="mb-4 block text-sm font-semibold">
      Öğrenci seçin
      <select
        value={selectedStudentId}
        disabled={isSwitchingStudent || isResettingPassword}
        onChange={e => {
          setSelectedStudentId(e.target.value);
          setShowPasswordResetModal(false);
          setShowStudentSettingsModal(false);
          setNewStudentPassword('');
          setConfirmStudentPassword('');
        }}
        className="ml-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
      >
        {linkedStudents.map(child => (
          <option key={child.id} value={child.id}>
            {child.name} · {child.grade}. sınıf
          </option>
        ))}
      </select>
    </label>
  ) : null;

  if (parentOrStudent?.role === 'parent') {
    if (studentLoadError && currentStudent.role !== 'student') {
      return (
        <div className="mx-auto max-w-6xl space-y-4 p-5">
          <h1 className="text-2xl font-bold">Veli paneli</h1>
          {studentSelector}
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
            <p className="font-semibold">{studentLoadError}</p>
            <button
              type="button"
              onClick={() => setStudentReload(v => v + 1)}
              className="mt-3 min-h-11 rounded-xl bg-indigo-700 px-5 py-2 text-white font-bold text-sm shadow-sm cursor-pointer"
            >
              Tekrar dene
            </button>
          </div>
          <AccountCenter />
        </div>
      );
    }
    if (isLoadingStudent && (currentStudent.id === 'pending' || currentStudent.role !== 'student')) {
      return (
        <div className="mx-auto max-w-6xl min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Bağlı öğrencinin bilgileri yükleniyor…</p>
        </div>
      );
    }
  }

  return (
    <div className="zp-dashboard-page zp-parent-dashboard min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-4">{studentSelector}{passwordResetNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{passwordResetNotice}</p>}</div>
      {/* Animated Subtle Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={prefersReducedMotion ? undefined : {
            scale: [1, 1.15, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.35, 0.5, 0.35]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl"
        />
        <motion.div 
          animate={prefersReducedMotion ? undefined : {
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
      <div className="zp-dashboard-hero relative z-10 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/80 pt-8 pb-10 px-4 sm:px-6 md:px-12 transition-colors">
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
              <p className="zp-dashboard-kicker">VELİ ALANI / GELİŞİM</p>
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
                    <div className="flex flex-wrap items-center gap-2">
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
                      {parentOrStudent?.role === 'parent' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordResetError(null);
                            setNewStudentPassword(''); setConfirmStudentPassword('');
                            setShowPasswordResetModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Şifreyi Yenile
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-start md:justify-end">
            {(onNavigate || onOpenStudent) && (
              <div className="col-span-2 sm:col-span-1">
              <button
                type="button"
                disabled={isSwitchingStudent}
                aria-busy={isSwitchingStudent}
                onClick={() => {
                  sound.playClick();
                  if (onOpenStudent) onOpenStudent(currentStudent.id); else onNavigate?.('dashboard');
                }}
                className="zp-dashboard-primary w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs transition-colors cursor-pointer min-h-[42px] disabled:opacity-60 disabled:cursor-wait"
              >
                <GraduationCap className="w-4 h-4" />
                <span>{isSwitchingStudent ? 'Öğrenci paneli açılıyor…' : 'Öğrenci Paneline Geç'}</span>
              </button>
              <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{currentStudent.name} için öğrenci oturumu açılır. Veli paneline dönüşte veli şifresi doğrulanır.</p>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendWeeklyReport}
              disabled={isSendingReport || !weeklyData}
              className={`px-3 sm:px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm border transition-all cursor-pointer min-h-[42px] ${
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
              <span className="truncate">{isSendingReport ? 'Hazırlanıyor...' : reportSendStatus === 'success' ? 'Rapor Hazır!' : 'Rapor E-postala'}</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sound.playClick();
                setShowStudentSettingsModal(true);
              }}
              className="px-3 sm:px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer min-h-[42px]"
            >
              <KeyRound className="w-4 h-4 text-indigo-500" />
              <span>Giriş Bilgileri</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sound.playClick();
                setShowReminderModal(true);
              }}
              className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer min-h-[42px]"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              <span>Hatırlatıcı</span>
            </motion.button>
          </div>

        </div>
      </div>

      {/* Main Dashboard Body */}
      <div className="zp-dashboard-content max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pt-8 space-y-8 relative z-10">
        
        {/* Modern Fluid Segmented Tabs */}
        <div className="zp-dashboard-tabs flex p-1.5 bg-zinc-200/60 dark:bg-zinc-900/80 rounded-2xl w-full max-w-full overflow-x-auto whitespace-nowrap scrollbar-none border border-zinc-200/70 dark:border-zinc-800/80 shadow-inner gap-1 md:w-fit" role="group" aria-label="Veli paneli bölümleri">
          <button 
            type="button"
            aria-pressed={activeTab === 'overview'}
            onClick={() => {
              sound.playClick();
              setActiveTab('overview');
            }}
            className={`relative px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <BarChart2 className="w-4 h-4" /> Gelişim Analizi & Bilişsel Radar
            </span>
          </button>

          <button 
            type="button"
            aria-pressed={activeTab === 'skills'}
            onClick={() => {
              sound.playClick();
              setActiveTab('skills');
            }}
            className={`relative px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <Brain className="w-4 h-4" /> 8 Bilişsel Boyut Haritası
            </span>
          </button>

          <button 
            type="button"
            aria-pressed={activeTab === 'preferences'}
            onClick={() => {
              sound.playClick();
              setActiveTab('preferences');
            }}
            className={`relative px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <Bell className="w-4 h-4" /> Bildirim & E-posta
            </span>
          </button>
          {isAndroidApp && <button type="button" aria-pressed={activeTab === 'membership'} onClick={() => setActiveTab('membership')} className="zp-native-parent-membership">Üyelik</button>}
        </div>

        {(!isAndroidApp || activeTab === 'membership') && parentProfile?.role === 'parent' && <FamilyActivation />}
        {(!isAndroidApp || activeTab === 'membership') && parentProfile?.role === 'parent' && currentStudent.role === 'student' && <NativeAccessStatus studentId={currentStudent.id} studentName={currentStudent.name}/>}
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
              <div className="zp-dashboard-kpis grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
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
                      {currentStudent.totalQuestionsSolved || 0}
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
                      <Shield className="w-3 h-3 text-indigo-500" /> {currentStudent.streakFreezeCount || 0} Kalkan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                      {currentStudent.streak || 0} <span className="text-sm font-semibold text-zinc-400">Gün</span>
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Kesintisiz Öğrenme Disiplini</p>
                  </div>
                </motion.div>

              </div>

              {isAndroidApp && <button type="button" className="zp-native-report-toggle" aria-expanded={nativeReportOpen} aria-controls="zp-parent-report" onClick={() => setNativeReportOpen(value => !value)}>{nativeReportOpen ? 'Raporu kapat' : 'Ayrıntılı gelişim raporunu aç'}</button>}
              {(!isAndroidApp || nativeReportOpen) && <div id="zp-parent-report">
              {/* Main Visuals Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Charts & Visuals */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Innovative Chart 1: Switchable Radar vs 30-Day Momentum */}
                  <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <Compass className="w-5 h-5 text-indigo-500" />
                          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {chartViewMode === 'radar' ? 'Bilişsel Yetenek Radar Haritası' : 'Bu Haftanın Soru Akışı'}
                          </h2>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {chartViewMode === 'radar' 
                            ? 'Öğrencinin çalıştığı bilişsel alanlardaki güncel ustalık dağılımı'
                            : 'Günlere göre gerçekten tamamlanan soru sayısı'}
                        </p>
                      </div>

                      {/* Switcher Toggle */}
                      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto border border-zinc-200/50 dark:border-zinc-700/50" role="group" aria-label="Grafik görünümü">
                        <button
                          type="button"
                          aria-pressed={chartViewMode === 'radar'}
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
                          type="button"
                          aria-pressed={chartViewMode === 'momentum'}
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
                          Haftalık Akış
                        </button>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-[270px] sm:h-[320px] w-full flex items-center justify-center">
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
                                  domain={[0, 'auto']}
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
                                  name="Çözülen Soru"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Animated Weekly Solved Questions Bar Chart */}
                  <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
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

                  <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-indigo-500 mt-0.5" />
                      <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Uzun Dönem Eğilim</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          Dört haftalık karşılaştırma, yeterli gerçek çalışma verisi biriktiğinde burada gösterilecek.
                        </p>
                      </div>
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
                        Öğrencimiz <strong className="text-amber-300 font-bold">{strengths[0]?.categoryName || 'Henüz veri yok'}</strong> kategorisinde %{strengths[0]?.accuracy || 0} doğruluk gösteriyor.
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
                  <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
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
                  <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
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

              </div>}
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
              <div className="zp-dashboard-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                    10 Bilişsel Boyut Haritası
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Uygulamadaki bilişsel çalışma alanlarının güncel ve hesaplanmış performans metrikleri.
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
                    Tümü ({displayMasteries.length})
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
                      className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
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
              <AccountCenter />
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
                  onClick={() => setShowStudyPlanModal(false)}
                  className="flex-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Planı İnceledim
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
      <AnimatePresence>
        {showPasswordResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-password-title"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onSubmit={handleResetStudentPassword}
              className="zp-dashboard-modal w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="student-password-title" className="text-lg font-black text-zinc-950 dark:text-white">Öğrenci şifresini yenile</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">İşlemden sonra öğrencinin diğer cihazlardaki oturumları kapatılır.</p>
                </div>
                <button type="button" disabled={isResettingPassword} onClick={() => { setShowPasswordResetModal(false); setNewStudentPassword(''); setConfirmStudentPassword(''); }} aria-label="Kapat" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 space-y-3">
                <NewPasswordFields label="Yeni öğrenci şifresi" value={newStudentPassword} confirmation={confirmStudentPassword} onChange={setNewStudentPassword} onConfirmation={setConfirmStudentPassword} disabled={isResettingPassword} />
                {passwordResetError && <p id="parent-password-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{passwordResetError}</p>}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" disabled={isResettingPassword} onClick={() => { setShowPasswordResetModal(false); setNewStudentPassword(''); setConfirmStudentPassword(''); }} className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Vazgeç</button>
                <button type="submit" disabled={isResettingPassword} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{isResettingPassword ? 'Yenileniyor…' : 'Şifreyi Güvenle Yenile'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Student Login & Security Modal */}
      <StudentSettingsModal
        isOpen={showStudentSettingsModal}
        onClose={() => setShowStudentSettingsModal(false)}
        student={currentStudent}
        onResetPassword={() => {
          setPasswordResetError(null);
          setShowPasswordResetModal(true);
        }}
      />

    </div>
  );
};


