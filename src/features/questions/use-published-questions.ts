import { useEffect, useState } from 'react';
import type { BaseQuestion } from '../../types';
import { loadPublishedQuestions } from '../../services/question-publishing-service';

export function usePublishedQuestions() {
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  useEffect(() => {
    let live = true;
    loadPublishedQuestions().then(items => { if (live) setQuestions(items); })
      .catch(() => { /* Existing procedural practice remains available offline. */ });
    return () => { live = false; };
  }, []);
  return questions;
}
