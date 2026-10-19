import { randomInt } from 'node:crypto';
import { generateQuestion, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';
import type { SchoolGrade } from '../src/features/questions/quality-policy';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../src/types';
import { questionVisualKey, questionStimulusKey } from '../src/features/questions/quality';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { getServiceClient } from './supabase-admin';
import { LearningError } from './learning-model';

export const RECENT_SESSION_LIMIT = 30;
export const RECENT_HISTORY_DAYS = 30;
type RecentSession = { questions: BaseQuestion[]; created_at: string };

/** Server snapshots retain visual content even though their question IDs are opaque. */
export function recentQuestionExposure(sessions: RecentSession[]) {
  const exposure = new Map<string, number>();
  for (const session of sessions) {
    const assignedAt = Date.parse(session.created_at);
    if (!Number.isFinite(assignedAt) || !Array.isArray(session.questions)) continue;
    for (const question of session.questions) {
      try {
        if (!question?.type || !question.visualConfig || !Array.isArray(question.options)) continue;
        const key = questionStimulusKey(question);
        exposure.set(key, Math.max(exposure.get(key) || 0, assignedAt));
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
  return recentQuestionExposure(data as RecentSession[]);
}

function shuffle<T>(items: T[], randomIndex: (max: number) => number) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Equal category quotas avoid inheriting the bank's 25% spatial / 3% verbal bias. */
export function balancedCategoryPlan(count: number, category: CognitiveCategory | 'mixed', randomIndex = randomInt) {
  const categories = shuffle<CognitiveCategory>(category === 'mixed' ? [...AVAILABLE_CATEGORIES] : [category], randomIndex);
  return Array.from({ length: count }, (_, index) => categories[index % categories.length]);
}

export function selectLearningQuestions(options: {
  count: number; category: CognitiveCategory | 'mixed'; candidates: BaseQuestion[];
  exposure: ReadonlyMap<string, number>; canUse: (question: BaseQuestion) => boolean;
  generate: (category: CognitiveCategory, typeCounts: ReadonlyMap<QuestionType,number>) => BaseQuestion; preferDiverseTypes?: boolean; randomIndex?: (max: number) => number; categories?: CognitiveCategory[]; allowGeneration?: boolean;
}) {
  const randomIndex = options.randomIndex || randomInt;
  const configured = options.category === 'mixed' && options.categories ? shuffle([...new Set(options.categories)], randomIndex) : undefined;
  if (configured && !configured.length) throw new LearningError('No verified activities are available.');
  const plan = configured ? Array.from({length:options.count},(_,i)=>configured[i%configured.length]) : balancedCategoryPlan(options.count, options.category, randomIndex);
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
  const take = (category: CognitiveCategory, allowRecent: boolean, unusedOnly=false) => {
    const group = groups.get(category) || [];
    while (group.length) {
      const eligible = group.filter(item => (allowRecent ? item.lastAssigned === group[0].lastAssigned : !item.lastAssigned) && (!unusedOnly || !typeCounts.has(item.question.type)));
      if (!eligible.length) return undefined;
      // Among equally fresh candidates, avoid a run of the same question template.
      // Stable ordering preserves oldest-first exposure when template counts tie.
      const item = eligible.reduce((best, next) => (typeCounts.get(next.question.type) || 0) < (typeCounts.get(best.question.type) || 0) ? next : best);
      group.splice(group.indexOf(item), 1);
      if (seen.has(item.key) || !options.canUse(item.question)) continue;
      seen.add(item.key);
      return item.question;
    }
    return undefined;
  };
  for (const category of plan) {
    let chosen = take(category, false, options.preferDiverseTypes);
    // Prefer a new proven variant before reusing a recently assigned bank question.
    for (let attempt = 0; !chosen && options.allowGeneration !== false && attempt < 50; attempt++) {
      try {
        const question = options.generate(category,typeCounts);
        if (question.category !== category || !options.canUse(question)) continue;
        const key = questionStimulusKey(question);
        if (seen.has(key) || options.exposure.has(key) || options.exposure.has(questionVisualKey(question))) continue;
        seen.add(key); chosen = question;
      } catch { /* Try another seed; no answer correction or quality gate relaxation. */ }
    }
    chosen ||= take(category, false);
    chosen ||= take(category, true);
    if (!chosen) throw new LearningError('Bu çalışma için yeterli farklı ve doğrulanmış soru hazır değil.');
    selected.push(chosen);
    typeCounts.set(chosen.type, (typeCounts.get(chosen.type) || 0) + 1);
  }
  return shuffle(selected, randomIndex);
}

/** Prefer an unused, independently proved topic before repeating a template in that area. */
export function generateVariedLearningQuestion(options:{grade:SchoolGrade; category:CognitiveCategory; difficulty:DifficultyLevel; seed:number; typeCounts:ReadonlyMap<QuestionType,number>; randomIndex?:(max:number)=>number}) {
  const pool=professionalGradeTypes(options.grade).filter(type=>STUDENT_CATEGORY_TYPES[options.category].includes(type));
  if(!pool.length)throw new LearningError('Bu alan için doğrulanmış soru türü bulunamadı.');
  const minimum=Math.min(...pool.map(type=>options.typeCounts.get(type)||0));
  const choices=pool.filter(type=>(options.typeCounts.get(type)||0)===minimum);
  return generateQuestion({profile:'professional',targetGrade:options.grade,category:options.category,type:choices[(options.randomIndex||randomInt)(choices.length)],difficulty:options.difficulty,seed:options.seed});
}
