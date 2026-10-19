import { useSyncExternalStore } from 'react';
const KEY = 'zekapark-motion-enabled-v1';
const listeners = new Set<() => void>();
let enabled = true;
try { if (typeof window !== 'undefined') enabled = window.localStorage.getItem(KEY) !== 'false'; } catch {}
export const studentMotion = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => enabled,
  getServerSnapshot: () => true,
  setEnabled(value: boolean) {
    enabled = value;
    try { window.localStorage.setItem(KEY, String(value)); } catch {}
    listeners.forEach(listener => listener());
  },
};
let deviceQuery:MediaQueryList|undefined;
function motionQuery() {
  if(typeof window==='undefined'||typeof window.matchMedia!=='function')return undefined;
  return deviceQuery??=window.matchMedia('(prefers-reduced-motion: reduce)');
}
const subscribeDeviceMotion=(listener:()=>void)=>{
  const query=motionQuery();
  query?.addEventListener('change',listener);
  return ()=>query?.removeEventListener('change',listener);
};
const deviceMotionSnapshot=()=>motionQuery()?.matches??false;
/** Device changes take effect immediately; the in-app toggle can only reduce motion further. */
export function useStudentReducedMotion() {
  const deviceReduced=useSyncExternalStore(subscribeDeviceMotion,deviceMotionSnapshot,()=>false);
  const animated=useSyncExternalStore(studentMotion.subscribe,studentMotion.getSnapshot,studentMotion.getServerSnapshot);
  return deviceReduced||!animated;
}
