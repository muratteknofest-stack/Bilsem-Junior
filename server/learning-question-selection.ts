import { generateLabQuestion, LAB_ENGINE, LAB_MECHANICS, LAB_TOPICS } from '../src/features/questions/reasoning-lab';
import {type AnswerEvidence} from '../src/features/questions/adaptive-difficulty';
import { orderTestQuestions } from '../src/features/questions/test-assembly';
import { QuestionDiversityError } from '../src/features/questions/test-diversity';
import { randomInt } from 'node:crypto';
import { generateQuestion, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import type { SchoolGrade } from '../src/features/questions/quality-policy';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../src/types';
import { questionVisualKey, questionStimulusKey } from '../src/features/questions/quality';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { getServiceClient } from './supabase-admin';
import { LearningError } from './learning-model';
import { generateProfessionalQuestion as generateLegacyProfessional } from '../src/features/questions/professional-engine-v7';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { LEARNING_QUESTION_FORMAT, supportsReasoningFormat, supportsProfessionalV2Format, needsCurrentQuestionFormat, needsProfessionalV2Format, needsReasoningFormat } from '../src/features/student/learning-question-format';

export const RECENT_SESSION_LIMIT = 30;
export const RECENT_HISTORY_DAYS = 30;
// Matches currentReasoningCandidate; push cheap engine filtering into the bank read.
export const CURRENT_REASONING_ENGINES = ['reasoning-lab-1','symbolic-v2','verified-8','verified-4','colorful-3','workshop-3','workshop-reading-1'] as const;
type RecentSession = { questions: BaseQuestion[]; answers?: Record<string,{correct?:boolean}>; created_at: string };

/** Renaming an equivalent topic cannot make the same displayed task fresh. */
export function learningStimulusKey(question: Pick<BaseQuestion,'type'|'visualConfig'>) {
  const type = ['dice_unfold','spatial_origami'].includes(question.type) ? 'dice_unfold' :
    ['paper_folding','punch_folding'].includes(question.type) ? 'paper_folding' :
    ['matrix_3x3','raven_matrix'].includes(question.type) ? 'matrix_3x3' : question.type;
  return questionStimulusKey({ ...question, type });
}

export function assertLearningQuestionFormat(questions:BaseQuestion[],format:unknown) {
  if(questions.some(q=>needsCurrentQuestionFormat(q)?format!==LEARNING_QUESTION_FORMAT:needsProfessionalV2Format(q)?!supportsProfessionalV2Format(format):needsReasoningFormat(q)&&!supportsReasoningFormat(format)))throw new LearningError('Bu çalışmadaki yeni soru türleri için uygulamayı güncellemelisin. Önceki cevapların korunuyor.',426);
}

export function currentReasoningCandidate(q:BaseQuestion,grade:SchoolGrade,modern:boolean):boolean {
  if(!professionalGradeTypes(grade).includes(q.type))return false;
  if(!modern)return !needsReasoningFormat(q);
  const mode=(q.visualConfig as Record<string,unknown>).displayMode;
  if(mode==='reasoning_lab')return q.authoring?.engine===LAB_ENGINE;
  if(mode==='symbolic_v2')return modern&&q.authoring?.engine==='symbolic-v2';
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
        for(const key of [questionStimulusKey(question),learningStimulusKey(question)])
          exposure.set(key, Math.max(exposure.get(key) || 0, assignedAt));
        if(includeReasoning)for(const rule of [questionReasoningKey(question),questionStyleKey(question)])exposure.set(rule,Math.max(exposure.get(rule)||0,assignedAt));
      } catch { /* A damaged historical snapshot cannot establish exposure. */ }
    }
  }
  return exposure;
}

