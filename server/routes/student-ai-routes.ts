import { sharedRateLimit } from '../shared-rate-limit';
import { Router } from 'express';
import { z } from 'zod';
import {
  requireSupabaseAuth,
  requireProfileRole,
} from '../security';
import { aiLimiter } from '../rate-limiters';

const studentAiRoutes = Router();

const questionOptionSchema = z.object({
  id: z.string().min(1).max(32),
  label: z.string().max(500).default(''),
}).passthrough();

const explanationSchema = z.object({
  summary: z.string().max(4000).optional().default(''),
  ruleTitle: z.string().max(500).optional().default(''),
  steps: z.array(z.string().max(1000)).max(12).optional().default([]),
}).passthrough().optional();

const questionRequestSchema = z.object({
  questionId: z.string().min(1).max(160),
  questionType: z.string().min(1).max(80),
  category: z.string().min(1).max(80),
  difficulty: z.number().int().min(1).max(6),
  prompt: z.string().min(1).max(4000),
  secondaryPrompt: z.string().max(2000).optional(),
  explanation: explanationSchema,
  options: z.array(questionOptionSchema).min(2).max(8),
  correctOptionId: z.string().min(1).max(32),
});

const hintRequestSchema = questionRequestSchema.extend({
  stepRequested: z.number().int().min(1).max(3).optional().default(1),
});
const mistakeRequestSchema = questionRequestSchema.extend({
  selectedOptionId: z.string().min(1).max(32),
});
const stepExplanationRequestSchema = mistakeRequestSchema.extend({
  isCorrect: z.boolean(),
});
const dailyPlanRequestSchema = z.object({
  studentName: z.string().trim().min(1).max(50).default('Öğrenci'),
  grade: z.number().int().min(1).max(4).default(3),
  level: z.number().int().min(1).max(1000).default(1),
  streak: z.number().int().min(0).max(3660).default(0),
  dailyGoalQuestions: z.number().int().min(1).max(200).default(10),
  dailyGoalMinutes: z.number().int().min(1).max(180).default(15),
  todayQuestionsSolved: z.number().int().min(0).max(1000).default(0),
  unresolvedMistakes: z.array(z.object({
    category: z.string().max(80),
    questionType: z.string().max(80),
    difficulty: z.number().int().min(1).max(6),
    prompt: z.string().max(1000),
  }).passthrough()).max(50).default([]),
  masteries: z.array(z.object({
    category: z.string().max(80),
    categoryName: z.string().max(120),
    mastery: z.number().min(0).max(100),
    accuracy: z.number().min(0).max(100),
    recentTrend: z.string().max(20),
  }).passthrough()).max(20).default([]),
});

// Legacy APKs can still request these paths. Keep authentication, role and
// abuse controls, and instruct them to use their bundled learning engine.
// No child profile, answer or prompt is forwarded to a model provider.
studentAiRoutes.post('/ai-hint', requireSupabaseAuth, aiLimiter, requireProfileRole('student', 'admin'), sharedRateLimit('student-ai', 30, 600), (req, res) => {
  if (!hintRequestSchema.safeParse(req.body).success) return res.status(400).json({ error: 'Çalışma desteği isteği geçersiz.' });
  return res.status(200).json({ fallback: true, code: 'LOCAL_LEARNING_ASSISTANCE', message: 'Çalışma desteği cihazdaki öğrenme motoruyla hazırlanır.' });
});

studentAiRoutes.post('/ai-explain-mistake', requireSupabaseAuth, aiLimiter, requireProfileRole('student', 'admin'), sharedRateLimit('student-ai', 30, 600), (req, res) => {
  if (!mistakeRequestSchema.safeParse(req.body).success) return res.status(400).json({ error: 'Çalışma desteği isteği geçersiz.' });
  return res.status(200).json({ fallback: true, code: 'LOCAL_LEARNING_ASSISTANCE', message: 'Çalışma desteği cihazdaki öğrenme motoruyla hazırlanır.' });
});

studentAiRoutes.post('/ai-step-explanation', requireSupabaseAuth, aiLimiter, requireProfileRole('student', 'admin'), sharedRateLimit('student-ai', 30, 600), (req, res) => {
  if (!stepExplanationRequestSchema.safeParse(req.body).success) return res.status(400).json({ error: 'Çalışma desteği isteği geçersiz.' });
  return res.status(200).json({ fallback: true, code: 'LOCAL_LEARNING_ASSISTANCE', message: 'Çalışma desteği cihazdaki öğrenme motoruyla hazırlanır.' });
});

studentAiRoutes.post('/ai-daily-plan', requireSupabaseAuth, aiLimiter, requireProfileRole('student', 'admin'), sharedRateLimit('student-ai', 30, 600), (req, res) => {
  if (!dailyPlanRequestSchema.safeParse(req.body).success) return res.status(400).json({ error: 'Çalışma desteği isteği geçersiz.' });
  return res.status(200).json({ fallback: true, code: 'LOCAL_LEARNING_ASSISTANCE', message: 'Çalışma desteği cihazdaki öğrenme motoruyla hazırlanır.' });
});

export default studentAiRoutes;
