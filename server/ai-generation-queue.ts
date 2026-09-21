import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { GoogleGenAI } from '@google/genai';
import { runQuestionPipeline, type PipelineConfig, type PipelineResult } from './ai-question-pipeline';
import type { BaseQuestion } from '../src/types';

export interface GenerationJobConfig {
  category?: string;
  questionType?: string;
  targetGrade: 1 | 2 | 3 | 4;
  difficulty: number | 'auto';
  count: number;
  minQualityScore: number;
}

export interface GenerationJob {
  jobId: string;
  adminId: string;
  config: GenerationJobConfig;
  configFingerprint: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
    approved: number;
    rejected: number;
    failed: number;
  };
  results: PipelineResult[];
  createdAt: number;
  completedAt?: number;
  leaseOwner?: string | null;
  leaseUntil?: number | null;
}

type Claim = {
  state: 'claimed';
  index: number;
  adminId: string;
  config: GenerationJobConfig;
} | { state: 'busy' } | { state: 'done' };

const CONCURRENCY_LIMIT = 3;
const TRANSIENT_RETRIES = 2;
const RETRY_BASE_MS = 2_000;
const DEFAULT_LEASE_MS = 5 * 60_000;

const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function leaseDurationMs(): number {
  const configured = Number(process.env.AI_JOB_LEASE_MS || DEFAULT_LEASE_MS);
  return Number.isInteger(configured) && configured >= 2 * 60_000 && configured <= 30 * 60_000
    ? configured
    : DEFAULT_LEASE_MS;
}

function fingerprint(config: GenerationJobConfig): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

function isTransientError(error: unknown): boolean {
  const message = String(error);
  return /429|RESOURCE_EXHAUSTED|\b503\b|fetch failed|timeout|ECONNRESET|ETIMEDOUT/i.test(message);
}

function failureResult(error: unknown): PipelineResult {
  return {
    success: false,
    qualityScore: 0,
    solverVerified: false,
    validationErrors: ['Beklenmeyen hata: ' + (error instanceof Error ? error.message : String(error))],
    validationWarnings: [],
    rejectionReasons: ['Sistem hatası'],
    durationMs: 0,
    model: 'server-configured',
    promptVersion: '1.0',
  };
}

function persistedResult(result: PipelineResult): PipelineResult {
  const {
    rawGeneratorResponse: _rawGeneratorResponse,
    rawSolverResponse: _rawSolverResponse,
    plannerOutput: _plannerOutput,
    ...safe
  } = result;
  return clean(safe as PipelineResult);
}

export class AiGenerationQueue {
  private readonly workerId = randomUUID();
  private readonly jobs = new Map<string, GenerationJob>();
  private readonly processingQueue: string[] = [];
  private readonly queuedJobs = new Set<string>();
  private activeWorkers = 0;

  constructor(
    private readonly aiClient: GoogleGenAI,
    private readonly firestore: any,
  ) {
    void this.hydrateFromFirestore();
  }

  private jobRef(jobId: string) {
    return this.firestore.collection('ai_generation_jobs').doc(jobId);
  }

  private enqueue(jobId: string): void {
    if (this.queuedJobs.has(jobId)) return;
    this.queuedJobs.add(jobId);
    this.processingQueue.push(jobId);
    void this.pump();
  }

  private async hydrateFromFirestore(): Promise<void> {
    try {
      const snapshot = await this.firestore
        .collection('ai_generation_jobs')
        .where('status', 'in', ['queued', 'processing'])
        .get();
      snapshot.docs.forEach((document: any) => this.enqueue(document.id));
      if (!snapshot.empty) {
        console.log(`[AiGenerationQueue] ${snapshot.size} unfinished jobs queued for lease recovery`);
      }
    } catch (error) {
      console.error('[AiGenerationQueue] Firestore hydration failed:', error);
    }
  }

  public async createJob(adminId: string, config: GenerationJobConfig, requestId: string): Promise<string> {
    const jobId = `job_${requestId.replace(/-/g, '')}`;
    const configFingerprint = fingerprint(config);
    const jobRef = this.jobRef(jobId);
    const job = await this.firestore.runTransaction(async (transaction: any) => {
      const existing = await transaction.get(jobRef);
      if (existing.exists) {
        const data = existing.data();
        if (data.adminId !== adminId || data.configFingerprint !== configFingerprint) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        return { jobId, results: [], ...data } as GenerationJob;
      }

      const created: GenerationJob = {
        jobId,
        adminId,
        config: clean(config),
        configFingerprint,
        status: 'queued',
        progress: { completed: 0, total: config.count, approved: 0, rejected: 0, failed: 0 },
        results: [],
        createdAt: Date.now(),
        leaseOwner: null,
        leaseUntil: null,
      };
      const { results: _results, ...summary } = created;
      transaction.create(jobRef, summary);
      return created;
    });

    this.jobs.set(jobId, job);
    if (job.status !== 'completed' && job.status !== 'failed') this.enqueue(jobId);
    return jobId;
  }