export function recentAnswerEvidence(sessions:RecentSession[]):AnswerEvidence[]{
 return sessions.filter(s=>Number.isFinite(Date.parse(s.created_at))).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).flatMap(s=>Array.isArray(s.questions)?s.questions.flatMap((q,index)=>{const correct=(s.answers?.[String(index)]||s.answers?.[q.id])?.correct;return q.targetGrade&&typeof correct==='boolean'?[{grade:q.targetGrade,difficulty:q.difficulty,correct}]:[];}):[]);
}
export async function loadRecentLearningContext(studentId:string,now=Date.now()){
 const {data,error}=await getServiceClient().from('learning_sessions').select('questions,answers,created_at').eq('student_id',studentId).gte('created_at',new Date(now-RECENT_HISTORY_DAYS*86400000).toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(RECENT_SESSION_LIMIT);
 if(error||!data)throw new LearningError('Çalışma geçmişin okunamadı. Yeniden dene.',503);
 const sessions=data as RecentSession[];return {exposure:recentQuestionExposure(sessions,true),answers:recentAnswerEvidence(sessions)};
}
export async function loadRecentQuestionExposure(studentId:string,now=Date.now()){return (await loadRecentLearningContext(studentId,now)).exposure;}

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
  // In early grades the matrix area has only the rotation style, which spatial
  // tasks can also use. Reserve that area before a flexible spatial slot takes
  // its only style. Every area still receives the same planned quota.
  if(category==='mixed'&&count>=categories.length)categories.sort((a,b)=>Number(a!=='matrix')-Number(b!=='matrix'));
  return Array.from({ length: count }, (_, index) => categories[index % categories.length]);
}

