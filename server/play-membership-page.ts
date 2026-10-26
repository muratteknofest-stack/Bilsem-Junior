import React from 'react';
import { APP_BRAND } from '../src/lib/brand';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayMembershipPage, type PlayMembershipPageProps } from '../src/components/PlayMembershipPage';
import { readPlatformSettings } from './platform-settings';
import { releaseBlockers } from '../src/lib/platform-settings';
import { playConfig, playSetupReady } from './google-play-client';
import { playStoreListing } from './play-listing';

export async function publicPlayMembership(readSettings = readPlatformSettings) {
  const { settings } = await readSettings();
  return { brand: APP_BRAND.name, storeUrl: playStoreListing(),
    ready: playConfig().enabled && playSetupReady() && releaseBlockers(settings).length === 0 };
}
export function playMembershipPageHtml(config: PlayMembershipPageProps) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f7f2"><meta name="description" content="Bilsem Junior Google Play üyeliği: aylık, 3 aylık ve yıllık aboneliklerle aynı öğrenci hesabında web ve Android erişimi."><title>Bilsem Junior · Google Play üyeliği</title><link rel="icon" href="/logo.svg"><link rel="stylesheet" href="/sales/sales.css"></head><body>${renderToStaticMarkup(React.createElement(PlayMembershipPage, config))}</body></html>`;
}
