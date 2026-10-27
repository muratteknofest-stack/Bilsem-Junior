import { StoryAdventure } from '../student/StoryAdventure';
import { STUDY_GROUPS } from '../../features/student/adventure-art';
import { StudentGameArt, GAME_ROUTE_ART } from '../student/StudentGameArt';
import { StudentExplorerPortal } from '../student/StudentExplorerWorld';
import { useState } from 'react';
import { BookOpen, Brain, ChevronRight, Clock3, Compass, Flame, GraduationCap, RotateCcw, Shapes, Sparkles, Star, Target, Trophy, type LucideIcon } from 'lucide-react';
import type { UserProfile } from '../../types';
import { type StoryProgress, type StoryStage } from '../../features/student/story-adventure';
import { useStudentReducedMotion } from '../../features/student/experience-preferences';
import { sound } from '../../lib/sound';
import { StudentMissionStrip } from '../student/StudentMissionStrip';
import { dataService } from '../../services/data-service';
import './android-student.css';
import './android-expedition.css';
import { StudentAdventureAtmosphere, StudentMotionToggle, useStudentMotionSurface } from '../student/StudentMotion';
import { StudentTreasure } from './StudentTreasure';
import './student-treasure.css';
import { StudentProfileWorld } from './StudentProfileWorld';

const studyLinks: Array<{route:string;title:string;detail:string;icon:LucideIcon; tone:string}> = [
  {route:'adaptive',title:'Adaptif Test',detail:'Kendi hızında, sana uygun sorular',icon:Sparkles,tone:'purple'},
  {route:'exams',title:'Deneme Sınavı',detail:'Süreli sınav deneyimi',icon:Clock3,tone:'blue'},
  {route:'practice',title:'Karışık Pratik',detail:'Bütün alanlardan alıştırmalar',icon:Target,tone:'green'},
  {route:'student-tests',title:'Zeka Testleri',detail:'Etkileşimli test kütüphanesi',icon:Shapes,tone:'pink'},
  {route:'student-topics',title:'Konu Çalışmaları',detail:'İstediğin konuyu seç',icon:BookOpen,tone:'blue'},
  {route:'student-lessons',title:'Konu Anlatımları',detail:'Animasyonla keşfet, adım adım öğren',icon:GraduationCap,tone:'green'},
  {route:'mistakes',title:'Hata Defteri',detail:'Cevaplarını yeniden incele',icon:RotateCcw,tone:'orange'},
  {route:'student-plan',title:'Kişisel Planım',detail:'Hedefler, favoriler ve çalışma planı',icon:Compass,tone:'green'},
  {route:'student-skills',title:'Yeteneklerim',detail:'Beceri alanlarına göre çalış',icon:Brain,tone:'purple'},
  {route:'glossary',title:'Bilişsel Sözlük',detail:'Kavramlar ve mini oyunlar',icon:GraduationCap,tone:'orange'},
];
const rewardLinks = [
  {route:'student-challenges',title:'Görevlerim',detail:'Günlük hedefler ve haftalık yarış',icon:Star,tone:'orange'},
  {route:'achievements',title:'Rozetlerim',detail:'Koleksiyonunu ve başarılarını gör',icon:Trophy,tone:'purple'},
  {route:'leaderboard',title:'Sıralama',detail:'Keşif arkadaşlarınla ilerle',icon:Flame,tone:'pink'},
  {route:'student-progress',title:'İlerlemem',detail:'Haftalık grafikler ve gelişim',icon:Target,tone:'blue'},
];
interface Props { route:string; user:UserProfile; progress:StoryProgress; saveError:string; onNavigate:(route:string)=>void; onStartStory:(stage:StoryStage)=>void; onSelectStory?:(id:string)=>void; onUserUpdate:(user:UserProfile)=>void; onReminder:()=>void; onLogout:()=>void; }
export function AndroidStudentHub({route,user,progress,saveError,onNavigate,onStartStory,onSelectStory,onUserUpdate,onReminder,onLogout}:Props) {
  const reduced=useStudentReducedMotion();
  const [studyGroup,setStudyGroup]=useState<string>('tests');
  const motionSurface=useStudentMotionSurface(`${route}-${studyGroup}`);
  const go=(route:string)=>{sound.playClick();onNavigate(route);};
  const visibleRoutes:readonly string[]=STUDY_GROUPS.find(group=>group.id===studyGroup)!.routes;
  const isRewards=route==='student-rewards';
  const links=isRewards?rewardLinks:studyLinks.filter(item=>visibleRoutes.includes(item.route));
  if(route==='student-profile')return <StudentProfileWorld user={user} progress={progress} onNavigate={onNavigate} onUserUpdate={onUserUpdate} onReminder={onReminder} onLogout={onLogout}/>;
  if(route==='student-study'||route==='student-rewards')return <main ref={motionSurface} className={`bj-native-hub bj-student-game bj-motion-world ${route==='student-rewards'?'bj-native-rewards':''}`} data-reduced-motion={reduced}>
    <StudentMotionToggle/>
    <div className="bj-native-page-title">{route==='student-rewards'?<Trophy aria-hidden="true"/>:<Shapes aria-hidden="true"/>}<div><p>{route==='student-rewards'?'HER ADIMIN DEĞERLİ':'BİLSEM HAZIRLIK ALANIN'}</p><h1>{route==='student-rewards'?'Ödüller ve gelişim':'Bugün ne keşfedelim?'}</h1></div></div>
    {route==='student-rewards'&&<StudentTreasure user={user} progress={progress} achievements={dataService.getAchievements()}/>}
    {route==='student-rewards'&&<StudentMissionStrip user={user} weeklyQuestions={dataService.getWeeklyQuestionProgressData(user).summary.thisWeekTotal}/>}
    {route==='student-study'&&<><StudentExplorerPortal onLessons={()=>go('student-lessons')}/><nav className="bj-study-groups" aria-label="Çalışma alanı grupları">{STUDY_GROUPS.map(group=><button key={group.id} aria-pressed={studyGroup===group.id} onClick={()=>{sound.playClick();setStudyGroup(group.id);}}>{group.label}</button>)}</nav></>}
    <div key={studyGroup} className="bj-native-feature-grid" data-motion-zone>{links.map(({route,title,detail,icon:Icon,tone})=><button key={route} onClick={()=>go(route)} data-tone={tone}>{isRewards?<span className="bj-reward-object" aria-hidden="true"><StudentGameArt kind={GAME_ROUTE_ART[route] || "medal"}/><i>✦</i></span>:<span className="bj-game-feature-art"><StudentGameArt kind={GAME_ROUTE_ART[route] || "cubes"}/><span className="bj-feature-key"><Icon aria-hidden="true"/></span></span>}<div><h2>{title}</h2><p>{detail}</p></div><ChevronRight aria-hidden="true"/></button>)}</div>
  </main>;
  return <main className="bj-native-hub bj-student-game"><StoryAdventure user={user} progress={progress} saveError={saveError} onStartStory={onStartStory} onSelectStory={onSelectStory} onStudy={()=>go('student-study')}/></main>;
}
