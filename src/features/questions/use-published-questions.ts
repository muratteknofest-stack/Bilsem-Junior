import { useEffect, useState } from 'react';
import type { BaseQuestion } from '../../types';
import { collection, onSnapshot, query, where } from '../../lib/supabase-data';
import { db } from '../../lib/platform';
import { questionBankService } from '../../services/question-bank-service';
import { loadPublishedQuestions } from '../../services/question-publishing-service';
import { auditQuestion } from './quality';

export function usePublishedQuestions() {
  const localPublished = () => questionBankService.getAll().filter(q => q.status === 'published' || (!q.isCustom && !q.status));
  const [questions, setQuestions] = useState<BaseQuestion[]>(localPublished);

  useEffect(() => {
    // 1. Subscribe to questionBankService in-memory/cache updates
    const unsubService = questionBankService.subscribe(() => {
      setQuestions(localPublished());
    });

    // 2. Subscribe to published questions for instant test distribution
    let unsubFirestore: (() => void) | null = null;
    if (typeof window !== 'undefined') {
      try {
        unsubFirestore = onSnapshot(
          query(collection(db, 'questions'), where('status', '==', 'published')),
          (snapshot) => {
            const items = snapshot.docs
              .map((d: { data: () => BaseQuestion; id: string }) => ({ ...d.data(), id: d.id } as BaseQuestion))
              .filter((item: BaseQuestion) => item.status === 'published' && auditQuestion(item).errors.length === 0);
            setQuestions(items.length > 0 ? items : localPublished());
          },
          (error) => {
            console.warn('Live published questions listener notice:', error);
            loadPublishedQuestions().then(setQuestions).catch(() => {});
          }
        );
      } catch (e) {
        loadPublishedQuestions().then(setQuestions).catch(() => {});
      }
    }

    return () => {
      unsubService();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  return questions;
}
