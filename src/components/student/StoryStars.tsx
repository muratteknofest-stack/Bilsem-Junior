import React, { useId, type CSSProperties, type ReactNode } from 'react';
import { storyCelebration, storyStars, STORY_QUESTION_COUNT } from '../../features/student/story-adventure';
const starPath='M14 2.5 17.5 9.6 25.4 10.8 19.7 16.3 21 24.1 14 20.4 7 24.1 8.3 16.3 2.6 10.8 10.5 9.6Z';
export function StoryStars({correct,total=STORY_QUESTION_COUNT,compact=false,label='Macera yıldızları'}:{correct:number;total?:number;compact?:boolean;label?:string}) {
  const id=useId().replace(/:/g,'');
  const score=storyStars(correct,total),formatted=score.toLocaleString('tr-TR',{maximumFractionDigits:2});
  return <span className={`bj-star-meter ${compact?'bj-star-meter-compact':''}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={5} aria-valuenow={score} aria-valuetext={`${correct}/${total} doğru, ${formatted}/5 yıldız`}>
    <span className="bj-star-row" aria-hidden="true">{Array.from({length:5},(_,index)=>{const fill=Math.max(0,Math.min(1,score-index));return <svg key={index} viewBox="0 0 28 28" data-fill={fill} style={{'--star-index':index} as CSSProperties}><defs><clipPath id={`${id}-${index}`}><rect width={28*fill} height={28}/></clipPath><linearGradient id={`${id}-gold-${index}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe9a0"/><stop offset="1" stopColor="#e7a82c"/></linearGradient></defs><path className="bj-star-empty" d={starPath}/><g clipPath={`url(#${id}-${index})`}><path d={starPath} fill={`url(#${id}-gold-${index})`} stroke="#c18a23" strokeWidth="1.1"/></g></svg>;})}</span>
    {!compact&&<strong>{formatted}<span> / 5 yıldız</span></strong>}
  </span>;
}
export function StoryResultCelebration({correct,total=STORY_QUESTION_COUNT,bestCorrect}:{correct:number;total?:number;bestCorrect?:number}) {
  const kind=storyCelebration(correct,total);
  const titles={perfect:'Kusursuz macera!',sparkle:'Yıldızların parlıyor!',orbit:'Yeni bir yörünge keşfettin!',grow:'Her denemede yeni bir keşif!'};
  return <section className="bj-story-celebration" data-celebration={kind} aria-label="Macera yıldız sonucu">
    <div className="bj-story-celebration-art" aria-hidden="true"><span className="bj-celebration-ring"/><span className="bj-celebration-ring"/><img src="/brand/junior-fox.svg" alt="" width={92} height={100}/>{Array.from({length:12},(_,index)=><i key={index} style={{'--particle-index':index} as CSSProperties}>{kind==='grow'?'✧':kind==='orbit'?'●':'✦'}</i>)}</div>
    <h3>{titles[kind]}</h3><p>{correct}/{total} doğru · Her 4 doğru, 1 yıldız eder.</p>
    <StoryStars correct={correct} total={total}/>
    {bestCorrect!==undefined&&<p className="bj-story-best">En iyi sonucun: {bestCorrect}/{total} doğru · {storyStars(bestCorrect,total).toLocaleString('tr-TR',{maximumFractionDigits:2})}/5 yıldız</p>}
    {correct<total&&<p>Yeniden oynayarak yıldız barını tamamlayabilirsin.</p>}
  </section>;
}

export function StoryAnswerReview({enabled,count,children}:{enabled:boolean;count:number;children:ReactNode}) {
  return enabled?<details className="bj-story-answer-review"><summary>{count} sorunun çözümlerini incele</summary>{children}</details>:<>{children}</>;
}
