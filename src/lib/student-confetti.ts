import confetti from 'canvas-confetti';
import { studentMotion } from '../features/student/experience-preferences';
/** Shared by student rewards so the in-app motion setting also covers canvas effects. */
export default function studentConfetti(options?: Parameters<typeof confetti>[0]) {
  if (!studentMotion.getSnapshot()) return;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  return confetti({ ...options, disableForReducedMotion: true });
}
