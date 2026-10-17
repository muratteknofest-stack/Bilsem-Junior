import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Clock3, Target, RotateCcw, BookOpen, Trophy } from 'lucide-react';
import { sound } from '../../lib/sound';
import { useStudentReducedMotion } from '../../features/student/experience-preferences';
import puzzleDesk from '../../assets/student/tactile-puzzle.webp';

export interface StudentModesGridProps {
  unresolvedMistakesCount: number; onStartAdaptive: () => void; onStartExam: () => void;
  onStartPractice: (category?: string) => void; onOpenMistakes: () => void;
  onNavigate: (view: string) => void; onOpenChallenges: () => void;
}

export function StudentModesGrid(p: StudentModesGridProps) {
  const reduced = useStudentReducedMotion();
  const startAdaptive = () => { sound.playClick(); p.onStartAdaptive(); };
  const modes = [
    { title: 'Deneme Sınavı', number: '02', text: 'Süreni yönet. Bildiklerini gerçek bir denemede göster.', icon: Clock3, tone: 'blue', tag: 'Süreli çalışma', action: p.onStartExam },
    { title: 'Karışık Pratik', number: '03', text: 'Farklı konularla zihnini ısıt, yeni bağlantılar kur.', icon: Target, tone: 'teal', tag: 'Karışık konular', action: () => p.onStartPractice('mixed') },
    { title: 'Hata Defteri', number: '04', text: 'Çözemediğin sorulara yeni bir gözle bak.', icon: RotateCcw, tone: 'amber', tag: p.unresolvedMistakesCount ? `${p.unresolvedMistakesCount} soru bekliyor` : 'Tekrar alanın', action: p.onOpenMistakes },
  ];

  return <section className="zp-modes-section" aria-labelledby="zp-mode-title">
    <div className="zp-mode-section-heading">
      <div><p className="zp-panel-eyebrow">ÇALIŞMA MASASI / 01</p><h2 id="zp-mode-title">Bugün nasıl çalışmak istersin?</h2></div>
      <span className="zp-desk-edition" aria-hidden="true">DÜŞÜNMEK<br />İÇİN BİR ALAN.</span>
    </div>
    <motion.button type="button" className="zp-mode-card zp-mode-feature" data-tone="cobalt"
      initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .3 }} whileTap={reduced ? undefined : { scale: .994 }} onClick={startAdaptive}>
      <span className="zp-feature-copy">
        <span className="zp-feature-label"><span aria-hidden="true" /> SANA UYARLANAN ÇALIŞMA</span>
        <span className="zp-feature-headline" aria-hidden="true">Bak. Düşün.<br />Bağlantıyı bul.</span>
        <h3>Adaptif Test</h3>
        <span className="zp-feature-description">Soru sayını sen seç. Sana uygun sorularla kendi ritminde ilerle.</span>
        <span className="zp-feature-cta">Çalışmaya başla <ArrowUpRight size={19} aria-hidden="true" /></span>
      </span>
      <span className="zp-feature-art" aria-hidden="true">
        <img src={puzzleDesk} alt="" width={1254} height={1254} fetchPriority="high" decoding="async" />
        <span className="zp-art-caption">ŞEKİLLER. OLASILIKLAR. YENİ FİKİRLER.</span>
      </span>
    </motion.button>
    <div className="zp-mode-grid">{modes.map(({ title, number, text, icon: Icon, tone, tag, action }, index) =>
      <motion.button type="button" key={title} className="zp-mode-card zp-mode-tool" data-tone={tone}
        initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .25, delay: reduced ? 0 : index * .04 }}
        whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { y: 1 }}
        onClick={() => { sound.playClick(); action(); }}>
        <span className="zp-mode-card-top"><span className="zp-mode-icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span><span className="zp-tool-number" aria-hidden="true">{number}</span></span>
        <h3>{title}</h3><p>{text}</p>
        <span className="zp-mode-open"><span>{tag}</span><ArrowUpRight size={19} aria-hidden="true" /></span>
      </motion.button>)}</div>
    <div className="zp-mode-links">
      <button type="button" onClick={() => { sound.playClick(); p.onNavigate('glossary'); }}><BookOpen size={19} aria-hidden="true" /><span>Bilişsel Sözlük<small>Görsel kavramlar ve mini oyunlar</small></span><ArrowRight size={16} aria-hidden="true" /></button>
      <button type="button" onClick={() => { sound.playClick(); p.onOpenChallenges(); }}><Trophy size={19} aria-hidden="true" /><span>Haftalık Görevler<small>Yeni bir hedef belirle</small></span><ArrowRight size={16} aria-hidden="true" /></button>
    </div>
  </section>;
}
