import { ArrowRight, Crown, Gift, Puzzle, RefreshCw, Rocket, ShieldCheck, Sparkles, Star, UserPlus } from 'lucide-react';

interface Props { onUpgrade: () => void; onRegister?: () => void; loading?: boolean; error?: string; onRetry?: () => void; }
export function MembershipPrompt({ onUpgrade, onRegister, loading = false, error = '', onRetry }: Props) {
  return <section className="zp-membership-prompt" aria-label="Üyelikle devam et" aria-busy={loading} data-state={loading ? 'loading' : error ? 'error' : 'ready'}>
    <div className="zp-membership-layout">
      <div className="zp-membership-art" aria-hidden="true">
        <span className="zp-membership-spark zp-membership-spark-one"><Star size={22} /></span>
        <span className="zp-membership-spark zp-membership-spark-two"><Sparkles size={26} /></span>
        <span className="zp-membership-sticker zp-membership-puzzle"><Puzzle size={27} /></span>
        <span className="zp-membership-rocket"><Rocket size={57} strokeWidth={1.8} /></span>
        <span className="zp-membership-sticker zp-membership-crown"><Crown size={29} /></span>
        <span className="zp-membership-art-label">KEŞİF KULÜBÜ</span>
      </div>
      <div className="zp-membership-content">
        <p className="zp-membership-eyebrow"><Sparkles size={15} aria-hidden="true" /> BİRLİKTE KEŞFEDELİM</p>
        <h2>{loading ? 'Üyeliğin kontrol ediliyor…' : error ? 'Üyelik bilgisine ulaşılamadı' : 'Yeni bir maceraya hazır mısın?'}</h2>
        <p className="zp-membership-description">{error || (onRegister
          ? 'Üye ol, günlük 3 ücretsiz soruyla keşfe başla. Daha fazla çalışma için velinle birlikte abone ol.'
          : 'Abone ol; konu testleri, adaptif çalışma ve haftalık görevlerle yeni keşiflere yelken aç!')}</p>
        {!loading && !error && <ul className="zp-membership-perks" aria-label="Üyelikle açılan özellikler">
          <li><Puzzle size={15} aria-hidden="true" /> Renkli testler</li>
          <li><Rocket size={15} aria-hidden="true" /> Sana özel çalışma</li>
          <li><Crown size={15} aria-hidden="true" /> Haftalık görevler</li>
        </ul>}
        <div className="zp-membership-actions">
          {error && onRetry && <button type="button" onClick={onRetry} className="zp-membership-retry"><RefreshCw size={17} aria-hidden="true" />Yeniden kontrol et</button>}
          {!loading && onRegister && <button type="button" onClick={onRegister} className="zp-membership-register" aria-label="Üye ol"><UserPlus size={20} aria-hidden="true" /><span>Üye ol<small>Ücretsiz keşfe başla</small></span><ArrowRight size={18} aria-hidden="true" /></button>}
          {!loading && <button type="button" onClick={onUpgrade} className="zp-membership-upgrade" aria-label={error ? 'Veli üyelik paneli' : 'Abone ol'}>
            <Crown size={23} aria-hidden="true" /><span>{error ? 'Veli üyelik paneli' : 'Abone ol'}<small>Velinle birlikte devam et</small></span><ArrowRight size={19} aria-hidden="true" />
          </button>}
        </div>
        <p className="zp-membership-free"><Gift size={17} aria-hidden="true" /><span>Günlük 3 temel soru, profilin ve kendi ilerlemen ücretsiz.</span></p>
        <small className="zp-membership-parent"><ShieldCheck size={14} aria-hidden="true" />Satın alma ve mevcut üyeliği geri yükleme veli panelinden yapılır.</small>
      </div>
    </div>
  </section>;
}
