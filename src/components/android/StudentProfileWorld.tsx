import { LegalLinks } from '../LegalLinks';
import { Bell, BookOpen, ChevronRight, Globe2, LogOut, ShieldCheck, Sparkles, UserRound, type LucideIcon } from 'lucide-react';
import type { UserProfile } from '../../types';
import type { StoryProgress } from '../../features/student/story-adventure';
import { levelProgress } from '../../features/student/study-hub-model';
import { useStudentReducedMotion } from '../../features/student/experience-preferences';
import { ADVENTURE_PHOTOS } from '../../features/student/adventure-art';
import { publicPageUrl } from '../../lib/native-app';
import { sound } from '../../lib/sound';
import { StudentHeroBanner } from '../student/StudentHeroBanner';
import { StudentExperienceControls } from '../student/StudentExperienceControls';
import { StudentMotionToggle, useStudentMotionSurface } from '../student/StudentMotion';
import { StudentPassport } from './StudentTreasure';
import './student-profile-world.css';

interface Props {
  user: UserProfile;
  progress: StoryProgress;
  onNavigate: (route: string) => void;
  onUserUpdate: (user: UserProfile) => void;
  onReminder: () => void;
  onLogout: () => void;
}

function ProfileActionFace({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <><span className="bj-profile-key" aria-hidden="true"><Icon /></span><span className="bj-profile-action-copy"><strong>{title}</strong><small>{detail}</small></span><ChevronRight className="bj-profile-action-arrow" aria-hidden="true" /></>;
}

export function StudentProfileWorld({ user, progress, onNavigate, onUserUpdate, onReminder, onLogout }: Props) {
  const reduced = useStudentReducedMotion();
  const surface = useStudentMotionSurface('profile-world');
  const goToParent = () => { sound.playClick(); onNavigate('parent'); };

  return <main ref={surface} className="bj-native-hub bj-student-game bj-motion-world bj-native-profile bj-profile-world bj-game-profile" data-reduced-motion={reduced}>
    <StudentMotionToggle />
    <header className="bj-profile-heading">
      <span className="bj-profile-heading-key" aria-hidden="true"><UserRound /></span>
      <div><p>KAŞİF KARTIN</p><h1>Profilim</h1></div>
      <span className="bj-profile-heading-spark" aria-hidden="true"><Sparkles /></span>
    </header>

    <StudentPassport progress={progress} />
    <div className="bj-profile-identity" data-motion-zone>
      <StudentHeroBanner user={user} greeting={{ text: 'Merhaba', emoji: '✦' }} xpProgress={levelProgress(user.xp)} onUserUpdate={onUserUpdate} onNavigate={onNavigate} prefersReducedMotion={reduced} avatarImageSrc={!user.avatar || user.avatar === '🦊' ? '/brand/junior-fox.svg' : undefined} />
    </div>

    <section className="bj-profile-settings" aria-labelledby="bj-profile-settings-heading" data-motion-zone>
      <div className="bj-profile-section-heading"><div><p>KENDİ RİTMİN, KENDİ DÜNYAN</p><h2 id="bj-profile-settings-heading">Keşif ayarların</h2></div><span aria-hidden="true">✦</span></div>
      <div className="bj-profile-preferences"><StudentExperienceControls /></div>
      <div className="bj-profile-actions">
        <button type="button" className="bj-profile-action" data-tone="sky" aria-label="Çalışma hatırlatıcısı" onClick={onReminder}>
          <ProfileActionFace icon={Bell} title="Çalışma hatırlatıcısı" detail="Keşif zamanını birlikte seçelim" />
        </button>
        <button type="button" className="bj-profile-action" data-tone="violet" aria-label="Veli alanı ve Google Play üyeliği" onClick={goToParent}>
          <ProfileActionFace icon={ShieldCheck} title="Veli alanı" detail="Hesap ve Google Play üyeliği" />
        </button>
        <a className="bj-profile-action" data-tone="mint" aria-label="Hesap ve veli rehberi" href={publicPageUrl('/bilgi/hesap-ve-veli-rehberi')}>
          <ProfileActionFace icon={BookOpen} title="Hesap ve veli rehberi" detail="Merak ettiklerin burada" />
        </a>
        <a className="bj-profile-action" data-tone="gold" href={publicPageUrl('/en/')} lang="en" aria-label="English · Thinking games">
          <ProfileActionFace icon={Globe2} title="English" detail="Thinking games" />
        </a>
      </div>
      <LegalLinks/>
      <button type="button" className="bj-profile-action bj-profile-logout" data-tone="rose" aria-label="Çıkış yap" onClick={onLogout}>
        <ProfileActionFace icon={LogOut} title="Çıkış yap" detail="Bir sonraki keşifte görüşürüz" />
      </button>
    </section>

    <details className="bj-photo-credits"><summary>Görsel künyesi</summary><p>Gerçek doğa ve nesne fotoğrafları · Unsplash</p><ul>{Object.entries(ADVENTURE_PHOTOS).map(([id, photo]) => <li key={id}><a href={photo.url} target="_blank" rel="noopener noreferrer">{photo.author}</a></li>)}</ul><a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Fotoğraf lisansı</a></details>
  </main>;
}
