import { SkillMastery, UserProfile, WeeklyQuestionProgressData } from '../types';

export type WeeklyReportShareResult = 'shared' | 'email-opened' | 'copied' | 'cancelled';

function buildWeeklyReport(
  student: UserProfile,
  weekly: WeeklyQuestionProgressData,
  masteries: SkillMastery[],
) {
  const sorted = [...masteries].sort((a, b) => b.mastery - a.mastery);
  const strongest = sorted.slice(0, 3).map((item) => item.categoryName).join(', ') || 'Henüz yeterli veri yok';
  const focus = sorted.slice(-3).reverse().map((item) => item.categoryName).join(', ') || 'Henüz yeterli veri yok';
  const activeDays = weekly.dailyStats.filter((day) => day.thisWeek > 0).length;
  const averageAccuracy = masteries.length
    ? Math.round(masteries.reduce((sum, item) => sum + item.accuracy, 0) / masteries.length)
    : 0;

  return [
    `ZekaPark Haftalık İlerleme Raporu — ${student.name}`,
    '',
    `Bu hafta çözülen soru: ${weekly.summary.thisWeekTotal}`,
    `Haftalık hedef: ${weekly.summary.weeklyTarget} (%${weekly.summary.targetCompletionRate})`,
    `Geçen hafta: ${weekly.summary.lastWeekTotal}`,
    `Aktif gün: ${activeDays}/7`,
    `Günlük ortalama: ${weekly.summary.dailyAverage}`,
    `En verimli gün: ${weekly.summary.bestDay.dayName} (${weekly.summary.bestDay.count} soru)`,
    `Ortalama doğruluk: %${averageAccuracy}`,
    `Öğrenme serisi: ${student.streak || 0} gün`,
    '',
    `Güçlü alanlar: ${strongest}`,
    `Odaklanılması önerilen alanlar: ${focus}`,
    '',
    'Bu rapor öğrencinin ZekaPark üzerindeki gerçek çalışma verilerinden oluşturulmuştur.',
  ].join('\n');
}

export async function shareWeeklyReport(
  parentEmail: string | undefined,
  student: UserProfile,
  weekly: WeeklyQuestionProgressData,
  masteries: SkillMastery[],
): Promise<WeeklyReportShareResult> {
  const subject = `ZekaPark Haftalık İlerleme Raporu - ${student.name}`;
  const text = buildWeeklyReport(student, weekly, masteries);

  if (navigator.share) {
    try {
      await navigator.share({ title: subject, text });
      return 'shared';
    } catch (error: any) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Continue with the e-mail or clipboard fallback.
    }
  }

  if (parentEmail) {
    window.location.assign(
      `mailto:${encodeURIComponent(parentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    );
    return 'email-opened';
  }

  await navigator.clipboard.writeText(`${subject}\n\n${text}`);
  return 'copied';
}
