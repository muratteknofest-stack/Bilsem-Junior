import React from 'react';

export function LearningExpiryNotice({ busy, onReload }: { busy: boolean; onReload?: () => void }) {
  return <div className="zp-focus-expired" role="status">
    <span>Süre doldu. Kaydedilmiş cevaplarınla sonuçlarını açabilirsin.</span>
    <button type="button" disabled={busy || !onReload} onClick={onReload}>
      {busy ? 'Sonuçlar yükleniyor…' : 'Sonuçları yükle'}
    </button>
  </div>;
}
