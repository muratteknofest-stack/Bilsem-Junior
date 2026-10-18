import { apiFetch } from '../lib/api-fetch';
import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  ExternalLink,
  FileText,
  KeyRound,
  Layers,
  Lock,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { apiUrl } from '../lib/api-client';
import type { PlatformInfo } from '../content/platform-info';
import { PLATFORM_INFO } from '../content/platform-info';
import './footer.css';

export type FooterModalTopic =
  | 'bilsem_guide'
  | 'pedagogy'
  | 'kvkk'
  | 'terms'
  | 'contact'
  | 'cognitive_domains'
  | 'exam_anxiety'
  | 'account_guide'
  | 'account_security';

interface TopicItem {
  id: FooterModalTopic;
  label: string;
  slug: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const topics: TopicItem[] = [
  { id: 'pedagogy', label: 'Platform hakkında', slug: 'zekapark-hakkinda', icon: Compass },
  { id: 'cognitive_domains', label: 'Çalışma alanları', slug: 'calisma-alanlari', icon: Layers },
  { id: 'account_guide', label: 'Hesap ve veli rehberi', slug: 'hesap-ve-veli-rehberi', icon: Users },
  { id: 'contact', label: 'İletişim ve destek', slug: 'iletisim-ve-destek', icon: MessageCircle },
  { id: 'kvkk', label: 'Gizlilik ve veriler', slug: 'gizlilik-ve-veriler', icon: Lock },
  { id: 'terms', label: 'Kullanım koşulları', slug: 'kullanim-kosullari', icon: FileText },
  { id: 'account_security', label: 'Hesap güvenliği', slug: 'hesap-guvenligi', icon: KeyRound },
];

interface FooterInfoModalProps {
  topic: FooterModalTopic;
  onClose: () => void;
  onSelectTopic?: (topic: FooterModalTopic) => void;
}

export function FooterInfoModal({ topic, onClose, onSelectTopic }: FooterInfoModalProps) {
  const [active, setActive] = useState(topic);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setActive(topic);
  }, [topic]);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const selected = topics.find(t => t.id === active) || topics[0];
  const [liveInfo, setLiveInfo] = useState<PlatformInfo | null>(null);
  const [policyError, setPolicyError] = useState('');
  const slug = selected?.slug;
  const dynamic = ['gizlilik-ve-veriler', 'kullanim-kosullari', 'iletisim-ve-destek'].includes(slug || '');

  useEffect(() => {
    setLiveInfo(null);
    setPolicyError('');
    if (!slug || !['gizlilik-ve-veriler', 'kullanim-kosullari', 'iletisim-ve-destek'].includes(slug)) return;

    const controller = new AbortController();
    apiFetch(apiUrl('/api/public/policy/' + slug), { signal: controller.signal, cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setLiveInfo)
      .catch(() => {
        if (!controller.signal.aborted) {
          setPolicyError('Güncel açıklama yüklenemedi. Yeniden deneyin veya ayrı bilgi sayfasını açın.');
        }
      });
    return () => controller.abort();
  }, [slug]);

  const info = dynamic
    ? liveInfo?.slug === slug
      ? liveInfo
      : undefined
    : PLATFORM_INFO.find(p => p.slug === slug);

  return (
    <dialog
      ref={dialog}
      className="platform-info-dialog"
      aria-labelledby="platform-info-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget && dialog.current) {
          const r = dialog.current.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
            onClose();
          }
        }
      }}
    >
      <div className="platform-info-dialog-header">
        <div className="platform-info-dialog-title-group">
          <span className="platform-info-dialog-badge">
            <Sparkles size={12} aria-hidden="true" />
            <span>{info?.badge || 'PLATFORM REHBERİ'}</span>
          </span>
          <h2 id="platform-info-title">{info?.title || selected.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="platform-info-dialog-close-icon"
          aria-label="Bilgi ekranını kapat"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>

      <nav aria-label="Bilgi konuları" className="platform-info-dialog-nav">
        {topics.map(t => {
          const IconComponent = t.icon;
          const isSelected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`platform-info-dialog-pill ${isSelected ? 'active' : ''}`}
              aria-pressed={isSelected}
              onClick={() => {
                setActive(t.id);
                onSelectTopic?.(t.id);
              }}
            >
              <IconComponent size={14} aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="platform-info-dialog-content">
        {dynamic && !info ? (
          <div className="platform-info-dialog-loading" role="status">
            <p>{policyError || 'Güncel açıklama yükleniyor…'}</p>
            <a href={`/bilgi/${slug}`} target="_blank" rel="noopener noreferrer" className="platform-info-dialog-ext-link">
              <span>Ayrı sayfada aç</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        ) : info ? (
          <>
            <div className="platform-info-dialog-hero">
              <p className="platform-info-dialog-desc">{info.description}</p>
            </div>
            <div className="platform-info-dialog-sections">
              {info.sections.map((s, idx) => (
                <section key={s.title} className="platform-info-dialog-card">
                  <div className="platform-info-dialog-card-header">
                    <span className="platform-info-dialog-sec-num" aria-hidden="true">
                      0{idx + 1}
                    </span>
                    <h3>{s.title}</h3>
                  </div>
                  <div className="platform-info-dialog-card-body">
                    {s.paragraphs.map(p => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="platform-info-dialog-footer">
              <a
                href={`/bilgi/${info.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-info-dialog-ext-link"
              >
                <span>Bu açıklamayı ayrı sayfada aç</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <button type="button" className="platform-info-dialog-done-btn" onClick={onClose}>
                Anladım
              </button>
            </div>
          </>
        ) : (
          <div className="platform-info-dialog-fallback">
            <p>
              Güncel kaynak bağlantıları ve eğitim içerikleri için{' '}
              <a href="/blog">Bilsem Junior blogunu</a> inceleyebilirsiniz. Resmî sınav koşulları için MEB duyurularını kontrol edin.
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}
