/** Production policy for both Vercel static files and the Express API. */
export const browserDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  styleSrcElem: ["'self'", 'https://fonts.googleapis.com'],
  // React charts and animations require style attributes, never inline scripts.
  styleSrcAttr: ["'unsafe-inline'"],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://images.pexels.com', 'https://screens.cdn.wordwall.net'],
  mediaSrc: ["'self'", 'blob:'],
  connectSrc: ["'self'", 'https://vtcsoqohkiagbwatlabk.supabase.co', 'wss://vtcsoqohkiagbwatlabk.supabase.co'],
  frameSrc: ['https://wordwall.net'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
};
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export const contentSecurityPolicy = Object.entries(browserDirectives).map(([key, values]) =>
  `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}${values.length ? ` ${values.join(' ')}` : ''}`,
).join('; ');

export function resolveConnectSrcOrigins(customSupabaseUrl?: string): string[] {
  const base = [...browserDirectives.connectSrc];
  if (!customSupabaseUrl) return base;
  try {
    const parsed = new URL(customSupabaseUrl);
    if (parsed.protocol === "https:") {
      const httpsOrigin = parsed.origin;
      const wssOrigin = `wss://${parsed.host}`;
      return ["'self'", httpsOrigin, wssOrigin];
    }
  } catch {
    // Ignore malformed custom URL and preserve strict defaults
  }
  return base;
}

export function buildContentSecurityPolicy(customSupabaseUrl?: string): string {
  const directives = {
    ...browserDirectives,
    connectSrc: resolveConnectSrcOrigins(customSupabaseUrl),
  };
  return Object.entries(directives)
    .map(([key, values]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}${values.length ? ` ${values.join(" ")}` : ""}`)
    .join("; ");
}
