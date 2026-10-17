import { ArrowRight, LockKeyhole } from 'lucide-react';

interface Props { onUpgrade: () => void; loading?: boolean; error?: string; onRetry?: () => void; }
export function MembershipPrompt({ onUpgrade, loading = false, error = '', onRetry }: Props) {
  return <section className="zp-membership-prompt" aria-label="Üyelikle devam et" aria-busy={loading}>
    <span className="zp-membership-icon" aria-hidden="true"><LockKeyhole size={22} /></span>
    <div><p className="zp-membership-eyebrow">ZEKAPARK ÜYELİĞİ</p>
      <h2>{loading ? 'Üyeliğin kontrol ediliyor…' : error ? 'Üyelik bilgisine ulaşılamadı' : 'Keşfe tüm bölümlerle devam et.'}</h2>
      <p>{error || 'Günde 3 temel soru, profilin ve kendi ilerlemen ücretsiz. Adaptif çalışma, denemeler, konu testleri, tekrar ve haftalık görevler aktif üyelikle açılır.'}</p>
      {error && onRetry && <button type="button" onClick={onRetry} className="zp-membership-retry">Yeniden kontrol et</button>}
      {!loading && <button type="button" onClick={onUpgrade} className="zp-membership-upgrade">{error ? 'Veli üyelik paneli' : 'Üyelik seçeneklerini gör'}<ArrowRight size={17} aria-hidden="true" /></button>}
      <small>Satın alma ve mevcut üyeliği geri yükleme veli panelinden yapılır.</small>
    </div>
  </section>;
}
