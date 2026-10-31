import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-fetch';
import { apiUrl } from '../lib/api-client';

export type RegistrationAvailability = 'loading' | 'open' | 'closed' | 'unavailable';

/** Display-only status. Account creation is always authorized by the server. */
export function useRegistrationAvailability() {
  const [status, setStatus] = useState<RegistrationAvailability>('loading');
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    apiFetch(apiUrl('/api/public/platform'), { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error('Status unavailable');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('registrationOpen' in data) || typeof data.registrationOpen !== 'boolean') throw Error('Invalid status');
        if (active) setStatus(data.registrationOpen ? 'open' : 'closed');
      })
      .catch(() => { if (active) setStatus('unavailable'); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);
  return status;
}
