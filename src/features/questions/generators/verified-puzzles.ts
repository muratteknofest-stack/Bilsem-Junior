import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { puzzlePrompt } from '../puzzle-contract';
import type { Cell } from '../solvers/puzzle';

export const REBUILT_TYPES: QuestionType[] = ['mirror_reflection','symmetry_completion','figure_completion','tangram_puzzle','shape_combination','shadow_matching','paper_folding','punch_folding','multiview_perspective','raven_matrix','logic_grid','story_logic','verbal_analogy','word_scramble_logic','dice_unfold','spatial_origami','top_view','cube_counting'];
export function generateVerifiedPuzzle(type:QuestionType, seed:number, difficulty:DifficultyLevel):BaseQuestion {
  const rng=new SeededRNG(seed);
  const n=difficulty<=3?4:5;
  const all:Cell[]=Array.from({length:n*n},(_,i)=>[i%n,Math.floor(i/n)]);
  const randomCells=()=>rng.pickUnique(all,Math.min(n*n-3,3+difficulty));
  let task:any, answer:any, wrong:any[]=[], steps:string[]=[];
  const board=(cells:Cell[],size=n)=>({cells,size});
  const variants=(cells:Cell[],size=n)=>{
    return [0,1,2].map(i=>{
      const c:Cell=[i%size,Math.floor(i/size)];
      const present=cells.some(p=>p[0]===c[0]&&p[1]===c[1]);
      return board(present?cells.filter(p=>p[0]!==c[0]||p[1]!==c[1]):[...cells,c],size);
    });
  };
  if(type==='mirror_reflection'||type==='symmetry_completion') {
    const axis=rng.pick(['vertical','horizontal']); const cells=randomCells();
    task={kind:'reflection',size:n,axis,cells};
    const result=cells.map(([x,y]):Cell=>axis==='vertical'?[n-1-x,y]:[x,n-1-y]);
    answer=board(result); wrong=variants(result);
    steps=['Eksene olan kare uzaklıklarını belirle.','Dikey eksende sağ-sol, yatay eksende üst-alt konumları yer değiştirir.','Her dolu kareyi aynı uzaklıkta karşı tarafa taşı.'];
  } else if(type==='figure_completion'||type==='tangram_puzzle') {
    // A true seven-piece tangram dissection of an 8×8 square.
    const pieces:Cell[][]=[[[0,0],[8,0],[4,4]],[[0,0],[4,4],[0,8]],[[8,4],[8,8],[4,8]],[[4,4],[6,2],[6,6]],[[0,8],[2,6],[4,8]],[[4,4],[6,6],[4,8],[2,6]],[[8,0],[8,4],[6,6],[6,2]]];
    const missing=rng.pick([0,2,3,5,6]);
    task={kind:'polygon_piece',pieces,missing,size:8};
    const local=(p:Cell[])=>{const x=Math.min(...p.map(c=>c[0])),y=Math.min(...p.map(c=>c[1]));return p.map(([a,b]):Cell=>[a-x,b-y]);};
    answer={points:local(pieces[missing]),size:8};
    wrong=rng.shuffle([0,2,3,5,6].filter(i=>i!==missing)).slice(0,3).map(i=>({points:local(pieces[i]),size:8}));
    steps=['Boşluğun köşelerini ve kenar uzunluklarını incele.','Seçenekler aynı ölçekte çizilmiştir; yalnızca döndürme veya taşıma yap.','Açıları ve tüm kenar uzunlukları eşleşen parça boşluğu doldurur.'];
  } else if(type==='shape_combination'||type==='shadow_matching') {
    const cells=randomCells();
    task=type==='shadow_matching'?{kind:'silhouette',size:n,cells,colors:cells.map(()=>rng.pick(['#2563eb','#dc2626','#059669']))}:{kind:'union',size:n,parts:[cells.filter((_,i)=>i%2===0),cells.filter((_,i)=>i%2===1)]};
    answer=board(cells);wrong=variants(cells);
    steps=['Karelerin ızgara üzerindeki konumlarını sabit tut.','Renk veya parça ayrımından bağımsız olarak dolu alanları bir araya getir.','Boş ve dolu karelerin tamamını karşılaştır.'];
  } else if(type==='paper_folding'||type==='punch_folding') {
    const size=8; const axes=type==='paper_folding'||difficulty<=2?[rng.pick(['vertical','horizontal'])]:['vertical','horizontal'];
    const x=axes.includes('vertical')?rng.nextInt(4,6):rng.nextInt(1,6), y=axes.includes('horizontal')?rng.nextInt(4,6):rng.nextInt(1,6);
    task={kind:'fold',size,axes,holes:[[x,y]]};
    const xs=axes.includes('vertical')?[x,7-x]:[x],ys=axes.includes('horizontal')?[y,7-y]:[y];
    const cells=xs.flatMap(a=>ys.map((b):Cell=>[a,b]));
    answer=board(cells,size);wrong=variants(cells,size);
    steps=['Katlama sırasını izle; delik son katlanmış bölgededir.','Kağıdı ters sırayla açarken her deliği katlama eksenine göre yansıt.',`Açılmış kağıtta ${cells.length} farklı delik oluşur.`];
  } else if(['multiview_perspective','top_view','cube_counting'].includes(type)) {
    const size=difficulty<=3?3:4;
    const heights=Array.from({length:size},()=>Array.from({length:size},()=>rng.nextInt(0,size)));
    heights[0][0]=rng.nextInt(1,size);
    const view=type==='top_view'?'top':type==='cube_counting'?'count':rng.pick(['front','right','top']);
    task={kind:'projection',heights,view};
    if(view==='count') {
      const total=heights.flat().reduce((a,b)=>a+b,0);
      answer={textNumber:total};wrong=[total-1,total+1,total+size].map(textNumber=>({textNumber}));
    } else {
      let cells:Cell[]=[];
      if(view==='top') heights.forEach((row,y)=>row.forEach((h,x)=>{if(h)cells.push([x,y]);}));
      else for(let i=0;i<size;i++) {
        let h=0;for(let j=0;j<size;j++)h=Math.max(h,view==='front'?heights[j][i]:heights[i][j]);
        for(let k=0;k<h;k++)cells.push([i,size-1-k]);
      }
      answer=board(cells,size);wrong=variants(cells,size);
    }
    steps=view==='count'?['Her karedeki sayıyı küp adedi olarak oku.','Sıfır yazan konumlar boştur.',`Bütün yüksekliklerin toplamı ${answer.textNumber} küptür.`]:['Okla belirtilen bakış yönünü bul.','Üstten görünüşte sıfırdan büyük konumlar doludur; yandan bakışta her hat üzerindeki en büyük yükseklik görünür.','Hesapladığın dolu kareleri seçeneklerle karşılaştır.'];
  } else if(type==='raven_matrix') {
    const size=3; const cells:Cell[]=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]);
    const operation=rng.pick(difficulty<=2?['union']:['xor','union','intersection']);
    const rows:any[]=Array.from({length:3},()=>{
      const a=rng.pickUnique(cells,rng.nextInt(2,5)),b=rng.pickUnique(cells,rng.nextInt(2,5));
      const out=cells.filter(c=>{const x=a.includes(c),y=b.includes(c);return operation==='xor'?x!==y:operation==='intersection'?x&&y:x||y;});
      return [a,b,out];
    });
    answer=board(rows[2][2],size);wrong=variants(rows[2][2],size);
    rows[2][2]=null;task={kind:'boolean_matrix',size,operation,rows};
    steps=['İlk iki satırda dolu karelerin nasıl birleştiğini doğrula.','Yönergede belirtilen işlemi son satırın her karesine uygula.','Ortaya çıkan desenle tüm konumları eşleşen seçeneği bul.'];
  } else if(type==='logic_grid') {
    const names=rng.pickUnique(['Ece','Ada','Can','Deniz','Ali','Efe'],4),items=rng.shuffle(['Keman','Flüt','Piyano','Gitar']);
    const matched=rng.shuffle(items);
    const clues:any[]=[{person:0,op:'is',item:matched[0]}];
    // Nested exclusions and all-different jointly give exactly one full assignment.
    for(let i=1;i<3;i++)for(let j=i+1;j<4;j++)clues.push({person:i,op:'not',item:matched[j]});
    const asked=rng.nextInt(1,3);
    task={kind:'assignment',names,items,clues:rng.shuffle(clues),asked};
    answer={textOnly:matched[asked]};wrong=items.filter(i=>i!==matched[asked]).map(textOnly=>({textOnly}));
    steps=['Kesin eşleşmeyi tabloya yerleştir.','Her nesne yalnızca bir kişiye aittir; olumsuz ipuçlarını ele.','Bütün ipuçlarını birlikte sağlayan eşleşmeleri kontrol et.'];
  } else if(type==='story_logic') {
    const names=rng.pickUnique(['Ece','Ada','Can','Deniz','Ali','Efe','Selin'],4),order=rng.shuffle(names);
    const before=rng.shuffle(order.slice(0,-1).map((x,i)=>[x,order[i+1]]));
    const askedPosition=rng.pick([0,3]);task={kind:'ordering',names,before,askedPosition};
    answer={textOnly:order[askedPosition]};wrong=names.filter(x=>x!==answer.textOnly).map(textOnly=>({textOnly}));
    steps=['Her ipucunu önce-sonra ilişkisi olarak yaz.','İlişkileri tek bir sıralamada birleştir.',`Sıralama: ${order.join(' → ')}.`];
  } else if(type==='verbal_analogy') {
    const sets=[[['Kuş','yuvası','Yuva'],['Arı','yuvası','Kovan'],['Arı','ürünü','Bal'],['Kuş','ürünü','Yumurta']],[['Gemi','kullanan kişi','Kaptan'],['Uçak','kullanan kişi','Pilot'],['Uçak','indiği yer','Havaalanı'],['Gemi','indiği yer','Liman']],[['Göz','işlevi','Görmek'],['Kulak','işlevi','Duymak'],['Kulak','algıladığı','Ses'],['Göz','algıladığı','Işık']]];
    const facts=rng.pick(sets).map(([from,relation,to])=>({from,relation,to}));
    const target=rng.pick([1,3]),example=facts[target-1];task={kind:'analogy',facts:rng.shuffle(facts),example:[example.from,example.to],asked:facts[target].from};
    answer={textOnly:facts[target].to};wrong=facts.filter((_,i)=>i!==target).map(f=>({textOnly:f.to}));
    steps=[`${example.from} → ${example.to} için ilişki: ${example.relation}.`,'Aynı ilişkiyi üçüncü sözcüğün bilgi satırlarına uygula.',`Sonuç: ${answer.textOnly}.`];
  } else if(type==='word_scramble_logic') {
    const word=rng.pick(['KALEM','KİTAP','DENİZ','GÜNEŞ','ORMAN','BULUT','ÇİLEK']);
    const order=rng.shuffle([1,2,3,4,5]);
    task={kind:'word_order',word,order};const chars=Array.from(word);
    answer={textOnly:order.map(i=>chars[i-1]).join('')};
    wrong=[0,1,2].map(i=>{const a=Array.from(answer.textOnly as string);[a[i],a[i+1]]=[a[i+1],a[i]];return {textOnly:a.join('')};});
    steps=['Harflerin altındaki başlangıç sıra numaralarını oku.',`Harfleri ${order.join(' → ')} sırasına yerleştir.`,`Sonuç: ${answer.textOnly}.`];
  } else if(type==='dice_unfold'||type==='spatial_origami') {
    const cells:Cell[]=[[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]];
    const labels=rng.shuffle(type==='dice_unfold'?['1','2','3','4','5','6']:['★','●','▲','■','◆','♥']);
    const target=rng.nextInt(0,5),opposite=[4,3,5,1,0,2][target];
    task={kind:'cube_net',cells,labels,target};answer={textOnly:labels[opposite]};wrong=rng.shuffle(labels.filter((_,i)=>i!==target&&i!==opposite)).slice(0,3).map(textOnly=>({textOnly}));
    steps=['Ortadaki yüzü sabit tutup komşu yüzleri 90° katla.','Hedef yüzle aynı doğrultuda ters yöne bakan yüzü bul.',`Karşı yüz: ${answer.textOnly}.`];
  } else throw new Error('Desteklenmeyen yeniden kurulan soru tipi.');
  let correctOptionId='A';
  const options=rng.shuffle([{value:answer,correct:true},...wrong.map(value=>({value,correct:false}))]).map((o,i)=>{
    const id='ABCD'[i];if(o.correct)correctOptionId=id;
    return {id,label:id,visualData:o.value,fingerprint:JSON.stringify(o.value)};
  });
  const category=['raven_matrix'].includes(type)?'matrix':['logic_grid','story_logic','verbal_analogy','word_scramble_logic'].includes(type)?'logic':type==='cube_counting'?'attention':['figure_completion','tangram_puzzle','shape_combination','shadow_matching'].includes(type)?'visual_perception':'spatial';
  return {id:`${type}-${seed}`,version:3,type,category,difficulty,seed,ageGroup:'all',estimatedSeconds:25+difficulty*5,skills:['Kural Uygulama','Mantıksal Doğrulama'],prompt:puzzlePrompt(type,task),visualConfig:{displayMode:'verified_puzzle',task},options,correctOptionId,explanation:{ruleTitle:'Adım Adım Çözüm',summary:steps.join(' '),steps}};
}
