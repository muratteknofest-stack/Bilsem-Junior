import { useEffect, useState } from 'react';

export type ParentPortalTab = 'overview' | 'skills' | 'membership' | 'preferences';

const EVENT_NAME = 'bilsem:parent-tab-change';
let currentParentTab: ParentPortalTab = 'overview';

export function getParentPortalTab(): ParentPortalTab {
  return currentParentTab;
}

export function setParentPortalTab(tab: ParentPortalTab): void {
  currentParentTab = tab;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ParentPortalTab>(EVENT_NAME, { detail: tab }));
  }
}

export function useParentPortalTab(initial?: ParentPortalTab): [ParentPortalTab, (tab: ParentPortalTab) => void] {
  const [tab, setTab] = useState<ParentPortalTab>(() => initial ?? currentParentTab);

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<ParentPortalTab>).detail;
      if (next) setTab(next);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const update = (next: ParentPortalTab) => {
    setTab(next);
    setParentPortalTab(next);
  };

  return [tab, update];
}
