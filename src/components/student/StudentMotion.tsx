import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Pause, Play, Sparkles } from 'lucide-react';
import { studentMotion, useStudentReducedMotion } from '../../features/student/experience-preferences';
import './student-motion.css';

/** Pause decorative CSS work when its scene is offscreen or the app is backgrounded. */
export function useStudentMotionSurface(scene: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const visibility = () => { root.dataset.motionPaused = String(document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.motionOffscreen = String(!entry.isIntersecting); });
    }, { rootMargin: '40px' });
    root.querySelectorAll('[data-motion-zone]').forEach(zone => observer?.observe(zone));
    // Section transitions mount their contents after the parent effect has run.
    const visit = (node: Node, added: boolean) => {
      if (!(node instanceof Element)) return;
      const zones = [...(node.matches('[data-motion-zone]') ? [node] : []), ...node.querySelectorAll('[data-motion-zone]')];
      zones.forEach(zone => added ? observer?.observe(zone) : observer?.unobserve(zone));
    };
    const mutations = observer ? new MutationObserver(records => records.forEach(record => {
      record.removedNodes.forEach(node => visit(node, false));
      record.addedNodes.forEach(node => visit(node, true));
    })) : null;
    mutations?.observe(root, { childList: true, subtree: true });
    return () => { document.removeEventListener('visibilitychange', visibility); mutations?.disconnect(); observer?.disconnect(); };
  }, [scene]);
  return ref;
}

export function StudentMotionToggle() {
  const enabled = useSyncExternalStore(studentMotion.subscribe, studentMotion.getSnapshot, studentMotion.getServerSnapshot);
  const reduced = useStudentReducedMotion();
  return <div className="bj-motion-toolbar">
    <span><Sparkles size={14} aria-hidden="true" /> Kendi ritminde keşfet</span>
    <button type="button" aria-label={enabled ? 'Animasyonları duraklat' : 'Animasyonları başlat'} aria-pressed={enabled}
      onClick={() => studentMotion.setEnabled(!enabled)}>
      {enabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      {reduced ? 'Hareket sakin' : 'Hareket açık'}
    </button>
  </div>;
}

/** Fixed, decorative particles: no timers, random hydration, or learning state. */
export function StudentAdventureAtmosphere() {
  return <div className="bj-adventure-atmosphere" aria-hidden="true">
    <span className="bj-drifting-cloud" /><span className="bj-drifting-cloud" />
    {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
    <span className="bj-orbit-star">✦</span>
  </div>;
}
