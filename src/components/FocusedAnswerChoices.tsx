import React from 'react';
import type { BaseQuestion } from '../types';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';

export function FocusedAnswerChoices(p: { question: BaseQuestion; response: QuestionResponse | null;
  onChange: (response: QuestionResponse) => void; busy: boolean; expired?: boolean; submitted: boolean }) {
  return <fieldset className="zp-focus-answers" disabled={p.busy || p.expired || p.submitted}>
    <legend className="sr-only">Cevabın</legend>
    <AnswerWorkspace compact allowedModes={['choice']} preferredMode="choice" question={p.question}
      response={p.response?.mode === 'choice' ? p.response : null} onChange={p.onChange} submitted={p.submitted}/>
  </fieldset>;
}
