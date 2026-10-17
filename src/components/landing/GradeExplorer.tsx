import React, { useState } from 'react';
import { ArrowRight, Check, Compass, Flag, Sparkles } from 'lucide-react';
import { PremiumButton } from './PremiumUI';
import { GRADE_PREVIEWS, type PreviewGrade } from './grade-preview';

export function GradeExplorer({ onTry, completed }: { onTry: (grade: PreviewGrade) => void; completed: boolean }) {
  const [grade, setGrade] = useState<PreviewGrade>(1);
  const profile = GRADE_PREVIEWS.find(item => item.grade === grade)!;
  return <section id="siniflar" className="zp-container zp-grade-section" aria-labelledby="grade-title">
    <div className="zp-grade-heading"><div><p className="zp-kicker"><Compass size={17} /> SINIFINA UYGUN BİLSEM HAZIRLIĞI</p><h2 id="grade-title">Senin sınıfın.<br /><span>Senin hazırlık rotan.</span></h2></div><p>Sınıfını seç, seni bekleyen dünyaya göz at.<br />İlk sorunu birlikte keşfedelim.</p></div>
    <div className="zp-grade-switch" role="group" aria-label="Keşif rotası için sınıf seç">
      {GRADE_PREVIEWS.map(item => <button key={item.grade} type="button" aria-pressed={grade === item.grade} aria-controls="grade-preview" onClick={() => setGrade(item.grade)} className={`zp-grade-choice zp-grade-${item.color}`}><span aria-hidden="true">{item.symbol}</span><strong>{item.grade}. sınıf</strong><small>{item.title}</small><Check size={16} aria-hidden="true" /></button>)}
    </div>
    <div id="grade-preview" className={`zp-grade-preview zp-grade-${profile.color}`}>
      <div className="zp-grade-map" aria-hidden="true"><span className="zp-map-label">KEŞİF ROTASI / 0{grade}</span><div className="zp-map-route" /><span className="zp-map-stop zp-map-start"><Compass size={30} /></span><span className="zp-map-stop zp-map-middle"><Sparkles size={34} /></span><span className="zp-map-stop zp-map-end"><Flag size={32} /></span><span className="zp-map-caption">Merak et <i>·</i> Dene <i>·</i> Keşfet</span><span className="zp-map-star">{profile.symbol}</span></div>
      <div className="zp-grade-copy"><div aria-live="polite" aria-atomic="true"><p className="zp-kicker">{grade}. SINIF KEŞİF ROTASI</p><h3>{profile.title}, hazır mısınız?</h3><p>{profile.description}</p><ul>{profile.skills.map(skill => <li key={skill}><Check size={15} />{skill}</li>)}</ul></div><PremiumButton onClick={() => onTry(grade)}>{completed ? 'Deneme sonucuna git' : `${grade}. sınıf sorusunu dene`}<ArrowRight size={18} /></PremiumButton><small>Bu seçim hesabındaki sınıf bilgisini değiştirmez.</small></div>
    </div>
  </section>;
}
