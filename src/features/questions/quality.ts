import type { BaseQuestion } from '../../types';

// Canonical content, independent of option letters, property order and supplied fingerprints.
export function canonicalContent(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalContent).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalContent(value[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}

export function optionContent(value: any): string {
  if (value && typeof value === 'object' && value.textNumber !== undefined) {
    return canonicalContent({ textNumber: String(value.textNumber).trim() });
  }
  return canonicalContent(value);
}

export function questionContentKey(q: BaseQuestion): string {
  return canonicalContent({ type: q.type, prompt: q.prompt.trim(), secondaryPrompt: q.secondaryPrompt?.trim(), visualConfig: q.visualConfig });
}

export interface SolverResult { supported: boolean; matchingIds: string[]; }
// Solve from the displayed evidence, never from correctOptionId or the explanation.
export function solveQuestion(q: BaseQuestion): SolverResult {
  const v = q.visualConfig;
  let predicate: ((data: any) => boolean) | undefined;
  if (q.type === 'number_pattern' && Array.isArray(v?.displayNumbers)) {
    const [a,b,c] = v.displayNumbers.map(Number);
    const candidates = new Set<number>();
    if (b-a === c-b) candidates.add(c+(c-b));
    if (a !== 0 && b !== 0 && b/a === c/b) candidates.add(c*(c/b));
    predicate = d => candidates.has(Number(d?.textNumber));
  } else if (q.type === 'number_pyramid' && Array.isArray(v?.pyramid)) {
    predicate = d => {
      const p = v.pyramid.map((n: number) => n === -1 ? Number(d?.textNumber) : n);
      return p.length === 6 && p.every(Number.isFinite) && p[0] === p[1]+p[2] && p[1] === p[3]+p[4] && p[2] === p[4]+p[5];
    };
  } else if (q.type === 'operation_machine' && Array.isArray(v?.pairs)) {
    const known = v.pairs.filter((p: any) => p.out !== '?');
    const target = v.pairs.find((p: any) => p.out === '?');
    if (known.length >= 2 && target) {
      const [a,b] = known;
      const slope = (Number(b.out)-Number(a.out))/(b.in-a.in);
      const offset = Number(a.out)-slope*a.in;
      const consistent = Number.isFinite(slope) && known.every((p: any) => Math.abs(slope*p.in+offset-Number(p.out)) < 1e-9);
      predicate = d => consistent && Math.abs(Number(d?.textNumber)-(slope*target.in+offset)) < 1e-9;
    }
  } else if (q.type === 'figure_rotation' && v?.targetItem) {
    const delta = v.direction === 'saat yönünde' ? v.rotationAngle : -v.rotationAngle;
    const expected = { ...v.targetItem, rotation: ((v.targetItem.rotation || 0)+delta+720)%360 };
    predicate = d => canonicalContent(d) === canonicalContent(expected);
  }
  return { supported: !!predicate, matchingIds: predicate ? q.options.filter(o => predicate!(o.visualData)).map(o => o.id) : [] };
}
