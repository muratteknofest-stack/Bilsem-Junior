import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { z } from 'zod';
import {
  escapeHtml,
  getAdminAuth,
  getAdminDb,
  requireFirebaseAuth,
  requireProfileRole,
  requireVerifiedEmail,
  type AuthenticatedRequest,
} from './server/security';

dotenv.config();

// ============================================================================
// CONSTANTS - Magic numbers centralized for maintainability
// ============================================================================
const DEFAULT_PORT = 3000;
const AI_LIMITER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const AI_LIMITER_MAX_REQUESTS = 30;
const REPORT_LIMITER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REPORT_LIMITER_MAX_REQUESTS = 5;
const ACCOUNT_SECURITY_LIMITER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ACCOUNT_SECURITY_LIMITER_MAX_REQUESTS = 6;
const ADMIN_AI_LIMITER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const ADMIN_AI_LIMITER_MAX_REQUESTS = 50;
const REQUEST_BODY_LIMIT = '256kb';
const MAX_OPTIONS_COUNT = 8;
const MIN_OPTIONS_COUNT = 2;
const MAX_EXPLANATION_STEPS = 12;
const MAX_STEP_LENGTH = 1000;
const MAX_SUMMARY_LENGTH = 4000;
const MAX_RULE_TITLE_LENGTH = 500;
const MAX_OPTION_LABEL_LENGTH = 500;
const MAX_OPTION_ID_LENGTH = 32;
const MIN_QUESTION_ID_LENGTH = 1;
const MAX_QUESTION_ID_LENGTH = 160;
const MAX_QUESTION_TYPE_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 80;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 6;
const MAX_PROMPT_LENGTH = 4000;
const MAX_SECONDARY_PROMPT_LENGTH = 2000;
const MAX_STUDENT_NAME_LENGTH = 50;
const MIN_GRADE = 1;
const MAX_GRADE = 4;
const MAX_LEVEL = 1000;
const MAX_STREAK = 3660;
const MAX_DAILY_GOAL_QUESTIONS = 200;
const MAX_DAILY_GOAL_MINUTES = 180;
const MAX_TODAY_QUESTIONS = 1000;
const MAX_UNRESOLVED_MISTAKES = 50;
const MAX_MASTERIES = 20;
const MAX_MASTERY_SCORE = 100;
const MAX_ACCURACY_SCORE = 100;
const MAX_RECENT_TREND_LENGTH = 20;
const MAX_CATEGORY_NAME_LENGTH = 120;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)/;
const MAX_CODE_LENGTH = 6;
const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;
const VERIFICATION_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

// ============================================================================
// ZOD SCHEMAS - Using constants for maintainability and consistency
// ============================================================================
const questionOptionSchema = z.object({
  id: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_OPTION_ID_LENGTH),
  label: z.string().max(MAX_OPTION_LABEL_LENGTH).default(''),
}).passthrough();

const explanationSchema = z.object({
  summary: z.string().max(MAX_SUMMARY_LENGTH).optional().default(''),
  ruleTitle: z.string().max(MAX_RULE_TITLE_LENGTH).optional().default(''),
  steps: z.array(z.string().max(MAX_STEP_LENGTH)).max(MAX_EXPLANATION_STEPS).optional().default([]),
}).passthrough().optional();

const questionRequestSchema = z.object({
  questionId: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_QUESTION_ID_LENGTH),
  questionType: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_QUESTION_TYPE_LENGTH),
  category: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_CATEGORY_LENGTH),
  difficulty: z.number().int().min(MIN_DIFFICULTY).max(MAX_DIFFICULTY),
  prompt: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_PROMPT_LENGTH),
  secondaryPrompt: z.string().max(MAX_SECONDARY_PROMPT_LENGTH).optional(),
  explanation: explanationSchema,
  options: z.array(questionOptionSchema).min(MIN_OPTIONS_COUNT).max(MAX_OPTIONS_COUNT),
  correctOptionId: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_OPTION_ID_LENGTH),
});

