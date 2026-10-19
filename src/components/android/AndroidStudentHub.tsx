import { ADVENTURE_PHOTOS, FEATURE_PHOTOS, STUDY_GROUPS } from '../../features/student/adventure-art';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bell, BookOpen, Brain, Check, ChevronLeft, ChevronRight, Clock3, Compass, Flame, GraduationCap, LockKeyhole, LogOut, RotateCcw, Shapes, ShieldCheck, Sparkles, Star, Target, Trophy, UserRound, type LucideIcon } from 'lucide-react';
import type { UserProfile } from '../../types';
import { levelProgress } from '../../features/student/study-hub-model';
import { STORY_CHAPTERS, STORY_STAGES, stageStatus, type StoryProgress, type StoryStage } from '../../features/student/story-adventure';
import { useStudentReducedMotion } from '../../features/student/experience-preferences';
import { sound } from '../../lib/sound';
import { publicPageUrl } from '../../lib/native-app';
import { StudentHeroBanner } from '../student/StudentHeroBanner';
import { StudentExperienceControls } from '../student/StudentExperienceControls';
import { StudentMissionStrip } from '../student/StudentMissionStrip';
import { dataService } from '../../services/data-service';
import './android-student.css';
import './android-expedition.css';
import { StudentAdventureAtmosphere, StudentMotionToggle, useStudentMotionSurface } from '../student/StudentMotion';

