import React from 'react';
import { ArrowUpRight, Mail, ShieldCheck } from 'lucide-react';
import type { UserRole } from '../types';
import { FOOTER_GROUPS, SUPPORT_EMAIL } from '../content/platform-info';
import { Logo } from './Logo';
import './footer.css';

interface FooterProps {
  onNavigate: (route: string) => void;
  onNavigateToLogin: (role: UserRole) => void;
}
export function Footer({ onNavigate, onNavigateToLogin }: FooterProps) {
  return <footer className="platform-footer">
    <div className="platform-footer-wrap">
      <div className="platform-footer-intro">
        <div><p className="platform-footer-eyebrow">MERAKTAN KEŞFE</p><h2>Birlikte düşünün.<br />Her adımı fark edin.</h2><p>1–4. sınıflar için düşünme alıştırmaları.<br />Öğrenciler için keşif, veliler için takip alanı.</p></div>
        <div className="platform-footer-actions"><button type="button" onClick={() => onNavigate('register')}>Ailece hesap oluştur <ArrowUpRight size={18} aria-hidden="true" /></button><div><button type="button" onClick={() => onNavigateToLogin('student')}>Öğrenci girişi</button><button type="button" onClick={() => onNavigateToLogin('parent')}>Veli girişi</button></div></div>
      </div>
      <div className="platform-footer-grid"><div className="platform-footer-brand"><Logo size="md" showTagline={false} /><p>Örüntü, mantık, dikkat, görsel algı, matris, uzamsal düşünme, sayılar ve kodlama.</p><a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={16} aria-hidden="true" />{SUPPORT_EMAIL}</a><span>E-posta uygulamanızdan gönderin.</span></div>
        {FOOTER_GROUPS.map(group => <nav key={group.title} aria-label={group.title}><h3>{group.title}</h3>{group.links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>)}
      </div>
      <div className="platform-footer-note"><ShieldCheck size={19} aria-hidden="true" /><p>ZekaPark bağımsız bir eğitim platformudur. MEB veya BİLSEM ile kurumsal bağlantısı yoktur. Alıştırmalar tanılama aracı değildir ve sınav başarısı garantisi sunmaz.</p></div>
      <div className="platform-footer-bottom"><span>© {new Date().getFullYear()} ZekaPark · Merakla büyüyen zihinler için.</span><a href="/blog/feed.xml">Blog RSS</a></div>
    </div>
  </footer>;
}
