import { withRequestDeadline } from './request-deadline';
import type { BaseQuestion } from '../types';
import { aiGenerationResponseSchema } from './ai-generation-response';
import { hasCompleteQualityReport } from '../features/questions/quality-policy';
import type { AiCapabilities, AiRoleModels } from '../features/questions/ai-contracts';

export interface ReviewTarget { id: string; revision: number }
export type ReviewOutcome = 'passed' | 'needs-changes' | 'failed';
export interface ReviewBatchItem extends ReviewTarget { outcome: ReviewOutcome; message: string }
export interface ReviewBatchProgress { total: number; currentId: string | null; items: ReviewBatchItem[]; stopped: boolean }
export type ReviewRequest = (target: ReviewTarget, models: AiRoleModels, signal: AbortSignal) => Promise<Response>;

/** Existing drafts need only the two reviewers; the designer is not called again. */
export function reviewConfigurationReady(capabilities: AiCapabilities | null, models: AiRoleModels | null): boolean {
  return !!models && ['solver', 'pedagogue'].every(role => {
    const selection = models[role as 'solver' | 'pedagogue'];
    return !!selection.model && capabilities?.providers.some(p => p.provider === selection.provider && p.configured);
  });
}

/** One awaited, revision-locked save per question. Never auto-retry a billable/ambiguous request. */
export async function runQuestionReviewBatch(options: {
  targets: ReviewTarget[]; models: AiRoleModels; request: ReviewRequest; requestTimeoutMs?: number;
  shouldStop: () => boolean; changed: (progress: ReviewBatchProgress) => void;
  saved: (question: BaseQuestion) => void;
}): Promise<ReviewBatchProgress> {
  const { models, request, shouldStop, changed, saved } = options;
  const targets = options.targets.map(target => ({ ...target }));
  if (!targets.length || targets.length > 20 || new Set(targets.map(q => q.id)).size !== targets.length ||
      targets.some(q => !q.id || !Number.isSafeInteger(q.revision) || q.revision < 0)) {
    throw Error('Bir işlemde 1–20 farklı, güncel soru seçin.');
  }
  let progress: ReviewBatchProgress = { total: targets.length, currentId: null, items: [], stopped: false };
  const emit = () => changed({ ...progress, items: [...progress.items] });
  for (const target of targets) {
    if (shouldStop()) { progress.stopped = true; break; }
    progress.currentId = target.id; emit();
    let halt = false;
    let item: ReviewBatchItem;
    try {
      const { response, payload } = await withRequestDeadline(async signal => {
        const response = await request(target, models, signal);
        return { response, payload: response.ok ? await response.json() as unknown : null };
      }, options.requestTimeoutMs ?? 70_000);
      if (!response.ok) {
        // A failed/ambiguous save needs a fresh revision before any manual retry.
        halt = response.status === 401 || response.status === 403 || response.status === 409 || response.status === 429 || response.status >= 500;
        const message = response.status === 409 ? 'Soru değişmiş; kuyruğu yenileyin.' :
          response.status === 401 || response.status === 403 ? 'Yönetici oturumunu kontrol edin.' :
          response.status === 429 ? 'İstek sınırına ulaşıldı. Biraz sonra kuyruğu yenileyip deneyin.' :
          response.status === 503 ? 'AI ayarları veya kayıt servisi hazır değil. Kuyruğu yenileyin.' : 'Denetim kaydedilemedi. Kuyruğu yenileyin.';
        item = { ...target, outcome: 'failed', message };
      } else {
        const receipt = aiGenerationResponseSchema.parse(payload);
        const question = receipt.question;
        if (!question || question.id !== target.id || question.revision !== target.revision + 1 || question.status !== 'review' ||
            receipt.success !== hasCompleteQualityReport(question) || receipt.success && receipt.solverVerified !== true) {
          throw Error('INVALID_REVIEW_RECEIPT');
        }
        saved(question);
        const unavailable = question.qualityReport?.stages.some(stage => stage.reasons.some(reason => reason.startsWith('AI_REVIEW_UNAVAILABLE:'))) === true;
        halt = unavailable;
        item = { ...target, revision: question.revision, outcome: unavailable ? 'failed' : receipt.success ? 'passed' : 'needs-changes',
          message: unavailable ? 'AI servisi denetimi tamamlayamadı. Eksik rapor kaydedildi; yeniden denemeden önce kuyruğu yenileyin.' : receipt.success ? 'AI denetimi geçti; editör kararı bekliyor.' : 'Denetim raporu kaydedildi; düzeltme veya yeniden inceleme gerekli.' };
      }
    } catch {
      halt = true;
      item = { ...target, outcome: 'failed', message: 'Sonuç doğrulanamadı. Tekrar denemeden önce kuyruğu yenileyin.' };
    }
    progress.items.push(item); progress.currentId = null;
    if (halt || shouldStop()) progress.stopped = true;
    emit();
    if (progress.stopped) break;
  }
  progress.currentId = null; emit();
  return progress;
}
