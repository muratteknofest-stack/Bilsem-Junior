import React from 'react';
import { privacyResponseDeadline } from '../../lib/privacy-rights';

export function PrivacyRequestDeadline({ receivedAt, status, now }: { receivedAt: string; status: string; now?: number }) {
  if (!['open', 'reviewing'].includes(status)) return null;
  const deadline = privacyResponseDeadline(receivedAt, now);
  if (!deadline) return <p role="alert" className="text-sm text-rose-200">Başvuru tarihi doğrulanamadı; yanıt süresini elle kontrol edin.</p>;
  return <p className={`rounded-xl p-3 text-sm ${deadline.overdue ? 'bg-rose-950 text-rose-200' : 'bg-amber-950 text-amber-200'}`}>
    KVKK yanıt son tarihi: <time dateTime={deadline.dueAt.toISOString()}>{deadline.dueAt.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</time>
    {' · '}{deadline.overdue ? 'Süre aşıldı; gecikmeden değerlendirin.' : `${deadline.daysRemaining} gün kaldı.`}
    {' '}Bu süre yanıt içindir; otomatik silme yapmaz. E-postayla gelen başvurularda ilk teslim tarihini esas alın.
  </p>;
}
