import { authenticatedFetch } from '../lib/api-client';

async function apiError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(payload.error || fallback);
}

export async function downloadPrivacyExport(): Promise<void> {
  const response = await authenticatedFetch('/api/privacy/export');
  if (!response.ok) return apiError(response, 'Veri aktarımı hazırlanamadı.');
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `zekapark-veri-aktarimi-${Date.now()}.json`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function requestPrivacyDeletion(reason?: string): Promise<{ requestId: string; dueAt: number }> {
  const response = await authenticatedFetch('/api/privacy/deletion-requests', {
    method: 'POST',
    body: JSON.stringify({
      confirmation: 'HESABIMI VE BAĞLI ÇOCUK VERİLERİNİ SİL',
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),
  });
  if (!response.ok) return apiError(response, 'Silme talebi oluşturulamadı.');
  return response.json();
}
