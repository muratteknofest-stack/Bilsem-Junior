import { useEffect, useRef } from 'react';
import { claimAndroidBack } from '../lib/android-navigation';

/** Registered on web as well so isolated Android UI tests exercise the same ownership. */
export function useAndroidBack(handler: () => void, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    if (!enabled) return;
    return claimAndroidBack(window, () => latest.current());
  }, [enabled]);
}
