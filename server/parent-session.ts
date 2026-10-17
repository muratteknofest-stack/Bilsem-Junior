import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './security';

type FamilyProfile = { id: string; role: string; email?: string; linkedStudentIds?: string[]; linkedParentId?: string };
type ParentSession = { parentId: string; access_token: string; refresh_token: string; verified: boolean };
export class ParentSignInError extends Error {
  constructor() { super('Veli şifresi doğrulanamadı. Şifrenizi kontrol edin veya veli giriş ekranını kullanın.'); }
}
export class ParentEmailUnconfirmedError extends Error {
  constructor() { super('Veli e-posta adresi henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısına tıklayın.'); }
}
interface Dependencies {
  profile: (id: string) => Promise<FamilyProfile | undefined>;
  signIn: (parentId: string, password: string) => Promise<ParentSession>;
  audit: (studentId: string, parentId: string) => Promise<void>;
}
const input = z.object({ password: z.string().min(1).max(128) }).strict();

/** No parent session is kept on a child's device: returning requires parent authentication. */
export function createParentSessionHandler(deps: Dependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.authUser) return res.status(401).json({ error: 'Öğrenci oturumunuzu yeniden açın.' });
    const parsed = input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Veli şifrenizi girin. Şifre en fazla 128 karakter olabilir.' });
    try {
      const student = await deps.profile(req.authUser.uid);
      if (!student || student.id !== req.authUser.uid || student.role !== 'student' || !student.linkedParentId)
        return res.status(403).json({ error: 'Bu öğrenciye bağlı veli hesabı doğrulanamadı.' });
      const parent = await deps.profile(student.linkedParentId);
      if (!parent || parent.id !== student.linkedParentId || parent.role !== 'parent' || !parent.linkedStudentIds?.includes(student.id))
        return res.status(403).json({ error: 'Bu öğrenciye bağlı veli hesabı doğrulanamadı.' });
      await deps.audit(student.id, parent.id);
      const session = await deps.signIn(parent.id, parsed.data.password);
      if (session.parentId !== parent.id || !session.verified || !session.access_token || !session.refresh_token) throw new Error('Invalid parent session');
      return res.json({ parentId: session.parentId, access_token: session.access_token, refresh_token: session.refresh_token });
    } catch (error) {
      if (error instanceof ParentEmailUnconfirmedError) return res.status(403).json({ error: error.message });
      if (error instanceof ParentSignInError) return res.status(401).json({ error: error.message });
      return res.status(503).json({ error: 'Veli oturumu açılamadı. Biraz sonra yeniden deneyin.' });
    }
  };
}
