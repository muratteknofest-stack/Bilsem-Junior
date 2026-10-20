import type { Board, Tile } from './professional-engine';

// Deliberately does not import solveBoard, transformTile or generator helpers.
// A second implementation catches errors shared by generation and its own solver.
export function independentlySolveBoard(b: Board): Tile | { textNumber: number | string } {
  if (b.kind === 'symmetry') {
    const t = b.tiles![0]!, cells = [...t.cells];
    for (let row = 0; row < t.size; row++) for (let col = 0; col < Math.floor(t.size / 2); col++) cells[row * t.size + t.size - col - 1] = t.cells[row * t.size + col];
    return { size: t.size, cells };
  }
  if (b.kind === 'overlay') {
    const a = b.tiles![0]!, c = b.tiles![1]!;
    return { size: a.size, cells: a.cells.map((v, i) => Math.min(1, v + c.cells[i])) };
  }
  if (b.kind === 'pyramid') {
    // Pascal weights independently evaluate the top without building intermediate rows.
    const base = b.base!, n = base.length - 1;
    let coefficient = 1, sum = 0;
    for (let i = 0; i <= n; i++) { sum += coefficient * base[i]; coefficient = coefficient * (n - i) / (i + 1); }
    return { textNumber: sum };
  }
  if (b.kind === 'path') {
    const delta = { up: -b.gridSize!, down: b.gridSize!, left: -1, right: 1 };
    let cell = b.start![0] * b.gridSize! + b.start![1];
    for (const m of b.moves!) {
      const next = cell + delta[m];
      if (next < 0 || next >= b.gridSize! ** 2 || (m === 'left' || m === 'right') && Math.floor(next / b.gridSize!) !== Math.floor(cell / b.gridSize!)) throw new Error('Rota sınırları geçersiz.');
      cell = next;
    }
    return { textNumber: `${Math.floor(cell / b.gridSize!) + 1}. satır, ${cell % b.gridSize! + 1}. sütun` };
  }
  const same = (a: Tile, c: Tile) => a.size === c.size && a.cells.every((v, i) => v === c.cells[i]);
  const move = (tile: Tile, operation: string, turns: number): Tile => {
    const n = tile.size;
    const cells = Array.from({ length: n * n }, (_, i) => {
      let row = Math.floor(i / n), col = i % n;
      if (operation === 'mirrorX') col = n - 1 - col;
      else if (operation === 'mirrorY') row = n - 1 - row;
      else for (let t = 0; t < turns; t++) [row, col] = [n - 1 - col, row];
      return tile.cells[row * n + col];
    });
    return { size: n, cells };
  };
  if (b.kind === 'transform') {
    const tiles = b.tiles!.slice(0, -1) as Tile[];
    const op = b.operation!;
    const turns = b.turns || 1;
    if(b.transformSteps){
      if(b.transformSteps.length!==2)throw Error('Bağımsız sıralı işlem denetimi başarısız.');
      const apply=(tile:Tile)=>b.transformSteps!.reduce((t,s)=>move(t,s.operation,s.turns),tile);
      if(tiles.length===3&&!same(apply(tiles[0]),tiles[1]))throw Error('Bağımsız iki adımlı örnek uyuşmuyor.');
      return apply(tiles.at(-1)!);
    }
    if (tiles.length === 3) {
      const candidates = op === 'rotate' ? [1, 2, 3] : [1];
      const valid = candidates.filter(t => same(move(tiles[0], op, t), tiles[1]) &&
        (!b.sequence || same(move(tiles[1], op, t), tiles[2])));
      if (valid.length !== 1 || (op === 'rotate' && valid[0] !== turns)) throw new Error('Bağımsız dönüşüm kuralı tekil değil.');
    }
    return move(tiles.at(-1)!, op, turns);
  }
  if (b.kind === 'matrix') {
    const t = b.tiles as Tile[];
    const combine = (a: Tile, c: Tile, op: string): Tile => ({ size: a.size,
      cells: a.cells.map((v, i) => Number(op === 'union' ? v === 1 || c.cells[i] === 1 :
        op === 'intersection' ? v === 1 && c.cells[i] === 1 : v !== c.cells[i])) });
    const rules = ['union', 'intersection', 'exclusive'].filter(op =>
      same(combine(t[0], t[1], op), t[2]) && same(combine(t[3], t[4], op), t[5]));
    if(b.matrixMode==='combine-rotate'){
      const candidates=['union','intersection','exclusive'].flatMap(op=>[1,2,3].map(turn=>({op,turn}))).filter(({op,turn})=>same(move(combine(t[0],t[1],op),'rotate',turn),t[2])&&same(move(combine(t[3],t[4],op),'rotate',turn),t[5]));
      if(candidates.length!==1)throw Error('Bağımsız çift matris kuralı tekil değil.');
      return move(combine(t[6],t[7],candidates[0].op),'rotate',candidates[0].turn);
    }
    if (rules.length !== 1) throw new Error('Bağımsız matris çözümü tekil değil.');
    return combine(t[6], t[7], rules[0]);
  }
  if (b.kind === 'numbers') {
    const v = b.values!, d = v.slice(1).map((n, i) => n - v[i]);
    if(b.rule==='multiply-add'){
      const additions=[1,3,5].map(i=>v[i]-v[i-1]),factors=[2,4].map(i=>v[i]/v[i-1]);
      if(v.length!==6||new Set(additions).size!==1||new Set(factors).size!==1||!Number.isInteger(factors[0])||factors[0]<2||!additions[0])throw Error('Bağımsız dönüşümlü işlem denetimi başarısız.');
      return {textNumber:v[5]*factors[0]};
    }
    if(b.rule==='interleaved-growing'){
      if(v.length!==8)throw Error('Bağımsız iç içe artış için örnekler eksik.');
      const gap=(i:number)=>v[i]-v[i-2], second=gap(4)-gap(2);
      if(second<=0||gap(6)-gap(4)!==second||gap(3)!==gap(5)||gap(5)!==gap(7))throw Error('Bağımsız değişen aralıklar tutarsız.');
      return {textNumber:2*v[6]-v[4]+second};
    }
    if (b.rule === 'interleaved') {
      // Verify constant two-position gaps instead of splitting into two arrays.
      if (v.length !== 6 || [2, 3].some(i => v[i + 2] - v[i] !== v[i] - v[i - 2])) throw new Error('Bağımsız iç içe örüntü denetimi başarısız.');
      return { textNumber: 2 * v[4] - v[2] };
    }
    const predictions: number[] = [];
    if (d.every(x => x === d[0])) predictions.push(v.at(-1)! + d[0]);
    if (d.every((x, i) => x === d[0] + i * (d[1] - d[0]))) predictions.push(v.at(-1)! + d.at(-1)! + d[1] - d[0]);
    if (d.every((x, i) => x === d[i % 2])) predictions.push(v.at(-1)! + d[d.length % 2]);
    const unique = [...new Set(predictions)];
    if (unique.length !== 1) throw new Error('Sayı örüntüsünde tutarsız veya birden çok sonuç var.');
    return { textNumber: unique[0] };
  }
  if (b.kind === 'machine') {
    const examples = b.examples!;
    const [x, y] = examples.at(-1)!;
    const other = examples.find(p => p[0] !== x);
    if (!other) throw new Error('İşlem kuralı için farklı girdiler gerekli.');
    const slope = (y - other[1]) / (x - other[0]);
    if (!examples.every(p => y + (p[0] - x) * slope === p[1])) throw new Error('İşlem örnekleri çelişiyor.');
    if(b.machineQuery==='input'){
      const answer=x+(b.input!-y)/slope;
      if(!slope||!Number.isSafeInteger(answer)||answer<0)throw Error('Bağımsız ters işlem tekil değil.');
      return {textNumber:answer};
    }
    return { textNumber: y + (b.input! - x) * slope };
  }
  if (b.kind === 'symbols') {
    let sum = 0;
    for (const symbol of b.symbols!) {
      const keys = b.key!.filter(k => k.symbol === symbol);
      if (keys.length !== 1) throw new Error('Sembolün tek bir değeri olmalı.');
      sum += keys[0].value;
    }
    return { textNumber: sum };
  }
  if (b.kind === 'count') {
    let count = 0;
    for (let i=0;i<b.items!.length;i++) {
      const columns=b.columns||6,row=Math.floor(i/columns)+1,col=i%columns+1,rows=b.items!.length/columns;
      const edge=[1,rows].includes(row)||[1,columns].includes(col);
      const eligible=!b.countScope||b.countScope==='border'&&edge||b.countScope==='inside'&&!edge||b.countScope==='oddRows'&&row%2===1||b.countScope==='evenRows'&&row%2===0;
      if (b.items![i] === b.target&&eligible) count++;
    }
    return { textNumber: count };
  }
  if (b.kind === 'order') {
    if(b.constraints) {
      // Assign positions to people, independently of the primary permutation solver.
      const names=b.names!,assigned=new Map<string,number>(),solutions:string[]=[];
      const visit=(i:number)=>{
        if(solutions.length>1)return;
        if(i===names.length){solutions.push(names.find(n=>assigned.get(n)===b.position)!);return;}
        const name=names[i];
        for(let pos=1;pos<=names.length;pos++) {
          if([...assigned.values()].includes(pos))continue;
          assigned.set(name,pos);
          const valid=b.constraints!.every(c=>{
            if(c.kind==='position')return !assigned.has(c.name)||assigned.get(c.name)===c.position;
            const a=assigned.get(c.left),z=assigned.get(c.right);
            return a===undefined||z===undefined||(c.kind==='before'?a<z:c.kind==='notAdjacent'?Math.abs(z-a)!==1:z-a===c.distance);
          })&&(b.clues||[]).every(([a,z])=>!assigned.has(a)||!assigned.has(z)||assigned.get(z)===assigned.get(a)!+1);
          if(valid)visit(i+1);
          assigned.delete(name);
        }
      };visit(0);
      if(solutions.length!==1||!solutions[0])throw Error('Bağımsız konum kısıtları tek sıra vermiyor.');
      return {textNumber:solutions[0]};
    }
    // Solve relative positions as constraints, independently of permutation search.
    const positions = new Map<string, number>([[b.names![0], 0]]);
    for (let pass = 0; pass < b.names!.length; pass++) for (const [a, c] of b.clues!) {
      if (positions.has(a) && !positions.has(c)) positions.set(c, positions.get(a)! + 1);
      if (positions.has(c) && !positions.has(a)) positions.set(a, positions.get(c)! - 1);
      if (positions.has(a) && positions.has(c) && positions.get(c)! !== positions.get(a)! + 1) throw new Error('Sıralama çelişkili.');
    }
    const values = [...positions.values()];
    if (positions.size !== b.names!.length || new Set(values).size !== values.length || Math.max(...values) - Math.min(...values) !== values.length - 1) throw new Error('Sıralama bağımsız olarak kanıtlanamadı.');
    const name = [...positions].find(([, pos]) => pos === Math.min(...values) + b.position! - 1)?.[0];
    if (!name) throw new Error('Hedef konum geçersiz.');
    return { textNumber: name };
  }
  throw new Error('Bu soru için bağımsız çözücü yok.');
}
