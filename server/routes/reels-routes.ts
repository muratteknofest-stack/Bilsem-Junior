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

function token() { return process.env.GITHUB_REELS_TOKEN?.trim() || ''; }
function storageOrigin() {
  const raw = (process.env.REELS_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(raw) ? raw : null;
}
function storageBucket() {
  const raw = process.env.IG_REELS_BUCKET || 'instagram-reels';
  return /^[a-z0-9_-]{3,64}$/.test(raw) ? raw : null;
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

type GithubRun = { id?: unknown; event?: unknown; status?: unknown; conclusion?: unknown; created_at?: unknown; run_started_at?: unknown };
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
      const manual = run.event === 'workflow_dispatch';
      const completed = run.status === 'completed' && run.conclusion === 'success';
      return {
        id, manual,
        status: typeof run.status === 'string' ? run.status : 'unknown',
        conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
        createdAt: typeof run.created_at === 'string' ? run.created_at : null,
        runUrl: 'https://github.com/' + REPO + '/actions/runs/' + id,
        videoUrl: completed && manual && origin && bucket
          ? origin + '/storage/v1/object/public/' + bucket + '/manual/' + id + '.mp4'
          : null,
      };
    });
    return res.json({ configured: true, runs, schedule: '19:00', timezone: 'Europe/Istanbul',
      notice: 'Elle oluşturulan videolar onay olmadan Instagram üzerinde paylaşılmaz.' });
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

export default router;
