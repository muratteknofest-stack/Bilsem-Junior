import React from 'react';
import { safeShopierUrl } from '../lib/shopier-config';
export type ShopierPlanView={id:string;title:string;days:number;amountKurus:number;url:string|null};
const presentation:Record<string,{tone:string;tag:string;intro:string;symbol:string}>={
  monthly:{tone:'peach',tag:'MERAKLA BAŞLA',intro:'Yeni bir keşif alışkanlığına ilk adım.',symbol:'✳'},
  quarterly:{tone:'lilac',tag:'DÜZENLİ KEŞİF',intro:'Her gün küçük bir adım, yeni bir keşif.',symbol:'✦'},
  annual:{tone:'mint',tag:'UZUN SOLUKLU YOLCULUK',intro:'Merakına kocaman bir alan aç.',symbol:'✿'},
};
const features=['44 konuda seçerek çalışma','Soru sayısını seçebildiğin adaptif testler','Denemeler ve cevap açıklamaları','Veli panelinde ilerleme takibi'];
export function ShopierPackageCards({plans,ready,checkout='shopier'}:{plans:ShopierPlanView[];ready:boolean;checkout?:'shopier'|'parent'}) {
  return <div className="zp-plan-grid">{plans.map(p=>{
    const look=presentation[p.id]||presentation.monthly;
    const canBuy=Boolean(ready&&p.url&&safeShopierUrl(p.url));
    return <section key={p.id} className={`zp-plan-card zp-plan-${look.tone}`} aria-labelledby={`plan-${p.id}`}>
      <div className="zp-plan-top"><span className="zp-plan-tag">{look.tag}</span><span className="zp-plan-flower" aria-hidden="true">{look.symbol}</span></div>
      <h3 id={`plan-${p.id}`}>{p.title}</h3><p className="zp-plan-intro">{look.intro}</p>
      <p className="zp-plan-price">{(p.amountKurus/100).toLocaleString('tr-TR')} <span>TL</span></p>
      <p className="zp-plan-duration">{p.days} gün erişim <span aria-hidden="true">·</span> Bir öğrenci</p>
      <div className="zp-plan-divider"/>
      <p className="zp-plan-feature-title">Renkli dünyanın tamamı dahil</p>
      <ul className="zp-plan-features">{features.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
      {canBuy?<a className="zp-sales-button zp-plan-cta" href={checkout==='parent'?'/login?role=parent':p.url!} {...(checkout==='shopier'?{target:'_blank',rel:'noopener noreferrer'}:{})}>{checkout==='parent'?'Veli panelinden satın al':'Shopier’den satın al'}<span aria-hidden="true">↗</span></a>:<button type="button" disabled className="zp-sales-button zp-plan-cta">Satış henüz açılmadı<span aria-hidden="true">♡</span></button>}
      <p className="zp-plan-small">Tek seferlik ödeme<br/>Otomatik yenileme yok</p>
    </section>;
  })}</div>;
}
