import React, { createContext, useContext, useState } from 'react';
import type { BaseQuestion } from '../../../types';

const MemoryContext=createContext({locked:false,hidden:false});
export const useMemoryStudy=()=>useContext(MemoryContext);
/** Mount with a question/session key. Review can reveal the original after scoring. */
export function MemoryStudy({question,review=false,children}:{question:Pick<BaseQuestion,'type'>;review?:boolean;children:React.ReactNode}){
  const [hidden,setHidden]=useState(false);
  const memory=question.type==='visual_memory',locked=memory&&!hidden&&!review;
  return <MemoryContext.Provider value={{locked,hidden:memory&&hidden&&!review}}>
    <div className="zp-memory-study space-y-4" data-locked={locked}>{children}{locked&&<button type="button" onClick={()=>setHidden(true)} className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">Deseni gizle ve cevapla</button>}</div>
  </MemoryContext.Provider>;
}

