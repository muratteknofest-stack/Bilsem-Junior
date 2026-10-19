import type { LearningCategory, LearningSessionView } from './learning-contract';

export interface StoryStage { id: string; index: number; round: number; chapter: number; title: string; task: string; category: LearningCategory; }
export const STORY_CHAPTERS = [
  { title:'Merak Ormanı', subtitle:'Kayıp haritanın izinde', scene:'forest', intro:'Tilki Junior, ormanda parlayan bir harita parçası buldu. Şekillerin izini takip ederek keşif kapısını birlikte açalım!', ending:'İlk harita parçası bulundu. Sıradaki durak: bulutların üzerindeki ada!', stages:[['İzleri bul','Örüntüleri takip et.','pattern'],['Ormanın şifresi','İpuçlarını birleştir.','logic'],['Gizli kapı','Ayrıntıları fark et.','attention']] },
  { title:'Bulut Adası', subtitle:'Gökyüzündeki kayıp köprü', scene:'sky', intro:'Bulut Adası’na giden köprü dağılmış. Junior’a parçaları bulmasında yardım et; yeni bir bakış açısı yolu gösterecek.', ending:'Bulut köprüsü tamam! Renkli vadiden yeni bir işaret geliyor.', stages:[['Bulut parçaları','Şekillere farklı açıdan bak.','spatial'],['Gökyüzü düzeni','Eksik parçayı keşfet.','matrix'],['Köprüyü kur','Bağlantıları çöz.','logic']] },
  { title:'Renkli Vadi', subtitle:'Yıldız pusulasını bul', scene:'valley', intro:'Vadideki yıldız pusulası renklerini kaybetmiş. Dikkatini ve örüntü becerini kullanarak Junior’la pusulanın izini sür.', ending:'Yıldız pusulası parlıyor! Şimdi ışıldayan mağaraya doğru yola çık.', stages:[['Renkli izler','Değişen kuralları bul.','pattern'],['Işığı yakala','Küçük ayrıntıları seç.','attention'],['Pusula parçaları','Parçaları zihninde birleştir.','spatial']] },
  { title:'Kristal Mağara', subtitle:'Işığın sakladığı ipucu', scene:'cave', intro:'Kristaller duvarlarda gizli desenler oluşturuyor. Junior’la her deseni incele; çıkış yolu ipuçlarında saklı.', ending:'Mağaranın ışığı yolu aydınlattı. Keşif gemisi seni bekliyor!', stages:[['Kristal dizisi','Dizideki kuralı keşfet.','pattern'],['Ayna koridoru','Şekillerin ilişkisini gör.','spatial'],['Işık bilmecesi','Gizli bağlantıyı bul.','matrix']] },
  { title:'Keşif Limanı', subtitle:'Yeni yolculuğa hazır mısın?', scene:'harbor', intro:'Keşif gemisinin rotası karışmış. Junior’la ipuçlarını topla, yönünü bul ve yıldızlara açılan kapıya ulaş.', ending:'Keşif gemisi hazır! Son harita parçası yıldızların arasında.', stages:[['Rota bulucu','Doğru bağlantıları kur.','logic'],['Limanın işareti','Farklı olanı yakala.','attention'],['Yelken aç','Şekilleri zihninde döndür.','spatial']] },
  { title:'Yıldız Bahçesi', subtitle:'Haritanın son parçası', scene:'stars', intro:'Bütün yollar yıldız bahçesine çıktı. Junior’la son üç keşfi tamamla; haritanın gizlediği büyük resmi ortaya çıkar.', ending:'Harita tamamlandı! Junior’la bütün adaları keşfettin. İstediğin durağı yeniden oynayabilir veya Çalış bölümünde yeni sorular çözebilirsin.', stages:[['Yıldız örüntüsü','Yıldızların kuralını keşfet.','pattern'],['Son ipucu','Bağlantıları tamamla.','matrix'],['Büyük keşif','Becerilerini birlikte kullan.','mixed']] },
] as const;
export const STORY_ROUND_LENGTH = 18;
export const STORY_QUESTION_COUNT = 3;
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
export interface StoryProgress { version: 2; completedCount: number; sessions: string[]; }
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
    return {version:2,completedCount,sessions:[...new Set(value.sessions.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<=100))].slice(-64)};
  } catch { return emptyStoryProgress(); }
}
// Keep the original key so upgrading the Android app preserves every completed stop.
export function storyStorageKey(userId: string,grade: number) { return `bilsem-story-v1:${encodeURIComponent(userId)}:${grade}`; }
export function stageStatus(progress: StoryProgress,index: number) { return index<progress.completedCount?'complete':index===progress.completedCount?'current':'locked'; }
export function isStoryStageComplete(progress: StoryProgress, stage: StoryStage) { return stage.index < progress.completedCount && storyStageAt(stage.index).id === stage.id; }
/** Only an acknowledged, fully answered session advances a stop. XP stays server-owned. */
export function advanceStory(progress: StoryProgress,stageId: string,session: LearningSessionView,grade: number): StoryProgress {
  const stage = storyStageAt(progress.completedCount);
  if(stage.id!==stageId || progress.sessions.includes(session.id) || session.mode!=='adaptive' || !session.result || session.questions.length!==STORY_QUESTION_COUNT || session.result.totalQuestions!==STORY_QUESTION_COUNT || session.result.blankAnswers!==0 || session.result.correctAnswers+session.result.wrongAnswers!==STORY_QUESTION_COUNT) return progress;
  if(new Set(session.questions.map(q=>q.category)).size!==STORY_QUESTION_COUNT) return progress;
  if(session.questions.some((q,i)=>q.targetGrade!==grade || !session.answers[String(i)]?.response)) return progress;
  return {version:2,completedCount:progress.completedCount+1,sessions:[...progress.sessions,session.id].slice(-64)};
}
