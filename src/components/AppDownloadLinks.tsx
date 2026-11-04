import React from 'react';
import { ArrowUpRight, Smartphone, Sparkles } from 'lucide-react';
import { safeAppStoreUrl, safePlayStoreUrl } from '../lib/play-listing';

export interface AppDownloadState {
  storeUrl: string | null;
  appStoreUrl?: string | null;
  status?: 'loading' | 'ready' | 'unavailable';
}

/** Publication links are independent of subscription sales and account access. */
export function AppDownloadLinks({ downloads, compact = false }: { downloads: AppDownloadState; compact?: boolean }) {
  const stores = [
    { name: 'Google Play', device: 'Android telefon ve tablet', theme: 'android', url: safePlayStoreUrl(downloads.storeUrl) ? downloads.storeUrl : null },
    { name: 'App Store', device: 'iPhone ve iPad', theme: 'ios', url: safeAppStoreUrl(downloads.appStoreUrl) ? downloads.appStoreUrl : null },
  ];
  return <div className={`bj-app-links${compact ? ' bj-app-links--compact' : ''}`} aria-label="Uygulamayı indir">
    {stores.map(store => {
      const content = <><span className="bj-app-icon" aria-hidden="true">{store.theme === 'android'
        ? <svg viewBox="0 0 32 36" width="28" height="32"><path d="M2 2 20 18 2 34Z" fill="#34a853"/><path d="m2 2 23 13-5 3Z" fill="#4285f4"/><path d="m20 18 5-3 5 3-5 3Z" fill="#fbbc04"/><path d="m2 34 18-16 5 3Z" fill="#ea4335"/></svg>
        : <Smartphone size={30}/>}</span><span className="bj-app-copy"><small>{store.url ? 'Uygulamayı keşfet' : downloads.status === 'loading' ? 'Bağlantı kontrol ediliyor' : downloads.status === 'unavailable' ? 'Bağlantı şu anda alınamadı' : 'İndirme bağlantısı yakında'}</small><strong>{store.name}</strong>{!compact && <span>{store.device}</span>}</span><span className="bj-app-arrow" aria-hidden="true">{store.url ? <ArrowUpRight size={20}/> : <Sparkles size={18}/>}</span></>;
      return store.url
        ? <a key={store.name} className={`bj-app-link bj-app-link--${store.theme}`} href={store.url} target="_blank" rel="noopener noreferrer" aria-label={`Bilsem Junior uygulamasını ${store.name} üzerinden indir (yeni sekme)`}>{content}</a>
        : <div key={store.name} className={`bj-app-link bj-app-link--${store.theme} bj-app-link--pending`} role="group" aria-label={`${store.name}: ${downloads.status === 'loading' ? 'kontrol ediliyor' : downloads.status === 'unavailable' ? 'bağlantı alınamadı' : 'indirme bağlantısı yakında'}`}>{content}</div>;
    })}
  </div>;
}
