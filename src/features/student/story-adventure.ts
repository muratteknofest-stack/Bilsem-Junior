import type { LearningCategory, LearningSessionView } from './learning-contract';

export interface StoryStage { id: string; chapter: number; title: string; task: string; category: LearningCategory; }
export const STORY_CHAPTERS = [
  { title:'Merak Ormanı', subtitle:'Kayıp haritanın izinde', scene:'forest', intro:'Tilki Junior, ormanda parlayan bir harita parçası buldu. Şekillerin izini takip ederek keşif kapısını birlikte açalım!', ending:'İlk harita parçası bulundu. Sıradaki durak: bulutların üzerindeki ada!', stages:[['İzleri bul','Örüntüleri takip et.','pattern'],['Ormanın şifresi','İpuçlarını birleştir.','logic'],['Gizli kapı','Ayrıntıları fark et.','attention']] },
  { title:'Bulut Adası', subtitle:'Gökyüzündeki kayıp köprü', scene:'sky', intro:'Bulut Adası’na giden köprü dağılmış. Junior’a parçaları bulmasında yardım et; yeni bir bakış açısı yolu gösterecek.', ending:'Bulut köprüsü tamam! Renkli vadiden yeni bir işaret geliyor.', stages:[['Bulut parçaları','Şekillere farklı açıdan bak.','spatial'],['Gökyüzü düzeni','Eksik parçayı keşfet.','matrix'],['Köprüyü kur','Bağlantıları çöz.','logic']] },
  { title:'Renkli Vadi', subtitle:'Yıldız pusulasını bul', scene:'valley', intro:'Vadideki yıldız pusulası renklerini kaybetmiş. Dikkatini ve örüntü becerini kullanarak Junior’la pusulanın izini sür.', ending:'Yıldız pusulası parlıyor! Şimdi ışıldayan mağaraya doğru yola çık.', stages:[['Renkli izler','Değişen kuralları bul.','pattern'],['Işığı yakala','Küçük ayrıntıları seç.','attention'],['Pusula parçaları','Parçaları zihninde birleştir.','spatial']] },
  { title:'Kristal Mağara', subtitle:'Işığın sakladığı ipucu', scene:'cave', intro:'Kristaller duvarlarda gizli desenler oluşturuyor. Junior’la her deseni incele; çıkış yolu ipuçlarında saklı.', ending:'Mağaranın ışığı yolu aydınlattı. Keşif gemisi seni bekliyor!', stages:[['Kristal dizisi','Dizideki kuralı keşfet.','pattern'],['Ayna koridoru','Şekillerin ilişkisini gör.','spatial'],['Işık bilmecesi','Gizli bağlantıyı bul.','matrix']] },
  { title:'Keşif Limanı', subtitle:'Yeni yolculuğa hazır mısın?', scene:'harbor', intro:'Keşif gemisinin rotası karışmış. Junior’la ipuçlarını topla, yönünü bul ve yıldızlara açılan kapıya ulaş.', ending:'Keşif gemisi hazır! Son harita parçası yıldızların arasında.', stages:[['Rota bulucu','Doğru bağlantıları kur.','logic'],['Limanın işareti','Farklı olanı yakala.','attention'],['Yelken aç','Şekilleri zihninde döndür.','spatial']] },
  { title:'Yıldız Bahçesi', subtitle:'Haritanın son parçası', scene:'stars', intro:'Bütün yollar yıldız bahçesine çıktı. Junior’la son üç keşfi tamamla; haritanın gizlediği büyük resmi ortaya çıkar.', ending:'Harita tamamlandı! Junior’la bütün adaları keşfettin. İstediğin durağı yeniden oynayabilir veya Çalış bölümünde yeni sorular çözebilirsin.', stages:[['Yıldız örüntüsü','Yıldızların kuralını keşfet.','pattern'],['Son ipucu','Bağlantıları tamamla.','matrix'],['Büyük keşif','Becerilerini birlikte kullan.','mixed']] },
] as const;
export const STORY_STAGES: StoryStage[] = STORY_CHAPTERS.flatMap((chapter,index)=>chapter.stages.map(([title,task,category],step)=>({id:`chapter-${index+1}-step-${step+1}`,chapter:index,title,task,category})));
export interface StoryProgress { version: 1; completed: string[]; sessions: string[]; }
export const emptyStoryProgress = (): StoryProgress => ({version:1,completed:[],sessions:[]});
export function parseStoryProgress(raw: string | null): StoryProgress {
  try {
    const value: unknown=JSON.parse(raw || 'null');
    if (!value || typeof value!=='object' || !('version' in value) || value.version!==1 || !('completed' in value) || !Array.isArray(value.completed) || !('sessions' in value) || !Array.isArray(value.sessions)) return emptyStoryProgress();
    const completed:string[]=[];
    for (const stage of STORY_STAGES) { if(value.completed[completed.length]!==stage.id)break; completed.push(stage.id); }
    return {version:1,completed,sessions:value.sessions.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<=100).slice(-STORY_STAGES.length)};
  } catch { return emptyStoryProgress(); }
}
export function storyStorageKey(userId: string,grade: number) { return `bilsem-story-v1:${encodeURIComponent(userId)}:${grade}`; }
export function stageStatus(progress: StoryProgress,index: number) { return index<progress.completed.length?'complete':index===progress.completed.length?'current':'locked'; }
/** Story milestones are presentation progress. Only server-acknowledged, fully answered sessions advance them; no XP or entitlement is issued here. */
export function advanceStory(progress: StoryProgress,stageId: string,session: LearningSessionView,grade: number): StoryProgress {
  const stage=STORY_STAGES[progress.completed.length];
  if(!stage || stage.id!==stageId || progress.sessions.includes(session.id) || session.mode!=='adaptive' || !session.result || session.questions.length!==3 || session.result.totalQuestions!==3 || session.result.blankAnswers!==0 || session.result.correctAnswers+session.result.wrongAnswers!==3) return progress;
  if(session.questions.some((q,i)=>q.targetGrade!==grade || (stage.category!=='mixed'&&q.category!==stage.category) || !session.answers[String(i)]?.response)) return progress;
  return {version:1,completed:[...progress.completed,stage.id],sessions:[...progress.sessions,session.id]};
}
