import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Copy, Check, Flame, ShieldCheck, ArrowUpRight, Trophy } from 'lucide-react';
import { sound } from '../../lib/sound';
import { StudentGradeSelector } from '../StudentGradeSelector';
import type { UserProfile } from '../../types';

export interface StudentHeroBannerProps {
  user: UserProfile;
  greeting: { text: string; emoji: string };
  xpProgress: { level: number; xp: number; percent: number; remaining: number };
  onUserUpdate: (u: UserProfile) => void;
  onNavigate: (view: string) => void;
  prefersReducedMotion?: boolean | null;
}

export const StudentHeroBanner: React.FC<StudentHeroBannerProps> = ({ user, greeting, xpProgress, onUserUpdate, onNavigate, prefersReducedMotion }) => {
  const [copiedStudentCode, setCopiedStudentCode] = useState(false);
  const [copyError, setCopyError] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const handleCopyStudentCode = async () => {
    if (!user.studentCode) return;
    try {
      await navigator.clipboard.writeText(user.studentCode);
      setCopiedStudentCode(true); setCopyError(''); sound.playClick();
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedStudentCode(false), 2000);
    } catch { setCopyError('Kod kopyalanamadı. Giriş kodunu seçerek kopyalayabilirsin.'); }
  };
  const celebrate = () => {
    sound.playLevelUp();
    if (!prefersReducedMotion) confetti({ particleCount: 24, spread: 45, ticks: 100, disableForReducedMotion: true, origin: { y: .3 } });
  };
  return <motion.section className="zp-dashboard-hero zp-pro-hero"
    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
    <div className="zp-pro-hero-content">
      <div className="zp-student-profile">
        <button type="button" className="zp-student-avatar" aria-label="Avatar kutlaması" onClick={celebrate}>
          <span>{user.avatar || '🦊'}</span><small>SEVİYE {xpProgress.level}</small>
        </button>
        <div className="zp-student-profile-copy">
          <p className="zp-dashboard-kicker">KEŞİF TAKIMINA HOŞ GELDİN</p>
          <h1>{greeting.text}, {user.name?.split(' ')[0] || 'Kaşif'}<span className="zp-profile-period" aria-hidden="true">.</span></h1>
          <div className="zp-profile-settings">
            <details className="zp-grade-settings"><summary>{user.grade || 1}. sınıf <span>Sınıfımı düzenle</span></summary><StudentGradeSelector key={user.id} user={user} onSaved={onUserUpdate} /></details>
            <details className="zp-profile-tools"><summary>Hesap ve giriş bilgileri</summary><div className="zp-profile-tools-content">
              {user.studentCode && <button type="button" onClick={handleCopyStudentCode} title="Giriş kodunu kopyala"><span>Giriş Kodu: <strong>{user.studentCode}</strong></span>{copiedStudentCode ? <Check size={15} aria-label="Kopyalandı" /> : <Copy size={15} aria-hidden="true" />}</button>}
              {user.linkedParentId && <button type="button" onClick={() => onNavigate('parent')} title="Veli alanına dönmek için veli şifresini doğrula"><ShieldCheck size={15} aria-hidden="true" />Veli Alanına Dön</button>}
              {user.id.startsWith('demo_') && <span>Deneme: toplam 3 örnek soru</span>}
              {copyError && <p role="status">{copyError}</p>}
            </div></details>
          </div>
        </div>
      </div>
      <div className="zp-profile-progress">
        <div><span>Bir sonraki seviye</span><strong>{xpProgress.xp} <small>/ {xpProgress.level * 250} XP</small></strong></div>
        <div role="progressbar" aria-label="Sonraki seviyeye ilerleme" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpProgress.percent)} className="zp-profile-xp-track">
          <motion.span initial={prefersReducedMotion ? false : { width: 0 }} animate={{ width: `${xpProgress.percent}%` }} transition={{ duration: prefersReducedMotion ? 0 : .6 }} />
        </div>
        <p>{xpProgress.remaining} XP kaldı. Her soruyla biraz daha ileri.</p>
      </div>
      <div className="zp-student-hero-stats">
        <button type="button" onClick={celebrate} className="zp-streak-chip"><Flame size={21} aria-hidden="true" /><span><strong>{user.streak || 0} gün</strong><small>{user.streakFreezeCount || 0} seri kalkanı</small></span></button>
        <button type="button" onClick={() => { sound.playClick(); onNavigate('leaderboard'); }} className="zp-ranking-chip"><Trophy size={20} aria-hidden="true" /><span>Sıralama</span><ArrowUpRight size={15} aria-hidden="true" /></button>
      </div>
    </div>
  </motion.section>;
};
