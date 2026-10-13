import React from 'react';
import type {EnglishArea} from './english-content';

/** Original vector artwork, independent of private puzzle answers. */
export function HarborBuddy({className=''}:{className?:string}){
 return <svg className={className} viewBox="0 0 220 230" aria-hidden="true" focusable="false">
  <ellipse cx="110" cy="208" rx="64" ry="10" fill="#173c39" opacity=".12"/>
  <path d="M66 172l-12 31h28l13-30M130 172l5 31h28l-11-35" fill="#173c39"/>
  <path d="M59 97Q27 109 29 144M164 94q36-29 35-53" fill="none" stroke="#173c39" strokeWidth="13" strokeLinecap="round"/>
  <path d="M199 45l-8-15m8 15 12-10m-12 10 15 2" fill="none" stroke="#173c39" strokeWidth="7" strokeLinecap="round"/>
  <rect x="50" y="49" width="120" height="130" rx="39" fill="#efaa3f"/>
  <rect x="50" y="40" width="120" height="130" rx="39" fill="#ffd45c" stroke="#173c39" strokeWidth="3"/>
  <path d="M75 44l11-24 25 15 25-15 10 24" fill="#f27660" stroke="#173c39" strokeWidth="3" strokeLinejoin="round"/>
  <ellipse cx="86" cy="97" rx="8" ry="11" fill="#173c39"/><ellipse cx="134" cy="97" rx="8" ry="11" fill="#173c39"/>
  <circle cx="72" cy="119" r="8" fill="#f27660"/><circle cx="148" cy="119" r="8" fill="#f27660"/>
  <path d="M95 120q15 19 30 0" fill="none" stroke="#173c39" strokeWidth="4" strokeLinecap="round"/>
  <path d="M109 145l4 6 7 1-5 5 1 7-7-3-6 3 1-7-5-5 7-1z" fill="#173c39"/>
 </svg>;
}

export function HarborScene(){return <svg viewBox="0 0 550 490" aria-hidden="true" focusable="false" className="en-harbor-scene">
 <path d="M52 227C16 106 98 27 218 37c99-51 212 4 259 105 56 91 15 234-111 275C220 465 56 378 52 227Z" fill="#b9dacc"/>
 <path d="M40 355q119-64 244 0t222-12" fill="none" stroke="#173c39" strokeWidth="2" strokeDasharray="5 9" opacity=".32"/>
 <g transform="translate(268 39) rotate(10 100 94)" className="en-scene-tile"><rect x="5" y="8" width="205" height="185" rx="21" fill="#173c39" opacity=".15"/><rect width="205" height="185" rx="21" fill="#fffdf7" stroke="#173c39" strokeWidth="2"/>
 <path d="M25 26h57" stroke="#b7c6bc" strokeWidth="5" strokeLinecap="round"/>
 {[0,1,2,3,4,5,6,7].map(i=><g key={i} transform={`translate(${25+(i%3)*55} ${49+Math.floor(i/3)*40})`}>{i%3===0?<circle cx="15" cy="15" r="13" fill="#f27660"/>:i%3===1?<rect x="2" y="2" width="26" height="26" rx="5" fill="#8faeef"/>:<path d="M15 1l15 28H0z" fill="#ffd45c"/>}</g>)}<text x="155" y="159" fontSize="27" fontWeight="800" fill="#173c39">?</text></g>
 <g transform="translate(44 83) rotate(-12 86 76)"><rect x="5" y="7" width="172" height="154" rx="18" fill="#173c39" opacity=".15"/><rect width="172" height="154" rx="18" fill="#fffdf7" stroke="#173c39" strokeWidth="2"/><path d="M22 29h66" stroke="#b7c6bc" strokeWidth="5" strokeLinecap="round"/><path d="M84 49v76" stroke="#173c39" strokeWidth="2" strokeDasharray="4 5"/><path d="M68 60H43v28H26v28h42z" fill="#558dc9"/><path d="M100 60h25v28h17v28h-42z" fill="#f27660"/></g>
 <g transform="translate(327 281) rotate(-9 79 60)"><rect x="5" y="7" width="157" height="125" rx="18" fill="#173c39" opacity=".15"/><rect width="157" height="125" rx="18" fill="#fffdf7" stroke="#173c39" strokeWidth="2"/><rect x="23" y="28" width="64" height="64" rx="11" fill="#f27660"/><circle cx="87" cy="64" r="31" fill="#8faeef"/><path d="M63 96l28-61 36 53z" fill="#ffd45c"/></g>
 <g transform="translate(93 214) rotate(4 74 84)"><ellipse cx="77" cy="185" rx="72" ry="9" fill="#173c39" opacity=".14"/><path d="M47 139l-9 41h24l10-40m27-2 11 42h24l-14-44" fill="#173c39"/><path d="M40 71Q10 91 20 116m107-55q35-20 38-48" fill="none" stroke="#173c39" strokeWidth="12" strokeLinecap="round"/><path d="M165 17l-5-14m5 14 14-9" fill="none" stroke="#173c39" strokeWidth="6" strokeLinecap="round"/><rect x="35" y="36" width="100" height="116" rx="32" fill="#efaa3f"/><rect x="35" y="28" width="100" height="116" rx="32" fill="#ffd45c" stroke="#173c39" strokeWidth="3"/><path d="M54 30l10-20 21 12 22-12 9 20" fill="#f27660" stroke="#173c39" strokeWidth="3" strokeLinejoin="round"/><ellipse cx="65" cy="79" rx="7" ry="9" fill="#173c39"/><ellipse cx="105" cy="79" rx="7" ry="9" fill="#173c39"/><path d="M70 98q15 18 30 0" fill="none" stroke="#173c39" strokeWidth="4" strokeLinecap="round"/><circle cx="53" cy="99" r="6" fill="#f27660"/><circle cx="117" cy="99" r="6" fill="#f27660"/></g>
 <g fill="#173c39"><path d="M35 27l5 14 14 5-14 5-5 14-5-14-14-5 14-5z"/><path d="M487 241l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/></g><circle cx="303" cy="450" r="7" fill="#f27660"/><path d="M233 11l5 10m4-13 3 10" stroke="#f27660" strokeWidth="4" strokeLinecap="round"/>
 </svg>;}

