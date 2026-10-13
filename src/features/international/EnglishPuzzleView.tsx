import React,{useState} from 'react';
import {ColorfulArt,ColorfulBoard} from '../questions/renderers/ColorfulBoard';
import type {EnglishPuzzle} from './english-puzzles';
export function EnglishPuzzleView({puzzle,choice,onChoose,reveal=false}:{puzzle:EnglishPuzzle;choice?:string;onChoose?:(id:string)=>void;reveal?:boolean}){
  const [hidden,setHidden]=useState(false);
  const memory=puzzle.area==='visual_memory',studying=memory&&!hidden&&!reveal;
  return <section className="en-puzzle" aria-label="Thinking puzzle">
    <h2 className="en-prompt" tabIndex={-1}>{puzzle.prompt}</h2>
    <div className="en-board" aria-label="Puzzle picture">
      {memory&&hidden&&!reveal?<div className="en-memory-hidden"><span aria-hidden="true">✦</span><p>The pattern is hidden.<br/>Find the exact match.</p></div>:<ColorfulBoard board={puzzle.board} locale="en"/>}
    </div>
    {studying?<div className="en-memory-action"><p>Take your time. No answer choices are shown while you study.</p><button className="en-primary" type="button" onClick={()=>setHidden(true)}>Hide pattern & answer</button></div>:<div className="en-options" role="group" aria-label="Choose an answer">
      {puzzle.options.map(option=>{const correct=reveal&&option.id===puzzle.correctOptionId,selected=choice===option.id;return <button type="button" key={option.id} aria-label={`Choice ${option.id}${correct?', correct answer':''}`} aria-pressed={selected} disabled={!onChoose||!!choice} className={`en-option ${selected?'is-selected':''} ${correct?'is-correct':''}`} onClick={()=>onChoose?.(option.id)}>
        <span className="en-option-letter">{option.id}</span><div className="en-option-art"><ColorfulArt locale="en" value={option.visualData as any} shadow={puzzle.area==='shadow_matching'}/></div>
        {correct&&<span className="en-answer-mark">✓</span>}
      </button>;})}
    </div>}
  </section>;
}