  public async getJob(jobId: string): Promise<GenerationJob | undefined> {
    const jobSnapshot = await this.jobRef(jobId).get();
    if (!jobSnapshot.exists) return undefined;
    const resultsSnapshot = await this.jobRef(jobId).collection('results').orderBy('index').get();
    const job = {
      jobId,
      ...jobSnapshot.data(),
      results: resultsSnapshot.docs.map((document: any) => document.data().result as PipelineResult),
    } as GenerationJob;
    this.jobs.set(jobId, job);
    return job;
  }

  private async pump(): Promise<void> {
    while (this.activeWorkers < CONCURRENCY_LIMIT && this.processingQueue.length > 0) {
      const jobId = this.processingQueue.shift()!;
      this.queuedJobs.delete(jobId);
      this.activeWorkers += 1;
      void this.processJob(jobId).catch((error) => {
        console.error(`[AiGenerationQueue] job ${jobId} worker failed:`, error);
        setTimeout(() => this.enqueue(jobId), 30_000);
      }).finally(() => {
        this.activeWorkers -= 1;
        void this.pump();
      });
    }
  }

  private async claimNext(jobId: string): Promise<Claim> {
    const jobRef = this.jobRef(jobId);
    return this.firestore.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) return { state: 'done' };
      const job = snapshot.data() as GenerationJob;
      const completed = Number(job.progress?.completed || 0);
      const total = Number(job.progress?.total || job.config?.count || 0);
      if (job.status === 'completed' || job.status === 'failed' || completed >= total) {
        if (job.status !== 'completed') {
          transaction.update(jobRef, {
            status: 'completed', completedAt: Date.now(), leaseOwner: null, leaseUntil: null,
          });
        }
        return { state: 'done' };
      }

