import { randomInt } from 'node:crypto';
import { generateQuestion, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import type { SchoolGrade } from '../src/features/questions/quality-policy';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../src/types';
import { questionVisualKey, questionStimulusKey } from '../src/features/questions/quality';
import { questionReasoningKey } from '../src/features/questions/reasoning-identity';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { getServiceClient } from './supabase-admin';
import { LearningError } from './learning-model';
import { generateProfessionalQuestion as generateLegacyProfessional } from '../src/features/questions/professional-engine-v7';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { LEARNING_QUESTION_FORMAT, needsReasoningFormat } from '../src/features/student/learning-question-format';

export const RECENT_SESSION_LIMIT = 30;
export const RECENT_HISTORY_DAYS = 30;
type RecentSession = { questions: BaseQuestion[]; created_at: string };

export function assertLearningQuestionFormat(questions:BaseQuestion[],format:unknown) {
  if(format!==LEARNING_QUESTION_FORMAT&&questions.some(needsReasoningFormat))throw new LearningError('Bu çalışmadaki yeni soru türleri için uygulamayı güncellemelisin. Önceki cevapların korunuyor.',426);
}

export function currentReasoningCandidate(q:BaseQuestion,grade:SchoolGrade,modern:boolean):boolean {
  if(!professionalGradeTypes(grade).includes(q.type))return false;
  if(!modern)return !needsReasoningFormat(q);
  const mode=(q.visualConfig as Record<string,unknown>).displayMode;
  return mode==='verified_board'?['verified-8','verified-4'].includes(q.authoring?.engine||''):
    mode==='colorful_board'?q.authoring?.engine==='colorful-3':mode==='workshop_board'&&(q.authoring?.engine==='workshop-3'||q.type==='word_scramble_logic'&&q.authoring?.engine==='workshop-reading-1');
}

/** Server snapshots retain visual content even though their question IDs are opaque. */
export function recentQuestionExposure(sessions: RecentSession[], includeReasoning = false) {
  const exposure = new Map<string, number>();
  for (const session of sessions) {
    const assignedAt = Date.parse(session.created_at);
    if (!Number.isFinite(assignedAt) || !Array.isArray(session.questions)) continue;
    for (const question of session.questions) {
      try {
        if (!question?.type || !question.visualConfig || !Array.isArray(question.options)) continue;
        const key = questionStimulusKey(question);
        exposure.set(key, Math.max(exposure.get(key) || 0, assignedAt));
        if(includeReasoning){const rule=questionReasoningKey(question);exposure.set(rule,Math.max(exposure.get(rule)||0,assignedAt));}
      } catch { /* A damaged historical snapshot cannot establish exposure. */ }
    }
  }
  return exposure;
}

export async function loadRecentQuestionExposure(studentId: string, now = Date.now()) {
  const { data, error } = await getServiceClient().from('learning_sessions').select('questions,created_at')
    .eq('student_id', studentId).gte('created_at', new Date(now - RECENT_HISTORY_DAYS * 86400_000).toISOString())
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(RECENT_SESSION_LIMIT);
  if (error || !data) throw new LearningError('Çalışma geçmişin okunamadı. Soruları hazırlamak için yeniden dene.', 503);
  return recentQuestionExposure(data as RecentSession[],true);
}

function shuffle<T>(items: T[], randomIndex: (max: number) => number) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** A mixed-difficulty test should challenge the student's grade rather than
 * randomly presenting first-grade-level items to fourth graders.
 * An explicitly selected easy difficulty remains unaffected. */
export function gradeChallengeFloor(grade: SchoolGrade): DifficultyLevel {
  const max = EDUCATION_PROFILES[grade].maxDifficulty;
  return Math.max(1, max - (grade === 4 ? 2 : 1)) as DifficultyLevel;
}

export function pickGradeChallenge(grade: SchoolGrade, randomIndex = randomInt): DifficultyLevel {
  const min = gradeChallengeFloor(grade);
  const max = EDUCATION_PROFILES[grade].maxDifficulty;
  return (min + randomIndex(max - min + 1)) as DifficultyLevel;
}

/** Equal category quotas avoid inheriting the bank's 25% spatial / 3% verbal bias. */
export function balancedCategoryPlan(count: number, category: CognitiveCategory | 'mixed', randomIndex = randomInt) {
  const categories = shuffle<CognitiveCategory>(category === 'mixed' ? [...AVAILABLE_CATEGORIES] : [category], randomIndex);
  return Array.from({ length: count }, (_, index) => categories[index % categories.length]);
}

export function selectLearningQuestions(options: {
  count: number; category: CognitiveCategory | 'mixed'; candidates: BaseQuestion[];
  exposure: ReadonlyMap<string, number>; canUse: (question: BaseQuestion) => boolean;
  generate: (category: CognitiveCategory, typeCounts: ReadonlyMap<QuestionType,number>, difficulty?: DifficultyLevel, reasoningCounts?: ReadonlyMap<string,number>) => BaseQuestion; preferDiverseTypes?: boolean; randomIndex?: (max: number) => number; categories?: CognitiveCategory[]; allowGeneration?: boolean; difficultyPlan?: readonly DifficultyLevel[];
}) {
  const randomIndex = options.randomIndex || randomInt;
  const configured = options.category === 'mixed' && options.categories ? shuffle([...new Set(options.categories)], randomIndex) : undefined;
  if (configured && !configured.length) throw new LearningError('No verified activities are available.');
  const plan = configured ? Array.from({length:options.count},(_,i)=>configured[i%configured.length]) : balancedCategoryPlan(options.count, options.category, randomIndex);
  if(options.difficultyPlan && options.difficultyPlan.length!==options.count)throw new LearningError('Zorluk planı çalışma uzunluğuyla uyuşmuyor.');
  const groups = new Map<CognitiveCategory, Array<{ question: BaseQuestion; key: string; lastAssigned: number }>>();
  for (const question of shuffle(options.candidates, randomIndex)) {
    try {
      const key = questionStimulusKey(question), group = groups.get(question.category) || [];
      group.push({ question, key, lastAssigned: options.exposure.get(key) || options.exposure.get(questionVisualKey(question)) || 0 });
      groups.set(question.category, group);
    } catch { /* Invalid candidates still cannot bypass canUse during selection. */ }
  }
  for (const group of groups.values()) group.sort((a, b) => a.lastAssigned - b.lastAssigned);
  const seen = new Set<string>(), selected: BaseQuestion[] = [];
  const typeCounts = new Map<BaseQuestion['type'], number>();
  const reasoningCounts = new Map<string,number>();
  const take = (category: CognitiveCategory, allowRecent: boolean, unusedOnly=false, difficulty?:DifficultyLevel) => {
    const group = groups.get(category) || [];
    while (group.length) {
      const matching=group.filter(item=>difficulty===undefined||item.question.difficulty===difficulty);
      if(!matching.length)return undefined;
      const oldest=Math.min(...matching.map(item=>item.lastAssigned));
      const eligible = matching.filter(item => (allowRecent ? item.lastAssigned === oldest : !item.lastAssigned) && (!unusedOnly || !typeCounts.has(item.question.type)));
      if (!eligible.length) return undefined;
      // Among equally fresh candidates, avoid a run of the same question template.
      // Stable ordering preserves oldest-first exposure when template counts tie.
      const rank=(q:BaseQuestion)=>{try{const key=questionReasoningKey(q);return [typeCounts.get(q.type)||0,reasoningCounts.get(key)||0,options.exposure.get(key)||0];}catch{return [Infinity,Infinity,Infinity];}};
      const item = eligible.reduce((best, next) => {const a=rank(next.question),b=rank(best.question);const index=a.findIndex((n,i)=>n!==b[i]);return index>=0&&a[index]<b[index]?next:best;});
      group.splice(group.indexOf(item), 1);
      if (seen.has(item.key) || !options.canUse(item.question)) continue;
      seen.add(item.key);
      return item.question;
    }
    return undefined;
  };
  for (const [index,category] of plan.entries()) {
    const difficulty=options.difficultyPlan?.[index];
    let chosen = take(category, false, options.preferDiverseTypes,difficulty);
    // Prefer a new proven variant before reusing a recently assigned bank question.
    for (let attempt = 0; !chosen && options.allowGeneration !== false && attempt < 50; attempt++) {
      try {
        const question = options.generate(category,typeCounts,difficulty,reasoningCounts);
        if (question.category !== category || !options.canUse(question)) continue;
        if(difficulty!==undefined&&question.difficulty!==difficulty)continue;
        const key = questionStimulusKey(question);
        if (seen.has(key) || options.exposure.has(key) || options.exposure.has(questionVisualKey(question))) continue;
        seen.add(key); chosen = question;
      } catch { /* Try another seed; no answer correction or quality gate relaxation. */ }
    }
    chosen ||= take(category, false,false,difficulty);
    chosen ||= take(category, true,false,difficulty);
    if (!chosen) throw new LearningError('Bu çalışma için yeterli farklı ve doğrulanmış soru hazır değil.');
    selected.push(chosen);
    typeCounts.set(chosen.type, (typeCounts.get(chosen.type) || 0) + 1);
    const key=questionReasoningKey(chosen);reasoningCounts.set(key,(reasoningCounts.get(key)||0)+1);
  }
  // Keep different areas/templates apart after shuffling, rather than recreating runs.
  const pending=shuffle(selected,randomIndex),ordered:BaseQuestion[]=[];
  while(pending.length){const last=ordered.at(-1);let i=pending.findIndex(q=>!last||q.category!==last.category&&q.type!==last.type);if(i<0)i=pending.findIndex(q=>q.type!==last?.type);ordered.push(pending.splice(Math.max(0,i),1)[0]);}
  return ordered;
}

/** Prefer an unused, independently proved topic before repeating a template in that area. */
export function generateVariedLearningQuestion(options:{grade:SchoolGrade; category:CognitiveCategory; difficulty:DifficultyLevel; seed:number; typeCounts:ReadonlyMap<QuestionType,number>; reasoningCounts?:ReadonlyMap<string,number>; exposure?:ReadonlyMap<string,number>; legacy?:boolean; randomIndex?:(max:number)=>number}) {
  const pool=professionalGradeTypes(options.grade).filter(type=>STUDENT_CATEGORY_TYPES[options.category].includes(type));
  if(!pool.length)throw new LearningError('Bu alan için doğrulanmış soru türü bulunamadı.');
  const minimum=Math.min(...pool.map(type=>options.typeCounts.get(type)||0));
  const choices=pool.filter(type=>(options.typeCounts.get(type)||0)===minimum);
  const type=choices[(options.randomIndex||randomInt)(choices.length)];
  let best:BaseQuestion|undefined,bestRank:[number,number]|undefined;
  for(let i=0;i<6;i++){
    let q=generateQuestion({profile:'professional',targetGrade:options.grade,category:options.category,type,difficulty:options.difficulty,seed:(options.seed+i*10007)%2147483647||1});
    if(options.legacy&&q.authoring?.engine==='verified-8')q={...generateLegacyProfessional(q.type,q.seed,q.difficulty),targetGrade:options.grade,targetGrades:[options.grade],ageGroup:options.grade<=2?'1-2':'3-4'};
    if(!isQuestionReadyForStudents(q))continue;
    const key=questionReasoningKey(q);
    const rank:[number,number]=[options.reasoningCounts?.get(key)||0,options.exposure?.get(key)||0];
    if(!bestRank||rank[0]<bestRank[0]||rank[0]===bestRank[0]&&rank[1]<bestRank[1]){best=q;bestRank=rank;}
    if(rank[0]===0&&rank[1]===0)break;
  }
  if(!best)throw new LearningError('Bu sınıfta doğrulanmış farklı bir soru hazırlanamadı.');
  return best;
}

