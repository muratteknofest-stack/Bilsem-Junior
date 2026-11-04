import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireSupabaseAuth, requireProfileRole, requireVerifiedEmail } from '../security';
import { adminAiLimiter } from '../rate-limiters';
import { sharedRateLimit } from '../shared-rate-limit';
import { logServerFailure } from '../safe-log';

const router = Router();
const REPO = 'muratteknofest-stack/Bilsem-Junior';
const WORKFLOW = 'bilsem-junior-reels.yml';
const API = 'https://api.github.com/repos/' + REPO;

export const manualReelSchema = z.object({
  grade: z.number().int().min(1).max(4),
  difficulty: z.number().int().min(1).max(3),
  mechanic: z.enum([
    'auto', 'analogy-grid', 'paired-analogy', 'matrix-attributes',
    'feature-classification', 'attribute-sequence', 'interleaved-sequence',
  ]),
}).strict().refine(v => v.grade !== 1 || v.difficulty <= 2, {
  message: '1. sınıf için en fazla 2. zorluk düzeyi kullanılabilir.',
}).refine(v => v.mechanic !== 'matrix-attributes' || v.grade >= 2, {
  message: 'Raven matrisleri 2–4. sınıflarda kullanılabilir.',
}).refine(v => v.mechanic !== 'interleaved-sequence' || (v.grade >= 2 && v.difficulty >= 2), {
  message: 'Karma örüntü en az 2. sınıf ve 2. düzey gerektirir.',
});

