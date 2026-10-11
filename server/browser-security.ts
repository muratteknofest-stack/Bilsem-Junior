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
  connectSrc: ["'self'", 'https://vehhvsdkifwstbjhnhao.supabase.co', 'wss://vehhvsdkifwstbjhnhao.supabase.co'],
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
