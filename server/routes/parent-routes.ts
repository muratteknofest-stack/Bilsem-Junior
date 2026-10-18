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
import { accountSecurityLimiter, panelSwitchLimiter, reportLimiter } from '../rate-limiters';
import { createStudentSessionHandler } from '../student-session';
import { createParentSessionHandler, ParentSignInError, ParentEmailUnconfirmedError } from '../parent-session';
import { createStudentPasswordHandler } from '../student-password';
import { activateUnconfirmedStudents } from '../student-activation';


const parentRoutes = Router();

parentRoutes.post('/parent/return-session', requireSupabaseAuth, requireProfileRole('student'),
  panelSwitchLimiter, sharedRateLimit('parent-panel-return', 60, 3600),
  createParentSessionHandler({
    async profile(id) { return (await getAdminDb().doc(`users/${id}`).get()).data() as any; },
    async audit(studentId, parentId) {
      await getAdminDb().collection('securityEvents').add({ type: 'parent_session_requested_by_student', actorId: studentId, parentId, createdAt: Date.now() });
    },
    async signIn(parentId, password) {
      const client = getServiceClient();
      const existing = await client.auth.admin.getUserById(parentId);
      if (existing.error || !existing.data.user?.email) throw new ParentSignInError();
      if (!existing.data.user.email_confirmed_at) throw new ParentEmailUnconfirmedError();
      const result = await client.auth.signInWithPassword({ email: existing.data.user.email, password });
      if (result.error) {
        if (result.error.code === 'email_not_confirmed') throw new ParentEmailUnconfirmedError();
        if (result.error.code === 'invalid_credentials') throw new ParentSignInError();
        throw new Error('Parent authentication unavailable');
      }
      if (!result.data.session || result.data.user?.id !== parentId || !result.data.user.email_confirmed_at) {
        await client.auth.signOut({ scope: 'local' });
        throw new Error('Parent identity unavailable');
      }
      return { parentId, access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token, verified: true };
    },
  }),
);

parentRoutes.post('/parent/student-session', requireSupabaseAuth, requireVerifiedEmail,
  requireProfileRole('parent'), panelSwitchLimiter, sharedRateLimit('student-panel-switch', 60, 3600),
  createStudentSessionHandler({
    async profile(id) {
      const data = (await getAdminDb().doc(`users/${id}`).get()).data();
      return data ? { id: data.id, role: data.role, linkedStudentIds: data.linkedStudentIds, linkedParentId: data.linkedParentId } : undefined;
    },
    async audit(parentId, studentId) {
      await getAdminDb().collection('securityEvents').add({ type: 'student_session_requested_by_parent', actorId: parentId, studentId, createdAt: Date.now() });
    },
    async createSession(studentId) {
      // getServiceClient returns an isolated, non-persistent client for this request.
      const client = getServiceClient();
      const existing = await client.auth.admin.getUserById(studentId);
      if (existing.error || !existing.data.user?.email) throw new Error('Student account unavailable');
      if (!existing.data.user.email_confirmed_at) {
        await client.auth.admin.updateUserById(studentId, { email_confirm: true });
      }
      const link = await client.auth.admin.generateLink({ type: 'magiclink', email: existing.data.user.email });
      if (link.error || link.data.user?.id !== studentId || !link.data.properties?.hashed_token) throw new Error('Student link unavailable');
      const verified = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'email' });
      if (verified.error || !verified.data.session || verified.data.user?.id !== studentId) throw new Error('Student session unavailable');
      return { studentId, access_token: verified.data.session.access_token, refresh_token: verified.data.session.refresh_token };
    },
  }),
);

parentRoutes.post('/parent/activate-students', requireSupabaseAuth, requireVerifiedEmail, accountSecurityLimiter, requireProfileRole('parent'), sharedRateLimit('parent-actions', 6, 3600), async (req: AuthenticatedRequest, res) => {
  const client = getServiceClient();
  const parent = await client.from('profiles').select('linked_student_ids').eq('id', req.authUser!.uid).single();
  if (parent.error) throw parent.error;
  const ids = parent.data.linked_student_ids || [];
  if (!ids.length) return res.json({ activated: 0 });
  const children = await client.from('profiles').select('id').in('id', ids).eq('linked_parent_id', req.authUser!.uid).eq('role', 'student');
  if (children.error) throw children.error;
  const activated = await activateUnconfirmedStudents(children.data || [], client.auth.admin);
  return res.json({ activated });
});

parentRoutes.post('/parent/reset-student-password', requireSupabaseAuth, accountSecurityLimiter,
  requireVerifiedEmail, requireProfileRole('parent'), sharedRateLimit('parent-actions', 6, 3600),
  createStudentPasswordHandler({
    async profile(id) { return (await getAdminDb().doc(`users/${id}`).get()).data() as any; },
    async update(studentId, password) { await getAdminAuth().updateUser(studentId, { password }); },
    async revoke(studentId) { await getAdminAuth().revokeRefreshTokens(studentId); },
    async audit(parentId, studentId) {
      await getAdminDb().collection('securityEvents').add({ type: 'student_password_reset_by_parent', actorId: parentId, studentId, createdAt: Date.now() });
    },
  }),
);

parentRoutes.get('/parent/learning-history/:studentId', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('parent'), async (req: AuthenticatedRequest, res) => {
  const studentId = String(req.params.studentId), parentId = req.authUser!.uid;
  if (!z.uuid().safeParse(studentId).success) return res.status(404).json({error:'Student not found.'});
  const client = getServiceClient();
  const [parent, child] = await Promise.all([client.from('profiles').select('linked_student_ids').eq('id',parentId).single(), client.from('profiles').select('linked_parent_id,role').eq('id',studentId).maybeSingle()]);
  if (parent.error || child.error) throw parent.error || child.error;
  if (!parent.data?.linked_student_ids?.includes(studentId) || child.data?.linked_parent_id !== parentId || child.data?.role !== 'student') return res.status(404).json({error:'Student not found.'});
  const {data,error} = await client.from('learning_sessions').select('id,mode,created_at,expires_at,finished_at,result,selection').eq('student_id',studentId).order('created_at',{ascending:false}).limit(50);
  if (error) throw error;
  return res.json({sessions:data});
});
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
          <h1 style="color: white; margin: 0; font-size: 24px;">Bilsem Junior Haftalık Gelişim Özeti</h1>
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
      subject: `${studentNameHeader} - Haftalık Bilsem Junior Gelişim Özeti`,
      html: emailHtml,
    });

    res.json({ success: true, message: 'Haftalık özet başarıyla gönderildi.' });
  } catch (error: any) {
    logServerFailure('Weekly report failed', error);
    res.status(500).json({ error: 'E-posta gönderilemedi.' });
  }
});

export default parentRoutes;



