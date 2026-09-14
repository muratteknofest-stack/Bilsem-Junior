// Pure constraint solvers. They consume displayed givens and candidate content only.
export type Cell = [number, number];
export const sortedCells = (cells: Cell[]) => [...new Set(cells.map(([x,y]) => `${x},${y}`))].sort().join(';');
export const sameCells = (a: Cell[], b: Cell[]) => sortedCells(a) === sortedCells(b);
export const permutations = <T,>(items: T[]): T[][] => items.length ? items.flatMap((x,i) => permutations(items.filter((_,j) => i !== j)).map(rest => [x,...rest])) : [[]];

export function polygonSignature(points: Cell[]): string {
  // Translation/rotation/reflection invariant distance matrix over cyclic vertex orders.
  const variants: string[] = [];
  for (const direction of [points, [...points].reverse()]) for (let offset=0;offset<points.length;offset++) {
    const p = direction.map((_,i) => direction[(i+offset)%points.length]);
    variants.push(p.flatMap(a => p.map(b => (a[0]-b[0])**2+(a[1]-b[1])**2)).join(','));
  }
  return variants.sort()[0];
}
export function netNormals(cells: Cell[]): number[][] {
  const frames = new Map<number, number[][]>([[0, [[1,0,0],[0,1,0],[0,0,1]]]]);
  const queue = [0]; const neg = (a:number[]) => a.map(x=>-x);
  for (let k=0;k<queue.length;k++) {
    const i=queue[k], [u,v,n]=frames.get(i)!;
    cells.forEach(([x,y],j)=>{
      const dx=x-cells[i][0],dy=y-cells[i][1];
      if (Math.abs(dx)+Math.abs(dy)!==1 || frames.has(j)) return;
      const frame = dx===1 ? [neg(n),v,u] : dx===-1 ? [n,v,neg(u)] : dy===1 ? [u,neg(n),v] : [u,n,neg(v)];
      frames.set(j,frame); queue.push(j);
    });
  }
  return cells.map((_,i)=>frames.get(i)?.[2] || []);
}
export function solvePuzzle(task:any, data:any): boolean {
  switch (task.kind) {
    case 'reflection': {
      const expected = task.cells.map(([x,y]:Cell) => task.axis === 'vertical' ? [task.size-1-x,y] : [x,task.size-1-y]);
      return data.size===task.size && sameCells(expected,data.cells);
    }
    case 'silhouette': return data.size===task.size && sameCells(task.cells,data.cells);
    case 'polygon_piece': return polygonSignature(task.pieces[task.missing]) === polygonSignature(data.points);
    case 'union': return data.size===task.size && sameCells(task.parts.flat(),data.cells);
    case 'fold': {
      let holes: Cell[] = task.holes;
      for (const axis of [...task.axes].reverse()) holes = [...holes,...holes.map(([x,y]:Cell):Cell=>axis==='vertical'?[task.size-1-x,y]:[x,task.size-1-y])];
      return data.size===task.size && sameCells(holes,data.cells);
    }
    case 'projection': {
      const h:number[][] = task.heights;
      if (task.view==='count') return Number(data.textNumber)===h.flat().reduce((s,n)=>s+n,0);
      let expected: Cell[]=[];
      if (task.view==='top') h.forEach((row,y)=>row.forEach((n,x)=>{if(n>0) expected.push([x,y]);}));
      else {
        const width=h.length;
        for(let x=0;x<width;x++) {
          const height=task.view==='front'?Math.max(...h.map(row=>row[x])):Math.max(...h[x]);
          for(let y=0;y<height;y++) expected.push([x,width-1-y]);
        }
      }
      return data.size===h.length && sameCells(expected,data.cells);
    }
    case 'boolean_matrix': {
      const op=(a:Cell[],b:Cell[])=>{
        const sa=new Set(a.map(c=>c.join(','))),sb=new Set(b.map(c=>c.join(',')));
        return [...new Set([...sa,...sb])].filter(s=>task.operation==='xor'?sa.has(s)!==sb.has(s):task.operation==='intersection'?sa.has(s)&&sb.has(s):true).sort().join(';');
      };
      if (!task.rows.slice(0,-1).every((r:Cell[][])=>op(r[0],r[1])===sortedCells(r[2]))) return false;
      const row=task.rows[task.rows.length-1];
      return data.size===task.size && op(row[0],row[1])===sortedCells(data.cells);
    }
    case 'assignment': {
      const solutions=permutations(task.items as string[]).filter(p=>task.clues.every((c:any)=>c.op==='is'?p[c.person]===c.item:p[c.person]!==c.item));
      const answers=new Set(solutions.map(p=>p[task.asked]));
      return answers.size===1 && answers.has(data.textOnly);
    }
    case 'ordering': {
      const solutions=permutations(task.names as string[]).filter(p=>task.before.every(([a,b]:string[])=>p.indexOf(a)<p.indexOf(b)));
      const answers=new Set(solutions.map(p=>p[task.askedPosition]));
      return answers.size===1 && answers.has(data.textOnly);
    }
    case 'word_order': {
      const chars=Array.from(task.word as string);
      if(new Set(task.order).size!==chars.length || task.order.some((n:number)=>n<1||n>chars.length)) return false;
      return data.textOnly===task.order.map((n:number)=>chars[n-1]).join('');
    }
    case 'analogy': {
      const first=task.facts.filter((f:any)=>f.from===task.example[0]&&f.to===task.example[1]);
      const relations=new Set(first.map((f:any)=>f.relation));
      const answers=new Set(task.facts.filter((f:any)=>f.from===task.asked&&relations.has(f.relation)).map((f:any)=>f.to));
      return relations.size===1 && answers.size===1 && answers.has(data.textOnly);
    }
    case 'cube_net': {
      const normals=netNormals(task.cells);
      if(normals.some(n=>n.length!==3) || new Set(normals.map(n=>n.join(','))).size!==6) return false;
      const target=normals[task.target];
      const index=normals.findIndex(n=>n.every((v,i)=>v===-target[i]));
      return index>=0 && data.textOnly===task.labels[index];
    }
    default: return false;
  }
}
