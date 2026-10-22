import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { PlayBilling } from '../lib/play-billing';
import { initialPlayBillingState, PlayBillingFlow } from '../lib/google-play-flow';
import { isAndroidApp } from '../lib/native-app';
import { WebPlayMembershipPanel } from './WebPlayMembershipPanel';
import { PlayBillingPanel } from './PlayBillingPanel';
import { ShopierBilling } from './ShopierBilling';
import { withRequestDeadline } from '../lib/request-deadline';

export function NativeAccessStatus({ studentId, studentName }: { studentId: string; studentName?: string }) {
  const owner = auth.currentUser?.uid;
  if (!isAndroidApp) return <WebBillingSession key={`${owner}:${studentId}`} studentId={studentId} studentName={studentName} owner={owner}/>;
  return <BillingSession key={`${owner}:${studentId}`} studentId={studentId} studentName={studentName} owner={owner}/>;
}
function WebBillingSession({ studentId, studentName, owner }: { studentId: string; studentName?: string; owner: string | undefined }) {
  const [shopierEnabled, setShopierEnabled] = useState(false);
  useEffect(() => {
    let current = true;
    void withRequestDeadline(async signal => {
      const response = await authenticatedFetch('/api/public/shopier', { signal });
      if (!response.ok) return;
      const config = await response.json();
      if (current && auth.currentUser?.uid === owner) setShopierEnabled(config.enabled === true);
    }).catch(() => {});
    return () => { current = false; };
  }, [owner]);
  return shopierEnabled ? <ShopierBilling studentId={studentId}/> : <BillingSession studentId={studentId} studentName={studentName} owner={owner}/>;
}
function BillingSession({ studentId, studentName, owner }: { studentId: string; studentName?: string; owner: string | undefined }) {
  const [state, setState] = useState(initialPlayBillingState), flow = useRef<PlayBillingFlow | null>(null);
  useEffect(() => {
    const controller = new PlayBillingFlow({ studentId, native: Capacitor.isNativePlatform(), store: PlayBilling,
      isCurrent: () => auth.currentUser?.uid === owner, changed: setState,
      async request(path, body, signal) {
        const response = await authenticatedFetch('/api/parent/google-play/' + path, { signal, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
        // Do not show proxy HTML, raw JSON parsing failures or provider details.
        if (!response.headers.get('content-type')?.includes('application/json')) throw Error('Abonelik servisine ulaşılamadı. Yeniden deneyin.');
        let data: unknown;
        try { data = await response.json(); } catch { throw Error('Abonelik yanıtı okunamadı. Yeniden deneyin.'); }
        const error = data && typeof data === 'object' && 'error' in data ? data.error : null;
        if (!response.ok) throw Error(typeof error === 'string' && error.length < 500 ? error : 'İşlem tamamlanamadı. Yeniden deneyin.');
        return data;
      },
    });
    flow.current = controller;
    const listeners: Array<{ remove(): Promise<void> }> = []; let disposed = false;
    const remember = (listener: { remove(): Promise<void> }) => { if (disposed) void listener.remove().catch(() => {}); else listeners.push(listener); };
    const online = () => { void controller.refresh(); };
    window.addEventListener('online', online);
    void controller.refresh();
    if (Capacitor.isNativePlatform()) {
      void PlayBilling.addListener('purchasesUpdated', controller.purchasesUpdated).then(remember).catch(() => {});
      void App.addListener('appStateChange', ({ isActive }) => { if (isActive) void controller.refresh(); }).then(remember).catch(() => {});
    }
    return () => { window.removeEventListener('online', online); disposed = true; controller.dispose(); for (const listener of listeners) void listener.remove().catch(() => {}); if (flow.current === controller) flow.current = null; };
  }, [studentId, owner]);
  if (!isAndroidApp) return <WebPlayMembershipPanel studentName={studentName} state={state} onRefresh={() => { void flow.current?.refresh(); }}/>;
  return <PlayBillingPanel studentName={studentName} state={state} onPurchase={plan => { void flow.current?.purchase(plan); }} onRestore={() => { void flow.current?.restore(); }} onRefresh={() => { void flow.current?.refresh(); }}/>;
}

