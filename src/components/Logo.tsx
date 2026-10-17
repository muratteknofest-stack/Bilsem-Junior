import React from 'react';
import './brand.css';
interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean; showTagline?: boolean;
  theme?: 'light' | 'dark' | 'auto'; className?: string; onClick?: () => void;
}
export const Logo: React.FC<LogoProps> = ({size='md',showText=true,showTagline=true,theme='light',className='',onClick}) => (
  <div className={`bj-logo bj-logo-${size} ${className}`} data-theme={theme} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} aria-label={onClick?'BİLSEM Junior ana sayfasına git':undefined} onKeyDown={event=>{if(onClick&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onClick();}}}>
    <img className="bj-logo-icon" src="/logo.svg" alt={showText?'':'BİLSEM Junior'} width="64" height="64"/>
    {showText && <div className="bj-logo-copy"><span className="bj-logo-name" aria-label="BİLSEM Junior"><span className="bj-logo-bilsem" aria-hidden="true">BİLSEM</span><span className="bj-logo-junior" aria-hidden="true"><b>ju</b><b>ni</b><b>or</b><i/></span></span>{showTagline && <span className="bj-logo-tagline">BİLSEM’e hazırlık, oyunla gelişim</span>}</div>}
  </div>
);
