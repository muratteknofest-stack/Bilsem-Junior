import type { PlatformSettings } from '../src/lib/platform-settings';
import { playConfig, playSetupReady } from './google-play-client';
import { releaseBlockers } from '../src/lib/platform-settings';

// An operator switch cannot override missing legal or real-world acceptance records.
// Restore and receipt verification are independent of this new-sales check.
export function paidSalesReady(settings: PlatformSettings): boolean {
  return playConfig().enabled && playSetupReady() && releaseBlockers(settings).length === 0;
}
