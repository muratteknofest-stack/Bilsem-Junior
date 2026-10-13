/** Public capacity only. Puzzle snapshots and answer keys remain on the server. */
export const ENGLISH_BANK_GRADES=[1,2,3,4] as const;
export const ENGLISH_QUESTIONS_PER_GRADE=1000;
export const ENGLISH_TOTAL_QUESTIONS=ENGLISH_BANK_GRADES.length*ENGLISH_QUESTIONS_PER_GRADE;
export const englishQuestionCount=(count:number)=>count.toLocaleString('en-US');
