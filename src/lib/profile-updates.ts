import { z } from 'zod';
import { userProfileUpdateSchema, profileUpdateResultSchema } from './validations';

interface ProfileTransport {
  currentUserId: () => string | undefined;
  request: (path: string, init: RequestInit) => Promise<Response>;
}
const activityResultSchema = z.object({ lastLoginAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).strict();

/** Pure transport adapter, also used by Android's authenticated native transport. */
export function createProfileUpdater(transport: ProfileTransport) {
  function checkOwner(id: string) {
    if (!id || transport.currentUserId() !== id) throw new Error('Yalnızca kendi profilinizi güncelleyebilirsiniz.');
  }
  async function send(id: string, path: string, method: string, body: unknown) {
    checkOwner(id);
    const response = await transport.request(path, { method, body: JSON.stringify(body), cache: 'no-store' });
    // An old request must not update the newly selected account's local state.
    checkOwner(id);
    if (!response.ok) {
      const messages: Record<number, string> = { 400: 'Profil ayarları geçersiz.', 401: 'Yeniden giriş yapın.',
        403: 'Profil güncelleme yetkisi doğrulanamadı.', 409: 'Profil şu anda güncellenemiyor.',
        429: 'Profil istek sınırına ulaşıldı. Biraz sonra yeniden deneyin.' };
      throw new Error(messages[response.status] || 'Profil kaydedilemedi. Biraz sonra yeniden deneyin.');
    }
    const value: unknown = await response.json();
    checkOwner(id);
    return value;
  }
  return {
    async update(id: string, updates: unknown) {
      checkOwner(id);
      const patch = userProfileUpdateSchema.parse(updates);
      return profileUpdateResultSchema.parse(await send(id, '/api/account/profile', 'PATCH', patch));
    },
    async activity(id: string) {
      return activityResultSchema.parse(await send(id, '/api/account/profile/activity', 'POST', {}));
    },
  };
}
