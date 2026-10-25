import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { WifiOff, X } from 'lucide-react';
import { connectionAvailable, subscribeConnection } from '../../lib/connection-status';

export function AndroidConnectionNotice() {
  const online = useSyncExternalStore(subscribeConnection, connectionAvailable, () => true);
  // Unmounting on recovery resets dismissal for the next interruption.
  return online ? null : <OfflineNotice />;
}
function OfflineNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return createPortal(<aside className="bj-connection-notice" aria-label="Bağlantı durumu">
      <WifiOff size={22} aria-hidden="true"/>
      <div role="status"><strong>Bağlantı kesildi</strong><p>Cevap kaydetmek ve abonelik işlemleri için internete bağlan. Kaydedilemeyen işlemi yeniden dene.</p></div>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Bağlantı uyarısını kapat"><X size={18} aria-hidden="true"/></button>
  </aside>, document.body);
}
