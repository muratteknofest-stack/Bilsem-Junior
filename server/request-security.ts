import type { RequestHandler } from 'express';

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value !== url.origin) return null;
    return url.origin;
  } catch { return null; }
}

/** Only these public HTML pages may be opened by a cross-site top-level link. */
function publicDocumentPath(path: string, format: unknown): boolean {
  return /^\/public\/membership\/page\/?$/.test(path)
    || (format === 'html' && /^\/public\/policy\/(?:gizlilik-ve-veriler|kullanim-kosullari|iletisim-ve-destek|hesap-ve-veri-silme|abonelik-iptal-ve-iade|cerez-ve-yerel-depolama)\/?$/.test(path));
}

/** Bearer authentication remains mandatory. Origin checks also protect public JSON forms. */
export function requestSecurity(configuredOrigins: string): RequestHandler {
  const allowedOrigins = new Set(configuredOrigins.split(',').map(value => canonicalOrigin(value.trim())).filter((value): value is string => !!value));
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    const parsed = origin ? canonicalOrigin(origin) : null;
    const sameOrigin = parsed === `${req.protocol}://${req.get('host')}`;
    // A link from another website is a document navigation, not an API fetch.
    // Keep this exception read-only and limited to public HTML; JSON, frames,
    // mutations, private endpoints and explicit Origin validation stay protected.
    const publicNavigation = ['GET', 'HEAD'].includes(req.method)
      && req.get('Sec-Fetch-Mode') === 'navigate'
      && req.get('Sec-Fetch-Dest') === 'document'
      && publicDocumentPath(req.path, req.query.format);
    if ((origin && (!parsed || (!sameOrigin && !allowedOrigins.has(parsed)))) ||
        (!origin && req.get('Sec-Fetch-Site') === 'cross-site' && !publicNavigation)) {
      return res.status(403).json({ error: 'İstek kaynağına izin verilmiyor.' });
    }
    if (origin && parsed) {
      res.setHeader('Access-Control-Allow-Origin', parsed);
      res.vary('Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) {
      return res.status(415).json({ error: 'İstek JSON biçiminde gönderilmelidir.' });
    }
    return next();
  };
}

