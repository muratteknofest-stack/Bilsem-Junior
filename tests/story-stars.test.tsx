import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StoryStars,StoryResultCelebration} from '../src/components/student/StoryStars';

test('five-star bar exposes an accurate accessible value and fractional fill without rounding up',()=>{
 const markup=renderToStaticMarkup(<StoryStars correct={19}/>);
 assert.match(markup,/role="meter"/);assert.match(markup,/aria-valuenow="4.75"/);assert.match(markup,/19\/20 doğru, 4,75\/5 yıldız/);
 assert.equal((markup.match(/data-fill="1"/g)||[]).length,4);assert.equal((markup.match(/data-fill="0.75"/g)||[]).length,1);
 const full=renderToStaticMarkup(<StoryStars correct={20}/>);assert.equal((full.match(/data-fill="1"/g)||[]).length,5);
 const empty=renderToStaticMarkup(<StoryStars correct={0}/>);assert.equal((empty.match(/data-fill="0"/g)||[]).length,5);
});

test('multiple saved star bars keep independent SVG clips and result variants show current and best scores',()=>{
 const markup=renderToStaticMarkup(<><StoryStars correct={10} compact/><StoryStars correct={20} compact/></>);
 const ids=[...markup.matchAll(/ id="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);
 const result=renderToStaticMarkup(<StoryResultCelebration correct={4} bestCorrect={20}/>);
 assert.match(result,/data-celebration="grow"/);assert.match(result,/En iyi sonucun: 20\/20 doğru/);assert.match(result,/aria-valuenow="1"/);
 assert.match(renderToStaticMarkup(<StoryResultCelebration correct={20}/>),/data-celebration="perfect"/);
});


test('different story lengths show current and best scores with their own denominators',()=>{
 const result=renderToStaticMarkup(<StoryResultCelebration correct={4} total={5} bestCorrect={9} bestTotal={10}/>);
 assert.match(result,/4\/5 doğru/);assert.match(result,/En iyi sonucun: 9\/10 doğru/);
 assert.match(result,/aria-valuenow="4"/);assert.doesNotMatch(result,/Her 4 doğru/);
});
