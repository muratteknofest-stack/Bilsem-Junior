import type { Firestore } from 'firebase-admin/firestore';

export type SocialPlatform = 'instagram' | 'facebook';
const version = process.env.META_GRAPH_VERSION || 'v26.0';
const base = `https://graph.facebook.com/${version}`;

async function waitForContainer(id: string, token: string) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(`${base}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Meta medya durumu okunamadı: ${response.status}`);
    const result = await response.json() as { status_code?: string };
    if (result.status_code === 'FINISHED') return;
    if (result.status_code === 'ERROR' || result.status_code === 'EXPIRED') throw new Error(`Meta medya işleme hatası: ${result.status_code}`);
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
  throw new Error('Meta medya işleme süresi aşıldı; yayın durumu kontrol edilmeli.');
}

async function graph(path: string, data: Record<string, string>, token: string): Promise<{ id: string; status_code?: string }> {
  const response = await fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...data, access_token: token }), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json() as { id?: string; status_code?: string; error?: { code?: number; message?: string } };
  if (!response.ok || !result.id) throw new Error(`Meta API hatası: ${result.error?.code || response.status}`);
  return { id: result.id, status_code: result.status_code };
}

function cardUrls(contentId: string) {
  const origin = process.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!origin || !origin.startsWith('https://')) throw new Error('PUBLIC_API_BASE_URL için HTTPS adresi gerekli.');
  return ['question', 'answer'].map(kind => `${origin}/api/social/media/${contentId}/${kind}.jpg`);
}

export function platformReady(platform: SocialPlatform) {
  return Boolean(process.env.PUBLIC_API_BASE_URL && (platform === 'instagram'
    ? process.env.META_IG_USER_ID && process.env.META_IG_ACCESS_TOKEN
    : process.env.META_PAGE_ID && process.env.META_PAGE_ACCESS_TOKEN));
}

export async function publishToMeta(contentId: string, platform: SocialPlatform, caption: string): Promise<string> {
  if (!platformReady(platform)) throw new Error('Platform yetkileri yapılandırılmamış.');
  const [question, answer] = cardUrls(contentId);
  const site = String(process.env.PUBLIC_SITE_BASE_URL || '').replace(/\/$/, '');
  const tracked = site.startsWith('https://') ? `${site}/soru-gunu/${contentId}?utm_source=${platform}&utm_medium=social&utm_campaign=gunun_sorusu` : '';
  const message = platform === 'facebook' && tracked ? `${caption}\n\nSoruyu çöz: ${tracked}` : caption;
  if (platform === 'instagram') {
    const account = process.env.META_IG_USER_ID!, token = process.env.META_IG_ACCESS_TOKEN!;
    const a = await graph(`${account}/media`, { image_url: question, is_carousel_item: 'true' }, token);
    const b = await graph(`${account}/media`, { image_url: answer, is_carousel_item: 'true' }, token);
    await Promise.all([waitForContainer(a.id, token), waitForContainer(b.id, token)]);
    const parent = await graph(`${account}/media`, { media_type: 'CAROUSEL', children: `${a.id},${b.id}`, caption: message }, token);
    await waitForContainer(parent.id, token);
    // Do not immediately retry an ambiguous publish call.
    const result = await graph(`${account}/media_publish`, { creation_id: parent.id }, token);
    return result.id;
  }
  const page = process.env.META_PAGE_ID!, token = process.env.META_PAGE_ACCESS_TOKEN!;
  const a = await graph(`${page}/photos`, { url: question, published: 'false' }, token);
  const b = await graph(`${page}/photos`, { url: answer, published: 'false' }, token);
  const post = await graph(`${page}/feed`, {
    message,
    'attached_media[0]': JSON.stringify({ media_fbid: a.id }),
    'attached_media[1]': JSON.stringify({ media_fbid: b.id }),
  }, token);
  return post.id;
}

export async function publishApproved(db: Firestore, contentId: string, platform: SocialPlatform) {
  const ref = db.collection('social_content').doc(contentId);
  const publication = db.collection('social_publications').doc(`${contentId}_${platform}`);
  const claim = await db.runTransaction(async tx => {
    const [content, previous] = await Promise.all([tx.get(ref), tx.get(publication)]);
    if (!content.exists || content.data()?.state !== 'approved' || previous.exists) return null;
    const data = content.data()!;
    tx.create(publication, { contentId, platform, state: 'publishing', startedAt: new Date().toISOString(), attemptCount: 1 });
    return { caption: String(data.caption || '').slice(0, 1800) };
  });
  if (!claim) return { state: 'skipped' as const };
  try {
    const id = await publishToMeta(contentId, platform, claim.caption);
    await publication.update({ state: 'published', externalPostId: id, publishedAt: new Date().toISOString() });
    return { state: 'published' as const, externalPostId: id };
  } catch (error) {
    // A timeout can occur after Meta has posted. Never retry without checking the remote account.
    await publication.update({ state: 'needs_attention', errorCode: error instanceof Error ? error.message.slice(0, 160) : 'UNKNOWN', updatedAt: new Date().toISOString() });
    return { state: 'needs_attention' as const };
  }
}
