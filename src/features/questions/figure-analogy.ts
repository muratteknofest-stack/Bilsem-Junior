import { SeededRNG } from '../../lib/rng';
export type Fill = 'empty' | 'solid' | 'hatched';
export interface AnalogyFigure {
  shape: 'circle' | 'square' | 'diamond' | 'pentagon';
  inner: 'circle' | 'diamond' | 'triangle';
  outerFill: Fill; innerFill: Fill; lines: number; half: boolean;
}
export type FigureTask = 'fill_exchange' | 'line_union' | 'half_completion';
export function validFigure(v: unknown): v is AnalogyFigure {
  if (!v || typeof v !== 'object') return false;
  const f=v as AnalogyFigure;
  return Object.keys(f).sort().join(',')==='half,inner,innerFill,lines,outerFill,shape' &&
    ['circle','square','diamond','pentagon'].includes(f.shape) && ['circle','diamond','triangle'].includes(f.inner) &&
    ['empty','solid','hatched'].includes(f.outerFill) && ['empty','solid','hatched'].includes(f.innerFill) &&
    Number.isInteger(f.lines) && f.lines>=0 && f.lines<=15 && typeof f.half==='boolean';
}
export function sameFigure(a:AnalogyFigure,b:AnalogyFigure):boolean {
  return (['shape','inner','outerFill','innerFill','lines','half'] as const).every(k=>a[k]===b[k]);
}
export function figureResult(task:FigureTask,figures:AnalogyFigure[]):AnalogyFigure {
  if (task==='fill_exchange') return {...figures[2],outerFill:figures[2].innerFill,innerFill:figures[2].outerFill};
  if (task==='half_completion') return {...figures[2],half:false};
  return {...figures[3],lines:figures[3].lines | figures[4].lines};
}
export function validateFigureTask(task:FigureTask,fs:AnalogyFigure[]):void {
  if(!['fill_exchange','line_union','half_completion'].includes(task)||!Array.isArray(fs)||fs.length!==(task==='line_union'?5:3)||!fs.every(validFigure))throw Error('Geçersiz şekil analojisi.');
  const [a,b,c]=fs;
  if(task==='fill_exchange') {
    if(a.half||b.half||c.half||fs.some(f=>f.lines!==0)||a.outerFill===a.innerFill||c.outerFill===c.innerFill||!sameFigure({...a,outerFill:a.innerFill,innerFill:a.outerFill},b))throw Error('Dolgu değişimi örneği belirsiz veya tutarsız.');
  } else if(task==='half_completion') {
    if(!a.half||b.half||!c.half||fs.some(f=>f.lines!==0||f.outerFill!=='empty'||f.innerFill!=='empty')||!sameFigure({...a,half:false},b))throw Error('Yarım şekil örneği tutarsız.');
  } else {
    if(fs.some(f=>f.half||f.outerFill!=='empty'||f.innerFill!=='empty')||!sameFigure({...a,lines:b.lines},b)||!sameFigure({...a,lines:c.lines},c)||!sameFigure({...fs[3],lines:fs[4].lines},fs[4]))throw Error('Çizgi birleşimi şekilleri tutarsız.');
    // Union, intersection and XOR must be distinguishable in the example.
    const results=[a.lines|b.lines,a.lines&b.lines,a.lines^b.lines];
    if(new Set(results).size!==3||c.lines!==results[0])throw Error('Örnek tek bir birleştirme kuralı vermiyor.');
  }
}
export function makeFigureTask(seed:number,difficulty:number) {
  const rng=new SeededRNG(seed);
  const task=rng.pick<FigureTask>(difficulty===1?['fill_exchange','half_completion']:['fill_exchange','line_union','half_completion']);
  const shapes=rng.shuffle<AnalogyFigure['shape']>(['circle','square','diamond','pentagon']);
  const base=(shape:AnalogyFigure['shape']):AnalogyFigure=>({shape,inner:rng.pick(['circle','diamond','triangle']),outerFill:'empty',innerFill:'empty',lines:0,half:false});
  let figures:AnalogyFigure[],prompt:string,steps:string[];
  if(task==='fill_exchange') {
    const fills=rng.shuffle<Fill>(difficulty<=2?['empty','solid']:['empty','solid','hatched']);
    const a={...base(shapes[0]),outerFill:fills[0],innerFill:fills[1]},c={...base(shapes[1]),outerFill:fills[1],innerFill:fills[0]};
    figures=[a,{...a,outerFill:a.innerFill,innerFill:a.outerFill},c];
    prompt='Üstteki şeklin iç ve dış bölgelerindeki değişimi incele. Aynı ilişkiyi alttaki şekle uyguladığında hangi sonuç oluşur?';
    steps=['Dış bölge ile iç şeklin dolgusunu ayrı ayrı izle.','İki bölgenin dolguları yer değiştirir; şekiller ve konumları korunur.'];
  } else if(task==='half_completion') {
    const a={...base(shapes[0]),half:true},c={...base(shapes[1]),half:true};
    figures=[a,{...a,half:false},c];
    prompt='Üstteki yarım şeklin tam şekle nasıl dönüştüğünü incele. Aynı dönüşümü alttaki yarım şekle uygula.';
    steps=['Sol yarıyı dikey eksenin sağ tarafına yansıt.','İki yarıyı birleştir ve ortadaki ayırıcı çizgiyi kaldır.'];
  } else {
    const bits=rng.shuffle([1,2,4,8]),common=bits[0],a={...base(shapes[0]),lines:common|bits[1]},b={...a,lines:common|bits[2]};
    const c={...base(shapes[1]),lines:bits[1]|bits[3]},d={...c,lines:bits[0]|bits[3]};
    figures=[a,b,{...a,lines:a.lines|b.lines},c,d];
    prompt='Üstteki iki şekilden üçüncü şeklin nasıl oluştuğunu bul. Aynı çizgi kuralını alttaki iki şekle uygula.';
    steps=['İki şekilde bulunan bütün çizgileri sonuçta koru.','Ortak çizgiyi silme veya iki kez çizme; bütün farklı çizgileri bir araya getir.'];
  }
  validateFigureTask(task,figures);
  const result=figureResult(task,figures), candidates:AnalogyFigure[]=[];
  if(task==='fill_exchange')for(const outerFill of ['empty','solid','hatched'] as Fill[])for(const innerFill of ['empty','solid','hatched'] as Fill[])candidates.push({...result,outerFill,innerFill});
  else if(task==='half_completion')candidates.push({...result,half:true},{...result,lines:1},{...result,shape:shapes.find(s=>s!==result.shape)!});
  else {const a=figures[3].lines,b=figures[4].lines; candidates.push({...result,lines:a&b},{...result,lines:a^b},{...result,lines:a},{...result,lines:b});}
  const extra=rng.shuffle(candidates.filter((f,i)=>!sameFigure(f,result)&&candidates.findIndex(c=>sameFigure(c,f))===i)).slice(0,3).map(figure=>({figure}));
  return {task,figures,prompt,steps,extra};
}
