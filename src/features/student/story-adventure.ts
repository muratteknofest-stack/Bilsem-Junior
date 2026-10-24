import { campaignById, campaignLength, STORY_CAMPAIGNS, STORY_STEPS_PER_CHAPTER } from './story-catalog';
import { AVAILABLE_CATEGORIES } from './available-categories';
import type { LearningCategory, LearningSessionView } from './learning-contract';

export interface StoryStage { id: string; index: number; round: number; chapter: number; title: string; task: string; category: LearningCategory; campaignId?: string; narrative?: string; discovery?: string; chapterTitle?: string; }
export const STORY_CHAPTERS = [
  { title:'Merak Ormanı', subtitle:'Kayıp haritanın izinde', scene:'forest', intro:'Tilki Junior, ormanda parlayan bir harita parçası buldu. Şekillerin izini takip ederek keşif kapısını birlikte açalım!', ending:'İlk harita parçası bulundu. Sıradaki durak: bulutların üzerindeki ada!', stages:[['İzleri bul','Örüntüleri takip et.','pattern'],['Ormanın şifresi','İpuçlarını birleştir.','logic'],['Gizli kapı','Ayrıntıları fark et.','attention']] },
  { title:'Bulut Adası', subtitle:'Gökyüzündeki kayıp köprü', scene:'sky', intro:'Bulut Adası’na giden köprü dağılmış. Junior’a parçaları bulmasında yardım et; yeni bir bakış açısı yolu gösterecek.', ending:'Bulut köprüsü tamam! Renkli vadiden yeni bir işaret geliyor.', stages:[['Bulut parçaları','Şekillere farklı açıdan bak.','spatial'],['Gökyüzü düzeni','Eksik parçayı keşfet.','matrix'],['Köprüyü kur','Bağlantıları çöz.','logic']] },
  { title:'Renkli Vadi', subtitle:'Yıldız pusulasını bul', scene:'valley', intro:'Vadideki yıldız pusulası renklerini kaybetmiş. Dikkatini ve örüntü becerini kullanarak Junior’la pusulanın izini sür.', ending:'Yıldız pusulası parlıyor! Şimdi ışıldayan mağaraya doğru yola çık.', stages:[['Renkli izler','Değişen kuralları bul.','pattern'],['Işığı yakala','Küçük ayrıntıları seç.','attention'],['Pusula parçaları','Parçaları zihninde birleştir.','spatial']] },
  { title:'Kristal Mağara', subtitle:'Işığın sakladığı ipucu', scene:'cave', intro:'Kristaller duvarlarda gizli desenler oluşturuyor. Junior’la her deseni incele; çıkış yolu ipuçlarında saklı.', ending:'Mağaranın ışığı yolu aydınlattı. Keşif gemisi seni bekliyor!', stages:[['Kristal dizisi','Dizideki kuralı keşfet.','pattern'],['Ayna koridoru','Şekillerin ilişkisini gör.','spatial'],['Işık bilmecesi','Gizli bağlantıyı bul.','matrix']] },
  { title:'Keşif Limanı', subtitle:'Yeni yolculuğa hazır mısın?', scene:'harbor', intro:'Keşif gemisinin rotası karışmış. Junior’la ipuçlarını topla, yönünü bul ve yıldızlara açılan kapıya ulaş.', ending:'Keşif gemisi hazır! Son harita parçası yıldızların arasında.', stages:[['Rota bulucu','Doğru bağlantıları kur.','logic'],['Limanın işareti','Farklı olanı yakala.','attention'],['Yelken aç','Şekilleri zihninde döndür.','spatial']] },
  { title:'Yıldız Bahçesi', subtitle:'Haritanın son parçası', scene:'stars', intro:'Bütün yollar yıldız bahçesine çıktı. Junior’la son üç keşfi tamamla; haritanın gizlediği büyük resmi ortaya çıkar.', ending:'Harita tamamlandı! Junior’la bütün adaları keşfettin. İstediğin durağı yeniden oynayabilir veya Çalış bölümünde yeni sorular çözebilirsin.', stages:[['Yıldız örüntüsü','Yıldızların kuralını keşfet.','pattern'],['Son ipucu','Bağlantıları tamamla.','matrix'],['Büyük keşif','Becerilerini birlikte kullan.','mixed']] },
] as const;
export const STORY_ROUND_LENGTH = 18;
export const STORY_QUESTION_COUNT = 20;
export const STORY_MIN_QUESTION_COUNT = 5;
export const STORY_MAX_QUESTION_COUNT = 50;
const LEGACY_STORY_QUESTION_COUNT = 3;
/** Resolve one stop on demand: the adventure never allocates an ever-growing map. */
export function storyStageAt(index: number): StoryStage {
  if (!Number.isSafeInteger(index) || index < 0 || index >= Number.MAX_SAFE_INTEGER) throw Error('Geçersiz keşif durağı');
  const round = Math.floor(index / STORY_ROUND_LENGTH) + 1;
  const chapter = Math.floor(index / 3);
  const baseChapter = chapter % STORY_CHAPTERS.length;
  const step = index % 3;
  const title = STORY_CHAPTERS[baseChapter].stages[step][0];
  return { id: `${round === 1 ? '' : `round-${round}-`}chapter-${baseChapter + 1}-step-${step + 1}`,
    index, round, chapter, title: round === 1 ? title : `${title} · ${round}. tur`,
    task: 'Farklı alanlardan karışık soruları keşfet.', category: 'mixed' };
}
/** First tour remains available to callers and for legacy storage migration. */
export const STORY_STAGES = Array.from({length: STORY_ROUND_LENGTH}, (_, index) => storyStageAt(index));
export interface StoryStageResult { bestCorrect:number; lastCorrect:number; totalQuestions:number; attempts:number; lastTotalQuestions?:number; }
export interface StoryReward { sessionId:string; points:number; badges:string[]; replay:boolean; improved:boolean; bestCorrect:number; bestTotalQuestions?:number; }
export interface StoryProgress { version: 2; completedCount: number; sessions: string[]; campaigns?: Record<string,number>; selectedStoryId?: string; skillPractice?: Record<string,number>; stageResults?: Record<string,StoryStageResult>; }
export const emptyStoryProgress = (): StoryProgress => ({version:2,completedCount:0,sessions:[]});
export function parseStoryProgress(raw: string | null): StoryProgress {
  try {
    const value: unknown = JSON.parse(raw || 'null');
    if (!value || typeof value !== 'object' || !('version' in value) || !('sessions' in value) || !Array.isArray(value.sessions)) return emptyStoryProgress();
    let completedCount = 0;
    if (value.version === 1 && 'completed' in value && Array.isArray(value.completed)) {
      for (const stage of STORY_STAGES) { if (value.completed[completedCount] !== stage.id) break; completedCount++; }
    } else if (value.version === 2 && 'completedCount' in value && Number.isSafeInteger(value.completedCount) && typeof value.completedCount === 'number' && value.completedCount >= 0 && value.completedCount < Number.MAX_SAFE_INTEGER) {
      completedCount = value.completedCount;
    } else return emptyStoryProgress();
    const progress: StoryProgress = {version:2,completedCount,sessions:[...new Set(value.sessions.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<=100))].slice(-64)};
    const extra = value as Record<string,unknown>;
    if(extra.campaigns && typeof extra.campaigns==='object' && !Array.isArray(extra.campaigns)) {
      progress.campaigns={};
      for(const story of STORY_CAMPAIGNS) { const count=(extra.campaigns as Record<string,unknown>)[story.id]; if(typeof count==='number'&&Number.isSafeInteger(count)&&count>=0&&count<=campaignLength(story))progress.campaigns[story.id]=count; }
    }
    if(typeof extra.selectedStoryId==='string'&&campaignById(extra.selectedStoryId))progress.selectedStoryId=extra.selectedStoryId;
    if(extra.skillPractice && typeof extra.skillPractice==='object') {
      progress.skillPractice={};
      for(const category of AVAILABLE_CATEGORIES) { const count=(extra.skillPractice as Record<string,unknown>)[category]; if(typeof count==='number'&&Number.isSafeInteger(count)&&count>=0&&count<=STORY_CAMPAIGNS.reduce((sum,s)=>sum+campaignLength(s)*STORY_MAX_QUESTION_COUNT,0))progress.skillPractice[category]=count; }
    }
    if(extra.stageResults && typeof extra.stageResults==='object' && !Array.isArray(extra.stageResults)) {
      progress.stageResults={};
      for(const story of STORY_CAMPAIGNS)for(let index=0;index<campaignCompleted(progress,story.id);index++) {
        const id=`${story.id}:${index}`,saved=(extra.stageResults as Record<string,unknown>)[id];
        if(!saved||typeof saved!=='object')continue;
        const record=saved as StoryStageResult;
        const total=record.totalQuestions,lastTotal=record.lastTotalQuestions??total;
        if(Number.isInteger(total)&&total>=STORY_MIN_QUESTION_COUNT&&total<=STORY_MAX_QUESTION_COUNT && Number.isInteger(lastTotal)&&lastTotal>=STORY_MIN_QUESTION_COUNT&&lastTotal<=STORY_MAX_QUESTION_COUNT && Number.isInteger(record.bestCorrect) && record.bestCorrect>=0 && record.bestCorrect<=total && Number.isInteger(record.lastCorrect) && record.lastCorrect>=0 && record.lastCorrect<=lastTotal && record.lastCorrect*total<=record.bestCorrect*lastTotal && Number.isSafeInteger(record.attempts) && record.attempts>=1 && record.attempts<=10000)progress.stageResults[id]={bestCorrect:record.bestCorrect,lastCorrect:record.lastCorrect,totalQuestions:total,attempts:record.attempts,...(record.lastTotalQuestions!==undefined?{lastTotalQuestions:lastTotal}:{})};
      }
    }
    return progress;
  } catch { return emptyStoryProgress(); }
}
// Keep the original key so upgrading the Android app preserves every completed stop.
export function storyStorageKey(userId: string,grade: number) { return `bilsem-story-v1:${encodeURIComponent(userId)}:${grade}`; }
export function stageStatus(progress: StoryProgress,index: number) { return index<progress.completedCount?'complete':index===progress.completedCount?'current':'locked'; }
export function isStoryStageComplete(progress: StoryProgress, stage: StoryStage) { return stage.campaignId ? stage.index < campaignCompleted(progress,stage.campaignId) && campaignStageAt(stage.campaignId,stage.index).id===stage.id : stage.index < progress.completedCount && storyStageAt(stage.index).id === stage.id; }
/** Only an acknowledged, fully answered session advances a stop. XP stays server-owned. */
export function advanceStory(progress: StoryProgress,stageId: string,session: LearningSessionView,grade: number): StoryProgress {
  const campaign=campaignById(stageId.split(':')[0]);
  let stage:StoryStage;
  if(campaign) {
    const index=Number(stageId.split(':')[1]);
    if(campaign.grade!==grade || !Number.isInteger(index) || index<0 || index>=campaignLength(campaign) || index>campaignCompleted(progress,campaign.id))return progress;
    stage=campaignStageAt(campaign.id,index);
  } else stage=storyStageAt(progress.completedCount);
  const count=campaign?session.questions.length:LEGACY_STORY_QUESTION_COUNT;
  if(campaign && (!Number.isInteger(count)||count<STORY_MIN_QUESTION_COUNT||count>STORY_MAX_QUESTION_COUNT))return progress;
  if(stage.id!==stageId || progress.sessions.includes(session.id) || session.mode!=='adaptive' || !session.result || session.questions.length!==count || session.result.totalQuestions!==count || session.result.blankAnswers!==0 || !Number.isInteger(session.result.correctAnswers) || session.result.correctAnswers<0 || !Number.isInteger(session.result.wrongAnswers) || session.result.wrongAnswers<0 || session.result.correctAnswers+session.result.wrongAnswers!==count)return progress;
  const categories=new Set(session.questions.map(q=>q.category));
  if(campaign ? categories.size<Math.min(count,AVAILABLE_CATEGORIES.length) || [...categories].some(category=>!AVAILABLE_CATEGORIES.includes(category)) : categories.size!==count)return progress;
  if(Object.keys(session.answers).length!==count||new Set(session.questions.map(q=>q.id)).size!==count)return progress;
  if(session.questions.some((q,i)=>q.targetGrade!==grade || !session.answers[String(i)]?.response))return progress;
  if(campaign) {
    const firstCompletion=stage.index===campaignCompleted(progress,campaign.id);
    const skillPractice={...progress.skillPractice};
    if(firstCompletion)session.questions.forEach(q=>{skillPractice[q.category]=(skillPractice[q.category]||0)+1;});
    const previous=progress.stageResults?.[stage.id],correct=session.result.correctAnswers;
    const improved=!previous||correct*previous.totalQuestions>previous.bestCorrect*count;
    const bestCorrect=improved?correct:previous.bestCorrect,bestTotal=improved?count:previous.totalQuestions;
    return {...progress,campaigns:{...progress.campaigns,[campaign.id]:Math.max(campaignCompleted(progress,campaign.id),stage.index+1)},selectedStoryId:campaign.id,skillPractice,
      stageResults:{...progress.stageResults,[stage.id]:{bestCorrect,lastCorrect:correct,totalQuestions:bestTotal,attempts:Math.min(10000,(previous?.attempts||0)+1),...(count!==bestTotal?{lastTotalQuestions:count}:{})}},sessions:[...progress.sessions,session.id].slice(-64)};
  }
  return {...progress,completedCount:progress.completedCount+1,sessions:[...progress.sessions,session.id].slice(-64)};
}

