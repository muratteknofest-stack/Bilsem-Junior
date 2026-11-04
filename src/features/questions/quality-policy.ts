import type { ColorfulBoard } from './colorful-engine';
import type { BaseQuestion, DifficultyLevel } from '../../types';
import type { Board } from './professional-engine';
import { generateVisualFingerprint } from './fingerprint';
import { isVisualSymbol } from './visual-vocabulary';
import type { WorkshopBoard } from './workshop-mechanics';

export const QUALITY_POLICY_VERSION = 'education-1';
export type SchoolGrade = 1 | 2 | 3 | 4;
/** Product editorial limits, not a clinical age test or a claim of curriculum accreditation. */
export const EDUCATION_PROFILES = {
  1: { ages: [6, 8], maxDifficulty: 2, maxNumber: 30, maxItems: 16, maxSymbols: 3, maxPeople: 4, maxGrid: 3, maxWords: 30 },
  2: { ages: [7, 9], maxDifficulty: 3, maxNumber: 100, maxItems: 24, maxSymbols: 5, maxPeople: 5, maxGrid: 3, maxWords: 35 },
  3: { ages: [8, 10], maxDifficulty: 4, maxNumber: 250, maxItems: 30, maxSymbols: 5, maxPeople: 5, maxGrid: 4, maxWords: 45 },
  4: { ages: [9, 11], maxDifficulty: 6, maxNumber: 1000, maxItems: 36, maxSymbols: 6, maxPeople: 6, maxGrid: 4, maxWords: 55 },
} as const;
export function isSchoolGrade(value: unknown): value is SchoolGrade { return [1, 2, 3, 4].includes(value as number); }
export function gradeDifficulty(grade: SchoolGrade, difficulty: number): DifficultyLevel {
  return Math.max(1, Math.min(EDUCATION_PROFILES[grade].maxDifficulty, difficulty)) as DifficultyLevel;
}
export type QualityStageId = 'structure' | 'answer' | 'content' | 'audience' | 'difficulty' | 'visual' | 'novelty' | 'blind' | 'editorial';
export const QUALITY_STAGES: { id: QualityStageId; label: string; weight: number }[] = [
  { id: 'structure', label: 'Veri ve seçenek yapısı', weight: 10 },
  { id: 'answer', label: 'İki bağımsız çözüm ve tek doğru cevap', weight: 25 },
  { id: 'content', label: 'Yönerge, açıklama ve çeldirici tutarlılığı', weight: 15 },
  { id: 'audience', label: 'Yaş ve sınıf profili', weight: 15 },
  { id: 'difficulty', label: 'Zorluk ve işlem yükü', weight: 10 },
  { id: 'visual', label: 'Görsel yoğunluk ve çizim verisi', weight: 10 },
  { id: 'novelty', label: 'Karşılaştırılan havuzda tekrar kontrolü', weight: 5 },
  { id: 'blind', label: 'Cevabı görmeden AI çözümü', weight: 5 },
  { id: 'editorial', label: 'Bağımsız AI editör incelemesi', weight: 5 },
];
export interface QualityStage {
  id: QualityStageId; label: string; weight: number; status: 'passed' | 'failed' | 'pending'; reasons: string[];
}
export interface QuestionQualityReport {
  similarity?: import('./novelty').QuestionNovelty;
  policyVersion: string; contentKey: string; evaluatedAt: string; score: number; eligible: boolean;
  target: { grade: SchoolGrade; age?: number; difficulty: number };
  metrics: { maxNumber: number; itemCount: number; symbolCount: number; peopleCount: number; gridSize: number; promptWords: number; comparedQuestions: number };
  stages: QualityStage[];
}
export interface GenerationAttempt {
  attempt: number; seed: number; type: string; questionId?: string; durationMs: number;
  outcome: 'accepted' | 'rejected' | 'unavailable'; action: string; reasons: string[]; report?: QuestionQualityReport;
}
export function assessmentContentKey(q: BaseQuestion): string {
  return generateVisualFingerprint({ type: q.type, category: q.category, seed: q.seed, version: q.version, engine: q.authoring?.engine,
    prompt: q.prompt, secondaryPrompt: q.secondaryPrompt, context:q.context, reviewPolicy:q.reviewPolicy, board: q.visualConfig, options: q.options, answer: q.correctOptionId,
    explanation: q.explanation, notes: q.authoring?.distractorNotes, grade: q.targetGrade, grades: q.targetGrades,
    age: q.targetAge, ageGroup: q.ageGroup, difficulty: q.difficulty, seconds: q.estimatedSeconds });
}
export function inspectEducation(q: BaseQuestion, grade: SchoolGrade, age?: number) {
  const p = EDUCATION_PROFILES[grade], b = q.visualConfig as Board;
  if (!p) throw new Error('Hedef sınıf 1–4 olmalı.');
  const w=q.visualConfig as unknown as WorkshopBoard;
  const workshop=w?.displayMode==='workshop_board';
  const numeric = [ ...(b.values || []), ...(b.examples || []).flat(), b.input,
    ...(b.base || []),
    ...(workshop ? [...(w.totals||[]),...(w.equations||[]).flat(),...(w.expression||[]),...(w.counts||[]),...(w.heights||[]),...(w.cells||[])] : []),
    ...(b.key || []).map(k => k.value), ...q.options.map(o => (o.visualData as { textNumber?: unknown })?.textNumber),
  ].filter((v): v is number => typeof v === 'number');
  const metrics = { maxNumber: Math.max(0, ...numeric.map(Math.abs)), itemCount: b.items?.length || 0,
    symbolCount: b.symbols?.length || b.moves?.length || 0, peopleCount: b.names?.length || 0,
    gridSize: Math.max(b.gridSize || 0, workshop ? w.size||0 : 0, ...(b.tiles || []).filter(Boolean).map(t => t!.size)), promptWords: q.prompt.trim().split(/\s+/u).length };
  if(workshop){
    metrics.symbolCount=w.kind==='cryptogram'?(w.querySymbols?.length||w.code!.length):w.kind==='word_scramble_logic'?w.letters!.length:w.kind==='visual_attention'?w.reference!.length:0;
    metrics.peopleCount=w.labels?.length||0;
    metrics.itemCount=w.cipherRows?.flat().length||w.figures?.length||w.symbols?.length||w.heights?.length||0;
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='colorful_board'){const c=q.visualConfig as unknown as ColorfulBoard;metrics.gridSize=c.source?.art==='mosaic'?c.source.size:0;metrics.itemCount=metrics.gridSize**2||c.layers?.length||1;}
  const audience: string[] = [], difficulty: string[] = [], visual: string[] = [];
  if((q.visualConfig as Record<string,unknown>).displayMode==='photo_lab'){
    const v=q.visualConfig as import('./photo-lab').PhotoBoard;
    const ids=v.mechanic==='photo-sequence'?v.sequence:v.mechanic==='photo-difference'?[...v.left,...v.right]:v.cards;
    metrics.maxNumber=v.mechanic==='photo-count'?v.cards.length:v.mechanic==='photo-difference'?v.left.length:0;metrics.gridSize=v.mechanic==='photo-count'||v.mechanic==='photo-difference'?v.columns:0;metrics.peopleCount=0;metrics.symbolCount=new Set(ids).size;metrics.itemCount=ids.length;
    if(v.grade!==grade)audience.push('GRADE_MISMATCH: Fotoğraf sınıfı uyuşmuyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='composite_shadow'){
    const v=q.visualConfig as import('./composite-shadow').ShadowBoard;
    metrics.maxNumber=0;metrics.gridSize=0;metrics.peopleCount=0;metrics.symbolCount=v.shapes.length;metrics.itemCount=v.shapes.length+v.holes.length;
    if(v.grade!==grade)audience.push('GRADE_MISMATCH: Birleşik gölge sınıfı uyuşmuyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='visual_lab'){
    const v=q.visualConfig as import('./visual-reasoning-lab').VisualBoard;
    metrics.maxNumber=0;metrics.peopleCount=0;metrics.gridSize=0;metrics.symbolCount=0;metrics.itemCount=0;
    if(v.mechanic==='object-shadow'||v.mechanic==='object-mirror'){metrics.itemCount=v.objects.length;metrics.symbolCount=new Set(v.objects.map(o=>o.kind)).size;}
    else if(v.mechanic==='scene-difference'){metrics.itemCount=v.left.length*2;metrics.symbolCount=new Set(v.left.map(o=>o.kind)).size;}
    else if(v.mechanic==='seven-piece')metrics.itemCount=7;
    else if(v.mechanic==='fold-punch')metrics.itemCount=v.holes.length*2**v.folds.length;
    else if(v.mechanic==='missing-symbol'){metrics.gridSize=v.side;metrics.itemCount=v.cells.length;metrics.symbolCount=v.side;}
    else if(v.mechanic==='raven-relation'){metrics.gridSize=v.side;metrics.itemCount=v.cards.length-1;metrics.symbolCount=new Set(v.cards.filter(c=>c!==null).flatMap(c=>Array.from({length:8},(_,i)=>i).filter(i=>c.mask&(1<<i)))).size;}
    else {const checked=inspectEducation({...q,visualConfig:v.cube},grade,age);Object.assign(metrics,checked.metrics);audience.push(...checked.audience);difficulty.push(...checked.difficulty);visual.push(...checked.visual);}
    if(v.grade!==grade)audience.push('GRADE_MISMATCH: Görsel muhakeme sınıfı uyuşmuyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='exam_lab'){
    const e=q.visualConfig as import('./exam-lab').ExamBoard;
    metrics.maxNumber=0;metrics.symbolCount=0;metrics.peopleCount=0;
    metrics.gridSize=e.mechanic==='cyclic-matrix'?e.side:e.mechanic==='composition-matrix'?3:0;
    metrics.itemCount='cards'in e?e.cards.filter(Boolean).length:e.mechanic==='detail-mirror'?e.source.cells.length:e.cells.filter(v=>v!==null).length;
    if(e.grade!==grade)audience.push('GRADE_MISMATCH: Deneme sınıfı uyuşmuyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='reference_lab'){
    const r=q.visualConfig as import('./reference-lab').ReferenceBoard;metrics.gridSize=0;metrics.itemCount=0;metrics.symbolCount=0;metrics.peopleCount=0;
    switch(r.mechanic){
      case'semantic-analogy':metrics.itemCount=r.examples.length*2+1;break;
      case'broken-pattern':metrics.itemCount=r.unit.length+r.sequence.length;metrics.symbolCount=r.unit.length;break;
      case'paired-memory':metrics.itemCount=r.pairs.length*2;metrics.symbolCount=r.pairs.length;break;
      case'number-memory':metrics.itemCount=r.digits.length;metrics.symbolCount=r.digits.length;break;
      case'symbol-code':metrics.itemCount=r.key.length+r.query.length;metrics.symbolCount=r.key.length;break;
      case'word-code':metrics.itemCount=r.examples.reduce((s,p)=>s+p[0].length,0);metrics.symbolCount=new Set(r.examples.map(p=>p[0]).join('')).size;break;
      case'texture-patch':metrics.gridSize=r.size;metrics.itemCount=r.cells.length+r.motif.length;metrics.symbolCount=new Set(r.motif).size;break;
      case'parts-union':metrics.gridSize=r.size;metrics.itemCount=r.target.filter(Boolean).length+r.pieces.reduce((s,p)=>s+p.cells.filter(Boolean).length,0);break;
      case'layered-top':metrics.itemCount=r.layers.length;metrics.symbolCount=r.layers.length;break;
    }
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='cube_lab'){
    const c=q.visualConfig as import('./cube-lab').CubeBoard;
    metrics.gridSize='size'in c?c.size:0;metrics.itemCount='heights'in c?c.heights.reduce((s,h)=>s+h,0):6;metrics.symbolCount=0;metrics.peopleCount=0;
    metrics.maxNumber=Math.max(metrics.maxNumber,...('heights'in c?c.heights: c.faces.map(f=>f.label)));
    if(c.grade!==grade)audience.push('GRADE_MISMATCH: Küp planının sınıfı uyuşmuyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='perceptual_board'){
    const board=q.visualConfig as import('./perceptual-engine').PerceptualBoard;
    const cards=board.cards.filter((c):c is import('./perceptual-engine').PerceptualValue=>c!==null);
    metrics.gridSize=board.mechanic==='matrix-attributes'?3:board.mechanic==='analogy-grid'?2:0;
    metrics.itemCount=cards.length;metrics.symbolCount=0;metrics.peopleCount=0;
    metrics.maxNumber=Math.max(0,...cards.map(c=>c?.count??0));
    if(grade===1&&(board.mechanic==='matrix-attributes'||board.mechanic==='interleaved-sequence'))audience.push('PREREQUISITE: Bu görsel ilişki 1. sınıf profilinde desteklenmiyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='curriculum_board'){
    const c=q.visualConfig as import('./complete-curriculum').CompleteBoard;
    metrics.gridSize=c.size;
    metrics.itemCount=c.sequence?.filter(Boolean).length||c.matrix?.filter(Boolean).length||c.grids?.reduce((sum,g)=>sum+g.filter(Boolean).length,0)||c.source?.filter(Boolean).length||c.pieces?.length||0;
    metrics.symbolCount=c.letters?.length||c.objects?.length||0;metrics.peopleCount=c.names?.length||0;
    const nums=[...(c.values||[]),...(c.base||[]),...(c.examples||[]).flat(),...(c.equations||[]).map(r=>r[2]),c.input,c.outputTarget,...q.options.map(o=>(o.visualData as {textNumber?:unknown}).textNumber)].filter((n):n is number=>typeof n==='number');
    metrics.maxNumber=Math.max(0,...nums);
    if(nums.some(n=>!Number.isSafeInteger(n)||n<0)||metrics.maxNumber>p.maxNumber)difficulty.push('NUMBER_LOAD: Müfredat sayıları sınıf sınırını aşıyor.');
    if(c.letters&&c.letters.length>p.maxSymbols)difficulty.push('WORKING_MEMORY: Harf sayısı sınıf sınırını aşıyor.');
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='reasoning_lab') {
    const lab=q.visualConfig as import('./reasoning-lab').LabBoard;
    const values:number[]=[];
    metrics.gridSize='size' in lab?lab.size:0;metrics.itemCount=0;metrics.symbolCount=0;metrics.peopleCount=0;
    switch(lab.mechanic) {
      case 'route-count':metrics.itemCount=lab.size**2;break;
      case 'domino-chain':metrics.itemCount=lab.chain.length*2;values.push(...lab.chain.filter(x=>x!==null).flat());break;
      case 'box-transfer':values.push(...lab.initial,...lab.transfers.map(t=>t.amount));metrics.itemCount=lab.transfers.length;break;
      case 'switch-parity':metrics.symbolCount=lab.lamps.length;metrics.itemCount=lab.presses.length;break;
      case 'position-swaps':metrics.peopleCount=lab.items.length;metrics.itemCount=lab.swaps.length;break;
      case 'boundary-edges':metrics.itemCount=lab.cells.length;break;
      case 'guaranteed-draw':values.push(...lab.counts,lab.target);metrics.itemCount=lab.counts.reduce((a,n)=>a+n,0);break;
      case 'cheapest-route':values.push(...lab.routes.flat(),...lab.routes.map(r=>r.reduce((a,n)=>a+n,0)));metrics.itemCount=lab.routes.flat().length;break;
    }
    metrics.maxNumber=Math.max(metrics.maxNumber,...values);
  }
  if((q.visualConfig as Record<string,unknown>).displayMode==='symbolic_v2'){
    const board=q.visualConfig as unknown as import('./symbolic-v2').SymbolicBoard;
    metrics.symbolCount=board.symbols.length;metrics.itemCount=board.equations.reduce((sum,row)=>sum+row.slice(0,-1).filter(Boolean).length,0)+board.query.filter(Boolean).length;
    metrics.maxNumber=Math.max(...board.equations.map(row=>row.at(-1)!),...q.options.map(o=>Number((o.visualData as {textNumber:number}).textNumber)));
    if(metrics.maxNumber>p.maxNumber)difficulty.push('NUMBER_LOAD: Sembolik ilişkiler sınıf sınırını aşıyor.');
  }
  if (age !== undefined && (!Number.isInteger(age) || age < p.ages[0] || age > p.ages[1])) audience.push('AGE_PROFILE: Yaş seçilen sınıfın içerik profili dışında.');
  if (q.targetGrade !== undefined && q.targetGrade !== grade) audience.push('GRADE_MISMATCH: Soru sınıfı istekle uyuşmuyor.');
  if (q.ageGroup !== 'all' && q.ageGroup !== (grade <= 2 ? '1-2' : '3-4')) audience.push('AGE_GROUP: Sınıf grubu etiketi uyuşmuyor.');
  if(q.context)metrics.promptWords += (q.context.title+' '+q.context.story).trim().split(/\s+/u).length;
  if (metrics.promptWords > p.maxWords) audience.push('READING_LOAD: Yönergenin okuma yükü fazla.');
  if (grade === 1 && (b.kind === 'machine' || b.kind === 'matrix')) audience.push('PREREQUISITE: Bu çok adımlı kural 1. sınıf profilinde desteklenmiyor.');
  if (q.difficulty > p.maxDifficulty) difficulty.push('DIFFICULTY_LIMIT: Seviye sınıf sınırının üzerinde.');
  if (numeric.some(v => !Number.isSafeInteger(v) || v < 0) || metrics.maxNumber > p.maxNumber) difficulty.push('NUMBER_LOAD: Verilen veya seçenek sayısı profil sınırını aşıyor.');
  if ((b.kind === 'path' ? metrics.symbolCount > grade + 4 : metrics.symbolCount > p.maxSymbols) || metrics.peopleCount > p.maxPeople) difficulty.push('WORKING_MEMORY: Sembol veya sıralama yükü fazla.');
  if (metrics.itemCount > p.maxItems || metrics.gridSize > (b.kind === 'path' && grade === 4 ? 5 : p.maxGrid)) visual.push('VISUAL_LOAD: Görsel yoğunluk sınıf sınırını aşıyor.');
  if (b.kind === 'symbols' && [...(b.key || []).map(k => k.symbol), ...(b.symbols || [])].some(s => !isVisualSymbol(s))) visual.push('SYMBOL_RENDERING: Sembol çizimi tanımlı değil.');
  if (b.kind === 'count' && [...(b.items || []), b.target || ''].some(s => !isVisualSymbol(s))) visual.push('SYMBOL_RENDERING: Sayılacak şeklin çizimi tanımlı değil.');
  return { audience, difficulty, visual, metrics };
}
export function hasCompleteQualityReport(q: BaseQuestion): boolean {
  const r = q.qualityReport;
  return !!r && r.policyVersion === QUALITY_POLICY_VERSION && r.contentKey === assessmentContentKey(q) && r.eligible === true &&
    r.target.grade === q.targetGrade && r.target.age === q.targetAge && r.target.difficulty === q.difficulty &&
    r.stages.length === QUALITY_STAGES.length && QUALITY_STAGES.every(s => r.stages.filter(t => t.id === s.id && t.status === 'passed' && t.reasons.length === 0 && t.weight === s.weight).length === 1) && r.score === 100;
}


