import { validateLabBoard } from './reasoning-lab';

/** Independent derivations: enumerate routes, reconstruct a missing domino,
 * use conservation/parity, trace a card backwards, and count shared edges.
 * This module never reads a seed, answer key or the primary solver's output. */
export function independentlySolveLab(value: unknown): string | number {
  const b = validateLabBoard(value);
  switch (b.mechanic) {
    case 'route-count': {
      let completed = 0;
      const visit = (row: number, col: number) => {
        if (row >= b.size || col >= b.size || b.blocked.includes(row * b.size + col)) return;
        if (row === b.size - 1 && col === b.size - 1) { completed++; return; }
        visit(row + 1, col); visit(row, col + 1);
      };
      visit(0, 0); return completed;
    }
    case 'domino-chain': {
      const matches: string[] = [], index = b.chain.indexOf(null);
      for (let left = 0; left <= 6; left++) for (let right = 0; right <= 6; right++) {
        const chain = b.chain.map((d, i) => i === index ? [left, right] : d!);
        if (chain.slice(1).every((d, i) => chain[i][1] === d[0])) matches.push(`${left} | ${right}`);
      }
      if (matches.length !== 1) throw Error('Domino tek bir sonuç vermiyor.');
      return matches[0];
    }
    case 'box-transfer':
      return b.initial[b.target] + b.transfers.filter(t => t.to === b.target).reduce((n, t) => n + t.amount, 0) - b.transfers.filter(t => t.from === b.target).reduce((n, t) => n + t.amount, 0);
    case 'switch-parity':
      return b.lamps.filter((state, i) => (state + b.presses.filter(p => p.includes(i)).length) % 2 === 1).length;
    case 'position-swaps': {
      let source = b.target;
      for (const [a, c] of [...b.swaps].reverse()) source = source === a ? c : source === c ? a : source;
      return b.items[source];
    }
    case 'boundary-edges': {
      let shared = 0;
      for (let row = 0; row < b.size; row++) for (let col = 0; col < b.size; col++) if (b.cells[row * b.size + col]) {
        if (col + 1 < b.size && b.cells[row * b.size + col + 1]) shared++;
        if (row + 1 < b.size && b.cells[(row + 1) * b.size + col]) shared++;
      }
      return 4 * b.cells.filter(Boolean).length - 2 * shared;
    }
    case 'guaranteed-draw': {
      // Enumerate all colour-count combinations that still avoid the goal.
      // The largest achievable such draw, plus one, is the guarantee.
      let worst = 0;
      const visit = (i: number, drawn: number) => {
        if (i === b.counts.length) { worst = Math.max(worst, drawn); return; }
        for (let n = 0; n <= b.counts[i] && n < b.target; n++) visit(i + 1, drawn + n);
      };
      visit(0, 0); return worst + 1;
    }
    case 'cheapest-route': {
      // Subtract each pair's segment weights instead of reusing total sorting.
      const wins = b.routes.flatMap((route, i) => b.routes.every((other, j) => i === j || Array.from({ length: Math.max(route.length, other.length) }, (_, k) => (route[k] || 0) - (other[k] || 0)).reduce((a, n) => a + n, 0) < 0) ? ['ABC'[i]] : []);
      if (wins.length !== 1) throw Error('En kısa yol tek değil.');
      return wins[0];
    }
  }
}
