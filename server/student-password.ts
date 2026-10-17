import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './security';
import { strongPasswordSchema } from '../src/lib/validations';
import { PasswordPolicyError } from './password-policy';

const input = z.object({ studentId: z.string().uuid(), newPassword: strongPasswordSchema }).strict();
type Profile = { id: string; role: string; linkedStudentIds?: string[]; linkedParentId?: string };
interface Dependencies {
  profile: (id: string) => Promise<Profile | undefined>;
  update: (studentId: string, password: string) => Promise<void>;
  revoke: (studentId: string) => Promise<void>;
  audit: (parentId: string, studentId: string) => Promise<void>;
}
export function createStudentPasswordHandler(deps: Dependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.authUser) return res.status(401).json({ error: 'Veli hesabınızla yeniden giriş yapın.' });
    if (!req.authUser.email_verified) return res.status(403).json({ error: 'Önce veli e-posta adresinizi doğrulayın.' });
    const parsed = input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.path[0] === 'newPassword' ? parsed.error.issues[0].message : 'Geçerli bir bağlı öğrenci ve yeni şifre girin.' });
    let updated = false;
    try {
      const [parent, student] = await Promise.all([deps.profile(req.authUser.uid), deps.profile(parsed.data.studentId)]);
      if (!parent || parent.id !== req.authUser.uid || parent.role !== 'parent' || !parent.linkedStudentIds?.includes(parsed.data.studentId) ||
          !student || student.id !== parsed.data.studentId || student.role !== 'student' || student.linkedParentId !== parent.id)
        return res.status(403).json({ error: 'Öğrenci bu veli hesabına bağlı değil.' });
      await deps.update(student.id, parsed.data.newPassword); updated = true;
      await deps.revoke(student.id);
      await deps.audit(parent.id, student.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof PasswordPolicyError) return res.status(error.status).json({ error: error.message, code: error.code });
      return res.status(503).json({ error: updated ? 'Şifre değişti ancak güvenlik işlemlerinin tamamlandığı doğrulanamadı. Yeni şifreyi kullanın; veli panelinden yeniden deneyin.' : 'Öğrenci şifresi değiştirilemedi. Biraz sonra yeniden deneyin.' });
    }
  };
}