export function ActivityArtwork({area}:{area:EnglishArea}){return <svg viewBox="0 0 160 110" aria-hidden="true" focusable="false">
 {area==='mirror_reflection'?<><path d="M80 12v86" stroke="#173c39" strokeWidth="2" strokeDasharray="4 5"/><path d="M65 24H37v29H20v33h45z" fill="#5b8fc9"/><path d="M95 24h28v29h17v33H95z" fill="#f27660"/></>:area==='figure_completion'?<>{[0,1,2,3,4].map(i=><rect key={i} x={25+i%3*39} y={15+Math.floor(i/3)*43} width="32" height="32" rx={i%2?16:6} fill={i%2?'#ffd45c':'#f27660'}/>)}<text x="111" y="84" fill="#173c39" fontSize="30" fontWeight="800">?</text></>:area==='visual_memory'?<>{[0,1,2,3,4,5,6,7,8].map(i=><rect key={i} x={26+i%3*37} y={6+Math.floor(i/3)*34} width="29" height="27" rx="5" fill={['#f27660','#ffd45c','#6b96ce'][i%3]}/>)}<path d="M10 16L4 10m146 6 6-6" stroke="#173c39" strokeWidth="2"/></>:area==='shadow_matching'?<><path d="M20 30h42v15H44v38H20z" fill="#f27660"/><path d="M99 30h42v15h-18v38H99z" fill="#173c39"/><path d="M71 55h18m-5-5 5 5-5 5" fill="none" stroke="#173c39" strokeWidth="2"/></>:<><rect x="34" y="19" width="64" height="67" rx="9" fill="#f27660"/><circle cx="94" cy="53" r="32" fill="#6b96ce"/><path d="M52 94l31-64 35 60z" fill="#ffd45c"/></>}
 </svg>;}

export function HarborMark(){return <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="13" fill="#173c39"/><path d="M20 7l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#ffd45c"/></svg>;}
