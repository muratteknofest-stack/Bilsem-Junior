import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearningAccess } from '../features/student/use-learning-access';
import { MembershipPrompt } from './MembershipPrompt';
import { WordwallLibrary } from './WordwallLibrary';
import './student/student-professional.css';

export function WordwallPage() {
  const { userProfile } = useAuth();
  const membership = useLearningAccess(userProfile?.role === 'student' ? userProfile.id : undefined);
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6"><a href="/" className="text-2xl font-extrabold text-violet-700">ZekaPark</a><a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={17} aria-hidden="true" /> Öğrenci alanına dön</a></header><main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">{membership.active ? <WordwallLibrary headingLevel={1} /> : <MembershipPrompt onUpgrade={() => window.location.assign('/login?role=parent')} loading={membership.loading} error={membership.error} onRetry={membership.refresh} />}</main></div>;
}
