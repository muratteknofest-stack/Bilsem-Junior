import { logServerFailure } from '../safe-log';
import { sharedRateLimit } from '../shared-rate-limit';
import { weeklyReportMetrics } from '../weekly-report';
import { getServiceClient } from '../supabase-admin';
import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import {
  getAdminAuth,
  getAdminDb,
  requireSupabaseAuth,
  requireProfileRole,
  requireVerifiedEmail,
  escapeHtml,
  sanitizeHeaderValue,
  type AuthenticatedRequest,
} from '../security';
import { accountSecurityLimiter, reportLimiter } from '../rate-limiters';

const parentRoutes = Router();

parentRoutes.post('/parent/activate-students', requireSupabaseAuth, requireVerifiedEmail, accountSecurityLimiter, requireProfileRole('parent'), sharedRateLimit('parent-actions', 6, 3600), async (req: AuthenticatedRequest, res) => {
  const client = getServiceClient();
  const parent = await client.from('profiles').select('linked_student_ids').eq('id', req.authUser!.uid).single();
  if (parent.error) throw parent.error;
  const ids = parent.data.linked_student_ids || [];
  if (!ids.length) return res.json({ activated: 0 });
  const children = await client.from('profiles').select('id').in('id', ids).eq('linked_parent_id', req.authUser!.uid).eq('role', 'student');
  if (children.error) throw children.error;
  let activated = 0;
  for (const child of children.data || []) {
    const user = await client.auth.admin.getUserById(child.id);
    if (user.error) throw user.error;
    if (!user.data.user.email_confirmed_at) {
      const result = await client.auth.admin.updateUserById(child.id, { email_confirm: true });
      if (result.error) throw result.error;
      activated++;
    }
  }
  return res.json({ activated });
});

const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-zğüşıöçĞÜŞİÖÇ])(?=.*\d)/, {
  message: 'Şifre en az bir harf ve bir rakam içermelidir.',
});
const linkedStudentPasswordSchema = z.object({
  studentId: z.string().min(1).max(128),
  newPassword: strongPassword,
}).strict();

parentRoutes.post(
  '/parent/reset-student-password',
  requireSupabaseAuth,
  accountSecurityLimiter,
  requireVerifiedEmail,
  requireProfileRole('parent'), sharedRateLimit('parent-actions', 6, 3600),
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

parentRoutes.post('/send-weekly-report', requireSupabaseAuth, reportLimiter, requireVerifiedEmail, requireProfileRole('parent'), sharedRateLimit('parent-actions', 6, 3600), async (req: AuthenticatedRequest, res) => {
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
    const weeklyData = weeklyReportMetrics(student, persistedValues);

    // HTML Email Template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ZekaPark Haftalık Gelişim Özeti</h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="font-size: 16px; line-height: 1.5;">Merhaba,</p>
          <p style="font-size: 16px; line-height: 1.5;">Öğrencimiz <strong>${studentName}</strong>'ın kayıtlı çalışma özeti:</p>
          
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
                <span style="color: #64748b;">✅ Kayıtlı Denemelerde Doğru Oranı:</span>
                <strong style="color: #10b981;">${weeklyData.accuracy === null ? 'Henüz deneme kaydı yok' : '%' + weeklyData.accuracy}</strong>
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
    logServerFailure('Weekly report failed', error);
    res.status(500).json({ error: 'E-posta gönderilemedi.' });
  }
});

export default parentRoutes;


