import React from 'react';
import { APP_BRAND } from '../lib/brand';
import './brand.css';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, showTagline = true, theme = 'light', className = '', onClick }) => (
  <div className={'bj-logo ' + className} data-size={size} data-theme={theme}
    onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
    aria-label={onClick ? APP_BRAND.name + ' ana sayfasına git' : undefined}
    onKeyDown={event => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }}>
    <img className="bj-logo-symbol" src="/logo.svg" width="48" height="48" alt={showText ? '' : 'Bilsem Junior · kitap ve keşif yıldızı logosu'} />
    {showText && <div className="bj-logo-copy"><span className="bj-wordmark">Bilsem <span>Junior</span></span>{showTagline && <span className="bj-logo-tagline">{APP_BRAND.tagline}</span>}</div>}
  </div>
);
