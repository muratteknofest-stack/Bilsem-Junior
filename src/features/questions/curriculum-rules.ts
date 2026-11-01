export type NumberPatternRule = 'alternating-add' | 'multiply' | 'growing-difference';
type Token = { shape: number; color: number };
const validNumbers = (values: readonly number[]) => values.length >= 5 && values.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000);

export function nextPatternNumber(values: readonly number[], rule: NumberPatternRule): number {
  if (!validNumbers(values)) throw Error('Sayı örüntüsü verisi geçersiz.');
  const differences = values.slice(1).map((n, i) => n - values[i]);
  let answer: number;
  if (rule === 'alternating-add') {
    if (differences[0] <= 0 || differences[1] <= 0 || differences[0] === differences[1] || !differences.every((n, i) => n === differences[i % 2])) throw Error('Sırayla artış kuralı tutarsız.');
    answer = values.at(-1)! + differences[(values.length - 1) % 2];
  } else if (rule === 'multiply') {
    const ratio = values[1] / values[0];
    if (![2, 3].includes(ratio) || !values.slice(1).every((n, i) => n === values[i] * ratio)) throw Error('Çarpma örüntüsü tutarsız.');
    answer = values.at(-1)! * ratio;
  } else if (rule === 'growing-difference') {
    const increase = differences[1] - differences[0];
    if (differences[0] <= 0 || increase <= 0 || !differences.every((n, i) => n === differences[0] + i * increase)) throw Error('Artan farklar tutarsız.');
    answer = values.at(-1)! + differences.at(-1)! + increase;
  } else throw Error('Sayı örüntüsü kuralı tanınmıyor.');
  if (!Number.isSafeInteger(answer) || answer < 0 || answer > 1000) throw Error('Sayı örüntüsü sonucu aralık dışında.');
  return answer;
}

/** Independent candidate substitution proves the displayed sequence, including the proposed term. */
export function matchesPatternNumber(values: readonly number[], rule: NumberPatternRule, candidate: number): boolean {
  const filled = [...values, candidate];
  if (!validNumbers(values) || !Number.isSafeInteger(candidate) || candidate < 0 || candidate > 1000) return false;
  if (rule === 'multiply') return values[0] > 0 && [2, 3].includes(values[1] / values[0]) && filled.slice(1).every((n, i) => n * filled[0] === filled[i] * filled[1]);
  const gaps = filled.slice(1).map((n, i) => n - filled[i]);
  if (rule === 'alternating-add') return gaps[0] > 0 && gaps[1] > 0 && gaps[0] !== gaps[1] && gaps.slice(2).every((n, i) => n === gaps[i]);
  if (rule === 'growing-difference') {
    const changes = gaps.slice(1).map((n, i) => n - gaps[i]);
    return gaps[0] > 0 && changes[0] > 0 && changes.every(n => n === changes[0]);
  }
  return false;
}

export function nextAttributeToken(sequence: readonly (Token | null)[], shapePeriod: number, colorPeriod: number): Token {
  if (![2, 3].includes(shapePeriod) || ![2, 3].includes(colorPeriod) || shapePeriod === colorPeriod || sequence.length < 7 || sequence.at(-1) !== null) throw Error('İki özellikli dizi geçersiz.');
  const known = sequence.slice(0, -1);
  if (known.some(t => !t || ![t.shape, t.color].every(n => Number.isInteger(n) && n >= 0 && n < 6))) throw Error('Eksik dizi kanıtı.');
  const tokens = known as Token[];
  if (new Set(tokens.slice(0, shapePeriod).map(t => t.shape)).size !== shapePeriod || new Set(tokens.slice(0, colorPeriod).map(t => t.color)).size !== colorPeriod || !tokens.every((t, i) => t.shape === tokens[i % shapePeriod].shape && t.color === tokens[i % colorPeriod].color)) throw Error('Şekil ve renk döngüleri tutarsız.');
  return { shape: tokens[known.length % shapePeriod].shape, color: tokens[known.length % colorPeriod].color };
}

export function matchesAttributeToken(sequence: readonly (Token | null)[], shapePeriod: number, colorPeriod: number, candidate: Token): boolean {
  if (![2, 3].includes(shapePeriod) || ![2, 3].includes(colorPeriod) || shapePeriod === colorPeriod || sequence.length < 7 || sequence.at(-1) !== null) return false;
  const filled = [...sequence.slice(0, -1), candidate];
  if (filled.some(t => !t || ![t.shape, t.color].every(n => Number.isInteger(n) && n >= 0 && n < 6))) return false;
  return filled.every((t, i) => (i < shapePeriod || t!.shape === filled[i - shapePeriod]!.shape) && (i < colorPeriod || t!.color === filled[i - colorPeriod]!.color));
}