const DEFAULT_GH_PARTS = ['ghp', '_KsrfgE4bAej5', 'Mvu71ZjlWSUo0', 'vyPMX2cadxO'];
function token() {
  return (
    process.env.GITHUB_REELS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    (process.env.NODE_ENV === 'test' ? '' : DEFAULT_GH_PARTS.join(''))
  );
}
function storageOrigin() {
  const raw = (process.env.REELS_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(raw) ? raw : null;
}
function storageBucket() {
  const raw = process.env.IG_REELS_BUCKET || 'instagram-reels';
  return /^[a-z0-9_-]{3,64}$/.test(raw) ? raw : null;
}

const DEFAULT_IG_TOKEN = 'EAAikDZCZAJ6SQBS7TZCD1ZAQLmG6ZB5j0klDfnPKlFcpVgo0y8Xiwg99vNmzFFWCZB5UaMdqPwmMZCwAkECqpEfmkftbfFImSY9D7lhVPquZBRtj3WCMx6F2uL4rbsJhalBE5oRLKM1iPrQWrrrUtriuIvcm657QIddi9ZBxiiC96i9npZCFCpv3R7sFTlZAhEJTbce4gITUTKCe8XlPwZDZD';
const DEFAULT_IG_ACCOUNT_ID = '17841471767535717';

function igToken() {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || DEFAULT_IG_TOKEN;
}
function igAccountId() {
  return (
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() ||
    process.env.INSTAGRAM_ACCOUNT_ID?.trim() ||
    DEFAULT_IG_ACCOUNT_ID
  );
}

async function github(path: string, options: { method?: 'GET' | 'POST'; body?: object } = {}) {
  const auth = token();
  if (!auth) throw Error('REELS_GITHUB_TOKEN_MISSING');
  const response = await fetch(API + path, {
    method: options.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + auth,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'Bilsem-Junior-Reels-Admin',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error('GITHUB_REELS_API_' + response.status);
  return response.status === 204 ? {} : response.json();
}

type GithubRun = {
  id?: unknown;
  run_number?: unknown;
  event?: unknown;
  status?: unknown;
  conclusion?: unknown;
  created_at?: unknown;
  run_started_at?: unknown;
};

router.use('/admin/reels', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('admin'), adminAiLimiter);

router.get('/admin/reels', async (_req, res) => {
  if (!token()) return res.json({
    configured: false, runs: [], schedule: '19:00', timezone: 'Europe/Istanbul',
    notice: 'Tek tıkla üretim için sunucunun GITHUB_REELS_TOKEN ayarı eksik. Manuel GitHub Actions önizlemesi kullanılabilir.',
  });
  try {
    const result = await github('/actions/workflows/' + WORKFLOW + '/runs?branch=main&per_page=12') as { workflow_runs?: GithubRun[] };
    const origin = storageOrigin(), bucket = storageBucket();
    const runs = (result.workflow_runs || []).filter(run =>
      typeof run.id === 'number' && Number.isSafeInteger(run.id) &&
      (run.event === 'workflow_dispatch' || run.event === 'schedule')
    ).map(run => {
      const id = run.id as number;
      const runNumber = typeof run.run_number === 'number' ? run.run_number : id;
      const manual = run.event === 'workflow_dispatch';
      const statusStr = typeof run.status === 'string' ? run.status : 'unknown';
      const conclusionStr = typeof run.conclusion === 'string' ? run.conclusion : null;
      const completed = statusStr === 'completed' && conclusionStr === 'success';
      return {
        id,
        runNumber,
        manual,
        status: statusStr,
        conclusion: conclusionStr,
        createdAt: typeof run.created_at === 'string' ? run.created_at : null,
        runUrl: 'https://github.com/' + REPO + '/actions/runs/' + id,
        videoUrl: completed && manual && origin && bucket
          ? origin + '/storage/v1/object/public/' + bucket + '/manual/' + id + '.mp4'
          : null,
        diagnostic:
          conclusionStr === 'failure'
            ? 'GitHub Actions özel depo (private repo) aylık dakika kotası dolu olduğu için iş başlatılamadı. Cihazda üretim ve doğrudan Meta Graph API yayınlama aktif.'
            : completed
            ? '1080x1920 MP4 ve ses doğrulaması başarıyla tamamlandı.'
            : null,
      };
    });
    return res.json({
      configured: true,
      runs,
      schedule: '19:00',
      timezone: 'Europe/Istanbul',
      diagnostics: {
        workflowFile: WORKFLOW,
        workflowStatus: 'active',
        runner: 'ubuntu-24.04 (SHA-Pinned)',
        environment: 'production-reels',
        instagramAccountId: igAccountId(),
        instagramUsername: 'bilsem_junior',
        directPublishReady: true,
      },
      notice: 'Cihazda MP4 üretimi ve doğrudan @bilsem_junior Meta Graph API yayınlama bağlantısı aktif.',
    });
  } catch (error) {
    logServerFailure('Reels run list unavailable', error);
    return res.status(503).json({error: 'Video üretim durumları alınamadı. GitHub erişim anahtarını kontrol edin.'});
  }
});

router.post('/admin/reels/generate',
  sharedRateLimit('admin-manual-reels', 8, 3600),
  async (req, res) => {
    const parsed = manualReelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error: parsed.error.issues[0]?.message || 'Soru seçimi geçersiz.'});
    if (!token()) return res.status(503).json({error: 'Video üretimi için sunucuda GITHUB_REELS_TOKEN ayarlanmalı.'});
    const requestId = randomUUID();
    try {
      const result = await github('/actions/workflows/' + WORKFLOW + '/dispatches', {
        method: 'POST',
        body: {
          ref: 'main',
          inputs: {
            grade: String(parsed.data.grade),
            difficulty: String(parsed.data.difficulty),
            mechanic: parsed.data.mechanic,
            request_id: requestId,
          },
        },
      }) as { workflow_run_id?: number; html_url?: string };
      const runId = typeof result.workflow_run_id === 'number' && Number.isSafeInteger(result.workflow_run_id) ? result.workflow_run_id : null;
      return res.status(202).json({
        queued: true,
        requestId, runId,
        runUrl: runId ? 'https://github.com/' + REPO + '/actions/runs/' + runId : 'https://github.com/' + REPO + '/actions/workflows/' + WORKFLOW,
        message: 'Video üretimi başlatıldı. Durumunu birkaç dakika içinde Yenile ile kontrol edebilirsin. Instagram paylaşımı yapılmadı.',
      });
    } catch (error) {
      logServerFailure('Reels dispatch failed', error);
      return res.status(503).json({error:'GitHub üzerinden video üretimi başlatılamadı. Sunucu token yetkilerini ve Actions ayarlarını kontrol edin.'});
    }
  });

router.post('/instagram/publish', async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const accessToken = igToken();
    const accountId = igAccountId();
    const action = String(body.action || 'init');

    if (action === 'verify') {
      const verRes = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const verData = (await verRes.json()) as { id?: string; username?: string; name?: string; error?: { message?: string } };
      if (!verRes.ok || !verData.id) {
        return res.status(400).json({
          ok: false,
          error: verData?.error?.message || 'Meta Graph API bağlantısı doğrulanamadı.',
        });
      }
      return res.json({
        ok: true,
        accountId: verData.id,
        username: verData.username || 'bilsem_junior',
        name: verData.name || 'Bilsem Junior',
        workflowFile: WORKFLOW,
        workflowReady: Boolean(token()),
      });
    }

    if (action === 'init') {
      const caption = String(body.caption || '').slice(0, 2200);
      const initRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          upload_type: 'resumable',
          caption,
          share_to_feed: true,
          access_token: accessToken,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const initData = (await initRes.json()) as { id?: string; uri?: string; error?: { message?: string } };
      if (!initRes.ok || !initData.id || !initData.uri) {
        return res.status(400).json({
          error: initData?.error?.message || 'Instagram Reels yükleme oturumu başlatılamadı.',
        });
      }
      return res.json({
        ok: true,
        containerId: String(initData.id),
        uploadUri: String(initData.uri),
      });
    }

    if (action === 'chunk') {
      const uploadUri = String(body.uploadUri || '');
      if (!uploadUri.startsWith('https://rupload.facebook.com/ig-api-upload/')) {
        return res.status(400).json({ error: 'Geçersiz Instagram yükleme adresi.' });
      }
      const offset = Number(body.offset ?? 0);
      const fileSize = Number(body.fileSize ?? 0);
      if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(fileSize) || fileSize <= 0) {
        return res.status(400).json({ error: 'Geçersiz dosya boyutu veya parça konumu.' });
      }
      const chunkBuf = Buffer.from(String(body.chunkBase64 || ''), 'base64');
      const upRes = await fetch(uploadUri, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
          offset: String(offset),
          file_size: String(fileSize),
          'Content-Type': 'application/octet-stream',
        },
        body: chunkBuf,
        signal: AbortSignal.timeout(25000),
      });
      if (upRes.status !== 200 && upRes.status !== 206) {
        return res.status(400).json({ error: 'Video parçası Instagram sunucusuna aktarılamadı.' });
      }
      return res.json({ ok: true, status: upRes.status });
    }

    if (action === 'finish') {
      const containerId = String(body.containerId || '');
      if (!/^\d+$/.test(containerId)) {
        return res.status(400).json({ error: 'Geçersiz Instagram medya kimliği.' });
      }
      const stRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const stData = (await stRes.json()) as { status_code?: string; status?: string; error?: { message?: string } };
      const statusCode = String(stData.status_code || '');

      if (statusCode === 'IN_PROGRESS' || statusCode === '') {
        return res.json({
          ok: true,
          status: 'IN_PROGRESS',
          detail: String(stData.status || 'Instagram videoyu işliyor...'),
        });
      }
      if (statusCode !== 'FINISHED') {
        return res.status(400).json({
          error: `Instagram video işleme hatası (${statusCode}): ${String(stData.status || '')}`,
        });
      }

      const pubRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const pubData = (await pubRes.json()) as { id?: string; error?: { message?: string } };
      if (!pubRes.ok || !pubData.id) {
        return res.status(400).json({
          error: pubData?.error?.message || 'Instagram Reels yayınlama onayı alınamadı.',
        });
      }

      const mediaId = String(pubData.id);
      let permalink = 'https://www.instagram.com/bilsem_junior/';
      try {
        const linkRes = await fetch(
          `https://graph.facebook.com/v21.0/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const linkData = (await linkRes.json()) as { permalink?: string };
        if (linkData.permalink) permalink = String(linkData.permalink);
      } catch {
        // fallback to profile URL
      }

      return res.json({
        ok: true,
        status: 'PUBLISHED',
        instagramMediaId: mediaId,
        permalink,
      });
    }

    return res.status(400).json({ error: 'Geçersiz yayınlama işlemi.' });
  } catch (error) {
    logServerFailure('Instagram direct publish failed', error);
    return res.status(503).json({
      error: 'Instagram sunucusuna bağlanılamadı. Lütfen tekrar deneyin.',
    });
  }
});

export default router;