const studyLinks: Array<{route:string;title:string;detail:string;icon:LucideIcon; tone:string}> = [
  {route:'adaptive',title:'Adaptif Test',detail:'Kendi hızında, sana uygun sorular',icon:Sparkles,tone:'purple'},
  {route:'exams',title:'Deneme Sınavı',detail:'Süreli sınav deneyimi',icon:Clock3,tone:'blue'},
  {route:'practice',title:'Karışık Pratik',detail:'Bütün alanlardan alıştırmalar',icon:Target,tone:'green'},
  {route:'student-tests',title:'Zeka Testleri',detail:'Etkileşimli test kütüphanesi',icon:Shapes,tone:'pink'},
  {route:'student-topics',title:'Konu Çalışmaları',detail:'İstediğin konuyu seç',icon:BookOpen,tone:'blue'},
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
interface Props { route:string; user:UserProfile; progress:StoryProgress; saveError:string; onNavigate:(route:string)=>void; onStartStory:(stage:StoryStage)=>void; onUserUpdate:(user:UserProfile)=>void; onReminder:()=>void; onLogout:()=>void; }
export function AndroidStudentHub({route,user,progress,saveError,onNavigate,onStartStory,onUserUpdate,onReminder,onLogout}:Props) {
  const reduced=useStudentReducedMotion();
  const currentChapter=Math.min(STORY_CHAPTERS.length-1,Math.floor(progress.completed.length/3));
  const [chapterIndex,setChapterIndex]=useState(currentChapter);
  const chapter=STORY_CHAPTERS[chapterIndex];
  const [intro,setIntro]=useState(false);
  const [studyGroup,setStudyGroup]=useState<string>('tests');
  const motionSurface=useStudentMotionSurface(`${route}-${chapterIndex}-${studyGroup}`);
  const scenePhoto=ADVENTURE_PHOTOS[chapter.scene];
  const go=(route:string)=>{sound.playClick();onNavigate(route);};
  const visibleRoutes:readonly string[]=STUDY_GROUPS.find(group=>group.id===studyGroup)!.routes;
  const links=route==='student-rewards'?rewardLinks:studyLinks.filter(item=>visibleRoutes.includes(item.route));
  if(route==='student-profile')return <main ref={motionSurface} className="bj-native-hub bj-student-game bj-motion-world" data-reduced-motion={reduced}>
    <StudentMotionToggle/>
    <div className="bj-native-page-title"><UserRound aria-hidden="true"/><div><p>KAŞİF KARTIN</p><h1>Profilim</h1></div></div>
    <StudentHeroBanner user={user} greeting={{text:'Merhaba',emoji:'✦'}} xpProgress={levelProgress(user.xp)} onUserUpdate={onUserUpdate} onNavigate={onNavigate} prefersReducedMotion={reduced}/>
    <section className="bj-native-settings" aria-label="Profil ayarları"><StudentExperienceControls/><button onClick={onReminder}><Bell aria-hidden="true"/>Çalışma hatırlatıcısı<ChevronRight aria-hidden="true"/></button><button onClick={()=>go('parent')}><ShieldCheck aria-hidden="true"/>Veli alanı ve Google Play üyeliği<ChevronRight aria-hidden="true"/></button><a href={publicPageUrl('/bilgi/hesap-ve-veli-rehberi')}><BookOpen aria-hidden="true"/>Hesap ve veli rehberi<ChevronRight aria-hidden="true"/></a><a href={publicPageUrl('/en/')} lang="en">English · Thinking games<ChevronRight aria-hidden="true"/></a><button onClick={onLogout}><LogOut aria-hidden="true"/>Çıkış yap</button></section><details className="bj-photo-credits"><summary>Görsel künyesi</summary><p>Gerçek doğa ve nesne fotoğrafları · Unsplash</p><ul>{Object.entries(ADVENTURE_PHOTOS).map(([id,photo])=><li key={id}><a href={photo.url} target="_blank" rel="noopener noreferrer">{photo.author}</a></li>)}</ul><a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Fotoğraf lisansı</a></details>
  </main>;
  if(route==='student-study'||route==='student-rewards')return <main ref={motionSurface} className="bj-native-hub bj-student-game bj-motion-world" data-reduced-motion={reduced}>
    <StudentMotionToggle/>
    <div className="bj-native-page-title">{route==='student-rewards'?<Trophy aria-hidden="true"/>:<Shapes aria-hidden="true"/>}<div><p>{route==='student-rewards'?'HER ADIMIN DEĞERLİ':'BİLSEM HAZIRLIK ALANIN'}</p><h1>{route==='student-rewards'?'Ödüller ve gelişim':'Bugün ne keşfedelim?'}</h1></div></div>
    {route==='student-rewards'&&<StudentMissionStrip user={user} weeklyQuestions={dataService.getWeeklyQuestionProgressData(user).summary.thisWeekTotal}/>}
    {route==='student-study'&&<><div className="bj-field-guide-banner" data-motion-zone><img src={ADVENTURE_PHOTOS.compass.src} alt="" width={700} height={240}/><div><span>KAŞİFİN ÇALIŞMA GÜNLÜĞÜ</span><strong>Her keşif bir soruyla başlar.</strong></div></div><nav className="bj-study-groups" aria-label="Çalışma alanı grupları">{STUDY_GROUPS.map(group=><button key={group.id} aria-pressed={studyGroup===group.id} onClick={()=>{sound.playClick();setStudyGroup(group.id);}}>{group.label}</button>)}</nav></>}
    <div key={studyGroup} className="bj-native-feature-grid" data-motion-zone>{links.map(({route,title,detail,icon:Icon,tone})=><button key={route} onClick={()=>go(route)} data-tone={tone}><span className="bj-feature-photo"><img src={ADVENTURE_PHOTOS[FEATURE_PHOTOS[route]].src} alt="" width={600} height={360} loading="lazy" decoding="async"/><span><Icon aria-hidden="true"/></span></span><div><h2>{title}</h2><p>{detail}</p></div><ChevronRight aria-hidden="true"/></button>)}</div>
  </main>;
  const chapterStages=STORY_STAGES.filter(stage=>stage.chapter===chapterIndex);
  const completedHere=chapterStages.filter(stage=>progress.completed.includes(stage.id)).length;
  return <main ref={motionSurface} className="bj-native-hub bj-story bj-motion-world" data-scene={chapter.scene} data-reduced-motion={reduced}>
    <StudentMotionToggle/>
    <div className="bj-story-status" data-motion-zone><span><Flame size={18} aria-hidden="true"/>{user.streak||0} gün</span><span><Star size={18} aria-hidden="true"/>{user.xp||0} XP</span><button onClick={()=>go('student-rewards')}><Trophy size={18} aria-hidden="true"/>Ödüller</button></div>
    <div className="bj-story-chapter-select"><button aria-label="Önceki hikâye bölümü" disabled={chapterIndex===0} onClick={()=>{sound.playClick();setChapterIndex(i=>i-1);setIntro(false);}}><ChevronLeft aria-hidden="true"/></button><div><p>BÖLÜM {chapterIndex+1} / {STORY_CHAPTERS.length}</p><h1>{chapter.title}</h1></div><button aria-label="Sonraki hikâye bölümü" disabled={chapterIndex===STORY_CHAPTERS.length-1} onClick={()=>{sound.playClick();setChapterIndex(i=>i+1);setIntro(false);}}><ChevronRight aria-hidden="true"/></button></div>
    <motion.section key={chapterIndex} className="bj-story-scene" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.25}}>
      <div className="bj-expedition-cover" data-motion-zone><StudentAdventureAtmosphere/><img src={scenePhoto.src} alt={scenePhoto.alt} width={1200} height={800} fetchPriority="high" decoding="async"/><div className="bj-cover-shade" aria-hidden="true"/><div className="bj-cover-caption"><span>JUNIOR İLE KEŞİF</span><strong>{chapter.subtitle}</strong><span><Compass size={13} aria-hidden="true"/>{completedHere===3?'Bölüm tamamlandı':`${3-completedHere} keşif seni bekliyor`}</span></div><span className="bj-cover-chapter" aria-hidden="true">{String(chapterIndex+1).padStart(2,'0')}</span></div>
      <div className="bj-story-scenery" aria-hidden="true"><span/><span/><i/><i/><i/><b>✦</b><b>✧</b></div>
      <div className="bj-story-dialogue" data-motion-zone><img src="/brand/junior-fox.svg" alt="Tilki rehber Junior" width={112} height={112}/><div><strong>{completedHere===3?'Harika keşif!':'Rotanı birlikte keşfedelim.'}</strong><p>{completedHere===3?chapter.ending:intro?chapter.intro:'Üç kısa görevi tamamla. Haritanın sıradaki parçasını bulalım.'}</p>{completedHere<3&&<button aria-expanded={intro} onClick={()=>{sound.playClick();setIntro(v=>!v);}}>{intro?'Kısa göster':'Hikâyeyi oku'}<BookOpen size={14} aria-hidden="true"/></button>}</div></div>
      <ol className="bj-story-stages" aria-label="Hikâye durakları" data-motion-zone>{chapterStages.map((stage,index)=>{
        const status=stageStatus(progress,STORY_STAGES.findIndex(item=>item.id===stage.id));
        return <li key={stage.id} data-state={status}><button disabled={status==='locked'} aria-current={status==='current'?'step':undefined} onClick={()=>{sound.playClick();onStartStory(stage);}}><span className="bj-story-node" aria-hidden="true"><img src={scenePhoto.src} alt="" width={140} height={140} decoding="async"/>{status==='locked'?<LockKeyhole/>:status==='complete'?<Check/>:index===2?<Trophy/>:<Star fill="currentColor"/>}</span><span><small>{status==='complete'?'TAMAMLANDI':status==='locked'?'SIRADAKİ KEŞİF': 'SENİN SIRAN'}</small><strong>{stage.title}</strong><span>{stage.task}</span><b>{status==='locked'?'Önce önceki durağı tamamla':status==='complete'?'Yeniden oyna':'3 soruyla başla'}{status!=='locked'&&<ArrowRight size={14} aria-hidden="true"/>}</b></span></button></li>;
      })}</ol>
      <div className="bj-story-chapter-progress"><progress aria-label="Bu bölümde tamamlanan duraklar" value={completedHere} max={3}/><span>{completedHere}/3 durak</span></div>
    </motion.section>
    {saveError&&<p role="alert" className="bj-story-save-error">{saveError}</p>}
    <p className="bj-story-device-note">Hikâye ilerlemen bu cihazda, hesabın ve sınıfın için saklanır. Soru sonuçların ve XP hesabına kaydedilir.</p>
    <button className="bj-story-free-play" onClick={()=>go('student-study')}>Serbest çalışmayı aç<Shapes size={17} aria-hidden="true"/></button>
  </main>;
}
