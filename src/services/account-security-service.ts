import { authenticatedFetch } from '../lib/api-client';
import { auth, supabase } from '../lib/supabase';
import { activateStudentSession } from '../lib/student-session';

export async function openLinkedStudentSession(studentId: string): Promise<void> {
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
  await activateStudentSession(response, studentId, supabase.auth);
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

