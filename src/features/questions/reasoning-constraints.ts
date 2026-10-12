/** Solve displayed constraints, independently of seeds and answer labels. */
export function solveLinearClues(equations: number[][]): number[] {
  const n = equations.length, rows = equations.map(row => [...row]);
  for (let col = 0; col < n; col++) {
    const pivot = rows.findIndex((r, i) => i >= col && Math.abs(r[col]) > 1e-9);
    if (pivot < 0) throw Error('Denklemler tek bir çözüm belirlemiyor.');
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col]; rows[col] = rows[col].map(v => v / divisor);
    for (let r = 0; r < n; r++) if (r !== col) {
      const factor = rows[r][col]; rows[r] = rows[r].map((v, c) => v - factor * rows[col][c]);
    }
  }
  const values = rows.map(r => Math.round(r[n]));
  if (values.some(v => v < 1 || v > 12) || equations.some(row => row.slice(0, n).reduce((sum, c, i) => sum + c * values[i], 0) !== row[n])) throw Error('Şekiller için 1–12 aralığında tam sayılı çözüm yok.');
  return values;
}

export function completeLatinSquare(cells: number[], size: number): number[] {
  const grid = [...cells], solutions: number[][] = [];
  const candidates = (i: number) => Array.from({length:size}, (_, n) => n + 1).filter(n =>
    !grid.slice(Math.floor(i / size) * size, (Math.floor(i / size) + 1) * size).includes(n) &&
    !grid.some((v, j) => j % size === i % size && v === n));
  for (let i = 0; i < size; i++) {
    for (const line of [grid.slice(i * size, (i + 1) * size), grid.filter((_, j) => j % size === i)]) {
      const givens = line.filter(Boolean);
      if (new Set(givens).size !== givens.length) throw Error('Latin karesinde tekrarlanan verilen var.');
    }
  }
  const visit = () => {
    if (solutions.length > 1) return;
    let chosen = -1, options: number[] = [];
    for (let i = 0; i < grid.length; i++) if (!grid[i]) {
      const available = candidates(i);
      if (!available.length) return;
      if (chosen < 0 || available.length < options.length) { chosen = i; options = available; }
    }
    if (chosen < 0) { solutions.push([...grid]); return; }
    for (const n of options) { grid[chosen] = n; visit(); }
    grid[chosen] = 0;
  };
  visit();
  if (solutions.length !== 1) throw Error('Latin karesi tam olarak bir tamamlanışa sahip olmalı.');
  return solutions[0];
}
