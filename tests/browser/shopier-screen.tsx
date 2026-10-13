import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {ShopierPackageCards} from '../../src/components/ShopierPackageCards';
import {SHOPIER_PLANS} from '../../src/lib/shopier-config';
const ready=new URLSearchParams(location.search).has('ready');
const plans=SHOPIER_PLANS.map((p,i)=>({...p,url:ready?`https://www.shopier.com/${i+1}`:null}));
createRoot(document.getElementById('root')!).render(<main className="p-4 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-4">Shopier paketleri</h1><ShopierPackageCards plans={plans} ready={ready}/></main>);
