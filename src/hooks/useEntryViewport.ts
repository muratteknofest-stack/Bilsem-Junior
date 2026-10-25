import { useEffect, useRef } from 'react';

/** Track the usable WebView area when Android resizes for its keyboard. */
export function useEntryViewport(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const element = ref.current;
    let fullHeight = window.innerHeight;
    let orientation = window.screen.orientation?.angle;
    const update = () => {
      const viewport = window.visualViewport;
      // Zoom must remain accessible; do not mistake zooming for the keyboard.
      if (viewport && viewport.scale > 1.05) return;
      const editable = document.activeElement?.matches('input:not([type=checkbox]),select,textarea');
      const angle = window.screen.orientation?.angle;
      if (angle !== orientation) fullHeight = window.innerHeight;
      orientation = angle;
      fullHeight = Math.max(fullHeight, window.innerHeight);
      const height = Math.round(viewport?.height ?? window.innerHeight);
      element.style.setProperty('--bj-entry-height', `${height}px`);
      element.dataset.keyboard = String(Boolean(editable && fullHeight - height > 120));
    };
    update();
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [enabled]);
  return ref;
}
