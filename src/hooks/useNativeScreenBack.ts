import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { isAndroidApp } from '../lib/native-app';

/** Keep nested native screens above the app router, while dialogs own their Back action. */
export function useNativeScreenBack(root: RefObject<HTMLElement | null>, onBack: () => boolean) {
  const action = useRef(onBack);
  useLayoutEffect(() => { action.current = onBack; });
  useEffect(() => {
    if (!isAndroidApp) return;
    const back = (event: Event) => {
      if (document.querySelector('.zp-free-test')) return;
      if (event.defaultPrevented || document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]') || document.fullscreenElement) return;
      const disclosure = root.current?.querySelector<HTMLDetailsElement>('details[open]');
      if (disclosure) {
        disclosure.open = false;
        disclosure.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
      } else if (!action.current()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('zekapark:native-back', back, true);
    return () => window.removeEventListener('zekapark:native-back', back, true);
  }, [root]);
}
