import type { BaseQuestion } from '../src/types';

export type SocialSlot = 'morning' | 'evening';

export function istanbulDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (name: string) => parts.find(part => part.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function socialSlotId(date: string, slot: SocialSlot): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['morning', 'evening'].includes(slot)) {
    throw new Error('Geçersiz tarih veya paylaşım dilimi.');
  }
  return `${date}_${slot}`;
}

export function socialQuestionRejection(question: BaseQuestion, minQuality = 90): string | null {
  if (question.status !== 'published') return 'Soru yayımlanmış değil.';
  if (!question.aiMeta?.solverVerified || (question.aiMeta.qualityScore ?? 0) < minQuality) {
    return 'Bağımsız çözüm veya kalite doğrulaması yetersiz.';
  }
  if (!question.prompt?.trim() || !question.explanation?.summary?.trim()) return 'Soru veya çözüm eksik.';
  if (question.options?.length !== 4 || new Set(question.options.map(o => o.id)).size !== 4) {
    return 'Dört farklı seçenek gerekli.';
  }
  if (!question.options.some(option => option.id === question.correctOptionId)) return 'Doğru seçenek bulunamadı.';
  if (new Set(question.options.map(o => JSON.stringify(o.visualData))).size !== 4) {
    return 'Birbirinden farklı dört görsel seçenek gerekli.';
  }
  return null;
}
