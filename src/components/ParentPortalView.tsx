import { LegalLinks } from './LegalLinks';
import { NativeAccessStatus } from './NativeAccessStatus';
import { isAndroidApp, publicPageUrl } from '../lib/native-app';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { AndroidParentOverview } from './android/AndroidParentOverview';
import { AndroidScreenLoading } from './android/AndroidScreenLoading';
import { AccountCenter, FamilyActivation } from './AccountCenter';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react';
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
import { sortSkillMasteriesByScore, buildCognitiveRadarData, buildMomentumSeries, calculateDailyGoalProgressPct } from '../features/parent/parent-portal-helpers';
import { useParentPortalTab } from '../features/parent/parent-tab-sync';
import { MetricCard } from './ui/MetricCard';
import './landing/design-system.css';
import './dashboard-design-system.css';
import { ParentProgressOverview, ParentWeeklyVolume } from './parent/ParentProgressOverview';
import './parent/parent-executive.css';
import './android/android-parent.css';

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
  const [activeTab, setActiveTab] = useParentPortalTab('overview');
  const [isBillingBusy, setIsBillingBusy] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [codeCopyError, setCodeCopyError] = useState('');
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
        setStudentLoadError('');
        setDisplayMasteries([]);
        setWeeklyData(null);
        setShowDetailedReport(false);
        setCodeCopied(false);
        setCodeCopyError('');
        setReportSendStatus('idle');
        try {
          const docRef = doc(db, 'users', selectedStudentId);
          const snap = await getDoc(docRef);
          if (snap.exists() && isSubscribed) {
            const child = snap.data() as UserProfile;
            if (child.id !== selectedStudentId || child.role !== 'student' || child.linkedParentId !== activeUser.id) {
              throw new Error('Linked student unavailable');
            }
            const progress = await dataService.loadRemoteProgressForUser(child.id);
            if (isSubscribed) {
              const childMasteries = progress.masteries || [];
              setCurrentStudent(child);
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
  }, [parentId, parentRole, selectedStudentId, studentReload, linkedIdsKey]);

  useEffect(() => {
    if (parentOrStudent?.role !== 'parent') {
      setWeeklyData(dataService.getWeeklyQuestionProgressData(currentStudent || undefined));
    }

    return reminderService.subscribeToConfig(() => {});
  }, [currentStudent, parentOrStudent?.role]);

  // Sort masteries
  const sorted = useMemo(() => sortSkillMasteriesByScore(displayMasteries || []), [displayMasteries]);

  const strengths = useMemo(() => sorted.slice(0, 3), [sorted]);
  const needsAttention = useMemo(() => sorted.slice(-3).reverse(), [sorted]);
  const accuracy = strengths.length > 0 ? (strengths[0].accuracy ?? 0) : 0;

  // Radar Data for 8 Cognitive Dimensions
  const radarData = useMemo(() => buildCognitiveRadarData(displayMasteries || []), [displayMasteries]);
  const monthlyMomentumData = useMemo(() => buildMomentumSeries(weeklyData), [weeklyData]);

  const skillsKpis = useMemo(() => {
    const list = displayMasteries || [];
    const practiced = list.filter(m => (m.attemptCount || 0) > 0);
    const avgMastery = list.length > 0
      ? Math.round(list.reduce((sum, m) => sum + (m.mastery || 0), 0) / list.length)
      : 0;
    const totalAttempts = list.reduce((sum, m) => sum + (m.attemptCount || 0), 0);
    const overallAccuracy = practiced.length > 0
      ? Math.round(practiced.reduce((sum, m) => sum + (m.accuracy || 0), 0) / practiced.length)
      : 0;
    return {
      avgMastery,
      practicedCount: practiced.length,
      totalDomains: list.length || 10,
      totalAttempts,
      overallAccuracy,
    };
  }, [displayMasteries]);

  useEffect(() => {
    if (!showStudyPlanModal && !showPasswordResetModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showPasswordResetModal && !isResettingPassword) {
        setShowPasswordResetModal(false);
        setNewStudentPassword('');
        setConfirmStudentPassword('');
      } else if (showStudyPlanModal) {
        setShowStudyPlanModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStudyPlanModal, showPasswordResetModal, isResettingPassword]);

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

  const handleCopyCode = async () => {
    if (!currentStudent.studentCode) return;
    setCodeCopyError('');
    try {
      await navigator.clipboard.writeText(currentStudent.studentCode);
      setCodeCopied(true);
      sound.playClick();
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setCodeCopyError('Kod kopyalanamadı. Giriş bilgileri bölümünden kodu seçip kopyalayabilirsiniz.');
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
  const goalProgressPct = calculateDailyGoalProgressPct(spentMins, targetMins);

  const studentSelector = parentOrStudent?.role === 'parent' && linkedStudents.length > 1 ? (
    <label className="mb-4 block text-sm font-semibold">
      Öğrenci seçin
      <select
        value={selectedStudentId}
        disabled={isSwitchingStudent || isResettingPassword || isBillingBusy}
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

  const changeTab = (tab: typeof activeTab) => {
    if (isSwitchingStudent || isResettingPassword || isBillingBusy) return;
    sound.playClick();
    setActiveTab(tab);
    setShowDetailedReport(false);
    if (isAndroidApp) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useAndroidBack(() => {
    if (isResettingPassword || isSwitchingStudent || isBillingBusy) return;
    if (showPasswordResetModal) setShowPasswordResetModal(false);
    else if (showStudentSettingsModal) setShowStudentSettingsModal(false);
    else if (showReminderModal) setShowReminderModal(false);
    else if (showStudyPlanModal) setShowStudyPlanModal(false);
    else if (showDetailedReport) setShowDetailedReport(false);
    else changeTab('overview');
  }, isAndroidApp && (isResettingPassword || isSwitchingStudent || isBillingBusy || showPasswordResetModal || showStudentSettingsModal || showReminderModal || showStudyPlanModal || showDetailedReport || activeTab !== 'overview'));

  if (parentOrStudent?.role === 'parent') {
    if (studentLoadError) {
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
          <LegalLinks/>
          <AccountCenter />
        </div>
      );
    }
    if (isLoadingStudent || currentStudent.id !== selectedStudentId || currentStudent.linkedParentId !== parentId || !linkedStudentIds?.includes(currentStudent.id)) {
      if (isAndroidApp) return <AndroidScreenLoading />;
      return (
        <div className="mx-auto max-w-6xl min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Bağlı öğrencinin bilgileri yükleniyor…</p>
        </div>
      );
    }
  }

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? 'always' : 'user'}><div className={`${isAndroidApp ? 'bj-native-parent ' : ''}zp-dashboard-page zp-parent-dashboard bj-parent-executive min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden`} data-reduced-motion={prefersReducedMotion}>
      
      <div className="bj-parent-student-selector relative z-10 mx-auto max-w-6xl px-5 pt-4">{studentSelector}{codeCopyError && <p role="alert" className="p-3 text-sm text-rose-700">{codeCopyError}</p>}{passwordResetNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{passwordResetNotice}</p>}</div>
      {isAndroidApp && <header className="bj-parent-native-heading"><span className="bj-parent-native-avatar" aria-hidden="true">{!currentStudent.avatar || currentStudent.avatar === '🦊' ? <img src="/brand/junior-fox-3d.webp" alt="" width={32} height={38}/> : currentStudent.avatar}</span><div><p>VELİ ALANI</p><h1>{currentStudent.name}</h1><small>{currentStudent.grade || 1}. sınıf · Seviye {currentStudent.level || 1}</small></div>{(onNavigate || onOpenStudent) && <button type="button" disabled={isSwitchingStudent || isBillingBusy} aria-busy={isSwitchingStudent} onClick={() => { sound.playClick(); if (onOpenStudent) onOpenStudent(currentStudent.id); else onNavigate?.('dashboard'); }}><GraduationCap size={18} aria-hidden="true"/>{isSwitchingStudent ? 'Açılıyor…' : 'Öğrenciye geç'}</button>}</header>}
      {/* Top Header Hero */}
      {!isAndroidApp && <div className="zp-dashboard-hero relative z-10 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/80 pt-8 pb-10 px-4 sm:px-6 md:px-12 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Student Profile Card */}
          <div className="flex items-center gap-5 w-full md:w-auto min-w-0">
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-4xl shadow-xs border border-indigo-200/60 dark:border-zinc-700/60 shrink-0"
            >
              <span className="select-none">{currentStudent.avatar || '🦊'}</span>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-4 ring-white dark:ring-zinc-900 shadow-xs">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="zp-dashboard-kicker">Aile Gelişim Merkezi</p>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif]">
                  Veli Portalı
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <ShieldCheck className="w-3 h-3" /> Gelişim Takibi
                </span>
              </div>

              {isLoadingStudent ? (
                <div className="text-zinc-500 text-sm mt-1.5">Öğrenci verileri senkronize ediliyor...</div>
              ) : (
                <div className="space-y-2.5 mt-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm tabular-nums">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {currentStudent.name}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                      <Award className="w-4 h-4" /> Seviye {currentStudent.level || 1}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Flame className="w-4 h-4" /> {currentStudent.streak || 0} Günlük Seri
                    </span>
                  </div>

                  {currentStudent.studentCode && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex min-h-[44px] items-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer group"
                        title="Öğrenci giriş kodunu kopyala"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-500 transition-colors shrink-0" />
                        <span>Giriş Kodu: <strong className="tracking-widest font-mono text-zinc-900 dark:text-white">{currentStudent.studentCode}</strong></span>
                        {codeCopied ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Kopyalandı</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 shrink-0" />
                        )}
                      </button>
                      {parentOrStudent?.role === 'parent' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordResetError(null);
                            setNewStudentPassword(''); setConfirmStudentPassword('');
                            setShowPasswordResetModal(true);
                          }}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Şifreyi Yenile
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
                className="zp-dashboard-primary w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
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
              className={`px-3 sm:px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xs border transition-all cursor-pointer min-h-[44px] ${
                reportSendStatus === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-600' 
                  : reportSendStatus === 'error' 
                  ? 'bg-rose-500 text-white border-rose-600' 
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 border-transparent'
              }`}
            >
              {isSendingReport ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
              ) : reportSendStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <Mail className="w-4 h-4 shrink-0" />
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
              className="px-3 sm:px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer min-h-[44px]"
            >
              <KeyRound className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Giriş Bilgileri</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sound.playClick();
                setShowReminderModal(true);
              }}
              className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer min-h-[44px]"
            >
              <Settings className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Hatırlatıcı</span>
            </motion.button>
          </div>

        </div>
      </div>}

      {/* Main Dashboard Body */}
      <div className="zp-dashboard-content max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pt-8 space-y-8 relative z-10">
        
        {/* Modern Fluid Segmented Tabs (4-Tab Synchronized Model: Overview, Skills, Preferences, Membership) */}
        {!isAndroidApp && <div className="zp-dashboard-tabs flex p-1.5 bg-zinc-200/60 dark:bg-zinc-900/80 rounded-2xl w-full max-w-full overflow-x-auto whitespace-nowrap scrollbar-none border border-zinc-200/70 dark:border-zinc-800/80 shadow-inner gap-1 md:w-fit" role="group" aria-label="Veli paneli bölümleri">
          <button 
            type="button"
            aria-pressed={activeTab === 'overview'}
            disabled={isSwitchingStudent || isResettingPassword || isBillingBusy}
            onClick={() => changeTab('overview')}
            className={`relative min-h-[44px] px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'overview' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'overview' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-xs border border-zinc-200/50 dark:border-zinc-700/50"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <BarChart2 className="w-4 h-4 shrink-0" /> Genel Bakış
            </span>
          </button>

          <button 
            type="button"
            aria-pressed={activeTab === 'skills'}
            disabled={isSwitchingStudent || isResettingPassword || isBillingBusy}
            onClick={() => changeTab('skills')}
            className={`relative min-h-[44px] px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'skills' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'skills' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-xs border border-zinc-200/50 dark:border-zinc-700/50"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <Brain className="w-4 h-4 shrink-0" /> Beceri Analizi
            </span>
          </button>

          <button 
            type="button"
            aria-pressed={activeTab === 'preferences'}
            disabled={isSwitchingStudent || isResettingPassword || isBillingBusy}
            onClick={() => changeTab('preferences')}
            className={`relative min-h-[44px] px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'preferences' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'preferences' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-xs border border-zinc-200/50 dark:border-zinc-700/50"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <Bell className="w-4 h-4 shrink-0" /> Ayarlar & Hesap
            </span>
          </button>

          <button 
            type="button"
            aria-pressed={activeTab === 'membership'}
            disabled={isSwitchingStudent || isResettingPassword || isBillingBusy}
            onClick={() => changeTab('membership')}
            className={`relative min-h-[44px] px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'membership' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'membership' && (
              <motion.div 
                layoutId="activeParentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-xs border border-zinc-200/50 dark:border-zinc-700/50"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" /> Üyelik
            </span>
          </button>
        </div>}

        {parentProfile?.role === 'parent' && <FamilyActivation />}
        {parentProfile?.role === 'parent' && currentStudent.role === 'student' && activeTab === 'membership' && <NativeAccessStatus key={currentStudent.id} studentId={currentStudent.id} studentName={currentStudent.name} onBusyChange={setIsBillingBusy}/>}
        {!isAndroidApp && activeTab === 'membership' && !(parentProfile?.role === 'parent' && currentStudent.role === 'student') && (
          <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200/70 dark:border-zinc-800 shadow-xs flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Üyelik ve Erişim Durumu</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Veli hesabınızla giriş yaptığınızda bağlı öğrencinizin abonelik ve erişim yönetimi burada görüntülenir.
              </p>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {isAndroidApp && activeTab === 'overview' && !showDetailedReport && <AndroidParentOverview key="native-overview" student={currentStudent} weeklyData={weeklyData} masteries={displayMasteries} onReport={() => setShowDetailedReport(true)} onMembership={() => changeTab('membership')}/>}
          {activeTab === 'overview' && (!isAndroidApp || showDetailedReport) && (
            <motion.div 
              key="tab-overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {isAndroidApp && <button type="button" className="bj-parent-pocket-link bj-parent-report-toggle" onClick={() => setShowDetailedReport(false)}>← Kısa özete dön</button>}
              <ParentProgressOverview student={currentStudent} weeklyData={weeklyData} masteries={displayMasteries} />

              {!isAndroidApp && parentProfile?.role === 'parent' && currentStudent.role === 'student' && (
                <div className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{currentStudent.name} · Üyelik ve Erişim</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Erişim paketi, Google Play senkronizasyonu ve abonelik yönetimi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => changeTab('membership')}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Üyelik detaylarını gör</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" className="dark:stroke-zinc-700" />
                                <PolarAngleAxis 
                                  dataKey="category" 
                                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
                                />
                                <PolarRadiusAxis 
                                  angle={30} 
                                  domain={[0, 100]} 
                                  stroke="#94a3b8" 
                                  className="dark:stroke-zinc-600"
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                />
                                <Radar isAnimationActive={!prefersReducedMotion}
                                  name="Ustalık Puanı" 
                                  dataKey="mastery" 
                                  stroke="#4f46e5" 
                                  fill="#4f46e5" 
                                  fillOpacity={0.25} 
                                  strokeWidth={2}
                                />
                                <RechartsTooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 space-y-1.5 min-w-[160px]">
                                          <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{data.fullName}</p>
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500 dark:text-zinc-400">Ustalık Seviyesi:</span>
                                            <strong className="font-bold tabular-nums text-indigo-600 dark:text-indigo-300">%{data.mastery}</strong>
                                          </div>
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500 dark:text-zinc-400">Doğruluk Oranı:</span>
                                            <strong className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">%{data.accuracy}</strong>
                                          </div>
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
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800" />
                                <XAxis 
                                  dataKey="date" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                                  dy={12}
                                  minTickGap={25}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                  domain={[0, 'auto']}
                                />
                                <RechartsTooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 space-y-1 min-w-[130px]">
                                          <p className="font-bold text-slate-700 dark:text-zinc-300">{data.date}</p>
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500 dark:text-zinc-400">Çözülen Soru:</span>
                                            <strong className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{data.score}</strong>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                  cursor={{ stroke: '#4f46e5', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                                />
                                <Area isAnimationActive={!prefersReducedMotion}
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="#4f46e5" 
                                  strokeWidth={2.5}
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

                  <ParentWeeklyVolume weeklyData={weeklyData} />

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
                  
                  {/* Coaching Recommendation Card */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 md:p-7 shadow-lg relative overflow-hidden border border-zinc-700/60"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                          <Lightbulb className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white font-['Outfit',sans-serif]">Çalışma Rehberi</h3>
                          <p className="text-[11px] text-zinc-400">Pedagojik Gelişim Analizi</p>
                        </div>
                      </div>

                      <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6 tabular-nums">
                        {strengths[0]?.attemptCount ? <>{currentStudent.name}, <strong className="text-amber-300 font-bold">{strengths[0].categoryName}</strong> alanındaki çalışmalarında %{strengths[0].accuracy || 0} doğruluk gösteriyor. </> : 'Çalışma kayıtları oluştuğunda öğrencinizin güçlü alanları ve pekiştirme önerileri burada görünecek. '}
                        Buna karşın <strong className="text-rose-300 font-bold">{needsAttention[0]?.categoryName || 'Matris'}</strong> alanında hata tekrarı mevcut. Hafta sonu 10 dakikalık odak egzersizi önerilir.
                      </p>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          sound.playClick();
                          setShowStudyPlanModal(true);
                        }}
                        className="w-full min-h-[44px] py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Özel Çalışma Programı Oluştur</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
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
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md tabular-nums">
                        İlk 3
                      </span>
                    </div>

                    <div className="space-y-4 tabular-nums">
                      {strengths.map((m, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                              {m.categoryName}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
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
                          <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                            <span>{m.attemptCount} soru çözüldü</span>
                            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
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

                    <div className="space-y-4 tabular-nums">
                      {needsAttention.map((m, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                              {m.categoryName}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
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
                          <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                            <span>{m.attemptCount} soru çözüldü</span>
                            <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-medium">
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

          {/* TAB 2: DETAILED 10 COGNITIVE DOMAINS */}
          {activeTab === 'skills' && (
            <motion.div 
              key="tab-skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Tremor Executive 4-KPI Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Ortalama Ustalık"
                  metric={`%${skillsKpis.avgMastery}`}
                  subtitle="10 bilişsel alan genel ortalaması"
                  icon={<Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  progressBar={{ value: skillsKpis.avgMastery, color: '#4f46e5' }}
                  className="min-w-0"
                />
                <MetricCard
                  title="Çalışılan Boyut"
                  metric={`${skillsKpis.practicedCount} / ${skillsKpis.totalDomains}`}
                  subtitle="En az bir soru çözülen alanlar"
                  icon={<Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  progressBar={{
                    value: Math.round((skillsKpis.practicedCount / Math.max(1, skillsKpis.totalDomains)) * 100),
                    color: '#0d9488',
                  }}
                  className="min-w-0"
                />
                <MetricCard
                  title="Ortalama Doğruluk"
                  metric={`%${skillsKpis.overallAccuracy}`}
                  subtitle="Çalışılan alanlardaki isabet oranı"
                  icon={<Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  delta={{
                    value: `${skillsKpis.totalAttempts} soru`,
                    direction: skillsKpis.overallAccuracy >= 70 ? 'up' : 'neutral',
                  }}
                  className="min-w-0"
                />
                <MetricCard
                  title="Öne Çıkan Alan"
                  metric={strengths[0]?.attemptCount ? `%${strengths[0].mastery}` : '—'}
                  subtitle={strengths[0]?.attemptCount ? strengths[0].categoryName : 'Henüz veri yok'}
                  icon={<Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  className="min-w-0"
                />
              </div>

              <div className="zp-dashboard-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                    10 Bilişsel Boyut Haritası
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Uygulamadaki bilişsel çalışma alanlarının güncel ve hesaplanmış performans metrikleri.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 self-start sm:self-auto max-w-full gap-1" role="group" aria-label="Beceri filtresi">
                  <button
                    type="button"
                    aria-pressed={skillFilter === 'all'}
                    onClick={() => setSkillFilter('all')}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                      skillFilter === 'all'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tümü ({displayMasteries.length})
                  </button>
                  <button
                    type="button"
                    aria-pressed={skillFilter === 'strengths'}
                    onClick={() => setSkillFilter('strengths')}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      skillFilter === 'strengths'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Güçlü Alanlar
                  </button>
                  <button
                    type="button"
                    aria-pressed={skillFilter === 'weaknesses'}
                    onClick={() => setSkillFilter('weaknesses')}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      whileHover={{ y: -3 }}
                      className="zp-dashboard-surface bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/70 dark:border-zinc-800 shadow-sm flex flex-col justify-between min-w-0"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isHigh 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                              : isMedium 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' 
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
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
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {skill.attemptCount} soru çözüldü · %{skill.accuracy} doğruluk
                        </p>
                      </div>

                      <div className="mt-5 space-y-2 tabular-nums">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">Yetkinlik</span>
                          <span className="font-black text-zinc-900 dark:text-zinc-100 tabular-nums">%{skill.mastery}</span>
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
              {isAndroidApp && <section className="bj-parent-native-tools" aria-label="Öğrenci ve destek işlemleri"><h2>Öğrenci ve destek</h2>
                <button type="button" onClick={() => setShowStudentSettingsModal(true)}><KeyRound size={17} aria-hidden="true"/>Giriş bilgileri</button>
                {currentStudent.studentCode && <button type="button" onClick={() => void handleCopyCode()}><Copy size={17} aria-hidden="true"/>{codeCopied ? 'Kopyalandı' : 'Kodu kopyala'}</button>}
                {parentOrStudent?.role === 'parent' && <button type="button" onClick={() => { setPasswordResetError(null); setNewStudentPassword(''); setConfirmStudentPassword(''); setShowPasswordResetModal(true); }}>Öğrenci şifresini yenile</button>}
                <button type="button" onClick={() => setShowReminderModal(true)}><Bell size={17} aria-hidden="true"/>Hatırlatıcı</button>
                <button type="button" disabled={isSendingReport || !weeklyData} onClick={handleSendWeeklyReport}><Mail size={17} aria-hidden="true"/>{isSendingReport ? 'Hazırlanıyor…' : 'Haftalık raporu paylaş'}</button>
                <a href={publicPageUrl('/bilgi/hesap-ve-veli-rehberi')} target="_blank" rel="noopener noreferrer">Hesap ve veli rehberi</a>
                {codeCopied && <p role="status">Öğrenci kodu kopyalandı.</p>}
                {reportSendStatus !== 'idle' && <p role="status">{reportSendStatus === 'success' ? 'Rapor hazır.' : 'Rapor hazırlanamadı. Yeniden deneyin.'}</p>}
              </section>}
              <LegalLinks/>
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

      {isAndroidApp && <nav className="bj-parent-native-tabs" aria-label="Veli alanı bölümleri"><div>{([
        { id: 'overview', label: 'Özet', icon: BarChart2 }, { id: 'skills', label: 'Beceriler', icon: Brain },
        { id: 'membership', label: 'Üyelik', icon: ShieldCheck }, { id: 'preferences', label: 'Hesap', icon: Settings },
      ] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={activeTab === id} disabled={isSwitchingStudent || isResettingPassword || isBillingBusy} onClick={() => changeTab(id)}><Icon aria-hidden="true"/><span>{label}</span></button>)}</div></nav>}
      {/* MODAL 1: Custom Study Plan Modal */}
      <AnimatePresence>
        {showStudyPlanModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-plan-modal-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowStudyPlanModal(false);
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setShowStudyPlanModal(false)}
                className="absolute top-5 right-5 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40 shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="study-plan-modal-title" className="text-xl font-black text-zinc-900 dark:text-white font-['Outfit',sans-serif]">
                    Kişisel Çalışma Programı
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {currentStudent.name} için kişiselleştirilmiş 7 günlük takviye planı
                  </p>
                </div>
              </div>

              {/* Plan Recommendations */}
              <div className="space-y-3 mb-6 tabular-nums">
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
                  type="button"
                  onClick={() => setShowStudyPlanModal(false)}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => setShowStudyPlanModal(false)}
                  className="flex-2 min-h-[44px] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            onClick={(event) => {
              if (event.target === event.currentTarget && !isResettingPassword) {
                setShowPasswordResetModal(false);
                setNewStudentPassword('');
                setConfirmStudentPassword('');
              }
            }}
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
                <button type="button" disabled={isResettingPassword} onClick={() => { setShowPasswordResetModal(false); setNewStudentPassword(''); setConfirmStudentPassword(''); }} aria-label="Kapat" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 space-y-3">
                <NewPasswordFields label="Yeni öğrenci şifresi" value={newStudentPassword} confirmation={confirmStudentPassword} onChange={setNewStudentPassword} onConfirmation={setConfirmStudentPassword} disabled={isResettingPassword} />
                {passwordResetError && <p id="parent-password-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{passwordResetError}</p>}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" disabled={isResettingPassword} onClick={() => { setShowPasswordResetModal(false); setNewStudentPassword(''); setConfirmStudentPassword(''); }} className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer">Vazgeç</button>
                <button type="submit" disabled={isResettingPassword} className="min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer">{isResettingPassword ? 'Yenileniyor…' : 'Şifreyi Güvenle Yenile'}</button>
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

    </div></MotionConfig>
  );
};


