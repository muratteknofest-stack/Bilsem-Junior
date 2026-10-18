import { playConfig } from './google-play-client';

/** Only set the publication flag after the actual store listing is accessible. */
export function playStoreListing() {
  return process.env.GOOGLE_PLAY_STORE_PUBLISHED === 'true'
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(playConfig().packageName)}` : null;
}