export function selectLearningQuestions(options: {
  count: number; category: CognitiveCategory | 'mixed'; candidates: BaseQuestion[];
  exposure: ReadonlyMap<string, number>; canUse: (question: BaseQuestion) => boolean;
  generate: (category: CognitiveCategory, typeCounts: ReadonlyMap<QuestionType,number>, difficulty?: DifficultyLevel, reasoningCounts?: ReadonlyMap<string,number>, acceptCandidate?: (question: BaseQuestion) => boolean) => BaseQuestion; preferDiverseTypes?: boolean; randomIndex?: (max: number) => number; categories?: CognitiveCategory[]; allowGeneration?: boolean; difficultyPlan?: readonly DifficultyLevel[];
  repeatPolicy?: 'unseen' | 'oldest-first';
  /** Mixed tests may transfer a repeated-style slot to another eligible area. */
  redistributeRepeatedCategories?: boolean;
  requireDistinctStyles?: boolean;
}) {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 50) throw new LearningError('Çalışma uzunluğu 1–50 arasında olmalı.', 422);
  const randomIndex = options.randomIndex || randomInt;
  const configured = options.category === 'mixed' && options.categories ? shuffle([...new Set(options.categories)], randomIndex) : undefined;
  if (configured && !configured.length) throw new LearningError('No verified activities are available.');
  const plan = configured ? Array.from({length:options.count},(_,i)=>configured[i%configured.length]) : balancedCategoryPlan(options.count, options.category, randomIndex);
  if(options.difficultyPlan && options.difficultyPlan.length!==options.count)throw new LearningError('Zorluk planı çalışma uzunluğuyla uyuşmuyor.');
  type Candidate = { question: BaseQuestion; key: string; visual: string; rule: string; style: string; lastAssigned: number };
  const describe = (question: BaseQuestion): Candidate => {
    const key=learningStimulusKey(question), visual=questionVisualKey(question);
    return {question,key,visual,rule:questionReasoningKey(question),style:questionStyleKey(question),
      lastAssigned:Math.max(options.exposure.get(key)||0,options.exposure.get(questionStimulusKey(question))||0,options.exposure.get(visual)||0)};
  };
  const groups = new Map<CognitiveCategory, Candidate[]>();
  for (const question of shuffle(options.candidates, randomIndex)) {
    try {
      if (!options.canUse(question)) continue;
      const group=groups.get(question.category)||[];
      group.push(describe(question));groups.set(question.category,group);
    } catch { /* Invalid content cannot enter a selection pool. */ }
  }
  const seen=new Set<string>(),seenVisuals=new Set<string>(),selected:BaseQuestion[]=[];
  const typeCounts=new Map<QuestionType,number>(),reasoningCounts=new Map<string,number>();
  const categoryCounts=new Map<CognitiveCategory,number>();
  // A new type name cannot outweigh a repeated rule or exercise style.
  const rank=(item:Candidate)=>[reasoningCounts.get(item.rule)||0,reasoningCounts.get(item.style)||0,
    typeCounts.get(item.question.type)||0,options.exposure.get(item.rule)||0,options.exposure.get(item.style)||0];
  const better=(next:Candidate,best:Candidate)=>{
    const a=rank(next),b=rank(best),index=a.findIndex((value,i)=>value!==b[i]);
    return index>=0&&a[index]<b[index];
  };
  const available=(item:Candidate,difficulty?:DifficultyLevel)=>!seen.has(item.key)&&!seenVisuals.has(item.visual)&&
    (!options.requireDistinctStyles||!reasoningCounts.has(item.rule)&&!reasoningCounts.has(item.style))&&
    (difficulty===undefined||item.question.difficulty===difficulty);
  for (const [index,category] of plan.entries()) {
    const difficulty=options.difficultyPlan?.[index];
    const inspected=new Map<CognitiveCategory,Candidate|undefined>();
    const inspect=(area:CognitiveCategory):Candidate|undefined=>{
      if(inspected.has(area))return inspected.get(area);
      const fresh=(groups.get(area)||[]).filter(item=>!item.lastAssigned&&available(item,difficulty));
      let best=fresh.reduce<Candidate|undefined>((best,next)=>!best||better(next,best)?next:best,undefined);
      if(options.allowGeneration!==false&&(!best||rank(best).some(value=>value>0))) {
        // The generator searches every eligible type, rather than locking onto
        // one underused type whose remaining seeds all repeat the same rule.
        for(let attempt=0;attempt<8;attempt++)try {
          const q=options.generate(area,typeCounts,difficulty,reasoningCounts,question=>{
            if(question.category!==area)return false;
            const candidate=describe(question);
            return !candidate.lastAssigned&&available(candidate,difficulty)&&options.canUse(question);
          });
          if(q.category!==area||!options.canUse(q))continue;
          const item=describe(q);
          if(options.requireDistinctStyles&&(reasoningCounts.has(item.rule)||reasoningCounts.has(item.style))){if(attempt>=1)break;continue;}
          if(item.lastAssigned||!available(item,difficulty))continue;
          if(!best||better(item,best))best=item;
          break;
        } catch { /* No proof gate, grade or difficulty constraint is relaxed. */ }
      }
      inspected.set(area,best);return best;
    };
    let chosen=inspect(category);
    // Ordinary practice keeps balanced area quotas. A familiar skill is useful
    // reinforcement, not a reason to search every other area again. Strict
    // assemblies may redistribute styles; all mixed tests can recover a truly
    // exhausted area without reusing an already displayed puzzle.
    if(options.category==='mixed'&&options.redistributeRepeatedCategories&&(!chosen||options.requireDistinctStyles&&(rank(chosen)[0]>0||rank(chosen)[1]>0))) {
      const areas=shuffle(configured||[...AVAILABLE_CATEGORIES],randomIndex)
        .sort((a,b)=>(categoryCounts.get(a)||0)-(categoryCounts.get(b)||0));
      // Keep all ten areas represented, then use a different eligible mechanic
      // before forcing another memory/reading/rotation variant into the test.
      if(!chosen||(categoryCounts.get(category)||0)>0)for(const area of areas) {
        if(area===category)continue;
        const alternative=inspect(area);
        if(!alternative||rank(alternative)[0]>0)continue;
        if(!chosen||better(alternative,chosen))chosen=alternative;
        if(chosen&&rank(chosen)[0]===0&&rank(chosen)[1]===0)break;
      }
    }
    if(!chosen&&options.repeatPolicy==='oldest-first') {
      const areas=options.category==='mixed'&&options.redistributeRepeatedCategories?
        [category,...(configured||AVAILABLE_CATEGORIES).filter(area=>area!==category)]:[category];
      for(const area of areas){
        const recent=(groups.get(area)||[]).filter(item=>available(item,difficulty));
        chosen=recent.reduce<Candidate|undefined>((best,next)=>!best||next.lastAssigned<best.lastAssigned||
          next.lastAssigned===best.lastAssigned&&better(next,best)?next:best,undefined);
        if(chosen)break;
      }
    }
    if(!chosen) {
      throw new QuestionDiversityError(options.count,selected.length);
    }
    seen.add(chosen.key);seenVisuals.add(chosen.visual);selected.push(chosen.question);
    typeCounts.set(chosen.question.type,(typeCounts.get(chosen.question.type)||0)+1);
    categoryCounts.set(chosen.question.category,(categoryCounts.get(chosen.question.category)||0)+1);
    for(const key of [chosen.rule,chosen.style])reasoningCounts.set(key,(reasoningCounts.get(key)||0)+1);
  }
  return orderTestQuestions(shuffle(selected,randomIndex),options.difficultyPlan);
}

