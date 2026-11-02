import { validatePerceptualBoard, validPerceptualValue, type PerceptualValue } from './perceptual-engine';

/** Candidate substitution proof. Does not call the generator, forward solver,
 * rule inference or answer key; checks relations on each completed board. */
export function independentlyMatchesPerceptual(value: unknown, candidate: unknown): candidate is PerceptualValue {
  try {
    if (!validPerceptualValue(candidate)) return false;
    const b = validatePerceptualBoard(value), c = [...b.cards] as PerceptualValue[];
    if (b.grade === 1 && candidate.count > 4) return false;
    if (b.mechanic === 'feature-classification') {
      let common = 0;
      for (const key of ['shape', 'count', 'rotation', 'filled'] as const) if (new Set(c.map(x => x[key])).size === 1) { common++; if (candidate[key] !== c[0][key]) return false; }
      return common >= 1 && common <= 2;
    }
    c[c.length - 1] = candidate;
    const cyclic = (n: number) => (n % 4 + 4) % 4;
    if (b.mechanic === 'matrix-attributes') {
      if (c.some(v => v.shape !== c[0].shape)) return false;
      const signature = (xs: PerceptualValue[]) => xs.map(x => x.count).sort().join(',');
      const target = signature(c.slice(0, 3)); if (new Set(c.slice(0, 3).map(x => x.count)).size !== 3) return false;
      for (let i = 0; i < 3; i++) if (signature(c.slice(i * 3, i * 3 + 3)) !== target || signature([c[i], c[i + 3], c[i + 6]]) !== target) return false;
      for (const stride of [1, 3]) {
        const turn = cyclic(c[stride].rotation - c[0].rotation), flip = c[stride].filled !== c[0].filled;
        for (let i = 0; i < 9; i++) if (stride === 1 ? i % 3 < 2 : i < 6) {
          if (cyclic(c[i + stride].rotation - c[i].rotation) !== turn || (c[i + stride].filled !== c[i].filled) !== flip) return false;
        }
      }
      return true;
    }
    const sequence = (xs: PerceptualValue[]) => {
      const countGap = xs[1].count - xs[0].count, angleGap = cyclic(xs[1].rotation - xs[0].rotation), toggle = xs[1].filled !== xs[0].filled;
      return Math.abs(countGap) <= 2 && xs.slice(1).every((x, i) => x.shape === xs[0].shape && x.count - xs[i].count === countGap && cyclic(x.rotation - xs[i].rotation) === angleGap && (x.filled !== xs[i].filled) === toggle);
    };
    if (b.mechanic === 'attribute-sequence') return sequence(c);
    if (b.mechanic === 'interleaved-sequence') return sequence([c[0], c[2], c[4], c[6]]) && sequence([c[1], c[3], c[5]]);
    const pairs = b.mechanic === 'analogy-grid' ? [[c[0], c[1]], [c[2], c[3]]] : [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]]];
    const [a, z] = pairs[0], turn = cyclic(z.rotation - a.rotation), toggle = z.filled !== a.filled;
    const additive = Math.abs(z.count - a.count) <= 2 && pairs.every(([x, y]) => y.count - x.count === z.count - a.count);
    const proportional = b.mechanic === 'paired-analogy' && [2, 0.5].some(ratio => pairs.every(([x, y]) => y.count / x.count === ratio));
    return (additive || proportional) && pairs.every(([x, y]) => x.shape === y.shape && cyclic(y.rotation - x.rotation) === turn && (y.filled !== x.filled) === toggle);
  } catch { return false; }
}
