import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
  escapeHtml,
  getAdminAuth,
  getAdminDb,
  normalizeStudentCode,
  requireFirebaseAuth,
  requireRole,
  type AuthenticatedRequest,
} from './server/security';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
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
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '256kb' }));

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.' },
  });
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

  const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Şifre en az bir harf ve bir rakam içermelidir.',
  });
  const familyRegistrationSchema = z.object({
    parentEmail: z.string().email().max(254),
    parentPassword: strongPassword,
    parentPhone: z.string().max(24).optional().default(''),
    studentName: z.string().trim().min(2).max(50),
    studentPassword: strongPassword,
    grade: z.number().int().min(1).max(4),
    examFocus: z.string().trim().min(2).max(80),
    kvkkConsent: z.literal(true),
  }).refine((value) => value.parentPassword !== value.studentPassword, {
    path: ['studentPassword'],
    message: 'Öğrenci şifresi veli şifresinden farklı olmalıdır.',
  });

  app.post('/api/auth/register-family', authLimiter, async (req, res) => {
    const parsed = familyRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Kayıt bilgileri geçersiz.' });
    }

    const createdUserIds: string[] = [];
    let adminAuth: ReturnType<typeof getAdminAuth> | null = null;
    try {
      adminAuth = getAdminAuth();
      const adminDb = getAdminDb();
      const input = parsed.data;
      const parentRecord = await adminAuth.createUser({
        email: input.parentEmail.toLowerCase(),
        password: input.parentPassword,
        emailVerified: false,
        displayName: input.parentEmail.split('@')[0],
      });
      createdUserIds.push(parentRecord.uid);

      let studentCode = '';
      let studentEmail = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        studentCode = `${normalizeStudentCode(input.studentName)}${randomInt(1000, 10000)}`;
        studentEmail = `${studentCode.toLowerCase()}@zekapark.com`;
        try {
          await adminAuth.getUserByEmail(studentEmail);
        } catch (error: any) {
          if (error?.code === 'auth/user-not-found') break;
          throw error;
        }
      }

      const studentRecord = await adminAuth.createUser({
        email: studentEmail,
        password: input.studentPassword,
        emailVerified: true,
        displayName: input.studentName,
      });
      createdUserIds.push(studentRecord.uid);

      await Promise.all([
        adminAuth.setCustomUserClaims(parentRecord.uid, { role: 'parent' }),
        adminAuth.setCustomUserClaims(studentRecord.uid, { role: 'student' }),
      ]);

      const now = Date.now();
      const parentProfile = {
        id: parentRecord.uid,
        email: input.parentEmail.toLowerCase(),
        name: input.parentEmail.split('@')[0],
        role: 'parent',
        avatar: '👨‍👩‍👧',
        level: 1,
        xp: 0,
        streak: 0,
        lastActiveDate: new Date(now).toISOString(),
        dailyGoalMinutes: 0,
        todayMinutesSpent: 0,
        soundEnabled: true,
        parentPhone: input.parentPhone,
        linkedStudentIds: [studentRecord.uid],
        createdAt: now,
        updatedAt: now,
      };
      const studentProfile = {
        id: studentRecord.uid,
        email: studentEmail,
        name: input.studentName,
        role: 'student',
        studentCode,
        grade: input.grade,
        examFocus: input.examFocus,
        avatar: '🦊',
        level: 1,
        xp: 0,
        streak: 0,
        lastActiveDate: new Date(now).toISOString(),
        dailyGoalMinutes: 15,
        todayMinutesSpent: 0,
        soundEnabled: true,
        linkedParentId: parentRecord.uid,
        createdAt: now,
        updatedAt: now,
        totalPoints: 0,
        totalQuestionsSolved: 0,
        resolvedMistakesCount: 0,
      };

      const batch = adminDb.batch();
      batch.create(adminDb.doc(`users/${parentRecord.uid}`), parentProfile);
      batch.create(adminDb.doc(`users/${studentRecord.uid}`), studentProfile);
      await batch.commit();

      const customToken = await adminAuth.createCustomToken(parentRecord.uid);
      return res.status(201).json({
        customToken,
        parentProfile,
        student: { id: studentRecord.uid, code: studentCode, email: studentEmail },
      });
    } catch (error: any) {
      if (adminAuth) {
        await Promise.all(createdUserIds.map((uid) => adminAuth?.deleteUser(uid).catch(() => undefined)));
      }
      if (error?.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Bu veli e-posta adresi zaten kullanımda.' });
      }
      console.error('Family registration failed:', error?.code || error?.message || error);
      return res.status(500).json({ error: 'Aile hesabı oluşturulamadı. Lütfen tekrar deneyin.' });
    }
  });

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

  app.post('/api/send-weekly-report', reportLimiter, requireFirebaseAuth, requireRole('parent'), async (req: AuthenticatedRequest, res) => {
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
