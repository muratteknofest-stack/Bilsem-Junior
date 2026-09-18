import { useEffect, useState } from 'react';
import type { BaseQuestion } from '../../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { questionBankService } from '../../services/question-bank-service';
import { loadPublishedQuestions } from '../../services/question-publishing-service';
import { auditQuestion } from './quality';

export function usePublishedQuestions() {
  const [questions, setQuestions] = useState<BaseQuestion[]>(() => questionBankService.getAll());

  useEffect(() => {
    // 1. Subscribe to questionBankService in-memory/cache updates
    const unsubService = questionBankService.subscribe(() => {
      setQuestions(questionBankService.getAll());
    });

    // 2. Subscribe directly to Firestore live snapshot for instant test distribution
    let unsubFirestore: (() => void) | null = null;
    if (typeof window !== 'undefined') {
      try {
        unsubFirestore = onSnapshot(
          collection(db, 'questions'),
          (snapshot) => {
            const items = snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id } as BaseQuestion))
              .filter((item) => auditQuestion(item).errors.length === 0);
            if (items.length > 0) {
              setQuestions(items);
            }
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
