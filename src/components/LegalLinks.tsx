import React, { lazy, Suspense, useState, type MouseEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { LEGAL_DOCUMENTS } from '../content/legal-documents';
import { publicPageUrl } from '../lib/native-app';
import type { FooterModalTopic } from './FooterInfoModal';
import { useAndroidBack } from '../hooks/useAndroidBack';

const FooterInfoModal = lazy(() => import('./FooterInfoModal').then(module => ({ default: module.FooterInfoModal })));

interface Props { mode?: 'panel' | 'entry' | 'trigger' | 'purchase'; disabled?: boolean; }

/** Anchors remain copyable and openable in a new tab; ordinary taps keep the app mounted. */
export function LegalLinks({ mode = 'panel', disabled = false }: Props) {
  const [topic, setTopic] = useState<FooterModalTopic | null>(null);
  useAndroidBack(() => setTopic(null), Boolean(topic));
  const selected = mode === 'entry' ? LEGAL_DOCUMENTS.slice(0, 2) : mode === 'purchase' ? LEGAL_DOCUMENTS.filter(item => ['kvkk', 'terms', 'subscription'].includes(item.id)) : LEGAL_DOCUMENTS;
  const open = (event: MouseEvent<HTMLAnchorElement>, id: FooterModalTopic) => {
    if (disabled) { event.preventDefault(); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setTopic(id);
  };
  return <>
    <nav className={`bj-legal-links bj-legal-${mode}`} aria-label="Yasal bilgiler">
      {mode === 'panel' && <strong>Yasal bilgiler ve hesap hakları</strong>}
      {mode !== 'trigger' && selected.map(item => <a key={item.id} href={publicPageUrl('/bilgi/' + item.slug)} onClick={event => open(event, item.id)} aria-disabled={disabled || undefined}>{mode === 'entry' ? item.id === 'kvkk' ? 'Gizlilik / KVKK' : 'Koşullar' : item.label}</a>)}
      {(mode === 'trigger' || mode === 'entry') && <button type="button" disabled={disabled} onClick={() => setTopic('kvkk')}><ShieldCheck size={15} aria-hidden="true"/>Yasal bilgiler</button>}
    </nav>
    {topic && <Suspense fallback={<p role="status">Yasal bilgiler hazırlanıyor…</p>}><FooterInfoModal topic={topic} onClose={() => setTopic(null)}/></Suspense>}
  </>;
}
