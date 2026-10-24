export type ProjectionView = 'FRONT' | 'RIGHT' | 'TOP';
export type Voxel = readonly [number, number, number];
export type Matrix = number[][];
export interface ProjectionOption { id: string; matrix: Matrix }
export interface SpatialProjectionTask {
  seed: number; gridSize: number; voxels: Voxel[]; view: ProjectionView;
  options: ProjectionOption[]; correctOptionId: string;
}
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function projection(voxels: readonly Voxel[], size: number, view: ProjectionView): Matrix {
  const matrix = Array.from({ length: size }, () => Array<number>(size).fill(0));
  for (const [x,y,z] of voxels) {
    if (![x,y,z].every(v => Number.isInteger(v) && v >= 0 && v < size)) throw Error('Invalid voxel');
    const row = view === 'TOP' ? z : size - 1 - y;
    const col = view === 'RIGHT' ? size - 1 - z : x;
    matrix[row][col] = 1;
  }
  return matrix;
}
export const matrixKey = (matrix: Matrix): string => matrix.map(row => row.join('')).join('|');
export function connected(voxels: readonly Voxel[]): boolean {
  if (!voxels.length) return false;
  const keys = new Set(voxels.map(v => v.join(',')));
  if (keys.size !== voxels.length) return false;
  const seen = new Set<string>(), queue: Voxel[] = [voxels[0]];
  const dirs: Voxel[] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  while (queue.length) {
    const v = queue.shift()!, key = v.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    for (const d of dirs) {
      const next: Voxel = [v[0]+d[0],v[1]+d[1],v[2]+d[2]];
      if (keys.has(next.join(',')) && !seen.has(next.join(','))) queue.push(next);
    }
  }
  return seen.size === keys.size;
}
export function generateSpatialProjection(seed: number, difficulty = 1): SpatialProjectionTask {
  const rng = random(seed);
  const size = difficulty >= 4 ? 4 : 3;
  const count = Math.min(size ** 3, 5 + Math.max(1,Math.min(6,Math.floor(difficulty))) * 2);
  const center = Math.floor(size / 2);
  const voxels: Voxel[] = [[center,center,center]];
  const used = new Set([voxels[0].join(',')]);
  const dirs: Voxel[] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  while (voxels.length < count) {
    const candidates: Voxel[] = [];
    for (const v of voxels) for (const d of dirs) {
      const n: Voxel = [v[0]+d[0],v[1]+d[1],v[2]+d[2]];
      if (n.every(c => c >= 0 && c < size) && !used.has(n.join(','))) candidates.push(n);
    }
    const next = candidates[Math.floor(rng()*candidates.length)];
    used.add(next.join(',')); voxels.push(next);
  }
  const views: ProjectionView[] = ['FRONT','RIGHT','TOP'];
  const view = views[Math.floor(rng()*views.length)];
  const correct = projection(voxels,size,view);
  const options: ProjectionOption[] = [{id:'A',matrix:correct}];
  const seen = new Set([matrixKey(correct)]);
  for (let attempt=0;options.length<4 && attempt<1000;attempt++) {
    const candidate = correct.map(row=>row.slice());
    const edits = 1 + Math.floor(rng()*Math.min(3,size));
    for (let j=0;j<edits;j++) {
      const r=Math.floor(rng()*size),c=Math.floor(rng()*size);
      candidate[r][c] ^= 1;
    }
    const key=matrixKey(candidate);
    if (candidate.flat().some(Boolean) && !seen.has(key)) {
      seen.add(key);options.push({id:'ABCD'[options.length],matrix:candidate});
    }
  }
  if(options.length!==4) throw Error('Cannot generate four unique options');
  for(let i=options.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [options[i],options[j]]=[options[j],options[i]];
  }
  return {seed,gridSize:size,voxels,view,options,correctOptionId:options.find(o=>matrixKey(o.matrix)===matrixKey(correct))!.id};
}
export function verifySpatialProjection(task: SpatialProjectionTask): boolean {
  if(!connected(task.voxels)||task.options.length!==4) return false;
  const keys=task.options.map(o=>matrixKey(o.matrix));
  if(new Set(keys).size!==4) return false;
  if(task.options.some(o=>o.matrix.length!==task.gridSize||o.matrix.some(row=>row.length!==task.gridSize||row.some(n=>n!==0&&n!==1))))return false;
  return task.options.filter(o=>matrixKey(o.matrix)===matrixKey(projection(task.voxels,task.gridSize,task.view))).length===1
    && task.options.find(o=>o.id===task.correctOptionId)?.matrix !== undefined
    && matrixKey(task.options.find(o=>o.id===task.correctOptionId)!.matrix)===matrixKey(projection(task.voxels,task.gridSize,task.view));
}