const hintRequestSchema = questionRequestSchema.extend({
  stepRequested: z.number().int().min(1).max(3).optional().default(1),
});
const mistakeRequestSchema = questionRequestSchema.extend({
  selectedOptionId: z.string().min(MIN_QUESTION_ID_LENGTH).max(MAX_OPTION_ID_LENGTH),
});
const stepExplanationRequestSchema = mistakeRequestSchema.extend({
  isCorrect: z.boolean(),
});
const dailyPlanRequestSchema = z.object({
  studentName: z.string().trim().min(MIN_QUESTION_ID_LENGTH).max(MAX_STUDENT_NAME_LENGTH).default('Öğrenci'),
  grade: z.number().int().min(MIN_GRADE).max(MAX_GRADE).default(3),
  level: z.number().int().min(MIN_QUESTION_ID_LENGTH).max(MAX_LEVEL).default(1),
  streak: z.number().int().min(0).max(MAX_STREAK).default(0),
  dailyGoalQuestions: z.number().int().min(MIN_QUESTION_ID_LENGTH).max(MAX_DAILY_GOAL_QUESTIONS).default(10),
  dailyGoalMinutes: z.number().int().min(MIN_QUESTION_ID_LENGTH).max(MAX_DAILY_GOAL_MINUTES).default(15),
  todayQuestionsSolved: z.number().int().min(0).max(MAX_TODAY_QUESTIONS).default(0),
  unresolvedMistakes: z.array(z.object({
    category: z.string().max(MAX_CATEGORY_LENGTH),
    questionType: z.string().max(MAX_QUESTION_TYPE_LENGTH),
    difficulty: z.number().int().min(MIN_DIFFICULTY).max(MAX_DIFFICULTY),
    prompt: z.string().max(MAX_STEP_LENGTH),
  }).passthrough()).max(MAX_UNRESOLVED_MISTAKES).default([]),
  masteries: z.array(z.object({
    category: z.string().max(MAX_CATEGORY_LENGTH),
    categoryName: z.string().max(MAX_CATEGORY_NAME_LENGTH),
    mastery: z.number().min(0).max(MAX_MASTERY_SCORE),
    accuracy: z.number().min(0).max(MAX_ACCURACY_SCORE),
    recentTrend: z.string().max(MAX_RECENT_TREND_LENGTH),
  }).passthrough()).max(MAX_MASTERIES).default([]),
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || DEFAULT_PORT;

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://zekapark.muratteknofest.chatgpt.site')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://firebasevertexai.googleapis.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));

  const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Yapay zekâ istek sınırına ulaşıldı. Lütfen kısa süre sonra tekrar deneyin.' },
  });
  const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Saatlik rapor gönderim sınırına ulaşıldı.' },
  });
  const accountSecurityLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 6,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Saatlik hesap güvenliği işlem sınırına ulaşıldı.' },
  });

  const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Şifre en az bir harf ve bir rakam içermelidir.',
  });
  const linkedStudentPasswordSchema = z.object({
    studentId: z.string().min(1).max(128),
    newPassword: strongPassword,
  }).strict();

  app.post(
    '/api/parent/reset-student-password',
    accountSecurityLimiter,
    requireFirebaseAuth,
    requireVerifiedEmail,
    requireProfileRole('parent'),
    async (req: AuthenticatedRequest, res) => {
      const parsed = linkedStudentPasswordSchema.safeParse(req.body);
      if (!parsed.success || !req.authUser) {
        return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message });
      }

      const adminDb = getAdminDb();
      const [parentSnapshot, studentSnapshot] = await Promise.all([
        adminDb.doc(`users/${req.authUser.uid}`).get(),
        adminDb.doc(`users/${parsed.data.studentId}`).get(),
      ]);
      const parent = parentSnapshot.data();
      const student = studentSnapshot.data();
      const isLinked = Array.isArray(parent?.linkedStudentIds)
        && parent.linkedStudentIds.includes(parsed.data.studentId)
        && student?.linkedParentId === req.authUser.uid
        && student?.role === 'student';

      if (!isLinked) return res.status(403).json({ error: 'Öğrenci bu veli hesabına bağlı değil.' });

      const adminAuth = getAdminAuth();
      await adminAuth.updateUser(parsed.data.studentId, { password: parsed.data.newPassword });
      await adminAuth.revokeRefreshTokens(parsed.data.studentId);
      await adminDb.collection('securityEvents').add({
        type: 'student_password_reset_by_parent',
        actorId: req.authUser.uid,
        studentId: parsed.data.studentId,
        createdAt: Date.now(),
      });
      return res.status(204).send();
    },
  );

  // Lazy initialize Gemini client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
    return aiClient;
  }

  // Weekly Report Email Endpoint
  const reportSchema = z.object({
    studentId: z.string().min(1).max(128),
  }).strict();

  app.post('/api/send-weekly-report', reportLimiter, requireFirebaseAuth, requireVerifiedEmail, requireProfileRole('parent'), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success || !req.authUser) {
        return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : 'Rapor bilgileri geçersiz.' });
      }

      const { studentId } = parsed.data;
      const adminDb = getAdminDb();
      const [parentSnap, studentSnap, stateSnap] = await Promise.all([
        adminDb.doc(`users/${req.authUser.uid}`).get(),
        adminDb.doc(`users/${studentId}`).get(),
        adminDb.doc(`users/${studentId}/private/state`).get(),
      ]);
      const parent = parentSnap.data();
      const student = studentSnap.data();
      if (!parent || !student || !Array.isArray(parent.linkedStudentIds) || !parent.linkedStudentIds.includes(studentId)) {
        return res.status(403).json({ error: 'Öğrenci bu veli hesabına bağlı değil.' });
      }
      const parentEmail = String(req.authUser.email || parent.email || '');
      if (!parentEmail) return res.status(400).json({ error: 'Veli e-posta adresi bulunamadı.' });
      const studentName = escapeHtml(student.name || 'Öğrenci');
      const persistedValues = (stateSnap.data()?.values || {}) as Record<string, unknown>;
      const parsePersisted = <T>(key: string, fallback: T): T => {
        const raw = persistedValues[key];
        if (typeof raw !== 'string') return fallback;
        try { return JSON.parse(raw) as T; } catch { return fallback; }
      };
      const weekly = parsePersisted<{ thisWeekDays?: number[] }>('yapyap_weekly_questions_v1', {});
      const masteries = parsePersisted<Array<{ attemptCount?: number; accuracy?: number }>>('yapyap_mastery', []);
      const attempted = masteries.filter((item) => (item.attemptCount || 0) > 0);
      const weeklyData = {
        totalMinutes: Number(student.todayMinutesSpent || 0),
        totalQuestions: (weekly.thisWeekDays || []).reduce((sum, count) => sum + Number(count || 0), 0),
        accuracy: attempted.length
          ? Math.round(attempted.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / attempted.length)
          : 0,
        streak: Number(student.streak || 0),
      };

      // HTML Email Template
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ZekaPark Haftalık Gelişim Özeti</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 16px; line-height: 1.5;">Merhaba,</p>
            <p style="font-size: 16px; line-height: 1.5;">Öğrencimiz <strong>${studentName}</strong>'ın bu haftaki çalışma performansı başarıyla analiz edildi:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px 0;">
              <ul style="list-style-type: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">⏱️ Bugünkü Kayıtlı Çalışma Süresi:</span>
                  <strong style="color: #0f172a;">${weeklyData.totalMinutes} dakika</strong>
                </li>
                <li style="margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">🎯 Bu Hafta Çözülen Soru:</span>
                  <strong style="color: #0f172a;">${weeklyData.totalQuestions} soru</strong>
                </li>
                <li style="margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">✅ Doğru Oranı:</span>
                  <strong style="color: #10b981;">%${weeklyData.accuracy}</strong>
                </li>
                <li style="font-size: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">🔥 Güncel Öğrenme Serisi:</span>
                  <strong style="color: #f59e0b;">${weeklyData.streak} gün</strong>
                </li>
              </ul>
            </div>
            
            <p style="font-size: 15px; color: #475569; line-height: 1.5;">Gelişim eğrisini incelemek ve yapay zeka destekli detaylı analizlere ulaşmak için Veli Portalı'nı ziyaret edebilirsiniz.</p>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${escapeHtml(process.env.APP_BASE_URL || 'https://zekapark.com')}" style="background-color: #4f46e5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Portala Giriş Yap</a>
            </div>
          </div>
        </div>
      `;

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(503).json({ error: 'E-posta servisi henüz yapılandırılmamış.' });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: parentEmail,
        subject: `${studentName} - Haftalık ZekaPark Gelişim Özeti`,
        html: emailHtml,
      });

      res.json({ success: true, message: 'Haftalık özet başarıyla gönderildi.' });
    } catch (error: any) {
      console.error('Email sending error:', error);
      res.status(500).json({ error: 'E-posta gönderilemedi.' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: Date.now(),
    });
  });

  // AI Step-by-Step Question Hint Endpoint
  app.post('/api/ai-hint', aiLimiter, requireFirebaseAuth, async (req, res) => {
    try {
      const validation = hintRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'İpucu isteği geçersiz.' });
      }
      const {
        questionId,
        questionType,
        category,
        difficulty,
        prompt,
        secondaryPrompt,
        explanation,
        options,
        correctOptionId,
        stepRequested = 1,
      } = validation.data;

      const ai = getGeminiClient();

      if (!ai) {
        // Return 503 or fallback indication so frontend seamlessly uses the procedural fallback
        return res.status(200).json({
          fallback: true,
          message: 'Gemini API key is not configured; using procedural Socratic engine.',
        });
      }

      const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için özel tasarlanmış şefkatli, eğlenceli ve cesaret verici bir "Bilişsel Zeka ve Pedagoji Rehberisin".

Öğrenci bir soru üzerinde düşünürken takıldı ve "İpucu" butonuna bastı.
GÖREVİN: Çocuğa doğrudan cevabı söylemeden (KESİNLİKLE "Cevap A şıkkı", "Doğru seçenek C" gibi doğrudan spoiler vermeden), Sokratik yöntemle kendi aklıyla sonuca ulaşmasını sağlayacak 3 KADEMELİ ADIM ADIM İPUCU seti üretmektir.

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${prompt}" ${secondaryPrompt ? `(${secondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Seçenekler: ${JSON.stringify(options?.map((o: any) => ({ id: o.id, label: o.label })) || [])}
- Doğru Seçenek: ${correctOptionId}

Üreteceğin 3 Adım Şunlardır:
1. "focus" (Nereye Bakmalısın?): Çocuğun dikkatini sorudaki anahtar bölgeye, değişen parçaya veya eksene yönlendir.
2. "rule" (Gizli Kuralı Keşfet): Şekiller arasındaki ilişkiyi (dönme açısı, satır/sütun kuralı, simetri aynası, parça sayısı vb.) merak uyandıran bir soruyla düşündür.
3. "elimination" (Seçenekleri Ele): Hangi bariz seçeneklerin neden elenebileceğini ve doğru cevabı ele veren kritik ayrıntıyı fısılda (ama doğrudan doğru seçeneğin harfini söyleme).

Üslup Kuralları:
- Dil: Çok samimi, sevimli, Türkçe, çocuk dostu, motive edici ("Harika bir dedektifsin!", "Birlikte parçaları inceleyelim!").
- Uzunluk: Her adım 2-3 kısa, net cümle olsun.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContext,
        config: {
          systemInstruction:
            'Sen çocuklar için bilişsel zeka sorularında rehberlik eden pedagojik bir AI koçusun. Çocuğa asla direkt cevabı söyleme; Sokratik ipuçları ver.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              introEncouragement: {
                type: Type.STRING,
                description: 'Çocuğu motive eden kısa sevimli bir giriş cümlesi.',
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, description: 'focus | rule | elimination' },
                    content: { type: Type.STRING, description: 'İpucu açıklaması' },
                    keyObservation: { type: Type.STRING, description: 'Dikkat edilmesi gereken kısa püf nokta' },
                    suggestedAction: { type: Type.STRING, description: 'Çocuğun şimdi yapmasını önerdiğin eylem' },
                  },
                  required: ['stepNumber', 'title', 'type', 'content'],
                },
              },
            },
            required: ['introEncouragement', 'steps'],
          },
        },
      });

      const rawJson = response.text?.trim();
      if (!rawJson) {
        return res.status(200).json({ fallback: true });
      }

      const parsed = JSON.parse(rawJson);
      return res.json({
        success: true,
        fallback: false,
        questionId,
        category,
        questionType,
        difficulty,
        totalSteps: 3,
        unlockedSteps: Math.min(3, Math.max(1, stepRequested)),
        introEncouragement: parsed.introEncouragement,
        steps: parsed.steps,
        isAiGenerated: true,
        modelUsed: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.log('AI fallback triggered: AI hint unavailable');
      // Fail gracefully so frontend uses fallback
      return res.status(200).json({
        fallback: true,
        error: 'AI service unavailable',
      });
    }
  });

  // AI Mistake Explanation ('Neden Yanlış?') Endpoint
  app.post('/api/ai-explain-mistake', aiLimiter, requireFirebaseAuth, async (req, res) => {
    try {
      const validation = mistakeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Hata açıklama isteği geçersiz.' });
      }
      const {
        questionId,
        questionType,
        category,
        difficulty,
        prompt,
        secondaryPrompt,
        explanation,
        options,
        selectedOptionId,
        correctOptionId,
      } = validation.data;

      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({
          fallback: true,
          message: 'Gemini API key is not configured; using procedural mistake analyzer.',
        });
      }

      const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için uzman, şefkatli bir "Çocuk Bilişsel Pedagoji Uzmanı"sın.

Bir öğrenci bir soru üzerinde düşünürken yanlış bir seçenek işaretledi.
Amacın: Çocuğu ASLA yargılamadan, suçlamadan, şefkatle ve yapıcı bir dille:
1. Öğrencinin seçtiği yanlış seçeneğin mantığını anlamak (neden bu seçeneğe yönelmiş olabilir, görsel/mantıksal tuzak neydi?).
2. Çocuğun seçtiği seçenek ile DOĞRU seçenek arasındaki kritik farkı net ve somut bir dille açıklamak.
3. Çocuğun bir sonraki soruda hatayı tekrarlamaması için akılda kalıcı bir "Altın Kural / Bilişsel Taktik" kazandırmak.

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${prompt}" ${secondaryPrompt ? `(${secondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Seçenekler: ${JSON.stringify(options || [])}
- Öğrencinin İşaretlediği Yanlış Seçenek: ${selectedOptionId}
- Doğru Seçenek: ${correctOptionId}

Üslup Kuralları:
- Dil: Çok samimi, sevecen, cesaret verici, Türkçe ("Çok güzel bir denemeydi!", "Hadi zihnimizin nerede şaşırdığını birlikte görelim!").
- Yaş Grubu: 7-11 yaş ilkokul çocukları. Cümleler akıcı, açık ve pozitif olmalı.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContext,
        config: {
          systemInstruction:
            'Sen çocuklar için bilişsel zeka sorularında hatanın nedenini şefkatle, pedagojik ve Sokratik olarak açıklayan bir uzmansın. Çocuğu yüreklendir.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              empatheticIntro: {
                type: Type.STRING,
                description: 'Çocuğun bu seçeneği seçmesini anlayışla karşılayan, şefkatli giriş cümlesi.',
              },
              misconceptionTrap: {
                type: Type.STRING,
                description: 'Sorudaki görsel yanılsama, çeldirici veya gözden kaçan kuralın analizi.',
              },
              differenceAnalysis: {
                type: Type.STRING,
                description: 'İşaretlenen seçenek ile doğru seçenek arasındaki somut farkın açıklaması.',
              },
              goldenRuleTip: {
                type: Type.STRING,
                description: 'Bir sonraki benzer soruda çocuğa rehberlik edecek akılda kalıcı altın kural.',
              },
              bilsemSuperPower: {
                type: Type.STRING,
                description: 'Bu hatadan kazanılan bilişsel süper güç unvanı (örn: Parça-Bütün Dedektifi).',
              },
            },
            required: [
              'empatheticIntro',
              'misconceptionTrap',
              'differenceAnalysis',
              'goldenRuleTip',
              'bilsemSuperPower',
            ],
          },
        },
      });

      const rawJson = response.text?.trim();
      if (!rawJson) {
        return res.status(200).json({ fallback: true });
      }

      const parsed = JSON.parse(rawJson);
      return res.json({
        success: true,
        fallback: false,
        questionId,
        selectedOptionId,
        correctOptionId,
        category,
        questionType,
        difficulty,
        empatheticIntro: parsed.empatheticIntro,
        misconceptionTrap: parsed.misconceptionTrap,
        differenceAnalysis: parsed.differenceAnalysis,
        goldenRuleTip: parsed.goldenRuleTip,
        bilsemSuperPower: parsed.bilsemSuperPower,
        isAiGenerated: true,
        modelUsed: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.log('AI fallback triggered: AI mistake explanation unavailable');
      return res.status(200).json({
        fallback: true,
        error: 'AI service unavailable',
      });
    }
  });

  // AI Step-by-Step Question Explanation Endpoint (Accordion Flow)
  app.post('/api/ai-step-explanation', aiLimiter, requireFirebaseAuth, async (req, res) => {
    try {
      const validation = stepExplanationRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Çözüm açıklaması isteği geçersiz.' });
      }
      const {
        questionId,
        questionType,
        category,
        difficulty,
        prompt,
        secondaryPrompt,
        explanation,
        options,
        selectedOptionId,
        correctOptionId,
        isCorrect,
      } = validation.data;

      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({
          fallback: true,
          message: 'Gemini API key is not configured; using procedural step engine.',
        });
      }

      const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve üstün bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için özel tasarlanmış uzman, şefkatli bir "Bilişsel Zeka ve Pedagojik Çözüm Rehberisin".

Öğrenci soruyu çözdü ve cevabını gönderdi.
- Öğrencinin Cevabı: ${selectedOptionId}
- Doğru Cevap: ${correctOptionId}
- Sonuç: ${isCorrect ? 'DOĞRU! Tebrik et ve mantığı pekiştir.' : 'YANLIŞ. Neden yanıldığını ve doğru yolu şefkatle açıkla.'}

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${prompt}" ${secondaryPrompt ? `(${secondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Kural Başlığı: "${explanation?.ruleTitle || ''}"
- Seçenekler: ${JSON.stringify(options || [])}

GÖREVİN: Çocuğun zihninde soru çözümünü netleştirecek 4 KADEMELİ ADIM ADIM (Step-by-Step) Pedagojik Akordiyon Açıklaması oluşturmaktır:
1. "focus" (Görsel Odak & İlk Bakış): Çocuğun gözünü nereye dikmesi gerektiğini ve sorunun kalbini göster. (Rozet: "1. Odaklanma")
2. "rule" (Gizli Kural & Örüntü): Şekillerin veya sayıların arkasındaki değişim kuralını (dönme, parça artışı, simetri, analoji vb.) açıkla. (Rozet: "2. Kural Keşfi")
3. "elimination" (Çeldiricileri Eleme & Doğrulama): Yanıltıcı seçeneklerin neden yanlış olduğunu ve doğru seçeneğin neden tam oturduğunu netleştir. (Rozet: "3. Eleme & Sonuç")
4. "tactic" (Bilişsel Altın Taktik & BİLSEM Püf Noktası): Gelecek sorularda işine yarayacak akılda kalıcı pratik bir zeka taktiği ver. (Rozet: "4. Altın Taktik")

Üslup:
- Çok sevimli, cesaret verici, samimi, Türkçe ve 7-11 yaş çocuk seviyesine uygun.
- Her adımın açıklaması 2-3 cümle, net ve merak uyandırıcı olmalı.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContext,
        config: {
          systemInstruction:
            'Sen çocuklar için bilişsel zeka sorularında akordiyon yapısıyla adım adım çözüm sunan pedagojik bir AI eğitmenisin.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineTitle: {
                type: Type.STRING,
                description: 'Çözüm için ilgi çekici kısa başlık (örn: Matris Çözüm Dedektifi)',
              },
              pedagogicalSummary: {
                type: Type.STRING,
                description: 'Çözümün ana fikrini özetleyen tek cümlelik dostane açıklama',
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    badge: { type: Type.STRING },
                    type: {
                      type: Type.STRING,
                      description: 'focus | rule | elimination | tactic',
                    },
                    explanation: { type: Type.STRING },
                    keyObservation: { type: Type.STRING },
                    visualAnchor: { type: Type.STRING },
                  },
                  required: ['stepNumber', 'title', 'badge', 'type', 'explanation'],
                },
              },
            },
            required: ['headlineTitle', 'pedagogicalSummary', 'steps'],
          },
        },
      });

      const rawJson = response.text?.trim();
      if (!rawJson) {
        return res.status(200).json({ fallback: true });
      }

      const parsed = JSON.parse(rawJson);
      return res.json({
        success: true,
        fallback: false,
        questionId,
        selectedOptionId,
        correctOptionId,
        isCorrect: Boolean(isCorrect),
        category,
        questionType,
        difficulty,
        headlineTitle: parsed.headlineTitle,
        pedagogicalSummary: parsed.pedagogicalSummary,
        steps: parsed.steps,
        isAiGenerated: true,
        modelUsed: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.log('AI fallback triggered: AI step explanation unavailable');
      return res.status(200).json({
        fallback: true,
        error: 'AI service unavailable',
      });
    }
  });

  // AI Personalized Daily Study Plan Endpoint ("Bugünün Çalışma Planı")
  app.post('/api/ai-daily-plan', aiLimiter, requireFirebaseAuth, async (req, res) => {
    try {
      const validation = dailyPlanRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Çalışma planı isteği geçersiz.' });
      }
      const {
        studentName = 'Öğrenci',
        grade = 3,
        level = 4,
        streak = 5,
        dailyGoalQuestions = 10,
        dailyGoalMinutes = 15,
        todayQuestionsSolved = 0,
        unresolvedMistakes = [],
        masteries = [],
      } = validation.data;

      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({
          fallback: true,
          message: 'Gemini API key is not configured; using procedural pedagogical plan generator.',
        });
      }

      const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve üstün yetenekli ilkokul öğrencileri (7-11 yaş) için çalışan uzman bir "Yapay Zeka Bilişsel Koç ve Eğitim Tasarımcısısın".

Öğrenci Bilgileri:
- İsim: ${studentName}
- Sınıf: ${grade}. Sınıf
- Seviye: Seviye ${level}
- Günlük Seri: ${streak} Gün
- Günlük Hedef: ${dailyGoalQuestions} Soru, ${dailyGoalMinutes} Dakika
- Bugün Şu Ana Kadar Çözülen Soru Sayısı: ${todayQuestionsSolved}

Öğrencinin Bilişsel Beceri Başarı Durumu (Mastery):
${JSON.stringify(
  masteries.map((m: any) => ({
    kategori: m.category,
    ad: m.categoryName,
    ustalikYuzdesi: m.mastery,
    dogrulukOrani: m.accuracy,
    trend: m.recentTrend,
  })),
  null,
  2
)}

Hata Defterinde Çözüm Bekleyen Sorular (${unresolvedMistakes.length} adet):
${JSON.stringify(
  unresolvedMistakes.slice(0, 5).map((m: any) => ({
    kategori: m.category,
    tip: m.questionType,
    zorluk: m.difficulty,
    metin: m.prompt,
  })),
  null,
  2
)}

GÖREVİN:
Her sabah güncellenen, bu öğrencinin GERÇEK EKSİK OLDUĞU (en düşük başarı yüzdesine sahip veya hata defterinde bekleyen soruları bulunan) konuları hedef alan KİŞİSELLEŞTİRİLMİŞ BİR "BUGÜNÜN ÇALIŞMA PLANI" üretmektir.

Plan Şunları İçermelidir:
1. "greetingTitle": Sabah enerjisi veren, neşeli, kişiselleştirilmiş başlık (örn: "Günaydın Deniz! Bugün Zihnini Parlatma Vakti 🚀")
2. "morningCoachMessage": Çocuğun dünkü serisini öven, bugün hangi 2 zayıf alanını (örn. Matris & Örüntü) güçlendireceğini anlatan samimi 2-3 cümlelik koçluk notu.
3. "motivationalQuote": Güne başlarken ilham verecek kısa bir zeka/özgüven sözü.
4. "focusWeaknesses": Öğrencinin en zayıf olduğu 2 veya 3 kategori için teşhis ve neden bugün üzerinde durulması gerektiğinin çocuk diliyle pedagojik açıklaması.
5. "tasks": Tam olarak 3 adet günlük hedef görevi:
   - Görev 1: En zayıf kategoride pratik (örn. "Zayıf Alan Güçlendirme: 4 Soru Matris Pratiği", actionType: "practice_category", category: en zayıf kategori, targetCount: 4)
   - Görev 2: Varsa Hata Defteri tekrarı veya 2. zayıf konu (örn. "Hata Avı: Bekleyen Soruları Fetheyle", actionType: "review_mistakes" veya "practice_category")
   - Görev 3: Destekleyici pratik veya adaptif antrenman (actionType: "adaptive_session" veya "practice_category")
6. "dailySuperpowerTarget": Bugün kazanılacak bilişsel süper güç unvanı (örn: "Matris Sihirbazı & 3D Pusula")
7. "totalTargetQuestions": ${dailyGoalQuestions || 10}
8. "estimatedMinutes": ${dailyGoalMinutes || 15}

Üslup:
- Çok sıcak, cesaretlendirici, motive edici, Türkçe ve çocuk dostu olmalıdır.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContext,
        config: {
          systemInstruction:
            'Sen BİLSEM öğrencileri için her sabah kişiselleştirilmiş zeka antrenman programı hazırlayan pedagojik bir AI eğitim koçusun. Eksik konuları hedefler ve çocuğu yüreklendirirsin.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              greetingTitle: {
                type: Type.STRING,
                description: 'Sabah karşılama başlığı',
              },
              morningCoachMessage: {
                type: Type.STRING,
                description: 'Sabah motivasyon ve rehberlik koçluk mesajı (2-3 cümle)',
              },
              motivationalQuote: {
                type: Type.STRING,
                description: 'Günün ilham veren zeka sözü',
              },
              focusWeaknesses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    categoryName: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    currentMastery: { type: Type.NUMBER },
                  },
                  required: ['category', 'categoryName', 'reason', 'currentMastery'],
                },
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    targetCount: { type: Type.NUMBER },
                    completedCount: { type: Type.NUMBER },
                    rewardXP: { type: Type.NUMBER },
                    isCompleted: { type: Type.BOOLEAN },
                    priority: { type: Type.STRING },
                    actionType: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'title',
                    'description',
                    'category',
                    'targetCount',
                    'completedCount',
                    'rewardXP',
                    'isCompleted',
                    'priority',
                    'actionType',
                  ],
                },
              },
              dailySuperpowerTarget: {
                type: Type.STRING,
                description: 'Bugün hedeflenen bilişsel süper güç rozeti unvanı',
              },
              totalTargetQuestions: {
                type: Type.NUMBER,
                description: 'Toplam soru adedi hedefi',
              },
              estimatedMinutes: {
                type: Type.NUMBER,
                description: 'Tahmini tamamlanma süresi (dakika)',
              },
            },
            required: [
              'greetingTitle',
              'morningCoachMessage',
              'motivationalQuote',
              'focusWeaknesses',
              'tasks',
              'dailySuperpowerTarget',
              'totalTargetQuestions',
              'estimatedMinutes',
            ],
          },
        },
      });

      const rawJson = response.text?.trim();
      if (!rawJson) {
        return res.status(200).json({ fallback: true });
      }

      const parsed = JSON.parse(rawJson);
      return res.json({
        success: true,
        fallback: false,
        greetingTitle: parsed.greetingTitle,
        morningCoachMessage: parsed.morningCoachMessage,
        motivationalQuote: parsed.motivationalQuote,
        focusWeaknesses: parsed.focusWeaknesses,
        tasks: parsed.tasks,
        dailySuperpowerTarget: parsed.dailySuperpowerTarget,
        totalTargetQuestions: parsed.totalTargetQuestions || dailyGoalQuestions,
        estimatedMinutes: parsed.estimatedMinutes || dailyGoalMinutes,
        isAiGenerated: true,
        modelUsed: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.log('AI fallback triggered: AI daily plan unavailable');
      return res.status(200).json({
        fallback: true,
        error: 'AI plan service unavailable',
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // AI Question Engine — Admin Endpoints
  // ═══════════════════════════════════════════════════════════

  const adminAiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AI soru motoru istek sınırına ulaşıldı.' },
  });

  const aiQuestionGenerateSchema = z.object({
    category: z.string().max(80).optional(),
    questionType: z.string().max(80).optional(),
    targetGrade: z.number().int().min(1).max(4),
    difficulty: z.number().int().min(1).max(6),
    minQualityScore: z.number().int().min(0).max(100).optional().default(85),
    aiModel: z.string().max(100).optional(),
  }).strict();

  const aiBulkGenerateSchema = z.object({
    category: z.string().max(80).optional(),
    questionType: z.string().max(80).optional(),
    targetGrade: z.number().int().min(1).max(4),
    difficulty: z.union([z.number().int().min(1).max(6), z.literal('auto')]),
    count: z.number().int().min(1).max(50),
    minQualityScore: z.number().int().min(0).max(100).optional().default(85),
    aiModel: z.string().max(100).optional(),
  }).strict();

  const aiQuestionReviewSchema = z.object({
    questionId: z.string().min(1).max(200),
    action: z.enum(['approve', 'reject', 'regenerate']),
  }).strict();

  // Lazy-initialize AI Queue
  let aiQueue: any = null;
  async function getAiQueue() {
    if (aiQueue) return aiQueue;
    const ai = getGeminiClient();
    if (!ai) return null;
    try {
      const adminDb = getAdminDb();
      const { AiGenerationQueue } = await import('./server/ai-generation-queue');
      aiQueue = new AiGenerationQueue(ai, adminDb);
      return aiQueue;
    } catch (err) {
      console.warn('AI Question Engine başlatılamadı:', err);
      return null;
    }
  }

  // POST /api/admin/ai-generate-question — Single question generation
  app.post('/api/admin/ai-generate-question', adminAiLimiter, requireFirebaseAuth, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = aiQuestionGenerateSchema.safeParse(req.body);
      if (!parsed.success || !req.authUser) {
        return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI servisi yapılandırılmamış. GEMINI_API_KEY ayarlanmalı.' });
      }

      const { runQuestionPipeline } = await import('./server/ai-question-pipeline');
      const result = await runQuestionPipeline(ai, {
        category: parsed.data.category,
        questionType: parsed.data.questionType,
        targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
        difficulty: parsed.data.difficulty,
        minQualityScore: parsed.data.minQualityScore,
        aiModel: parsed.data.aiModel,
      });

      // Log to Firestore
      try {
        const adminDb = getAdminDb();
        await adminDb.collection('ai_generation_logs').add({
          adminId: req.authUser.uid,
          model: result.model,
          promptVersion: result.promptVersion,
          qualityScore: result.qualityScore,
          success: result.success,
          rejectionReasons: result.rejectionReasons,
          durationMs: result.durationMs,
          createdAt: Date.now(),
        });
      } catch (logErr) {
        console.warn('AI generation log yazılamadı:', logErr);
      }

      // If successful, save as draft
      if (result.success && result.question) {
        try {
          const adminDb = getAdminDb();
          const qRef = adminDb.collection('questions').doc(result.question.id);
          await qRef.set({
            ...result.question,
            status: 'draft',
            revision: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: req.authUser.uid,
          });
        } catch (saveErr) {
          console.warn('AI sorusu kaydedilemedi:', saveErr);
        }
      }

      return res.json({
        success: result.success,
        question: result.question,
        qualityScore: result.qualityScore,
        solverVerified: result.solverVerified,
        validationErrors: result.validationErrors,
        validationWarnings: result.validationWarnings,
        rejectionReasons: result.rejectionReasons,
        durationMs: result.durationMs,
      });
    } catch (err: any) {
      console.error('AI soru üretim hatası:', err);
      return res.status(500).json({ error: 'AI soru üretimi başarısız: ' + (err.message || 'Bilinmeyen hata') });
    }
  });

  // POST /api/admin/ai-bulk-generate — Bulk question generation
  app.post('/api/admin/ai-bulk-generate', adminAiLimiter, requireFirebaseAuth, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = aiBulkGenerateSchema.safeParse(req.body);
      if (!parsed.success || !req.authUser) {
        return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
      }

      const queue = await getAiQueue();
      if (!queue) {
        return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
      }

      const jobId = queue.createJob(req.authUser.uid, {
        category: parsed.data.category,
        questionType: parsed.data.questionType,
        targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
        difficulty: parsed.data.difficulty,
        count: parsed.data.count,
        minQualityScore: parsed.data.minQualityScore,
        aiModel: parsed.data.aiModel,
      });

      return res.json({ jobId, status: 'queued', message: `${parsed.data.count} soru üretim işi başlatıldı.` });
    } catch (err: any) {
      console.error('Toplu üretim başlatma hatası:', err);
      return res.status(500).json({ error: 'Toplu üretim başlatılamadı.' });
    }
  });

  // GET /api/admin/ai-generation-job/:jobId — Job status
  app.get('/api/admin/ai-generation-job/:jobId', requireFirebaseAuth, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const queue = await getAiQueue();
      if (!queue) {
        return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
      }

      const job = queue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'İş bulunamadı.' });
      }

      return res.json({
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        results: job.results.map((r: any) => ({
          success: r.success,
          qualityScore: r.qualityScore,
          solverVerified: r.solverVerified,
          rejectionReasons: r.rejectionReasons,
          question: r.question ? {
            id: r.question.id,
            type: r.question.type,
            category: r.question.category,
            difficulty: r.question.difficulty,
            prompt: r.question.prompt,
            correctOptionId: r.question.correctOptionId,
          } : null,
        })),
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'İş durumu alınamadı.' });
    }
  });

  // POST /api/admin/ai-question-review — Approve/Reject/Regenerate
  app.post('/api/admin/ai-question-review', adminAiLimiter, requireFirebaseAuth, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = aiQuestionReviewSchema.safeParse(req.body);
      if (!parsed.success || !req.authUser) {
        return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : 'Geçersiz istek.' });
      }

      const { questionId, action } = parsed.data;
      const adminDb = getAdminDb();
      const qRef = adminDb.collection('questions').doc(questionId);
      const snap = await qRef.get();

      if (!snap.exists) {
        return res.status(404).json({ error: 'Soru bulunamadı.' });
      }

      const currentData = snap.data()!;

      if (action === 'approve') {
        await qRef.update({
          status: 'published',
          reviewedBy: req.authUser.uid,
          updatedAt: new Date().toISOString(),
          updatedBy: req.authUser.uid,
          revision: (currentData.revision || 0) + 1,
        });
        return res.json({ success: true, message: 'Soru onaylandı ve yayınlandı.' });
      }

      if (action === 'reject') {
        await qRef.update({
          status: 'archived',
          updatedAt: new Date().toISOString(),
          updatedBy: req.authUser.uid,
          revision: (currentData.revision || 0) + 1,
        });
        return res.json({ success: true, message: 'Soru reddedildi.' });
      }

      if (action === 'regenerate') {
        // Delete old and trigger new generation
        await qRef.delete();
        const ai = getGeminiClient();
        if (!ai) return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });

        const { runQuestionPipeline } = await import('./server/ai-question-pipeline');
        const result = await runQuestionPipeline(ai, {
          category: currentData.category,
          questionType: currentData.type,
          targetGrade: currentData.targetGrade || 3,
          difficulty: currentData.difficulty || 3,
        });

        if (result.success && result.question) {
          await adminDb.collection('questions').doc(result.question.id).set({
            ...result.question,
            status: 'draft',
            revision: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: req.authUser.uid,
          });
        }

        return res.json({
          success: result.success,
          message: result.success ? 'Soru yeniden üretildi.' : 'Yeniden üretim başarısız.',
          question: result.question,
          qualityScore: result.qualityScore,
        });
      }

      return res.status(400).json({ error: 'Geçersiz işlem.' });
    } catch (err: any) {
      console.error('Soru inceleme hatası:', err);
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'API uç noktası bulunamadı.' });
    });
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
