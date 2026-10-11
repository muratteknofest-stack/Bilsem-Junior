import type { RequestHandler } from 'express';

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value !== url.origin) return null;
    return url.origin;
  } catch { return null; }
}

/** Bearer authentication remains mandatory. Origin checks also protect public JSON forms. */
export function requestSecurity(configuredOrigins: string): RequestHandler {
  const allowedOrigins = new Set(configuredOrigins.split(',').map(value => canonicalOrigin(value.trim())).filter((value): value is string => !!value));
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    const parsed = origin ? canonicalOrigin(origin) : null;
    const sameOrigin = parsed === `${req.protocol}://${req.get('host')}`;
    if ((origin && (!parsed || (!sameOrigin && !allowedOrigins.has(parsed)))) ||
        (!origin && req.get('Sec-Fetch-Site') === 'cross-site')) {
      return res.status(403).json({ error: 'İstek kaynağına izin verilmiyor.' });
    }
    if (origin && parsed) {
      res.setHeader('Access-Control-Allow-Origin', parsed);
      res.vary('Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) {
      return res.status(415).json({ error: 'İstek JSON biçiminde gönderilmelidir.' });
    }
    return next();
  };
}
