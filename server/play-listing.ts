import { playConfig } from './google-play-client';
import { safeAppStoreUrl } from '../src/lib/play-listing';

/** Only set the publication flag after the actual store listing is accessible. */
export function playStoreListing() {
  return process.env.GOOGLE_PLAY_STORE_PUBLISHED === 'true'
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(playConfig().packageName)}` : null;
}

export function appStoreListing() {
  const url = process.env.APP_STORE_URL;
  return process.env.APP_STORE_PUBLISHED === 'true' && safeAppStoreUrl(url) ? url : null;
}
