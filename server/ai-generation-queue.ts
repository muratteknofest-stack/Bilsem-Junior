import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { 
  runQuestionPipeline, 
  PipelineResult, 
  PipelineConfig 
} from './ai-question-pipeline';
import { BaseQuestion } from '../src/types';

export interface GenerationJobConfig {
  category?: string;
  questionType?: string;
  targetGrade: 1 | 2 | 3 | 4;
  difficulty: number | 'auto';
  count: number;
  minQualityScore: number;
  aiModel?: string;
}

export interface GenerationJob {
  jobId: string;
  adminId: string;
  config: GenerationJobConfig;
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
  retryCount?: number;
}

const CONCURRENCY_LIMIT = 3;

export class AiGenerationQueue {
  private aiClient: GoogleGenAI;
  private store: any; // Supabase server-side data adapter
  private jobs: Map<string, GenerationJob> = new Map();
  private processingQueue: string[] = [];
  private activeWorkers = 0;

  constructor(aiClient: GoogleGenAI, store: any) {
    this.aiClient = aiClient;
    this.store = store;
    this.hydrateFromSupabase();
  }

  async hydrateFromSupabase(): Promise<void> {
    try {
      const snapshot = await this.store
        .collection('ai_generation_jobs')
        .where('status', 'in', ['queued', 'processing'])
        .get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!this.jobs.has(doc.id)) {
          const job: GenerationJob = {
            jobId: doc.id,
            adminId: data.adminId,
            config: data.config,
            status: 'queued', // Reset to queued for re-processing
            progress: data.progress || { completed: 0, total: data.config?.count || 0, approved: 0, rejected: 0, failed: 0 },
            results: [],
            createdAt: data.createdAt || Date.now(),
          };
          // Adjust progress to skip already completed items
          job.progress.completed = Math.min(job.progress.completed, job.progress.total);
          this.jobs.set(doc.id, job);
          if (job.progress.completed < job.progress.total) {
            this.processingQueue.push(doc.id);
          }
        }
      }
      if (this.processingQueue.length > 0) {
        console.log(`[AiGenerationQueue] Hydrated ${this.processingQueue.length} unfinished jobs from Supabase`);
        this.processNext();
      }
    } catch (err) {
      console.error('[AiGenerationQueue] Failed to hydrate from Supabase:', err);
    }
  }

  public createJob(adminId: string, config: GenerationJobConfig): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const job: GenerationJob = {
      jobId,
      adminId,
      config,
      status: 'queued',
      progress: {
        completed: 0,
        total: config.count,
        approved: 0,
        rejected: 0,
        failed: 0,
      },
      results: [],
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);
    
    // Save initial state to Supabase
    this.saveJobToSupabase(job).catch(console.error);

    // Trigger processing asynchronously
    this.processNext().catch(console.error);

    return jobId;
  }

  public getJob(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): GenerationJob[] {
    return Array.from(this.jobs.values());
  }

  private async processNext(): Promise<void> {
    if (this.activeWorkers >= CONCURRENCY_LIMIT || this.processingQueue.length === 0) {
      return;
    }

    const jobId = this.processingQueue[0];
    const job = this.jobs.get(jobId);

    if (!job || job.status === 'completed' || job.status === 'failed') {
      this.processingQueue.shift(); // Remove invalid/completed jobs
      return this.processNext();
    }

    if (job.progress.completed >= job.progress.total) {
      job.status = 'completed';
      job.completedAt = Date.now();
      this.processingQueue.shift();
      await this.saveJobToSupabase(job);
      return this.processNext();
    }

    this.activeWorkers++;
    job.status = 'processing';
    await this.saveJobToSupabase(job);

    let isRetrying = false;

    try {
      // Determine difficulty
      const diff = job.config.difficulty === 'auto' 
        ? Math.floor(Math.random() * 6) + 1 
        : job.config.difficulty;

      const pipelineConfig: PipelineConfig = {
        category: job.config.category,
        questionType: job.config.questionType,
        targetGrade: job.config.targetGrade,
        difficulty: diff,
        minQualityScore: job.config.minQualityScore,
        aiModel: job.config.aiModel,
      };

      const result = await runQuestionPipeline(this.aiClient, pipelineConfig);
      
      // Reset retry count on successful pipeline completion
      job.retryCount = 0;
      job.progress.completed++;
      job.results.push(result);

      if (result.question) await this.saveQuestionToSupabase(result.question);
      if (result.success && result.question) {
        job.progress.approved++;
      } else {
        if (result.validationErrors.length > 0 || result.rejectionReasons.length > 0) {
          job.progress.rejected++;
        } else {
          job.progress.failed++;
        }
      }

      await this.logGenerationAttempt(job.jobId, result);
      await this.saveJobToSupabase(job);

    } catch (error: any) {
      const isTransient = String(error).includes('429') ||
        String(error).includes('RESOURCE_EXHAUSTED') ||
        String(error).includes('503') ||
        String(error).includes('fetch failed') ||
        String(error).includes('timeout');

      job.retryCount = (job.retryCount || 0) + 1;

      if (isTransient && job.retryCount <= 3) {
        isRetrying = true;
        const delayMs = Math.pow(2, job.retryCount) * 1000;
        console.warn(`[AiGenerationQueue] Transient error on job ${jobId}. Retrying attempt ${job.retryCount}/3 after ${delayMs}ms...`);
        // Schedule next process after delay without incrementing failed count
        setTimeout(() => {
          this.processNext().catch(console.error);
        }, delayMs);
        return;
      }

      console.error(`[AiGenerationQueue] Error processing job ${jobId} (Retries exhausted):`, error);
      job.retryCount = 0; // Reset for subsequent questions
      job.progress.completed++;
      job.progress.failed++;
      
      const errorResult: PipelineResult = {
        success: false,
        qualityScore: 0,
        solverVerified: false,
        validationErrors: ['Beklenmeyen hata: ' + (error instanceof Error ? error.message : String(error))],
        validationWarnings: [],
        rejectionReasons: ['Sistem hatası'],
        durationMs: 0,
        model: 'gemini-2.5-flash',
        promptVersion: '1.0',
      };
      job.results.push(errorResult);
      await this.logGenerationAttempt(job.jobId, errorResult);
      await this.saveJobToSupabase(job);
    } finally {
      this.activeWorkers--;
      // Only immediately trigger next item if not in backoff delay
      if (!isRetrying) {
        this.processNext().catch(console.error);
      }
    }
  }

  private async saveJobToSupabase(job: GenerationJob) {
    try {
      const docRef = this.store.collection('ai_generation_jobs').doc(job.jobId);
      // Omit results array for summary document to avoid exceeding 1MB limit for large jobs
      const { results, ...jobSummary } = job;
      await docRef.set(jobSummary, { merge: true });
    } catch (error) {
      console.error('Failed to save job status to Supabase:', error);
    }
  }

  private async saveQuestionToSupabase(question: BaseQuestion) {
    try {
      // Enforce draft status for newly generated questions
      question.status = question.aiMeta?.solverVerified ? 'draft' : 'review';
      const docRef = this.store.collection('questions').doc(question.id);
      await docRef.set(question);
    } catch (error) {
      console.error('Failed to save generated question to Supabase:', error);
    }
  }

  private async logGenerationAttempt(jobId: string, result: PipelineResult) {
    try {
      const logDoc = this.store.collection('ai_generation_logs').doc();
      await logDoc.set({
        jobId,
        timestamp: Date.now(),
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
    } catch (error) {
      console.error('Failed to log generation attempt:', error);
    }
  }
}

