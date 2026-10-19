import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Clock3, Target, RotateCcw, BookOpen, Trophy, Star, Sparkles } from 'lucide-react';
import { StudentAdventureAtmosphere } from './StudentMotion';
import { sound } from '../../lib/sound';
import { useStudentReducedMotion } from '../../features/student/experience-preferences';

export interface StudentModesGridProps {
  unresolvedMistakesCount: number; onStartAdaptive: () => void; onStartExam: () => void;
  onStartPractice: (category?: string) => void; onOpenMistakes: () => void;
  onNavigate: (view: string) => void; onOpenChallenges: () => void;
}

export function StudentModesGrid(p: StudentModesGridProps) {
  const reduced = useStudentReducedMotion();
  const modes = [
    { title: 'Adaptif Test', number: '01', text: 'Kendi hızında keşfet.', icon: Star, tone: 'violet', tag: 'BAŞLA', action: p.onStartAdaptive },
    { title: 'Deneme Sınavı', number: '02', text: 'Süreli bir maceraya çık.', icon: Clock3, tone: 'blue', tag: 'Süreli çalışma', action: p.onStartExam },
    { title: 'Karışık Pratik', number: '03', text: 'Farklı konular, yeni keşifler.', icon: Target, tone: 'teal', tag: 'Karışık konular', action: () => p.onStartPractice('mixed') },
    { title: 'Hata Defteri', number: '04', text: 'Yeniden dene, güçlen!', icon: RotateCcw, tone: 'amber', tag: p.unresolvedMistakesCount ? `${p.unresolvedMistakesCount} soru bekliyor` : 'Tekrar alanın', action: p.onOpenMistakes },
  ];

  return <section className="zp-modes-section bj-quest-world" aria-labelledby="zp-mode-title">
    <div className="zp-mode-section-heading bj-chapter-heading" data-motion-zone><StudentAdventureAtmosphere />
      <div><p className="zp-panel-eyebrow">KEŞİF YOLU · BİLSEM HAZIRLIK</p><h2 id="zp-mode-title">Bugün nasıl çalışmak istersin?</h2></div>
      <span className="bj-chapter-star" aria-hidden="true"><Sparkles size={38} /></span>
    </div>
    <div className="bj-fox-welcome" data-motion-zone>
      <span className="zp-feature-art" aria-hidden="true"><img src="/brand/junior-fox.svg" alt="" width={160} height={160} decoding="async" /></span>
      <div className="bj-fox-bubble"><strong>Haydi, keşfedelim!</strong><p>Bir durak seç, zihnini oyuna davet et.</p><span><Sparkles size={14} aria-hidden="true" /> Her soru yeni bir keşif!</span></div>
    </div>
    <div className="bj-quest-path" data-motion-zone>
      <svg className="bj-quest-connector" viewBox="0 0 520 650" preserveAspectRatio="none" aria-hidden="true"><path d="M70 65 C70 170 175 110 175 230 S70 300 70 395 S175 470 175 580" /></svg>
      <span className="bj-world-cloud bj-world-cloud-one" aria-hidden="true" /><span className="bj-world-cloud bj-world-cloud-two" aria-hidden="true" />
      <span className="bj-world-spark bj-world-spark-one" aria-hidden="true">✦</span><span className="bj-world-spark bj-world-spark-two" aria-hidden="true">✧</span>
      <span className="bj-world-plant" aria-hidden="true"><i /><i /><i /></span>
      {modes.map(({ title, number, text, icon: Icon, tone, tag, action }, index) =>
        <motion.button type="button" key={title} className={`zp-mode-card bj-quest-stop ${index === 0 ? 'bj-quest-start' : 'zp-mode-tool'}`} data-tone={tone}
          initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .25, delay: reduced ? 0 : index * .05 }}
          whileTap={reduced ? undefined : { y: 5 }}
          onClick={() => { sound.playClick(); action(); }}>
          <span className="bj-quest-coin" aria-hidden="true"><span className="bj-coin-glint" /><Icon size={36} strokeWidth={2.8} fill={index === 0 ? 'currentColor' : 'none'} />{index === 0 && <span className="bj-coin-spark">✦</span>}</span>
          <span className="bj-quest-stop-copy"><span className="zp-tool-number">DURAK {number}</span><h3>{title}</h3><span className="bj-quest-description">{text}</span><span className="bj-quest-action">{tag}<ArrowRight size={14} aria-hidden="true" /></span></span>
        </motion.button>)}
      <div className="bj-path-finish"><Trophy size={23} aria-hidden="true" /><span>Küçük adımlar. Büyük keşifler.</span><Star size={15} aria-hidden="true" /></div>
    </div>
    <div className="zp-mode-links">
      <button type="button" onClick={() => { sound.playClick(); p.onNavigate('glossary'); }}><BookOpen size={19} aria-hidden="true" /><span>Bilişsel Sözlük<small>Görsel kavramlar ve mini oyunlar</small></span><ArrowUpRight size={16} aria-hidden="true" /></button>
      <button type="button" onClick={() => { sound.playClick(); p.onOpenChallenges(); }}><Trophy size={19} aria-hidden="true" /><span>Haftalık Görevler<small>Yeni bir hedef belirle</small></span><ArrowUpRight size={16} aria-hidden="true" /></button>
    </div>
  </section>;
}
