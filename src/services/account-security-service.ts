import { authenticatedFetch } from '../lib/api-client';

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
