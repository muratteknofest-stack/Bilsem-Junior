const origin = new URL(process.env.MONITOR_SITE_URL || 'https://zekapark.vercel.app');
if (origin.origin !== 'https://zekapark.vercel.app') throw Error('İzleme hedefi doğrulanamadı.');
for (const path of ['/', '/blog', '/api/health', '/api/public/platform']) {
  const response = await fetch(origin.origin + path, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw Error(`Hizmet kontrolü başarısız: ${path} (${response.status})`);
  if (path === '/api/health') { const data = await response.json(); if (data.database !== 'ready' || data.projectRef !== 'vehhvsdkifwstbjhnhao') throw Error('Veritabanı sağlık kontrolü başarısız.'); }
  else await response.arrayBuffer();
}
console.log('Site, blog, API ve veritabanı sağlık kontrolleri geçti.');
