import { Check, Flame, Star, Target, Trophy } from 'lucide-react';
import type { UserProfile } from '../../types';
import { dailyMissions, weeklyLeague } from '../../features/student/gamification-model';

export function StudentMissionStrip({ user, weeklyQuestions }: { user: UserProfile; weeklyQuestions: number }) {
  const missions = dailyMissions(user);
  const league = weeklyLeague(weeklyQuestions);
  const icons = [Target, Flame, Star];
  return <section className="bj-mission-strip" aria-label="Günlük keşif görevlerim" data-motion-zone>
    <div className="bj-mission-heading"><span><Star size={18} aria-hidden="true" /> Günün yıldızları <small>{missions.filter(mission => mission.completed).length}/3</small></span><span><Trophy size={15} aria-hidden="true" />{league.name} ligi</span></div>
    <div className="bj-mission-cards">{missions.map((mission, index) => {
      const Icon = icons[index];
      return <article key={mission.id} data-complete={mission.completed}>
        <span className="bj-mission-token" aria-hidden="true">{mission.completed ? <Check size={20} /> : <Icon size={20} />}</span>
        <div><h3>{mission.title}</h3><span>{mission.current} / {mission.target} {index === 0 ? 'soru' : index === 1 ? 'dk' : 'oturum'}</span>
          <progress aria-label={mission.title} max={mission.target} value={Math.min(mission.current, mission.target)} />
        </div>
      </article>;
    })}</div>
  </section>;
}
