import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-fetch';
import { apiUrl } from '../lib/api-client';
import { isAndroidApp } from '../lib/native-app';
import { safeAppStoreUrl, safePlayStoreUrl } from '../lib/play-listing';
import type { AppDownloadState } from '../components/AppDownloadLinks';

export function useAppDownloads() {
  const [downloads, setDownloads] = useState<AppDownloadState>({ storeUrl: null, appStoreUrl: null, status: 'loading' });
  useEffect(() => {
    if (isAndroidApp) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 10000);
    apiFetch(apiUrl('/api/public/membership'), { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error('Store links unavailable');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('storeUrl' in data)) throw Error('Invalid store links');
        if (active) setDownloads({ status: 'ready', storeUrl: safePlayStoreUrl(data.storeUrl) ? data.storeUrl : null,
          appStoreUrl: 'appStoreUrl' in data && safeAppStoreUrl(data.appStoreUrl) ? data.appStoreUrl : null });
      })
      .catch(() => { if (active) setDownloads({ storeUrl: null, appStoreUrl: null, status: 'unavailable' }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);
  return downloads;
}
