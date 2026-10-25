import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { connectionAvailable, subscribeConnection } from '../lib/connection-status';
import { App } from '@capacitor/app';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { PlayBilling, isGooglePlayBillingPlatform } from '../lib/play-billing';
import { initialPlayBillingState, PlayBillingFlow } from '../lib/google-play-flow';
import { WebPlayMembershipPanel } from './WebPlayMembershipPanel';
import { PlayBillingPanel } from './PlayBillingPanel';

export function NativeAccessStatus({ studentId, studentName }: { studentId: string; studentName?: string }) {
  const owner = auth.currentUser?.uid;
  return <BillingSession key={`${owner}:${studentId}`} studentId={studentId} studentName={studentName} owner={owner}/>;
}
function BillingSession({ studentId, studentName, owner }: { studentId: string; studentName?: string; owner: string | undefined }) {
  const nativeAndroid = isGooglePlayBillingPlatform();
  const online = useSyncExternalStore(subscribeConnection, connectionAvailable, () => true);
  const [state, setState] = useState(initialPlayBillingState), flow = useRef<PlayBillingFlow | null>(null);
  useAndroidBack(() => {}, nativeAndroid && ['opening', 'verifying'].includes(state.phase));
  useEffect(() => {
    const controller = new PlayBillingFlow({ studentId, native: nativeAndroid, store: PlayBilling,
      isOnline: connectionAvailable,
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
    if (nativeAndroid) {
      void PlayBilling.addListener('purchasesUpdated', controller.purchasesUpdated).then(remember).catch(() => {});
      void App.addListener('appStateChange', ({ isActive }) => { if (isActive) void controller.refresh(); }).then(remember).catch(() => {});
    }
    return () => { window.removeEventListener('online', online); disposed = true; controller.dispose(); for (const listener of listeners) void listener.remove().catch(() => {}); if (flow.current === controller) flow.current = null; };
  }, [studentId, owner, nativeAndroid]);
  if (!nativeAndroid) return <WebPlayMembershipPanel studentName={studentName} state={state} onRefresh={() => { void flow.current?.refresh(); }}/>;
  return <PlayBillingPanel studentName={studentName} state={state} online={online} onPurchase={plan => { void flow.current?.purchase(plan); }} onRestore={() => { void flow.current?.restore(); }} onRefresh={() => { void flow.current?.refresh(); }}/>;
}

