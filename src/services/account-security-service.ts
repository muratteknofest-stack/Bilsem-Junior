import { authenticatedFetch } from '../lib/api-client';
import { auth, supabase } from '../lib/supabase';
import { activateStudentSession, activateParentSession } from '../lib/student-session';
import { beginAccountSwitch } from '../lib/account-switch';
export { cancelAccountSwitch } from '../lib/account-switch';

export async function openLinkedParentSession(parentId: string, password: string): Promise<void> {
  const isCurrent = beginAccountSwitch();
  const studentId = auth.currentUser?.uid;
  let response: Response;
  try { response = await authenticatedFetch('/api/parent/return-session', { method: 'POST', body: JSON.stringify({ password }) }); }
  catch { throw new Error('Veli paneli açılamadı. Bağlantınızı kontrol edin.'); }
  if (!studentId || auth.currentUser?.uid !== studentId) throw new Error('Hesap değişti. Veli panelini yeniden açın.');
  await activateParentSession(response, parentId, supabase.auth, isCurrent);
}

export async function openLinkedStudentSession(studentId: string): Promise<void> {
  const isCurrent = beginAccountSwitch();
  const parentId = auth.currentUser?.uid;
  let response: Response;
  try {
    response = await authenticatedFetch('/api/parent/student-session', {
      method: 'POST', body: JSON.stringify({ studentId }),
    });
  } catch {
    throw new Error('Öğrenci paneli açılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  }
  if (!parentId || auth.currentUser?.uid !== parentId) throw new Error('Hesap değişti. Öğrenci panelini yeniden açın.');
  await activateStudentSession(response, studentId, supabase.auth, isCurrent);
}

export async function resetLinkedStudentPassword(studentId: string, newPassword: string): Promise<void> {
  const response = await authenticatedFetch('/api/parent/reset-student-password', {
    method: 'POST',
    body: JSON.stringify({ studentId, newPassword }),
  });

  if (response.status === 204) return;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || 'Öğrenci şifresi yenilenemedi.');
  }

  throw new Error('Güvenli hesap servisi henüz bu yayında etkin değil.');
}

