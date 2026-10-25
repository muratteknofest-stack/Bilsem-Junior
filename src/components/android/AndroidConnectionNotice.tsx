import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { WifiOff, X } from 'lucide-react';
import { connectionAvailable, subscribeConnection } from '../../lib/connection-status';

export function AndroidConnectionNotice() {
  const online = useSyncExternalStore(subscribeConnection, connectionAvailable, () => true);
  // Unmounting on recovery resets the collapsed state for the next interruption.
  return online ? null : <OfflineNotice />;
}
function OfflineNotice() {
  const [collapsed, setCollapsed] = useState(false);
  return createPortal(<aside className="bj-connection-notice" data-collapsed={collapsed} aria-label="Bağlantı durumu">
    {collapsed ? <button type="button" className="bj-connection-open" onClick={() => setCollapsed(false)} aria-label="İnternet bağlantısı yok. Ayrıntıyı göster"><WifiOff size={20} aria-hidden="true"/></button> : <>
      <WifiOff size={22} aria-hidden="true"/>
      <div role="status"><strong>Bağlantı kesildi</strong><p>Cevap kaydetmek ve abonelik işlemleri için internete bağlan. Kaydedilemeyen işlemi yeniden dene.</p></div>
      <button type="button" onClick={() => setCollapsed(true)} aria-label="Bağlantı uyarısını küçült"><X size={18} aria-hidden="true"/></button>
    </>}
  </aside>, document.body);
}
