import React, { useId } from 'react';

export function ShopierActivationForm({orderId,busy,onChange,onSubmit}:{orderId:string;busy:boolean;onChange:(value:string)=>void;onSubmit:React.FormEventHandler<HTMLFormElement>}) {
  const id=useId();
  return <form onSubmit={onSubmit} className="zp-billing-activation"><div className="zp-billing-activation-heading"><span aria-hidden="true">✦</span><div><h3>Paketiniz hazır mı?</h3><p>Sipariş numaranızla keşfin kapısını açın.</p></div></div><div className="zp-billing-form-row"><label htmlFor={id}>Shopier sipariş numarası<input id={id} required maxLength={80} autoComplete="off" placeholder="Sipariş numaranızı yazın" value={orderId} onChange={e=>onChange(e.target.value)} disabled={busy}/></label><button type="submit" disabled={busy||!orderId.trim()} className="zp-sales-button">{busy?'Doğrulanıyor…':'Siparişi doğrula ve erişimi aç'}<span aria-hidden="true">↗</span></button></div></form>;
}

