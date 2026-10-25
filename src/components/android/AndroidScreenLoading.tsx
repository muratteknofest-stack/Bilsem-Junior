import './android-loading.css';

/** A stable loading surface avoids a blank screen while lazy sections arrive. */
export function AndroidScreenLoading() {
  return <div className="bj-screen-loading" role="status" aria-live="polite"><img src="/brand/junior-fox.svg" alt="" width={58} height={66}/><strong>Keşif alanın hazırlanıyor</strong><p>Birazdan devam edebilirsin.</p><span aria-hidden="true"/><span className="sr-only">Yükleniyor</span></div>;
}