/** Continuous star fill: 19/20 is 4.75, and only 20/20 fills all five stars. */
export function storyStars(correct:number,total=STORY_QUESTION_COUNT) {
  if(!Number.isInteger(correct)||!Number.isInteger(total)||total<=0||correct<0||correct>total)return 0;
  return correct/total*5;
}
export function storyCelebration(correct:number,total=STORY_QUESTION_COUNT) {
  const stars=storyStars(correct,total);
  return stars===5?'perfect':stars>=4?'sparkle':stars>=2.5?'orbit':'grow';
}

export function campaignCompleted(progress: StoryProgress,id: string) { return progress.campaigns?.[id] || 0; }
export function campaignStageAt(id: string,index: number): StoryStage {
  const story=campaignById(id);
  if(!story || !Number.isSafeInteger(index) || index<0 || index>=campaignLength(story))throw Error('Geçersiz hikâye durağı');
  const chapterIndex=Math.floor(index/STORY_STEPS_PER_CHAPTER),step=index%STORY_STEPS_PER_CHAPTER;
  const chapter=story.chapters[chapterIndex];
  const labels=['İlk iz','İpuçlarını topla','Bağlantıyı kur','Başka açıdan bak','Çözümü kontrol et','Bölüm finali'];
  const tasks=['Değişen ve aynı kalan özellikleri ara.','Birden fazla ipucunu karşılaştır.','Parçalar arasındaki ilişkiyi incele.','İlk fikrini farklı örneklerle sına.','Bulduğun kuralın her adımda çalıştığını kontrol et.','Bölümün son keşfinde öğrendiklerini birlikte kullan.'];
  const bridge=story.grade<=2 ? ['Birlikte ilk izi arayalım.','Junior yeni işaretleri topluyor.','Şimdi parçaları birlikte düşünelim.','Başka bir yönden bakmayı deneyelim.','Bulduğumuz yolu bir kez daha kontrol edelim.','Son görevle bu bölümün keşfini tamamlayalım.'] : ['İlk gözlemleri ayırıp bir varsayım kur.','İpuçlarının birlikte ne anlattığını araştır.','Kurallar arasındaki bağlantıyı gerekçelendir.','İlk açıklamanı başka bir bakış açısından sına.','Sonucun bütün ipuçlarıyla tutarlı olduğunu kontrol et.','Son keşifte karşılaştırma ve kontrol adımlarını birlikte kullan.'];
  return {id:`${id}:${index}`,index,round:1,chapter:chapterIndex,campaignId:id,chapterTitle:chapter.title,title:`${labels[step]} · ${chapter.title}`,task:tasks[step],category:'mixed',narrative:`${chapter.opening} ${bridge[step]}`,discovery:step===5?chapter.discovery:`${labels[step]} tamamlandı. ${story.companion} ile yeni ipuçlarını incelemeye hazırsın.`};
}
export function nextCampaignStage(progress: StoryProgress,id: string) {
  const story=campaignById(id),count=campaignCompleted(progress,id);
  return story&&count<campaignLength(story)?campaignStageAt(id,count):undefined;
}
export function storyCollection(progress: StoryProgress,grade: number) {
  const stories=STORY_CAMPAIGNS.filter(s=>s.grade===grade);
  const stops=stories.reduce((sum,s)=>sum+campaignCompleted(progress,s.id),0);
  const chapters=stories.reduce((sum,s)=>sum+Math.floor(campaignCompleted(progress,s.id)/STORY_STEPS_PER_CHAPTER),0);
  const finished=stories.filter(s=>campaignCompleted(progress,s.id)===campaignLength(s));
  return {stops,chapters,finished,points:stops*20+chapters*60+finished.length*240};
}
export function storyBadges(progress: StoryProgress,grade: number) {
  const collection=storyCollection(progress,grade);
  return [
    ...[{id:'first',title:'İlk Adım',target:1,current:collection.stops},{id:'six',title:'İz Sürücü',target:6,current:collection.stops},{id:'twenty-four',title:'Kararlı Kâşif',target:24,current:collection.stops},{id:'chapters',title:'Bölüm Ustası',target:8,current:collection.chapters}].map(b=>({...b,unlocked:b.current>=b.target})),
    ...STORY_CAMPAIGNS.filter(s=>s.grade===grade).map(s=>({id:s.id,title:s.relic,target:campaignLength(s),current:campaignCompleted(progress,s.id),unlocked:campaignCompleted(progress,s.id)===campaignLength(s)})),
  ];
}
export function storyPracticeLevel(attempts: number) {
  const thresholds=[0,3,12,30,60,120];
  const count=Number.isFinite(attempts)?Math.max(0,Math.floor(attempts)):0;
  const level=thresholds.filter(n=>count>=n).length-1;
  return {level,next:thresholds[level+1]??null,label:['Yeni','Keşfeden','İz süren','Bağ kuran','Çözüm arayan','Deneyimli'][level]};
}

