import type { CSSProperties } from 'react';
import { BarChart3, CheckCircle2, Clock3, Flame, Target, TrendingUp } from 'lucide-react';
import type { SkillMastery, UserProfile, WeeklyQuestionProgressData } from '../../types';
import { dailyMissions } from '../../features/student/gamification-model';

interface ParentProgressOverviewProps {
  student: UserProfile;
  weeklyData: WeeklyQuestionProgressData | null;
  masteries: SkillMastery[];
}

export function ParentProgressOverview({ student, weeklyData, masteries }: ParentProgressOverviewProps) {
  const questionGoal = dailyMissions(student)[0];
  const days = weeklyData?.dailyStats || [];
  const total = days.reduce((sum, day) => sum + day.thisWeek, 0);
  const activeDays = days.filter(day => day.thisWeek > 0).length;
  const practiced = masteries.filter(skill => skill.attemptCount > 0);
  const tiles = [
    { label: 'Bu hafta çözülen', value: total, unit: 'soru', icon: BarChart3, tone: 'blue' },
    { label: 'Çalışılan gün', value: activeDays, unit: '/ 7 gün', icon: Clock3, tone: 'teal' },
    { label: 'Çalışılan beceri', value: practiced.length, unit: 'alan', icon: Target, tone: 'violet' },
    { label: 'Mevcut seri', value: student.streak || 0, unit: 'gün', icon: Flame, tone: 'amber' },
  ];
  return <section className="bj-parent-overview" aria-labelledby="bj-parent-overview-title">
    <div className="bj-overview-heading"><div><p>ÖĞRENME ANALİTİĞİ</p><h2 id="bj-parent-overview-title">Gelişime bütüncül bir bakış.</h2></div><span><CheckCircle2 size={15} aria-hidden="true" /> Öğrenci çalışma kayıtları</span></div>
    <div className="bj-executive-grid">
      <article className="bj-parent-brief"><span className="bj-brief-label"><TrendingUp size={17} aria-hidden="true" /> HAFTANIN GÖRÜNÜMÜ</span>
        <h3>{total > 0 ? 'Her çalışma, yeni bir adım.' : 'İlk keşif için hazır.'}</h3>
        <p>{total > 0 ? `${student.name || 'Öğrenciniz'} bu hafta ${activeDays} günde ${total} soru çözdü. Günlük dağılımı ve beceri gelişimini aşağıda inceleyebilirsiniz.` : 'Öğrenciniz çalışmaya başladığında gelişim göstergeleri ve grafikler burada oluşacak.'}</p>
        <span className="bj-brief-footnote">BİLSEM hazırlık pratiği · Resmî sınav puanı değildir</span>
        <div className="bj-target-sculpture" role="img" aria-label={`Bugünkü soru hedefi yüzde ${questionGoal.progress}: ${questionGoal.current} / ${questionGoal.target} soru`}>
          <div className="bj-target-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="bj-target-ring" style={{ '--goal-turn': `${questionGoal.progress * 3.6}deg` } as CSSProperties}><div><Target size={23} aria-hidden="true" /><strong>%{questionGoal.progress}</strong><span>günlük soru hedefi</span></div></div>
        </div>
      </article>
      <div className="bj-parent-metrics">{tiles.map(({ label, value, unit, icon: Icon, tone }) => <article key={label} data-tone={tone}>
        <span className="bj-metric-icon"><Icon size={21} aria-hidden="true" /></span><p>{label}</p><strong>{value}<small>{unit}</small></strong>
      </article>)}</div>
    </div>
  </section>;
}

export function ParentWeeklyVolume({ weeklyData }: { weeklyData: WeeklyQuestionProgressData | null }) {
  const days = weeklyData?.dailyStats || [];
  const maximum = Math.max(1, ...days.map(day => day.thisWeek));
  const total = days.reduce((sum, day) => sum + day.thisWeek, 0);
  return <figure className="zp-dashboard-surface bj-volume-chart" aria-labelledby="bj-volume-title">
    <figcaption><div><span>HAFTALIK AKTİVİTE</span><h2 id="bj-volume-title">Günlük soru dağılımı</h2></div><strong>{total}<small>soru</small></strong></figcaption>
    {total === 0 && <p className="bj-chart-empty">Bu hafta henüz çalışma kaydı yok.</p>}
    <div className="bj-volume-columns" aria-hidden="true">{(days.length ? days.map(day => ({ label: day.shortDay, value: day.thisWeek })) : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(label => ({ label, value: 0 }))).map((day, i) =>
      <div className="bj-volume-day" key={day.label}><strong>{day.value}</strong><div className="bj-volume-well"><div data-empty={day.value === 0} className="bj-volume-bar" style={{ '--bar-height': `${day.value / maximum * 100}%`, '--bar-delay': `${i * 70}ms` } as CSSProperties}><span /></div></div><span>{day.label}</span></div>
    )}</div>
    <table className="sr-only"><caption>Bu haftanın günlük soru sayıları</caption><thead><tr><th>Gün</th><th>Çözülen soru</th></tr></thead><tbody>{days.map(day => <tr key={day.dayIndex}><th>{day.shortDay}</th><td>{day.thisWeek}</td></tr>)}</tbody></table>
    <p className="bj-chart-caption">Sütun yüksekliği çözülen soru sayısını gösterir.</p>
  </figure>;
}
