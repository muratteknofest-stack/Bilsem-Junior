import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { PLATFORM_INFO } from '../content/platform-info';
import './footer.css';
export type FooterModalTopic = 'bilsem_guide' | 'pedagogy' | 'kvkk' | 'terms' | 'contact' | 'cognitive_domains' | 'exam_anxiety';
const topics: { id: FooterModalTopic; label: string; slug: string }[] = [
  { id: 'pedagogy', label: 'Platform hakkında', slug: 'zekapark-hakkinda' },
  { id: 'cognitive_domains', label: 'Çalışma alanları', slug: 'calisma-alanlari' },
  { id: 'kvkk', label: 'Gizlilik ve veriler', slug: 'gizlilik-ve-veriler' },
  { id: 'terms', label: 'Kullanım koşulları', slug: 'kullanim-kosullari' },
  { id: 'contact', label: 'İletişim', slug: 'iletisim-ve-destek' },
];
interface FooterInfoModalProps { topic: FooterModalTopic; onClose: () => void; onSelectTopic?: (topic: FooterModalTopic) => void }
export function FooterInfoModal({ topic, onClose, onSelectTopic }: FooterInfoModalProps) {
  const [active, setActive] = useState(topic);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setActive(topic); }, [topic]);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  const selected = topics.find(t => t.id === active);
  const info = PLATFORM_INFO.find(p => p.slug === selected?.slug);
  return <dialog ref={dialog} className="platform-info-dialog" aria-labelledby="platform-info-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget && dialog.current) { const r = dialog.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="platform-info-dialog-header"><h2 id="platform-info-title">{info?.title || 'BİLSEM ve aile rehberleri'}</h2><button type="button" onClick={onClose} aria-label="Bilgi ekranını kapat"><X aria-hidden="true" size={22} /></button></div>
    <nav aria-label="Bilgi konuları" className="platform-info-dialog-nav">{topics.map(t => <button key={t.id} type="button" aria-pressed={active === t.id} onClick={() => { setActive(t.id); onSelectTopic?.(t.id); }}>{t.label}</button>)}</nav>
    <div className="platform-info-dialog-content">{info ? <><p>{info.description}</p>{info.sections.map(s => <section key={s.title}><h3>{s.title}</h3>{s.paragraphs.map(p => <p key={p}>{p}</p>)}</section>)}<p><a href={`/bilgi/${info.slug}`} target="_blank" rel="noopener noreferrer">Bu açıklamayı ayrı sayfada aç</a></p></> : <p>Güncel kaynak bağlantıları ve eğitim içerikleri için <a href="/blog">ZekaPark blogunu</a> inceleyebilirsiniz. Resmî sınav koşulları için MEB duyurularını kontrol edin.</p>}</div>
  </dialog>;
}
