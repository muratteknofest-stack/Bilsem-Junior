import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole } from '../security';
import { sharedRateLimit } from '../shared-rate-limit';
import { updateOwnProfile, recordOwnProfileActivity } from '../profile-update';

const routes = Router();
const beforeAuth = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Profil istek sınırına ulaşıldı. Biraz sonra yeniden deneyin.' } });
const access = [beforeAuth, requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('student', 'parent', 'admin'),
  sharedRateLimit('profile-preferences', 120, 600)];

routes.patch('/account/profile', ...access, updateOwnProfile);
routes.post('/account/profile/activity', ...access, recordOwnProfileActivity);
export default routes;
