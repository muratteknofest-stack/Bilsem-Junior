import { Compass, Flame, Sparkles, Star, Trophy } from 'lucide-react';
import type { Achievement, UserProfile } from '../../types';
import type { StoryProgress } from '../../features/student/story-adventure';
import { storyCollection, storyBadges } from '../../features/student/story-adventure';
import { campaignById, campaignLength } from '../../features/student/story-catalog';
import { StudentAdventureAtmosphere } from '../student/StudentMotion';

export function StudentPassport({ progress }: { progress: StoryProgress }) {
  const stops=progress.completedCount+Object.values(progress.campaigns||{}).reduce((sum,n)=>sum+n,0);
  const finished=Object.entries(progress.campaigns||{}).filter(([id,n])=>{const story=campaignById(id);return story&&n===campaignLength(story);}).length;
  return <section className="bj-passport" aria-label="Keşif pasaportum" data-motion-zone>
    <StudentAdventureAtmosphere />
    <div className="bj-passport-copy"><span>JUNIOR KAŞİF KULÜBÜ</span><h2>Dünyan keşifle büyür.</h2><p>Her durak yeni bir başlangıç.</p></div>
    <div className="bj-passport-mascot" aria-hidden="true"><span/><img src="/brand/junior-fox.svg" alt="" width={104} height={104}/><i>✦</i></div>
    <div className="bj-passport-stamps"><span><Compass size={16} aria-hidden="true"/><strong>{stops}</strong> keşif</span><span><Star size={16} aria-hidden="true"/><strong>{finished}</strong> hikâye</span><span><Sparkles size={16} aria-hidden="true"/> Yeni rotalar açık</span></div>
  </section>;
}

export function StudentTreasure({ user, progress, achievements }: { user: UserProfile; progress: StoryProgress; achievements: Achievement[] }) {
  const storyAwards=storyBadges(progress,user.grade||1);
  const unlocked = achievements.filter(item => item.unlocked).length+storyAwards.filter(item=>item.unlocked).length;
  const collection=storyCollection(progress,user.grade||1);
  return <section className="bj-treasure" aria-label="Ödül koleksiyonum" data-motion-zone>
    <StudentAdventureAtmosphere />
    <div className="bj-treasure-copy"><span>KÜÇÜK ADIMLAR, BÜYÜK BAŞARILAR</span><h2>Emeklerin parlıyor!</h2><p>Görevlerini tamamla, koleksiyonunu büyüt.</p></div>
    <div className="bj-treasure-cup" aria-hidden="true"><span><Trophy size={45} strokeWidth={2.4}/></span><i>✦</i><i>✧</i></div>
    <dl className="bj-treasure-stats"><div><dt><Star size={14} aria-hidden="true"/>Toplam XP</dt><dd>{user.xp || 0}</dd></div><div><dt><Trophy size={14} aria-hidden="true"/>Açılan rozet</dt><dd>{unlocked}<small> / {achievements.length+storyAwards.length}</small></dd></div><div><dt><Flame size={14} aria-hidden="true"/>Keşif durağı</dt><dd>{progress.completedCount+collection.stops}</dd></div></dl>
  </section>;
}
