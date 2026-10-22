import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShopierSalesPage } from '../src/components/ShopierSalesPage';

export function shopierMembershipPageHtml(config: React.ComponentProps<typeof ShopierSalesPage>) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f7f2"><title>Bilsem Junior · Üyelik paketleri</title><link rel="icon" href="/logo.svg"><link rel="stylesheet" href="/sales/sales.css"></head><body>${renderToStaticMarkup(React.createElement(ShopierSalesPage, config))}</body></html>`;
}
