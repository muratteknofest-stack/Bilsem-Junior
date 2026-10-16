import React, { useEffect, useState } from 'react';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { withRequestDeadline } from '../lib/request-deadline';

/** Existing access only. No prices, purchase links, order redemption or checkout. */
export function NativeAccessStatus({ studentId }: { studentId: string }) {
  const [message, setMessage] = useState('Erişim bilgisi yükleniyor…');
  useEffect(() => {
    let active = true;
    const owner = auth.currentUser?.uid;
    setMessage('Erişim bilgisi yükleniyor…');
    withRequestDeadline(async signal => {
      const response = await authenticatedFetch('/api/parent/shopier/access?studentId=' + encodeURIComponent(studentId), { signal });
      if (!response.ok) throw new Error();
      const value = await response.json();
      const expiresAt = value.access?.expiresAt;
      const date = typeof expiresAt === 'string' ? new Date(expiresAt) : null;
      if (active && auth.currentUser?.uid === owner) setMessage(value.access?.active === true && date && Number.isFinite(date.getTime())
        ? `Erişim ${date.toLocaleDateString('tr-TR')} tarihine kadar aktif.`
        : value.enforced === true ? 'Bu öğrencinin aktif erişimi bulunmuyor.' : 'Mevcut ücretsiz kullanım devam ediyor.');
    }).catch(() => { if (active && auth.currentUser?.uid === owner) setMessage('Erişim bilgisi alınamadı. Bağlantınızı kontrol edip sayfayı yeniden açın.'); });
    return () => { active = false; };
  }, [studentId]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Öğrenci erişimi"><h2 className="font-bold">Öğrenci erişimi</h2><p role="status">{message}</p></section>;
}
