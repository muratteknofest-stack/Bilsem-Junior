import React, { useSyncExternalStore } from 'react';
import { getProgressSyncStatus, subscribeProgressSync, persistUserStateToSupabase, hydrateUserStateFromSupabase } from '../services/modules/persistence-service';
export function ProgressSyncBanner() {
  const status = useSyncExternalStore(subscribeProgressSync, getProgressSyncStatus, () => 'saved');
  if (status === 'saved') return null;
  return <div role="status" className={'px-5 py-2 text-center text-sm ' + ((status === 'error' || status === 'volatile') ? 'bg-amber-50 text-amber-950' : 'bg-indigo-50 text-indigo-900')}>
    {status === 'volatile' ? 'Tarayıcı kalıcı kaydı kullanılamıyor. İlerleme buluta kaydedilene kadar bu sayfayı kapatmayın.' : status === 'error' ? 'Bulut kaydı doğrulanamadı. Bekleyen ilerlemeniz bu cihazda korunuyor.' : status === 'syncing' ? 'İlerlemeniz kaydediliyor…' : 'İlerlemeniz kaydedilmeyi bekliyor…'}
    {(status === 'error' || status === 'volatile') && <button type="button" className="ml-3 min-h-11 font-semibold underline" onClick={() => void persistUserStateToSupabase().then(() => hydrateUserStateFromSupabase()).catch(() => {})}>Tekrar dene</button>}
  </div>;
}
