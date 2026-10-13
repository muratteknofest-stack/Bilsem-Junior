import React from 'react';
import { safeShopierUrl } from '../lib/shopier-config';
export type ShopierPlanView={id:string;title:string;days:number;amountKurus:number;url:string|null};
export function ShopierPackageCards({plans,ready}:{plans:ShopierPlanView[];ready:boolean}) {
  return <div className="grid gap-3 sm:grid-cols-2">{plans.map(p=><section key={p.id} className="rounded-xl border p-4 space-y-2">
    <h3 className="font-bold">{p.title} · {p.days} gün</h3><p className="text-xl font-bold">{p.amountKurus/100} TL</p>
    <p className="text-sm">Bir öğrenci · Tek seferlik ödeme · Otomatik yenileme yok</p>
    {ready&&p.url&&safeShopierUrl(p.url)?<a className="inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-4 text-white" href={p.url} target="_blank" rel="noopener noreferrer">Shopier’den satın al</a>:<button type="button" disabled className="min-h-11 rounded-lg border px-4">Satış henüz açılmadı</button>}
  </section>)}</div>;
}
