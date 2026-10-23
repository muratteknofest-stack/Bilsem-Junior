import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { PlayOffer, PlayPurchase, PlayPlanId } from './google-play-contract';
export interface PlayPurchases { purchases: PlayPurchase[]; cancelled?: boolean; }
interface PlayBillingPlugin {
  catalog(options: { productId: string }): Promise<{ offers: PlayOffer[] }>;
  purchase(options: { productId: string; basePlanId: PlayPlanId; accountId: string; profileId: string }): Promise<PlayPurchases>;
  restore(): Promise<PlayPurchases>;
  addListener(event: 'purchasesUpdated', callback: (event: PlayPurchases) => void): Promise<PluginListenerHandle>;
}
export const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling');

/** A build label alone cannot turn a browser or another native OS into Play. */
export function isGooglePlayBillingPlatform(platform: Pick<typeof Capacitor, 'isNativePlatform' | 'getPlatform'> = Capacitor) {
  return platform.isNativePlatform() && platform.getPlatform() === 'android';
}
