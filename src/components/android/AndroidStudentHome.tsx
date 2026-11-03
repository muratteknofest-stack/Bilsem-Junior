import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Map, Shapes } from 'lucide-react';
import type { UserProfile } from '../../types';
import { campaignLength, campaignsForGrade } from '../../features/student/story-catalog';
import { campaignCompleted, nextCampaignStage, type StoryProgress, type StoryStage } from '../../features/student/story-adventure';
import { useAndroidBack } from '../../hooks/useAndroidBack';
import { StoryAdventure } from '../student/StoryAdventure';
import { StudentStoryScene } from '../student/StudentStoryScene';
import './android-home.css';

interface Props {
  user: UserProfile;
  progress: StoryProgress;
  saveError: string;
  onNavigate: (route: string) => void;
  onStartStory: (stage: StoryStage) => void;
  onSelectStory?: (id: string) => void;
}

/** Keep the complete journey available on demand, outside the short home screen. */
export function AndroidStudentHome({ user, progress, saveError, onNavigate, onStartStory, onSelectStory }: Props) {
  const [showMap, setShowMap] = useState(false);
  const mapButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const returnHome = () => {
    setShowMap(false);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => mapButton.current?.focus({ preventScroll: true }));
  };
  useAndroidBack(returnHome, showMap);
  const openMap = () => {
    setShowMap(true);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => backButton.current?.focus({ preventScroll: true }));
  };
  const stories = campaignsForGrade(user.grade || 1);
  const story = stories.find(item => item.id === progress.selectedStoryId) || stories[0];
  if (showMap) return <main className="bj-native-hub bj-student-game">
    <button ref={backButton} type="button" className="bj-native-back" onClick={returnHome}><ArrowLeft size={18} aria-hidden="true" /> Ana sayfaya dön</button>
    <StoryAdventure user={user} progress={progress} saveError={saveError} onStartStory={onStartStory} onSelectStory={onSelectStory} onStudy={() => onNavigate('student-study')} />
  </main>;

  const next = story && nextCampaignStage(progress, story.id);
  const completed = story ? campaignCompleted(progress, story.id) : 0;
  const chapter = story?.chapters[next?.chapter ?? story.chapters.length - 1];
  return <main className="bj-native-hub bj-android-home" aria-label="Öğrenci ana sayfası">
    <header className="bj-home-greeting"><div><p>{user.grade || 1}. sınıf</p><h1>Merhaba, {user.name}!</h1></div></header>
    {story && chapter && <section className="bj-home-adventure" aria-label="Sıradaki maceran">
      <div className="bj-home-scene" aria-hidden="true"><StudentStoryScene scene={chapter.scene} /></div>
      <div className="bj-home-adventure-copy"><h2>{next ? chapter.title : 'Harika bir yolculuktu!'}</h2>
        <div className="bj-home-progress"><progress aria-label="Hikâye ilerlemesi" aria-valuetext={`${story.title}: ${completed}/${campaignLength(story)} görev`} value={completed} max={campaignLength(story)} /></div>
        <button type="button" className="bj-home-continue" onClick={() => next ? onStartStory(next) : openMap()}>{next ? 'Keşfe devam et' : 'Hikâyeleri keşfet'}<ArrowRight size={19} aria-hidden="true" /></button>
      </div>
    </section>}
    {saveError && <p role="alert" className="bj-home-error">{saveError}</p>}
    <nav className="bj-home-shortcuts" aria-label="Hızlı çalışma"><button type="button" onClick={() => onNavigate('student-study')}><Shapes aria-hidden="true" />Test çöz</button><button type="button" onClick={() => onNavigate('student-lessons')}><BookOpen aria-hidden="true" />Konu öğren</button></nav>
    <button ref={mapButton} type="button" className="bj-home-map" onClick={openMap}><Map size={19} aria-hidden="true" />Macera haritası<ArrowRight size={17} aria-hidden="true" /></button>
  </main>;
}
