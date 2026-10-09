import { useEffect, useState } from 'react';
import type { BaseQuestion } from '../../types';
import { collection, onSnapshot, query, where } from '../../lib/supabase-data';
import { db } from '../../lib/platform';
import { dataService } from '../../services/data-service';
import { isSchoolGrade } from './quality-policy';
import { isQuestionReadyForStudents } from './quality';

export function usePublishedQuestions() {
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);

  useEffect(() => {
    const grade = dataService.getCurrentUser().grade;
    if (!isSchoolGrade(grade)) return;
    // Only approved questions for the learner's grade reach this screen.
    let unsubSupabase: (() => void) | null = null;
    if (typeof window !== 'undefined') {
      try {
        unsubSupabase = onSnapshot(
          query(collection(db, 'questions'), where('status', '==', 'published'), where('target_grade', '==', grade)),
          (snapshot) => {
            const items = snapshot.docs
              .map((d: { data: () => BaseQuestion; id: string }) => ({ ...d.data(), id: d.id } as BaseQuestion))
              .filter((item: BaseQuestion) => item.status === 'published' && item.targetGrade === grade && isQuestionReadyForStudents(item));
            setQuestions(items);
          },
          (error) => {
            console.warn('Live published questions listener notice:', error);
            setQuestions([]);
          }
        );
      } catch (e) {
        setQuestions([]);
      }
    }

    return () => {
      if (unsubSupabase) unsubSupabase();
    };
  }, []);

  return questions;
}

