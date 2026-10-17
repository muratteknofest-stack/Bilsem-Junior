import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => { window.removeEventListener('online', onChange); window.removeEventListener('offline', onChange); };
}
export function NativeConnectionNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <div role="status" className="zp-native-connection"><WifiOff size={17} aria-hidden="true"/><span>Bağlantı yok. Yeni işlem için internete bağlan.</span></div>;
}