/** Prefer an unused, independently proved topic before repeating a template in that area. */
export function generateVariedLearningQuestion(options:{grade:SchoolGrade; category:CognitiveCategory; difficulty:DifficultyLevel; seed:number; typeCounts:ReadonlyMap<QuestionType,number>; reasoningCounts?:ReadonlyMap<string,number>; exposure?:ReadonlyMap<string,number>; acceptCandidate?:(question:BaseQuestion)=>boolean; legacy?:boolean; lab?:boolean; randomIndex?:(max:number)=>number}) {
  const pool=professionalGradeTypes(options.grade).filter(type=>STUDENT_CATEGORY_TYPES[options.category].includes(type));
  if(!pool.length)throw new LearningError('Bu alan için doğrulanmış soru türü bulunamadı.');
  const variants=[...pool.map(type=>({type,mechanic:undefined as undefined|typeof LAB_MECHANICS[number]})),...(!options.legacy&&options.lab!==false?LAB_MECHANICS.filter(mechanic=>pool.includes(LAB_TOPICS[mechanic])).map(mechanic=>({type:LAB_TOPICS[mechanic],mechanic})):[])];
  const choices=shuffle(variants,options.randomIndex||randomInt).sort((a,b)=>(options.typeCounts.get(a.type)||0)-(options.typeCounts.get(b.type)||0));
  const minimum=options.typeCounts.get(choices[0].type)||0;
  let best:BaseQuestion|undefined,bestRank:number[]|undefined;
  for(const [typeIndex,{type,mechanic}] of choices.entries())for(let i=0;i<(mechanic?1:8);i++){
    try {
      const seed=(options.seed+i*10007+typeIndex*104729)%2147483647||1;
      let q=mechanic?generateLabQuestion(mechanic,seed,options.difficulty,options.grade):generateQuestion({profile:'professional',targetGrade:options.grade,category:options.category,type,difficulty:options.difficulty,seed});
      if(options.legacy&&q.authoring?.engine==='verified-8')q={...generateLegacyProfessional(q.type,q.seed,q.difficulty),targetGrade:options.grade,targetGrades:[options.grade],ageGroup:options.grade<=2?'1-2':'3-4'};
      // A fresh seed may still draw a previously used stimulus. Search another
      // seed or mechanic inside this pass instead of returning that dead end.
      if(options.acceptCandidate&&!options.acceptCandidate(q))continue;
      if(!isQuestionReadyForStudents(q))continue;
      const key=questionReasoningKey(q),style=questionStyleKey(q);
      const rank=[options.reasoningCounts?.get(key)||0,options.reasoningCounts?.get(style)||0,options.typeCounts.get(type)||0,
        options.exposure?.get(key)||0,options.exposure?.get(style)||0];
      const differing=bestRank?rank.findIndex((value,index)=>value!==bestRank![index]):-1;
      if(!bestRank||differing>=0&&rank[differing]<bestRank[differing]){best=q;bestRank=rank;}
      if(rank[0]===0&&rank[1]===0&&rank[2]===minimum&&rank[3]===0&&rank[4]===0)return q;
    } catch { /* An unavailable type/seed cannot hide other eligible mechanics. */ }
  }
  if(!best)throw new LearningError('Bu sınıfta doğrulanmış farklı bir soru hazırlanamadı.');
  return best;
}

