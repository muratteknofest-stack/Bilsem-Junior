import React from 'react';

/** A single answer surface: no nested badge/card around the actual answer. */
export function AnswerValue({value}:{value:string|number}) {
  const text=String(value);
  if(text==='Saat yönü'||text==='Saat yönünün tersi'){
    const clockwise=text==='Saat yönü';
    return <span className="bj-answer-direction"><svg viewBox="0 0 100 100" role="img" aria-label={text} shapeRendering="geometricPrecision">
      <circle cx="50" cy="50" r="33" fill="#f2f5fa" stroke="#d7e0e9" strokeWidth="2"/>
      <g transform={clockwise?undefined:'translate(100 0) scale(-1 1)'}><path d="M27 58A27 27 0 1 1 75 63" fill="none" stroke="#244fca" strokeWidth="9" strokeLinecap="round"/><path d="M61 62L78 76L87 55Z" fill="#244fca"/></g>
      <circle cx="50" cy="50" r="3" fill="#152d46"/>
    </svg><span>{text}</span></span>;
  }
  if(/^-?\d{1,4}$/.test(text)||/^[A-D]$/.test(text))return <svg className="bj-answer-number" viewBox="0 0 160 110" role="img" aria-label={text} shapeRendering="geometricPrecision">
    <text x="80" y="82" textAnchor="middle" fontSize={text.length>3?48:text.length>2?60:76} fontWeight="800" fill="#b8c8d9" aria-hidden="true">{text}</text>
    <text x="80" y="77" textAnchor="middle" fontSize={text.length>3?48:text.length>2?60:76} fontWeight="800" fill="#19364e" aria-hidden="true">{text}</text>
  </svg>;
  return <span className="bj-answer-text">{text}</span>;
}
