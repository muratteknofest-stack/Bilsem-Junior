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
}

const CONCURRENCY_LIMIT = 3;

export class AiGenerationQueue {
  private aiClient: GoogleGenAI;
  private firestore: any; // Firebase Admin Firestore instance
  private jobs: Map<string, GenerationJob> = new Map();
  private processingQueue: string[] = [];
  private activeWorkers = 0;

  constructor(aiClient: GoogleGenAI, firestore: any) {
    this.aiClient = aiClient;
    this.firestore = firestore;
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
    
    // Save initial state to Firestore
    this.saveJobToFirestore(job).catch(console.error);

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
      await this.saveJobToFirestore(job);
      return this.processNext();
    }

    this.activeWorkers++;
    job.status = 'processing';
    await this.saveJobToFirestore(job);

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
      };

      const result = await runQuestionPipeline(this.aiClient, pipelineConfig);
      
      job.progress.completed++;
      job.results.push(result);

      if (result.success && result.question) {
        job.progress.approved++;
        await this.saveQuestionToFirestore(result.question);
      } else {
        if (result.validationErrors.length > 0 || result.rejectionReasons.length > 0) {
          job.progress.rejected++;
        } else {
          job.progress.failed++;
        }
      }

      await this.logGenerationAttempt(job.jobId, result);
      await this.saveJobToFirestore(job);

    } catch (error) {
      console.error(`[AiGenerationQueue] Error processing job \${jobId}:`, error);
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
      await this.saveJobToFirestore(job);
    } finally {
      this.activeWorkers--;
      // Call again to process next item in this job or next job
      this.processNext().catch(console.error);
    }
  }

  private async saveJobToFirestore(job: GenerationJob) {
    try {
      const docRef = this.firestore.collection('ai_generation_jobs').doc(job.jobId);
      // Omit results array for summary document to avoid exceeding 1MB limit for large jobs
      const { results, ...jobSummary } = job;
      await docRef.set(jobSummary, { merge: true });
    } catch (error) {
      console.error('Failed to save job status to Firestore:', error);
    }
  }

  private async saveQuestionToFirestore(question: BaseQuestion) {
    try {
      // Enforce draft status for newly generated questions
      question.status = 'draft';
      const docRef = this.firestore.collection('questions').doc(question.id);
      await docRef.set(question);
    } catch (error) {
      console.error('Failed to save generated question to Firestore:', error);
    }
  }

  private async logGenerationAttempt(jobId: string, result: PipelineResult) {
    try {
      const logDoc = this.firestore.collection('ai_generation_logs').doc();
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
