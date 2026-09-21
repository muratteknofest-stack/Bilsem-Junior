import React, { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { legalConfig } from '../lib/legal-config';
import {
  createBillingPortal,
  createCheckout,
  getBillingStatus,
  openTrustedBillingUrl,
  type BillingStatus,
} from '../services/billing-api-service';

export const BillingCard: React.FC = () => {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getBillingStatus()
      .then((next) => { if (active) setStatus(next); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Abonelik durumu alınamadı.'); });
    return () => { active = false; };
  }, []);

  const redirect = async (kind: 'checkout' | 'portal') => {
    setBusy(true);
    setError(null);
    try {
      const url = kind === 'checkout' ? await createCheckout() : await createBillingPortal();
      openTrustedBillingUrl(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ödeme işlemi başlatılamadı.');
      setBusy(false);
    }
  };

  const active = status?.status === 'active' || status?.status === 'trialing';
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <h2 className="font-extrabold text-zinc-900 dark:text-white">Aile Premium aboneliği</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {legalConfig.premiumPriceDisplay} · Yenilenen abonelik · İptal abonelik portalından yapılır.
          </p>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Kart bilgileri ZekaPark sunucusunda tutulmaz; ödeme sağlayıcısının barındırdığı sayfa kullanılır.
          </p>
        </div>
        {status?.enabled ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void redirect(active ? 'portal' : 'checkout')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Yönlendiriliyor…' : active ? 'Aboneliği yönet' : 'Güvenli ödemeye geç'}
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Ödeme henüz etkin değil</span>
        )}
      </div>
      {active && status?.currentPeriodEnd && (
        <p className="mt-3 text-xs text-emerald-700">Aktif · dönem sonu {new Date(status.currentPeriodEnd).toLocaleDateString('tr-TR')}</p>
      )}
      {error && <p className="mt-3 text-xs font-semibold text-rose-700">{error}</p>}
    </section>
  );
};
