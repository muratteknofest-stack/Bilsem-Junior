import { BarChart3, Brain, ChevronRight, Flame, Target } from 'lucide-react';
import type { SkillMastery, UserProfile, WeeklyQuestionProgressData } from '../../types';
import { dailyMissions } from '../../features/student/gamification-model';

interface Props {
  student: UserProfile;
  weeklyData: WeeklyQuestionProgressData | null;
  masteries: SkillMastery[];
  onReport: () => void;
  onMembership: () => void;
}

/** Small native summary; full charts are mounted only when requested. */
export function AndroidParentOverview({ student, weeklyData, masteries, onReport, onMembership }: Props) {
  const goal = dailyMissions(student)[0];
  const days = weeklyData?.dailyStats || [];
  const total = days.reduce((sum, day) => sum + day.thisWeek, 0);
  const activeDays = days.filter(day => day.thisWeek > 0).length;
  const practiced = masteries.filter(skill => skill.attemptCount > 0).length;
  const metrics = [
    { label: 'Bu hafta', value: total, unit: 'soru', icon: BarChart3 },
    { label: 'Çalışılan gün', value: activeDays, unit: '/ 7', icon: Target },
    { label: 'Beceri alanı', value: practiced, unit: 'alan', icon: Brain },
    { label: 'Mevcut seri', value: student.streak || 0, unit: 'gün', icon: Flame },
  ];
  return <section className="bj-parent-pocket" aria-labelledby="bj-parent-pocket-title">
    <div className="bj-parent-pocket-heading"><span>ÖĞRENME ÖZETİ</span><h2 id="bj-parent-pocket-title">Bu hafta nasıl geçti?</h2><p>{total > 0 ? `${student.name}, ${activeDays} günde ${total} soru tamamladı.` : 'İlk çalışma tamamlandığında gelişim burada görünecek.'}</p></div>
    <div className="bj-parent-pocket-metrics">{metrics.map(({ label, value, unit, icon: Icon }) => <article key={label}><Icon aria-hidden="true"/><span>{label}</span><strong>{value}<small>{unit}</small></strong></article>)}</div>
    <div className="bj-parent-pocket-goal"><div><Target aria-hidden="true"/><strong>Bugünkü soru hedefi</strong><span>{goal.current} / {goal.target}</span></div><progress max={100} value={goal.progress} aria-label={`Bugünkü soru hedefi: ${goal.current} / ${goal.target}`}/></div>
    <button type="button" className="bj-parent-pocket-link" onClick={onReport}><BarChart3 aria-hidden="true"/><span>Grafikleri ve raporu incele</span><ChevronRight aria-hidden="true"/></button>
    <button type="button" className="bj-parent-pocket-link" onClick={onMembership}><span>Google Play üyeliğini yönet</span><ChevronRight aria-hidden="true"/></button>
    <p className="bj-parent-pocket-note">Çalışma kayıtlarına dayanır. Resmî sınav puanı veya zekâ ölçümü değildir.</p>
  </section>;
}
