import { completeLatinSquare } from './reasoning-constraints';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { generateVisualFingerprint as fingerprint } from './fingerprint';
import type { Tile } from './professional-engine';
import { TOPIC_CATEGORY, WORKSHOP_TYPES } from './topic-catalog';
import { VISUAL_SYMBOL_IDS, type VisualSymbol } from './visual-vocabulary';
import { independentlyMatchesWorkshop } from './workshop-independent-solver';
import { solveWorkshopBoard, transformed, TANGRAM_POLYGONS, POLYGON_SYMBOLS, WORKSHOP_ENGINE_VERSION, type WorkshopBoard, type WorkshopValue } from './workshop-mechanics';

const same=(a:unknown,b:unknown)=>fingerprint(a)===fingerprint(b);
const words=['TOP','KUM','ARI','KALEM','KİTAP','MASA','ELMA','OKUL','BALIK','KAPI','ORMAN'];
const relations:[string,string][]=[['kuş','yuva'],['arı','kovan'],['köpek','kulübe'],['at','ahır'],['tavuk','kümes'],['karınca','karınca yuvası']];
export function generateWorkshopQuestion(type:QuestionType,seed:number,difficulty:DifficultyLevel):BaseQuestion {
  if(!WORKSHOP_TYPES.includes(type)||!Number.isSafeInteger(seed)||seed<1||!Number.isInteger(difficulty)||difficulty<1||difficulty>6)throw Error('INVALID_WORKSHOP_INPUT: Konu, tohum veya zorluk geçersiz.');
  const rng=new SeededRNG(seed),size=difficulty<=3?3:4;
  let b:WorkshopBoard={displayMode:'workshop_board',kind:type}, prompt='',steps:string[]=[],extra:WorkshopValue[]=[];
  const tile=():Tile=>{const cells=Array.from({length:size**2},()=>Number(rng.nextBool(.45)));cells[0]=1;cells[1]=0;return {size,cells};};
  switch(type) {
    case 'odd_one_out': b.symbols=rng.shuffle([...rng.shuffle(POLYGON_SYMBOLS).slice(0,3),rng.pick(['●','♥','☾'] as VisualSymbol[])]);prompt='Üç şekil köşelidir. Köşesi olmayan farklı şekli seç.';steps=['Şekillerin düz kenarlarını ve köşelerini incele.','Köşesi olmayan şekil diğer üçünden farklıdır.'];extra=b.symbols.map(symbol=>({symbol}));break;
    case 'classification': b.reference=rng.shuffle(POLYGON_SYMBOLS).slice(0,3);prompt='Örnek gruptaki şekiller köşelidir. Bu gruba hangi şekil eklenebilir?';steps=['Örneklerin ortak özelliği köşeli olmalarıdır.','Seçenekler arasında köşesi olan tek şekli gruba ekle.'];extra=[{symbol:rng.pick(POLYGON_SYMBOLS)},...(['●','♥','☾'] as VisualSymbol[]).map(symbol=>({symbol}))];break;
    case 'figure_completion': {const whole=tile(),partial=structuredClone(whole);partial.cells=partial.cells.map((v,i)=>i%size<size-1?v:0);whole.cells[size-1]=1;partial.cells[size-1]=0;b.tiles=[whole,partial];prompt='Tam desenden sağdaki parça çıkarılıyor. Çıkarılan parçada kalan dolu hücreler hangisidir?';steps=['Tam desen ile elde kalan parçayı aynı hücrelerde karşılaştır.','Tam desende dolu, parçada boş olan hücreler çıkarılan parçayı oluşturur.'];break;}
    case 'shadow_matching': b.tiles=[tile()];prompt='Renkleri yok say. Deseni döndürmeden aynı dolu hücrelere sahip gölgeyi seç.';steps=['Dolu hücrelerin satır ve sütunlarını incele.','Gölge eşleştirmede konumlar değişmez; yalnızca renkler yok sayılır.'];break;
    case 'visual_memory': b.tiles=[tile()];prompt='Deseni incele. Hazır olduğunda gizle ve aynı deseni belleğinden seç.';steps=['Desendeki dolu hücrelerin konumlarını aklında tut.','Desen gizlendikten sonra konumları seçeneklerle karşılaştır.'];break;
    case 'visual_analogy': {let a=tile();for(let attempt=0;new Set(Array.from({length:8},(_,v)=>fingerprint(transformed(a,v)))).size!==8;attempt++){if(attempt>100)throw Error('Asimetrik örnek üretilemedi.');a=tile();}const rule=rng.nextInt(1,7);b.tiles=[a,transformed(a,rule),tile()];prompt='A deseni B’ye dönüştürülmüş. Aynı döndürme veya yansıtmayı C’ye uygularsan hangi desen oluşur?';steps=['A ve B’yi karşılaştır; döndürme ve yansıtmalar arasından tek uygun dönüşümü bul.','Bu dönüşümü C’nin her hücresine aynı şekilde uygula.'];break;}
    case 'spatial_relationship': b.size=3;b.symbols=rng.shuffle(VISUAL_SYMBOL_IDS).slice(0,9);b.index=rng.nextInt(3,8);prompt='İşaretli hücrenin hemen üstündeki hücrede hangi şekil var?';steps=['İşaretli hücrenin sütununu değiştirme.','Bir satır yukarıdaki hücrede bulunan şekli seç.'];extra=rng.shuffle(b.symbols).slice(0,4).map(symbol=>({symbol}));break;
    case 'visual_attention': b.reference=rng.shuffle(VISUAL_SYMBOL_IDS).slice(0,2);b.symbols=Array.from({length:Math.min(16,6+difficulty)},()=>rng.pick(b.reference!));prompt='Şerit soldan sağa okunuyor. Hedef iki şekil yan yana ve aynı sırayla kaç kez var?';steps=['Şeritteki her komşu şekil çiftini hedef çiftle karşılaştır.','İki şeklin de aynı sırada eşleştiği çiftleri say; örtüşen çiftler de sayılır.'];break;
    case 'logical_sequence': {const timeline=['Hazırlık','Ekim','Sulama','Filizlenme'];b.labels=rng.shuffle(timeline);b.order=b.labels.map(label=>timeline.indexOf(label)+1);b.position=rng.nextInt(0,3);prompt=`Olaylar sıra numaralarıyla verilmiş. Zaman çizelgesinde ${b.position+1}. olay hangisidir?`;steps=['Olay kartlarını yanlarındaki sıra numaralarına göre sırala.','İstenen sıradaki olayın adını seç.'];extra=b.labels.map(textNumber=>({textNumber}));break;}
    case 'shape_equation': {
      const n=difficulty>=4?3:2, values=rng.pickUnique([1,2,3,4,5,6],n);
      const coefficients=n===2?(difficulty===1?[[2,0],[1,1]]:[[2,1],[1,1]]):rng.shuffle([[2,1,0],[0,2,1],[1,0,1]]);
      b.equations=coefficients.map(row=>[...row,row.reduce((sum,c,i)=>sum+c*values[i],0)]);
      b.expression=n===2?(difficulty===1?[0,1]:[1,2]):difficulty<=4?[1,1,1]:rng.pick([[2,1,1],[1,2,1],[1,1,2]]);
      prompt='Aynı şekiller aynı pozitif tam sayıyı gösteriyor. Bütün eşitlikleri kullanarak son satırdaki işlemin sonucunu bul.';
      const names=['kare','daire','üçgen'];
      steps=['Tek bir eşitliğe bakmak yetmez; bütün satırlarda aynı şekil aynı değerde kalmalı.',
        values.map((v,i)=>`${names[i]} = ${v}`).join('; ')+'.',
        ...b.equations.map(row=>row.slice(0,n).flatMap((c,i)=>Array(c).fill(values[i])).join(' + ')+` = ${row[n]}; eşitlik sağlanır.`),
        'Son satır: '+b.expression.flatMap((c,i)=>Array(c).fill(values[i])).join(' + ')+` = ${b.expression.reduce((sum,c,i)=>sum+c*values[i],0)}.`];
      if(n===2)steps.splice(1,0,difficulty===1?`İlk eşitlikte iki kare ${b.equations[0][2]}; bir kare ${b.equations[0][2]} ÷ 2 = ${values[0]}. İkinci eşitlikten kareyi çıkar: ${b.equations[1][2]} − ${values[0]} = ${values[1]}.`:`İlk iki eşitlikte daireler aynıdır. Toplamları çıkarınca bir kare kalır: ${b.equations[0][2]} − ${b.equations[1][2]} = ${values[0]}. Sonra ${b.equations[1][2]} − ${values[0]} = ${values[1]} ile daireyi bul.`);
      else {const a=b.equations.find(r=>r[0]===2)![3],bb=b.equations.find(r=>r[1]===2)![3],c=b.equations.find(r=>r[0]===1)![3];steps.splice(1,0,`İki kare + daire eşitliğini iki kez al. Kare + üçgen eşitliğini ekle. İki daire + üçgen eşitliğini çıkarınca 5 kare kalır: 2 × ${a} + ${c} − ${bb} = ${5*values[0]}. Bir kare ${values[0]} olur.`,`Daire: ${a} − 2 × ${values[0]} = ${values[1]}. Üçgen: ${c} − ${values[0]} = ${values[2]}.`);}
      extra=[{textNumber:values.reduce((a,v)=>a+v,0)},{textNumber:b.equations.at(-1)!.at(-1)!},{textNumber:b.expression.reduce((a,v)=>a+v,0)},...values.map(textNumber=>({textNumber}))];
      break;
    }
    case 'balance_scale': {const count=rng.nextInt(2,3),weight=rng.nextInt(2,8);b.counts=[count];b.totals=[count*weight];prompt='Terazi dengede ve karelerin ağırlıkları eşit. Bir karenin ağırlığı kaç birimdir?';steps=[`${count} eş kare toplam ${count*weight} birimdir.`,`Toplamı eş parça sayısına böl: ${count*weight} ÷ ${count} = ${weight}.`];break;}
    case 'latin_square': {
      b.size=size;
      for(let attempt=0;attempt<100;attempt++){
        const rows=rng.shuffle(Array.from({length:size},(_,i)=>i)),cols=rng.shuffle(Array.from({length:size},(_,i)=>i)),values=rng.shuffle(Array.from({length:size},(_,i)=>i+1));
        const full=rows.flatMap(r=>cols.map(c=>values[(r+c)%size]));
        b.cells=[...full];b.index=rng.nextInt(0,size**2-1);b.cells[b.index]=0;
        const target=Math.min(Math.floor(size**2*.65),difficulty===1?2:difficulty===2?4:difficulty===3?5:7+Math.floor((difficulty-4)/2));
        for(const i of rng.shuffle(Array.from({length:full.length},(_,i)=>i).filter(i=>i!==b.index))){
          if(b.cells.filter(v=>!v).length>=target)break;
          b.cells[i]=0;try{completeLatinSquare(b.cells,size);}catch{b.cells[i]=full[i];}
        }
        const r=Math.floor(b.index/size),c=b.index%size;
        const immediate=values.filter(v=>!b.cells!.slice(r*size,(r+1)*size).includes(v)&&!b.cells!.some((n,i)=>i%size===c&&n===v));
        if(difficulty===1||immediate.length>1){
          const solved=completeLatinSquare(b.cells,size);
          steps=['Her satır ve sütunda aynı sayı yalnızca bir kez bulunabilir.',
            ...b.cells.flatMap((v,i)=>v?[]:[`${Math.floor(i/size)+1}. satır, ${i%size+1}. sütun: ${solved[i]}. Bu değerler birlikte tüm satır ve sütun kurallarını sağlar.`]),
            `İşaretli hedef hücre ${r+1}. satır, ${c+1}. sütundur; değeri ${solved[b.index]} olur.`];
          break;
        }
        if(attempt===99)throw Error('Çok adımlı, tek çözümlü kare üretilemedi.');
      }
      prompt=`Her satır ve sütunda 1’den ${size}’e kadar sayılar birer kez bulunur. Boş hücreleri birlikte düşün. İşaretli ? hücresine hangi sayı gelir?`;
      extra=Array.from({length:size},(_,i)=>({textNumber:i+1}));break;
    }
    case 'gear_rotation': b.counts=[Math.min(5,2+Math.floor(difficulty/2))];b.direction=rng.pick(['clockwise','counterclockwise']);prompt='Dış dişliler sırayla birbirine temas ediyor. İlk dişlinin yönü verilmiş. Son dişli nasıl döner?';steps=['Temas eden her dış dişli bir öncekinin tersine döner.','Zinciri baştan sona izleyerek her temasta yönü değiştir.'];extra=['Saat yönünde','Saat yönünün tersine','Dönmez','Yönü sürekli değişir'].map(textNumber=>({textNumber}));break;
    case 'paper_folding': case 'punch_folding': b.size=size;b.folds=difficulty<=2?[rng.pick(['x','y'])]:rng.shuffle(['x','y']);b.holes=[[rng.nextInt(0,Math.floor(size/2)-1),rng.nextInt(0,Math.floor(size/2)-1)]];prompt=type==='paper_folding'?'Kâğıt kesikli eksenlerden katlanıyor. İşaretli noktadan küçük bir kesim yapılıyor. Açıldığında hangi kesim deseni oluşur?':'Kâğıt kesikli eksenlerden katlanıyor. İşaretli noktada delik açılıyor. Açıldığında delikler nerede olur?';steps=['Her katlama ekseni işaretli noktanın karşı tarafında bir yansıma oluşturur.','Kâğıdı açarken tüm eksenlere göre yansıyan konumları işaretle.'];break;
    case 'venn_diagram': {const pool=rng.shuffle(['Ada','Ece','Can','Efe','Ela','Oya']);b.groups=[pool.slice(0,3),rng.shuffle(pool).slice(0,3)];prompt='İki grubun üyeleri verilmiş. Her iki grupta da bulunan kaç kişi vardır?';steps=['Birinci gruptaki her ismi ikinci grubun listesinde ara.','İki listede de bulunan isimleri birer kez say.'];break;}
    case 'cube_counting': case 'top_view': case 'multiview_perspective': b.size=size;b.heights=Array.from({length:size**2},()=>rng.nextBool(.45)?rng.nextInt(1,difficulty<=2?2:3):0);b.heights[0]=1;prompt=type==='cube_counting'?'Her hücredeki sayı, üst üste duran birim küp sayısıdır. Gizli küpler de dâhil toplam kaç küp vardır?':type==='top_view'?'Sayılar küp sütunlarının yükseklikleridir. Tam tepeden bakıldığında hangi hücreler dolu görünür?':'Küp yükseklikleri planda verilmiş. Ok yönünden önden bakıldığında hangi dolu hücre deseni görünür?';steps=type==='cube_counting'?['Her sütunun tüm küpleri yüksekliği kadar sayılır.','Örtünen küpleri de eklemek için bütün hücre yüksekliklerini topla.']:type==='top_view'?['Sıfır yükseklikteki hücre boş kalır.','Yüksekliği bir veya daha fazla olan her hücre tepeden dolu görünür.']:['Her sütun için aynı doğrultudaki yüksekliklerin en büyüğünü bul.','Alt sıradan başlayarak bu yükseklik kadar hücreyi doldur.'];break;
    case 'dice_unfold': case 'spatial_origami': {const labels=rng.shuffle(['1','2','3','4','5','6']),rotate=rng.nextInt(0,3);const xy=[[0,0],[0,1],[0,2],[0,3],[-1,1],[1,1]];b.net=xy.map(([x,y],i)=>{for(let r=0;r<rotate;r++)[x,y]=[-y,x];return {x,y,label:labels[i]};});b.face=rng.pick(labels);prompt=`Açılım çizgilerden katlanarak küp oluyor. ${b.face} yüzünün karşısında hangi yüz bulunur?`;steps=['Bitişik kareleri ortak kenarlarından 90° katlayarak altı yüzü oluştur.','Sorulan yüzün tam tersine bakan yüzü bul; kenar komşuları karşı yüz olamaz.'];extra=labels.map(textNumber=>({textNumber}));break;}
    case 'cryptogram': {const word=rng.pick(words.filter(w=>w.length<=(difficulty<=2?3:Math.min(6,3+difficulty)))),letters=[...new Set([...word])],codes=rng.shuffle(['A','B','C','D','E','F']);b.entries=letters.map((letter,i)=>({letter,code:codes[i]}));b.code=[...word].map(letter=>b.entries!.find(e=>e.letter===letter)!.code);prompt='Anahtardaki kodları harflere çevir. Verilen kod dizisi hangi sözcüğü oluşturur?';steps=['Her kodu tabloda gösterilen harfle eşleştir.','Harfleri kod dizisinin sırasını değiştirmeden yan yana oku.'];break;}
    case 'verbal_analogy': b.pairs=rng.shuffle(relations);b.target=rng.nextInt(1,b.pairs.length-1);prompt='Tablo hayvanlarla yuvalarını eşleştiriyor. Sorulan hayvanın yuvası hangisidir?';steps=['Örnekteki ilişki hayvan ile yaşadığı yuva arasındadır.','Tablodaki aynı ilişkiyi sorulan hayvana uygula.'];extra=b.pairs.map(p=>({textNumber:p[1]}));break;
    case 'story_logic': case 'weight_comparison': {const order=rng.shuffle(['Ada','Ece','Can','Efe']);b.labels=rng.shuffle(order);b.edges=order.slice(1).map((label,i)=>[order[i],label]);if(type==='story_logic'){b.position=rng.nextInt(0,3);prompt=`Çocukların geliş sırası ipuçlarıyla verilmiş. ${b.position+1}. gelen kimdir?`;}else prompt='İpuçlarında soldaki cismin sağdakinden daha hafif olduğu verilmiş. En ağır cisim hangisidir?';steps=['Her ipucunu yönünü değiştirmeden kullan.','Tüm ipuçlarını birleştirerek tek sıralamayı oluştur ve istenen konumu seç.'];extra=b.labels.map(textNumber=>({textNumber}));break;}
    case 'tangram_puzzle': b.polygon=rng.pick(TANGRAM_POLYGONS);prompt='Karedeki renkli üçgen sabit kalıyor. Dış kenarları aynı boyda tutarak boş kısmı hangi üçgen tamamlar?';steps=['Renkli üçgen karenin köşegeninin bir tarafını kaplar.','Diğer köşegen tarafını tam örten üçgeni seç; örtüşme ve boşluk bırakma.'];extra=TANGRAM_POLYGONS.map(polygon=>({polygon}));break;
    case 'maze_path': {b.size=size;const wall=size===3?1:2;b.cells=Array.from({length:size**2},(_,i)=>Number(i%size===wall));const left=b.cells.flatMap((v,i)=>!v&&i%size<wall?[i]:[]),right=b.cells.flatMap((v,i)=>!v&&i%size>wall?[i]:[]);b.start=rng.pick(left);b.goals=rng.shuffle([rng.pick(left.filter(i=>i!==b.start)),...rng.shuffle(right).slice(0,3)]);prompt='Başlangıçtan yalnızca boş komşu hücrelere yatay veya dikey ilerle. Duvarı aşmadan hangi hedefe ulaşabilirsin?';steps=['Başlangıca bağlı açık hücreleri incele; çapraz geçiş yapılamaz.','Duvarla ayrılan hedefleri ele ve ulaşılabilen tek hedefi seç.'];extra=['A','B','C','D'].map(textNumber=>({textNumber}));break;}
    case 'detail_detection': {const original=tile(),copy=structuredClone(original),occupied=original.cells.flatMap((v,i)=>v?[i]:[]);copy.cells[rng.pick(occupied)]=0;b.tiles=[original,copy];prompt='Sağdaki kopyada bir dolu hücre kaybolmuş. Eksik hücre hangi satır ve sütundadır?';steps=['İki deseni satır satır aynı hücrelerde karşılaştır.','Solda dolu, sağda boş olan tek hücrenin satır ve sütununu seç.'];break;}
    case 'word_scramble_logic': {const word=rng.pick(words.filter(w=>w.length<=(difficulty<=2?3:Math.min(6,3+difficulty)))),order=rng.shuffle(Array.from({length:word.length},(_,i)=>i));b.letters=order.map(i=>word[i]);b.order=Array.from({length:word.length},(_,i)=>order.indexOf(i)+1);prompt='Numaralı harfleri verilen kod sırasıyla oku. Hangi sözcük oluşur?';steps=['Kod sırasındaki ilk numaranın gösterdiği harfi al.','Diğer numaraları sırayla izleyerek harfleri birleştir; harf atlama veya ekleme.'];break;}
    default:throw Error('UNKNOWN_WORKSHOP_TOPIC');
  }
  const answer=solveWorkshopBoard(b,extra),choices:WorkshopValue[]=[answer];
  if(b.heights){
    const rowTotals=Array.from({length:size},(_,r)=>b.heights!.slice(r*size,(r+1)*size).reduce((a,v)=>a+v,0));
    if(type==='cube_counting'){
      steps=['Her sütunun tabandaki küpünü ve üstündeki küpleri birlikte say.',...rowTotals.map((v,r)=>`${r+1}. sıradaki sütunlar: ${b.heights!.slice(r*size,(r+1)*size).join(' + ')} = ${v}.`),`Toplam: ${rowTotals.join(' + ')} = ${rowTotals.reduce((a,v)=>a+v,0)} küp.`];
      extra=[{textNumber:b.heights.filter(Boolean).length},{textNumber:Math.max(...b.heights)},{textNumber:b.heights.reduce((a,v)=>a+Math.max(0,v-1),0)}];
    }else if(type==='multiview_perspective'){
      const max=Array.from({length:size},(_,c)=>Math.max(...b.heights!.filter((_,i)=>i%size===c)));
      steps=['Önden bakarken aynı sütundaki alçak küpler, daha yüksek sütunun arkasında kalabilir.',...max.map((v,c)=>`${c+1}. sütunda görünen yükseklik: en büyük değer ${v}.`),'Her sütunu tabandan başlayarak bu yüksekliğe kadar doldur.'];
    }
  }
  const add=(v:WorkshopValue)=>{if(!choices.some(c=>same(c,v)))choices.push(v);};
  for(const v of rng.shuffle(extra.filter(v=>!same(v,answer)))){add(v);if(choices.length===4)break;}
  if(choices.length<4&&'cells' in answer) {
    for(const i of rng.shuffle(answer.cells.map((_,i)=>i))){const cells=[...answer.cells];cells[i]=1-cells[i];add({size:answer.size,cells});if(choices.length===4)break;}
  }else if(choices.length<4&&'textNumber' in answer&&typeof answer.textNumber==='number') {
    for(const offset of rng.shuffle([-2,-1,1,2,3,4])){if(answer.textNumber+offset>=0)add({textNumber:answer.textNumber+offset});if(choices.length===4)break;}
  }else if(choices.length<4&&'symbol' in answer){for(const symbol of rng.shuffle(VISUAL_SYMBOL_IDS)){add({symbol});if(choices.length===4)break;}}
  else if('textNumber' in answer&&choices.length<4){
    const text=String(answer.textNumber);
    if(type==='detail_detection'){for(const i of rng.shuffle(Array.from({length:size**2},(_,i)=>i))){add({textNumber:`${Math.floor(i/size)+1}. satır, ${i%size+1}. sütun`});if(choices.length===4)break;}}
    else {for(const offset of rng.shuffle(Array.from({length:text.length},(_,i)=>i))){const letters=[...text];letters[offset]=rng.pick(['A','E','İ','O','U'].filter(l=>l!==letters[offset]));add({textNumber:letters.join('')});if(choices.length===4)break;}}
  }
  if(choices.length!==4)throw Error('Dört farklı şık üretilemedi.');
  if(choices.filter(v=>independentlyMatchesWorkshop(b,v)).length!==1||!independentlyMatchesWorkshop(b,answer))throw Error('İki mekanik kanıtlayıcı tek cevapta birleşmedi.');
  let correctOptionId='';const notes:Record<string,string>={};
  const options=rng.shuffle(choices).map((visualData,i)=>{const id='ABCD'[i],correct=same(visualData,answer);if(correct)correctOptionId=id;notes[id]=describeWorkshopChoice(b,visualData,answer);return {id,label:id,visualData,fingerprint:fingerprint(visualData)};});
  const finalSteps=[...steps,`Verilen kurala uyan tek seçenek ${correctOptionId}.`];
  return {id:`${type}-w2-d${difficulty}-s${seed}`,version:2,type,category:TOPIC_CATEGORY[type],seed,difficulty,ageGroup:difficulty<=2?'1-2':'3-4',prompt,options,correctOptionId,explanation:{ruleTitle:QUESTION_TYPE_LABELS[type],summary:finalSteps.join(' '),steps:finalSteps},visualConfig:b,skills:[type],estimatedSeconds:30+difficulty*10,status:'draft',authoring:{engine:WORKSHOP_ENGINE_VERSION,objective:prompt,distractorNotes:notes}};
}
export function describeWorkshopChoice(board:WorkshopBoard,choice:WorkshopValue,expected:WorkshopValue):string {
  if(same(choice,expected))return 'Verilen bilgilerden hesaplanan tek doğru sonuç; bağımsız aday denetimi de aynı sonucu veriyor.';
  if('cells' in choice&&'cells' in expected){const wrong=choice.cells.flatMap((v,i)=>v!==expected.cells[i]?[`${Math.floor(i/choice.size)+1}. satır ${i%choice.size+1}. sütun`]:[]);return `Hücre kuralı ile uyuşmuyor: ${wrong.join(', ')}.`;}
  if('textNumber' in choice&&'textNumber' in expected)return `Verilen ${QUESTION_TYPE_LABELS[board.kind]} kuralı ${String(choice.textNumber)} sonucunu vermiyor; adım adım çözüm ${String(expected.textNumber)} sonucunu veriyor.`;
  return 'Şeklin köşe, konum veya parça özelliği verilen kuralla uyuşmuyor.';
}
