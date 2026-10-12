import React from 'react';
import { Home, AlertCircle, Award, Target, Book, ShieldCheck, BookOpen, CircleHelp, type LucideIcon } from 'lucide-react';
import { sound } from '../lib/sound';
import type { UserRole } from '../types';
interface MobileBottomNavProps { currentRoute: string; onNavigate: (route: string) => void; mistakesCount: number; userRole: UserRole; onLogout?: () => void }
interface NavItem { id: string; icon: LucideIcon; label: string; badge?: number }
const studentItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Ana sayfa' },
  { id: 'adaptive', icon: Target, label: 'Pratik' },
  { id: 'achievements', icon: Award, label: 'Rozetler' },
  { id: 'mistakes', icon: AlertCircle, label: 'Tekrar' },
  { id: 'glossary', icon: Book, label: 'Sözlük' },
];
export function MobileBottomNav({ currentRoute, onNavigate, mistakesCount, userRole }: MobileBottomNavProps) {
  const items: NavItem[] = userRole === 'student' ? studentItems : userRole === 'parent' ? [{ id: 'parent', icon: Home, label: 'Veli alanı' }] : [{ id: 'admin', icon: ShieldCheck, label: 'Yönetim' }];
  const tone = userRole === 'parent' ? 'text-parent-600 bg-parent-50' : userRole === 'admin' ? 'text-admin-600 bg-admin-50' : 'text-primary-600 bg-primary-50';
  const itemClass = 'flex-1 flex flex-col items-center justify-center gap-1 min-h-14 py-2 relative rounded-xl mx-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
  const badge = Number.isFinite(mistakesCount) ? Math.max(0, Math.floor(mistakesCount)) : 0;
  return <nav aria-label={userRole === 'student' ? 'Öğrenci alt menüsü' : userRole === 'parent' ? 'Veli alt menüsü' : 'Yönetici alt menüsü'} className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 z-50 pb-safe">
    <div className="flex items-center justify-around px-2 py-1 min-h-16">
      {items.map(({ id, icon: Icon, label }) => { const active = currentRoute === id; return <button key={id} type="button" aria-current={active ? 'page' : undefined} aria-label={id === 'mistakes' && badge > 0 ? `${label}: ${badge} yanlış soru` : label} onClick={() => { if (!active) { sound.playClick(); onNavigate(id); } }} className={`${itemClass} ${active ? tone : 'text-slate-500'}`}><Icon aria-hidden="true" className="w-6 h-6" /><span className="text-[10px] font-bold">{label}</span>{id === 'mistakes' && badge > 0 && <span aria-hidden="true" className="absolute top-1 right-2 bg-rose-600 text-white text-[9px] font-bold rounded-full px-1">{badge > 9 ? '9+' : badge}</span>}</button>; })}
      {userRole !== 'student' && <><a href="/blog" className={`${itemClass} text-slate-500`}><BookOpen aria-hidden="true" className="w-6 h-6" /><span className="text-[10px] font-bold">Blog</span></a><a href={userRole === 'parent' ? '/bilgi/hesap-ve-veli-rehberi' : '/bilgi/hesap-guvenligi'} className={`${itemClass} text-slate-500`}><CircleHelp aria-hidden="true" className="w-6 h-6" /><span className="text-[10px] font-bold">Rehber</span></a></>}
    </div>
  </nav>;
}
