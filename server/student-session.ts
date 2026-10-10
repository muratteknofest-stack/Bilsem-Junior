import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './security';

type FamilyProfile = { id: string; role: string; linkedStudentIds?: string[]; linkedParentId?: string };
type StudentSession = { studentId: string; access_token: string; refresh_token: string };
interface Dependencies {
  profile: (id: string) => Promise<FamilyProfile | undefined>;
  createSession: (studentId: string) => Promise<StudentSession>;
  audit: (parentId: string, studentId: string) => Promise<void>;
}
const inputSchema = z.object({ studentId: z.string().uuid() }).strict();

export function createStudentSessionHandler(deps: Dependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.authUser) return res.status(401).json({ error: 'Öğrenci panelini açmak için veli hesabınızla giriş yapın.' });
    if (!req.authUser.email_verified) return res.status(403).json({ error: 'Önce veli e-posta adresinizi doğrulayın.' });
    const input = inputSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: 'Geçerli bir bağlı öğrenci seçin.' });
    try {
      const [parent, student] = await Promise.all([deps.profile(req.authUser.uid), deps.profile(input.data.studentId)]);
      if (!parent || parent.id !== req.authUser.uid || parent.role !== 'parent' ||
          !parent.linkedStudentIds?.includes(input.data.studentId) ||
          !student || student.id !== input.data.studentId || student.role !== 'student' ||
          student.linkedParentId !== req.authUser.uid) {
        return res.status(403).json({ error: 'Öğrenci bu veli hesabına bağlı değil.' });
      }
      // Issue a real student session; never rewrite the parent's profile or role.
      await deps.audit(parent.id, student.id);
      const session = await deps.createSession(student.id);
      if (session.studentId !== student.id || !session.access_token || !session.refresh_token) throw new Error('Invalid student session');
      return res.json(session);
    } catch {
      // Provider errors may contain credentials; return only a fixed message.
      return res.status(503).json({ error: 'Öğrenci oturumu açılamadı. Veli panelinden tekrar deneyin.' });
    }
  };
}
