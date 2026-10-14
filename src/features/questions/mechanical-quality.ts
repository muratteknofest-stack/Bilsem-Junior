import { validColorfulValue } from './colorful-engine';
import { validFigure } from './figure-analogy';
import type { BaseQuestion } from '../../types';
import { generateVisualFingerprint as fingerprint } from './fingerprint';
import { solveQuestion } from './universal-solver';
import { isVisualSymbol } from './visual-vocabulary';
import { TANGRAM_POLYGONS } from './workshop-mechanics';
import { validCompleteValue } from './complete-curriculum';

/** Identity follows renderer precedence: invisible metadata never makes a new choice. */
export function visibleOptionKey(value:unknown):string {
  const v=value as Record<string,unknown>|null;
  if(!v||typeof v!=='object')return fingerprint(null);
  if(v.curriculum==='piece'&&Array.isArray(v.points))return fingerprint({curriculum:'piece',points:v.points.map(p=>JSON.stringify(p)).sort()});
  if(v.figure!==undefined){const f=v.figure as any;return fingerprint({figure:{shape:f.shape,half:f.half,lines:f.lines,outerFill:f.outerFill,innerFill:f.innerFill,...(f.outerFill!=='empty'||f.innerFill!=='empty'?{inner:f.inner}:{})}});}
  if(v.symbol!==undefined)return fingerprint({symbol:v.symbol});
  if(Array.isArray(v.polygon))return fingerprint({polygon:v.polygon.map(p=>JSON.stringify(p)).sort()});
  if(Array.isArray(v.cells)&&[3,4].includes(Number(v.size)))return fingerprint({size:v.size,cells:v.cells});
  if(v.textNumber!==undefined)return fingerprint({textNumber:typeof v.textNumber==='string'?v.textNumber.normalize('NFKC').replace(/\s+/gu,' ').trim():v.textNumber});
  // Legacy views remain subject to their independent proof and template check.
  return fingerprint(v);
}
export interface MechanicalChoiceReport {id:string;visibleKey:string;ruleMatch:boolean;reason:string;}
export interface MechanicalReport {passed:boolean;uniqueVisibleOptions:number;matchingOptions:number;errors:string[];proofSteps:string[];choices:MechanicalChoiceReport[];}
export function analyzeQuestionMechanics(q:BaseQuestion):MechanicalReport {
  const errors:string[]=[], mode=(q.visualConfig as Record<string,unknown>)?.displayMode;
  const keys=q.options.map(o=>visibleOptionKey(o.visualData));
  if(new Set(keys).size!==4)errors.push('VISIBLE_DUPLICATE: Öğrencinin gördüğü dört şık birbirinden farklı olmalı.');
  if(mode==='workshop_board'||mode==='verified_board')for(const option of q.options){
    const value=option.visualData as Record<string,unknown>;
    if(!value||typeof value!=='object'||Array.isArray(value)){errors.push(`${option.id}: Seçenek nesnesi geçersiz.`);continue;}
    const allowed=mode==='workshop_board'&&value.figure!==undefined?['figure']:mode==='workshop_board'&&value.symbol!==undefined?['symbol']:mode==='workshop_board'&&value.polygon!==undefined?['polygon']:value.cells!==undefined?['size','cells']:['textNumber'];
    if(Object.keys(value).some(k=>!allowed.includes(k)))errors.push(`${option.id}: INVISIBLE_OPTION_DATA: Çizilmeyen alanlar seçenek farkı oluşturamaz.`);
    if(allowed[0]==='figure'&&!validFigure(value.figure))errors.push(`${option.id}: Şekil çizimi geçersiz.`);
    if(allowed[0]==='symbol'&&!isVisualSymbol(String(value.symbol)))errors.push(`${option.id}: Seçenek şekli tanımlı değil.`);
    if(allowed[0]==='polygon'&&!TANGRAM_POLYGONS.some(p=>fingerprint(p)===fingerprint(value.polygon)))errors.push(`${option.id}: Üçgen çizimi geçersiz.`);
    if(allowed[0]==='size'&&(![3,4].includes(Number(value.size))||!Array.isArray(value.cells)||value.cells.length!==Number(value.size)**2||value.cells.some(c=>c!==0&&c!==1)))errors.push(`${option.id}: Seçenek ızgarası geçersiz.`);
    if(allowed[0]==='textNumber'&&(!['string','number'].includes(typeof value.textNumber)||typeof value.textNumber==='string'&&!value.textNumber.trim()||typeof value.textNumber==='number'&&!Number.isFinite(value.textNumber)))errors.push(`${option.id}: Şık metni veya sayısı geçersiz.`);
  }
  if(mode==='colorful_board'&&q.options.some(o=>!validColorfulValue(o.visualData)))errors.push('Çizilmeyen veya geçersiz renkli seçenek alanı.');
  if(mode==='curriculum_board'&&q.options.some(o=>!validCompleteValue(o.visualData)))errors.push('Müfredat seçeneğinde çizilmeyen veya geçersiz alan.');
  const solve=solveQuestion(q), matches=q.options.filter(o=>fingerprint(o.visualData)===solve.expectedFingerprint);
  if(solve.canSolve&&(!solve.isMatch||solve.ambiguityDetected))errors.push('ANSWER_MECHANICS: Mekanik çözüm tek bir doğru şık ve cevap anahtarıyla uyuşmuyor.');
  const choices=q.options.map((option,i)=>{const ruleMatch=solve.canSolve&&!solve.ambiguityDetected&&option.id===solve.expectedAnswerId;return {id:option.id,visibleKey:keys[i],ruleMatch,reason:ruleMatch?'Verilenlerden hesaplanan tek doğru şık.':solve.canSolve&&!solve.ambiguityDetected?'Verilen kurala uymayan çeldirici.':'Bağımsız kanıt tamamlanamadığı için bu şık onaylanamaz.'};});
  return {passed:!errors.length&&solve.canSolve&&solve.isMatch&&!solve.ambiguityDetected,uniqueVisibleOptions:new Set(keys).size,matchingOptions:matches.length,errors,proofSteps:solve.proofSteps,choices};
}

