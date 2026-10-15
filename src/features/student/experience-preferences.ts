import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';
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
/** An in-app preference may reduce motion, but never overrides the device's preference. */
export function useStudentReducedMotion() {
  const deviceReduced = useReducedMotion();
  const animated = useSyncExternalStore(studentMotion.subscribe, studentMotion.getSnapshot, studentMotion.getServerSnapshot);
  return Boolean(deviceReduced || !animated);
}
