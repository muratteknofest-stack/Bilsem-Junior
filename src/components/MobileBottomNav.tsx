import React from 'react';
import { Home, Compass, AlertCircle, Award, Target, Book, ShieldCheck } from 'lucide-react';
import { sound } from '../lib/sound';
import { UserRole } from '../types';

interface MobileBottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  mistakesCount: number;
  userRole: UserRole;
  onLogout?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  onNavigate,
  mistakesCount,
  userRole,
}) => {
  // Common Nav Item Template
  const NavItem = ({ id, icon: Icon, label, badge, customColor }: any) => {
    const isActive = currentRoute === id;
    let colorClass = 'text-slate-400';
    let bgClass = 'bg-transparent';
    let iconScale = 'scale-100';

    if (isActive) {
      if (userRole === 'admin') {
        colorClass = 'text-admin-600';
        bgClass = 'bg-admin-50';
      } else if (userRole === 'parent') {
        colorClass = 'text-parent-600';
        bgClass = 'bg-parent-50';
      } else {
        colorClass = 'text-primary-600';
        bgClass = 'bg-primary-50';
      }
      iconScale = 'scale-110';
    } else if (customColor) {
      colorClass = customColor;
    }

    return (
      <button
        onClick={() => {
          if (!isActive) {
            sound.playClick();
            onNavigate(id);
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-all duration-300 ${bgClass} rounded-xl mx-1`}
      >
        <div className={`transition-transform duration-300 ${iconScale}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <span className={`text-[10px] font-bold ${isActive ? colorClass : 'text-slate-500'}`}>
          {label}
        </span>
        {badge > 0 && (
          <span className="absolute top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white ">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-zinc-200 z-50 pb-safe">
      <div className="flex items-center justify-around px-2 py-1 h-16">
        
        {userRole === 'student' && (
          <>
            <NavItem id="dashboard" icon={Home} label="Ana Sayfa" />
            <NavItem id="adaptive" icon={Target} label="Pratik" />
            <NavItem id="achievements" icon={Award} label="Başarılar" />
            <NavItem id="mistakes" icon={AlertCircle} label="Hatalar" badge={mistakesCount} customColor={mistakesCount > 0 && currentRoute !== 'mistakes' ? 'text-rose-400' : ''} />
            <NavItem id="glossary" icon={Book} label="Sözlük" />
          </>
        )}

        {userRole === 'parent' && (
          <>
            <NavItem id="parent" icon={Home} label="Veli Portalı" />
          </>
        )}

        {userRole === 'admin' && (
          <>
            <NavItem id="admin" icon={ShieldCheck} label="Admin Portal" />
          </>
        )}
      </div>
    </div>
  );
};
