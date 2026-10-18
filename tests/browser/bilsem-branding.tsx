import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from '../../src/components/LandingPage';
import { LoginPage } from '../../src/components/LoginPage';
import type { UserRole } from '../../src/types';
import '../../src/index.css';

function BrandPreview() {
  const initial = new URLSearchParams(location.search).get('view') || 'home';
  const [view, setView] = useState(initial);
  const [role, setRole] = useState<UserRole>('student');
  return <div className="bilsem-junior-skin">{view === 'home'
    ? <LandingPage onNavigateToLogin={next => { setRole(next); setView('login'); }} onNavigate={next => setView(next === 'register' ? 'register' : 'home')} />
    : <LoginPage key={view + role} initialMode={view === 'register' ? 'register' : 'login'} initialRole={role} onNavigateHome={() => setView('home')} onLoginSuccess={() => {}} />}</div>;
}
createRoot(document.getElementById('root')!).render(<BrandPreview />);
