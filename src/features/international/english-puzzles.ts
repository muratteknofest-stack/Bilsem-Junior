import type {BaseQuestion,DifficultyLevel} from '../../types';
import {generateColorfulQuestion,independentlyMatchesColorful,type ColorfulBoard} from '../questions/colorful-engine';
import {generateVisualFingerprint} from '../questions/fingerprint';
import {publicVisualConfig,type DisplayColorfulBoard} from '../questions/public-visual';
import {SeededRNG} from '../../lib/rng';
import {ENGLISH_AREAS,type EnglishArea,type EnglishLevel} from './english-content';
export interface EnglishPuzzle {
  id:string;area:EnglishArea;level:EnglishLevel;difficulty:number;prompt:string;
  board:DisplayColorfulBoard;options:Array<Pick<BaseQuestion['options'][number],'id'|'label'|'visualData'>>;correctOptionId:string;
  explanation:{title:string;steps:string[]};
}
export function englishPuzzle(source:BaseQuestion,level:EnglishLevel):EnglishPuzzle {
  const b=source.visualConfig as ColorfulBoard,area=ENGLISH_AREAS.find(a=>a.id===source.type);
  if(!area||b.displayMode!=='colorful_board')throw Error('Unsupported English puzzle.');
  const matches=source.options.filter(o=>independentlyMatchesColorful(b,o.visualData as any));
  if(matches.length!==1||matches[0].id!==source.correctOptionId)throw Error('English puzzle has no unique verified answer.');
  let prompt:string,steps:string[];
  switch(area.id){
    case 'mirror_reflection':
      prompt='The mirror is on the right. Which choice shows the reflected pattern?';
      steps=['A vertical mirror swaps left and right. It does not swap top and bottom.','Reverse the order of the tiles in each row. Compare every tile before choosing.'];break;
    case 'figure_completion': {
      const rule=b.mosaicRule||(source.difficulty>=3?'shift-row':'repeat-row');
      const descriptions={
        'repeat-row':['Every row follows the same tile order.','Copy the order from a complete row into the row with the missing square.'],
        'repeat-column':['Every column follows the same tile order.','Copy the order from a complete column into the column with the missing square.'],
        'shift-row':['Each new row shifts the tiles one place to the left.','The first tile moves to the end; all other tiles move one place left.'],
        'shift-column':['Each new column shifts the tiles one place down.','The last tile moves to the top; all other tiles move one place down.'],
      };
      prompt=descriptions[rule][0]+' Which tile belongs in the missing square?';
      steps=[descriptions[rule][1],'Check the missing position against both its row and its column.'];break;
    }
    case 'visual_memory':
      prompt='Remember the pattern. When you are ready, hide it and choose the exact match.';
      steps=['Study the pattern row by row. Remember the positions of the corner tiles.','The matching choice must keep every geometric mark and colour in the same position.'];break;
    case 'shadow_matching':
      prompt='Which shadow keeps the object’s outline and gaps? Keep the object facing the same way.';
      steps=['Compare the outer edges, projecting parts and inside gaps.','Colour and decoration disappear in a shadow. The outline, direction and gaps stay in the same places.'];break;
    case 'spatial_relationship':{
      const depth=b.targetDepth!;
      prompt=depth===0?'Which numbered crayon is on top of all the others?':`Which numbered crayon is ${depth===1?'second':'third'} from the top?`;
      steps=['At a crossing, the crayon whose outline continues is above the other crayon.','Follow the crossings and arrange the crayons from top to bottom.',`Find the ${['first','second','third'][depth]} crayon in that order. Its printed number identifies it.`];break;
    }
  }
  return {id:`en-L${level}-${source.id}`,area:area.id,level,difficulty:source.difficulty,prompt,
    board:publicVisualConfig(source) as DisplayColorfulBoard,options:source.options.map(({id,label,visualData})=>({id,label,visualData})),
    correctOptionId:source.correctOptionId,explanation:{title:area.title,steps:[...steps,`The matching choice is ${source.correctOptionId}.`]}};
}
let cached:EnglishPuzzle[]|undefined;
/** 75 questions per activity level; original certified rules, original artwork, explicit English templates. */
export function englishBank():EnglishPuzzle[]{
  if(cached)return cached;
  const bank:EnglishPuzzle[]=[],seen=new Set<string>();
  const amounts=[20,20,20,8,7];
  for(const level of [1,2,3,4] as const)for(const [areaIndex,area] of ENGLISH_AREAS.entries()){
    let accepted=0;
    for(let attempt=0;accepted<amounts[areaIndex]&&attempt<10000;attempt++){
      const difficulty=(level===1?1+attempt%2:level===2?2+attempt%2:level===3?3+attempt%2:4+attempt%3) as DifficultyLevel;
      const seed=100003+level*10000019+areaIndex*1000003+attempt*7919;
      const q=generateColorfulQuestion(area.id,seed,difficulty);
      const key=generateVisualFingerprint(q.visualConfig);
      if(seen.has(key))continue;
      const translated=englishPuzzle(q,level);seen.add(key);bank.push(translated);accepted++;
    }
    if(accepted!==amounts[areaIndex])throw Error('English practice bank could not be verified.');
  }
  cached=bank;return bank;
}
export function selectEnglishPuzzles(level:EnglishLevel,area:EnglishArea|'mixed',count:5|10,seed:number,recent:string[]=[]):EnglishPuzzle[]{
  const rng=new SeededRNG(seed),pool=englishBank().filter(q=>q.level===level&&(area==='mixed'||q.area===area));
  const fresh=rng.shuffle(pool.filter(q=>!recent.includes(q.id))),old=rng.shuffle(pool.filter(q=>recent.includes(q.id)));
  if(area!=='mixed')return [...fresh,...old].slice(0,Math.min(count,pool.length));
  const result:EnglishPuzzle[]=[];
  for(let round=0;result.length<count;round++){
    let added=false;
    for(const a of rng.shuffle([...ENGLISH_AREAS])){
      const q=[...fresh,...old].find(q=>q.area===a.id&&!result.some(r=>r.id===q.id));
      if(q){result.push(q);added=true;}if(result.length===count)break;
    }
    if(!added)break;
  }
  return result;
}