      const now = Date.now();
      if (Number(job.leaseUntil || 0) > now && job.leaseOwner && job.leaseOwner !== this.workerId) {
        return { state: 'busy' };
      }
      transaction.update(jobRef, {
        status: 'processing',
        leaseOwner: this.workerId,
        leaseUntil: now + leaseDurationMs(),
        updatedAt: now,
      });
      return { state: 'claimed', index: completed, adminId: job.adminId, config: job.config };
    });
  }

  private async runPipeline(config: GenerationJobConfig): Promise<PipelineResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= TRANSIENT_RETRIES; attempt += 1) {
      try {
        const difficulty = config.difficulty === 'auto' ? randomInt(1, 7) : config.difficulty;
        const pipelineConfig: PipelineConfig = {
          category: config.category,
          questionType: config.questionType,
          targetGrade: config.targetGrade,
          difficulty,
          minQualityScore: config.minQualityScore,
        };
        return await runQuestionPipeline(this.aiClient, pipelineConfig);
      } catch (error) {
        lastError = error;
        if (!isTransientError(error) || attempt === TRANSIENT_RETRIES) break;
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * (2 ** attempt)));
      }
    }
    return failureResult(lastError);
  }

  private async renewLease(jobId: string, index: number): Promise<void> {
    const jobRef = this.jobRef(jobId);
    await this.firestore.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(jobRef);
      const job = snapshot.data() as GenerationJob | undefined;
      if (!job || job.leaseOwner !== this.workerId || Number(job.progress?.completed || 0) !== index) {
        throw new Error('LEASE_LOST');
      }
      transaction.update(jobRef, { leaseUntil: Date.now() + leaseDurationMs(), updatedAt: Date.now() });
    });
  }

  private async finalize(jobId: string, index: number, input: PipelineResult, adminId: string): Promise<void> {
    const preparedInput = input.success && input.question && !/^[A-Za-z0-9_-]{1,200}$/.test(input.question.id)
      ? {
          ...input,
          success: false,
          question: undefined,
          validationErrors: [...input.validationErrors, 'Üretilen soru kimliği güvenli biçimde saklanamıyor.'],
          rejectionReasons: [...input.rejectionReasons, 'Geçersiz soru kimliği'],
        }
      : input;
    const jobRef = this.jobRef(jobId);
    const resultRef = jobRef.collection('results').doc(String(index).padStart(3, '0'));
    const logRef = this.firestore.collection('ai_generation_logs').doc(`${jobId}_${String(index).padStart(3, '0')}`);
    const questionRef = preparedInput.success && preparedInput.question
      ? this.firestore.collection('questions').doc(preparedInput.question.id)
      : null;
    const auditRef = preparedInput.success && preparedInput.question
      ? this.firestore.collection('adminAuditLogs').doc(`ai_question_${jobId}_${String(index).padStart(3, '0')}`)
      : null;

    await this.firestore.runTransaction(async (transaction: any) => {
      const jobSnapshot = await transaction.get(jobRef);
      const resultSnapshot = await transaction.get(resultRef);
      const questionSnapshot = questionRef ? await transaction.get(questionRef) : null;
      if (!jobSnapshot.exists) throw new Error('JOB_NOT_FOUND');
      if (resultSnapshot.exists) return;

      const job = jobSnapshot.data() as GenerationJob;
      if (job.leaseOwner !== this.workerId || Number(job.progress?.completed || 0) !== index) {
        throw new Error('LEASE_LOST');
      }

      let result = persistedResult(preparedInput);
      if (questionRef && questionSnapshot?.exists) {
        result = persistedResult({
          ...preparedInput,
          success: false,
          question: undefined,
          validationErrors: [...preparedInput.validationErrors, 'Üretilen soru kimliği mevcut bir kayıtla çakıştı.'],
          rejectionReasons: [...preparedInput.rejectionReasons, 'Soru kimliği çakışması'],
        });
      }

      const approvedIncrement = result.success && result.question ? 1 : 0;
      const rejectedIncrement = !result.success && (result.validationErrors.length > 0 || result.rejectionReasons.length > 0) ? 1 : 0;
      const failedIncrement = !approvedIncrement && !rejectedIncrement ? 1 : 0;
      const nextCompleted = index + 1;
      const total = Number(job.progress.total || job.config.count);
      const completed = nextCompleted >= total;
      const now = Date.now();

      if (approvedIncrement && result.question && questionRef && auditRef) {
        const timestamp = new Date(now).toISOString();
        const question: BaseQuestion = {
          ...result.question,
          status: 'draft',
          revision: 0,
          createdAt: result.question.createdAt || timestamp,
          updatedAt: timestamp,
          updatedBy: adminId,
        };
        transaction.create(questionRef, question);
        transaction.create(auditRef, {
          action: 'ai_question_created',
          actorId: adminId,
          jobId,
          resultIndex: index,
          questionId: question.id,
          createdAt: now,
        });
        result = persistedResult({ ...result, question });
      }

      transaction.create(resultRef, { index, result, createdAt: now });
      transaction.create(logRef, {
        jobId,
        adminId,
        resultIndex: index,
        createdAt: now,
        success: result.success,
        qualityScore: result.qualityScore,
        solverVerified: result.solverVerified,
        errors: result.validationErrors,
        warnings: result.validationWarnings,
        rejectionReasons: result.rejectionReasons,
        durationMs: result.durationMs,
        questionId: result.question?.id || null,
        model: result.model,
      });
      transaction.update(jobRef, {
        status: completed ? 'completed' : 'queued',
        progress: {
          completed: nextCompleted,
          total,
          approved: Number(job.progress.approved || 0) + approvedIncrement,
          rejected: Number(job.progress.rejected || 0) + rejectedIncrement,
          failed: Number(job.progress.failed || 0) + failedIncrement,
        },
        completedAt: completed ? now : null,
        leaseOwner: null,
        leaseUntil: null,
        updatedAt: now,
      });
    });
  }

  private async processJob(jobId: string): Promise<void> {
    while (true) {
      const claim = await this.claimNext(jobId);
      if (claim.state === 'done') return;
      if (claim.state === 'busy') {
        setTimeout(() => this.enqueue(jobId), 30_000);
        return;
      }

      const heartbeat = setInterval(() => {
        void this.renewLease(jobId, claim.index).catch((error) => {
          console.warn(`[AiGenerationQueue] lease heartbeat failed for ${jobId}:`, error);
        });
      }, 60_000);
      heartbeat.unref();
      let result: PipelineResult;
      try {
        result = await this.runPipeline(claim.config);
      } finally {
        clearInterval(heartbeat);
      }
      try {
        await this.finalize(jobId, claim.index, result, claim.adminId);
      } catch (error) {
        if (error instanceof Error && error.message === 'LEASE_LOST') {
          setTimeout(() => this.enqueue(jobId), 30_000);
          return;
        }
        throw error;
      }
    }
  }
}
