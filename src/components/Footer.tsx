import React, { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  Copy,
  FileText,
  GraduationCap,
  Heart,
  KeyRound,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  Palette,
  Rss,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import type { UserRole } from '../types';
import { FOOTER_GROUPS, SUPPORT_EMAIL } from '../content/platform-info';
import { Logo } from './Logo';
import './footer.css';

interface FooterProps {
  onNavigate: (route: string) => void;
  onNavigateToLogin: (role: UserRole) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  Sparkles,
  BookOpen,
  ShieldCheck,
  Compass,
  Layers,
  Users,
  Trophy,
  Heart,
  Palette,
  MessageCircle,
  Lock,
  FileText,
  KeyRound,
  Rss,
};

const COGNITIVE_SKILLS = [
  { label: 'Örüntü', emoji: '🧩', colorClass: 'zp-chip-emerald' },
  { label: 'Mantık', emoji: '💡', colorClass: 'zp-chip-indigo' },
  { label: 'Dikkat', emoji: '🎯', colorClass: 'zp-chip-amber' },
  { label: 'Görsel Algı', emoji: '👁️', colorClass: 'zp-chip-purple' },
  { label: 'Matris', emoji: '🔢', colorClass: 'zp-chip-teal' },
  { label: 'Uzamsal Düşünme', emoji: '📐', colorClass: 'zp-chip-sky' },
  { label: 'Sayılar', emoji: '🧮', colorClass: 'zp-chip-rose' },
  { label: 'Kodlama', emoji: '💻', colorClass: 'zp-chip-violet' },
];

export function Footer({ onNavigate, onNavigateToLogin }: FooterProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch {
      // Fallback silently if clipboard permissions are denied
    }
  };

  return (
    <footer className="platform-footer">
      <div className="platform-footer-wrap">
        {/* Upper CTA Intro Card */}
        <div className="platform-footer-intro">
          <div>
            <p className="platform-footer-eyebrow">
              <Sparkles size={12} aria-hidden="true" /> MERAKTAN KEŞFE
            </p>
            <h2>
              Birlikte düşünün.
              <br />
              Her adımı fark edin.
            </h2>
            <p>
              1–4. sınıflar için düşünme alıştırmaları.
              <br />
              Öğrenciler için keşif, veliler için takip alanı.
            </p>
          </div>
          <div className="platform-footer-actions">
            <a href="/paketler" className="platform-footer-btn-secondary">Shopier paketleri</a>
            <a href="/en/" lang="en" hrefLang="en" className="platform-footer-btn-secondary">English · Thinking games</a>
            <button
              type="button"
              className="platform-footer-btn-primary"
              onClick={() => onNavigate('register')}
            >
              Ailece hesap oluştur <ArrowUpRight size={18} aria-hidden="true" />
            </button>
            <div className="platform-footer-btn-group">
              <button
                type="button"
                className="platform-footer-btn-secondary"
                onClick={() => onNavigateToLogin('student')}
              >
                <GraduationCap size={15} aria-hidden="true" /> Öğrenci girişi
              </button>
              <button
                type="button"
                className="platform-footer-btn-secondary"
                onClick={() => onNavigateToLogin('parent')}
              >
                <UserCheck size={15} aria-hidden="true" /> Veli girişi
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Navigation & Brand Grid */}
        <div className="platform-footer-grid">
          {/* Brand & Cognitive Pills & Contact */}
          <div className="platform-footer-brand">
            <Logo size="md" showTagline={false} />

            <div className="platform-footer-pills-wrap">
              <p className="platform-footer-pills-label">Temel Bilişsel Beceriler</p>
              <div className="platform-footer-pills" role="list" aria-label="Bilişsel beceri alanları">
                {COGNITIVE_SKILLS.map(skill => (
                  <span
                    key={skill.label}
                    role="listitem"
                    className={`platform-footer-chip ${skill.colorClass}`}
                  >
                    <span aria-hidden="true">{skill.emoji}</span>
                    <span>{skill.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="platform-footer-contact-card">
              <div className="platform-footer-contact-header">
                <span className="platform-footer-contact-title">
                  <Mail size={13} aria-hidden="true" /> İletişim & Geri Bildirim
                </span>
              </div>
              <div className="platform-footer-email-row">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="platform-footer-email-link"
                  title="E-posta uygulamasında aç"
                >
                  <Mail size={14} aria-hidden="true" />
                  <span>{SUPPORT_EMAIL}</span>
                </a>
                <button
                  type="button"
                  className={`platform-footer-copy-btn ${copiedEmail ? 'copied' : ''}`}
                  onClick={handleCopyEmail}
                  aria-label={copiedEmail ? 'E-posta panoya kopyalandı' : 'E-posta adresini kopyala'}
                  title={copiedEmail ? 'Kopyalandı!' : 'Kopyala'}
                >
                  {copiedEmail ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                </button>
              </div>
              <p className="platform-footer-contact-hint">
                E-posta uygulamanızdan gönderin. Sorularınıza ve bildirimlerinize özenle yanıt veriyoruz.
              </p>
            </div>
          </div>

          {/* Navigation Columns */}
          {FOOTER_GROUPS.map(group => {
            const GroupIcon = (group.icon && ICON_MAP[group.icon]) || Sparkles;
            return (
              <nav key={group.title} className="platform-footer-col" aria-label={group.title}>
                <div className="platform-footer-col-header">
                  <div className="platform-footer-col-icon" aria-hidden="true">
                    <GroupIcon size={14} />
                  </div>
                  <h3>{group.title}</h3>
                </div>
                <div className="platform-footer-link-list">
                  {group.links.map(link => {
                    const LinkIcon = (link.icon && ICON_MAP[link.icon]) || ArrowUpRight;
                    return (
                      <a key={link.href} href={link.href} className="platform-footer-link-card">
                        <span className="platform-footer-link-card-icon" aria-hidden="true">
                          <LinkIcon size={15} />
                        </span>
                        <div className="platform-footer-link-info">
                          <div className="platform-footer-link-title-row">
                            <span className="platform-footer-link-label">{link.label}</span>
                            {link.tag && <span className="platform-footer-link-tag">{link.tag}</span>}
                          </div>
                          {link.desc && <span className="platform-footer-link-desc">{link.desc}</span>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </nav>
            );
          })}
        </div>

        {/* Independence & Trust Disclaimer Note */}
        <div className="platform-footer-note">
          <div className="platform-footer-note-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <p>
            <strong>BİLSEM Junior bağımsız bir eğitim platformudur.</strong> MEB veya BİLSEM ile kurumsal bağlantısı yoktur.
            Alıştırmalar tanılama aracı değildir ve sınav başarısı garantisi sunmaz.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="platform-footer-bottom">
          <div className="platform-footer-bottom-copy">
            <span>© {new Date().getFullYear()} BİLSEM Junior · Merakla büyüyen zihinler için.</span>
          </div>
          <div className="platform-footer-bottom-links">
            <a href="/blog/feed.xml" className="platform-footer-rss-link">
              <Rss size={13} aria-hidden="true" />
              <span>Blog RSS</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

