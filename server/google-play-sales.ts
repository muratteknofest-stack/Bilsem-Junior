import type { PlatformSettings } from '../src/lib/platform-settings';
import { playConfig, playSetupReady } from './google-play-client';
import { licenseTestLegalReady } from './google-play-license-test';

// Paid sales have their own explicit operator switch and server/payment checks.
// General platform acceptance flags remain truthful and are reported separately;
// they are not assertions about a customer's purchase or entitlement.
export function paidSalesReady(settings: PlatformSettings): boolean {
  return playConfig().enabled && playSetupReady() && licenseTestLegalReady(settings);
}
