/** Build-time target: never an authorization or membership entitlement. */
export const isAndroidApp = import.meta.env?.VITE_APP_TARGET === 'android';

/** Native bundles contain the learning app, while articles are served on the public site. */
export function publicPageUrl(path: string) {
  return isAndroidApp ? `${import.meta.env.VITE_PUBLIC_SITE_URL}${path}` : path;
}
