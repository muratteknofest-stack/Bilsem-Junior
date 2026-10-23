import type { BaseQuestion, CognitiveCategory, QuestionType } from '../../types';
import { ALL_TOPIC_TYPES, TOPIC_CATEGORY } from '../questions/topic-catalog';

export const LEARNING_TOPICS = ALL_TOPIC_TYPES;
export type LearningTopic = 'mixed' | QuestionType;
export function isLearningTopic(value: unknown): value is LearningTopic {
  return value === 'mixed' || (typeof value === 'string' && LEARNING_TOPICS.includes(value as QuestionType));
}
export function topicCategory(topic: LearningTopic, category: CognitiveCategory | 'mixed') {
  return topic === 'mixed' ? category : TOPIC_CATEGORY[topic];
}
/** Legacy bank-audit helper. Live test preparation preserves the requested length
 * and rejects insufficient diversity instead of silently capping the count. */
export function topicQuestionCount(questions: BaseQuestion[], requested: number, topic: LearningTopic) {
  return topic === 'mixed' ? requested : Math.min(requested, questions.length);
}
