import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import {
  getAdminAuth,
  getAdminDb,
  requireAppCheck,
  requireSupabaseAuth,
  requireProfileRole,
  requireVerifiedEmail,
  escapeHtml,
  sanitizeHeaderValue,
  type AuthenticatedRequest,
} from '../security';
import { accountSecurityLimiter, reportLimiter } from '../rate-limiters';

const parentRoutes = Router();

const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
  message: 'Şifre en az bir harf ve bir rakam içermelidir.',
});
const linkedStudentPasswordSchema = z.object({
  studentId: z.string().min(1).max(128),
  newPassword: strongPassword,
}).strict();

parentRoutes.post(
  '/parent/reset-student-password',
  requireSupabaseAuth,
  requireAppCheck,
  accountSecurityLimiter,
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

const reportSchema = z.object({
  studentId: z.string().min(1).max(128),
}).strict();

parentRoutes.post('/send-weekly-report', requireSupabaseAuth, requireAppCheck, reportLimiter, requireVerifiedEmail, requireProfileRole('parent'), async (req: AuthenticatedRequest, res) => {
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
    if (
      !parent ||
      !student ||
      student.role !== 'student' ||
      student.linkedParentId !== req.authUser.uid ||
      !Array.isArray(parent.linkedStudentIds) ||
      !parent.linkedStudentIds.includes(studentId)
    ) {
      return res.status(403).json({ error: 'Öğrenci bu veli hesabına bağlı değil.' });
    }
    const parentEmail = String(req.authUser.email || parent.email || '');
    if (!parentEmail) return res.status(400).json({ error: 'Veli e-posta adresi bulunamadı.' });
    const studentName = escapeHtml(student.name || 'Öğrenci');
    const studentNameHeader = sanitizeHeaderValue(student.name || 'Öğrenci');
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
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: parentEmail,
      subject: `${studentNameHeader} - Haftalık ZekaPark Gelişim Özeti`,
      html: emailHtml,
    });

    res.json({ success: true, message: 'Haftalık özet başarıyla gönderildi.' });
  } catch (error: any) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'E-posta gönderilemedi.' });
  }
});

export default parentRoutes;
