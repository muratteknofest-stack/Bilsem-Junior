import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Brain, Clock3, Target, RotateCcw, BookOpen, Trophy, Sparkles } from 'lucide-react';
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
    { title: 'Adaptif Test', label: 'SANA UYARLANIR', text: 'Soru sayını seç, çalışma geçmişine uygun sorularla ilerle.', icon: Brain, tone: 'violet', tag: 'Kendi ritminde', action: p.onStartAdaptive },
    { title: 'Deneme Sınavı', label: 'ODAKLAN VE DENE', text: 'Süreli bir çalışmayla kendini dene, sonuçlarını birlikte inceleyelim.', icon: Clock3, tone: 'blue', tag: 'Süreli çalışma', action: p.onStartExam },
    { title: 'Karışık Pratik', label: 'YENİ BİR KEŞİF', text: 'Farklı konulardan gelen sorularla kısa bir zihinsel ısınma yap.', icon: Target, tone: 'teal', tag: 'Karışık konular', action: () => p.onStartPractice('mixed') },
    { title: 'Hata Defteri', label: 'BİR KEZ DAHA KEŞFET', text: 'Yanıldığın sorulara geri dön, çözüm yolunu adım adım öğren.', icon: RotateCcw, tone: 'amber', tag: p.unresolvedMistakesCount ? `${p.unresolvedMistakesCount} soru bekliyor` : 'Yeni başlangıç', action: p.onOpenMistakes },
  ];
  return <section className="zp-modes-section" aria-labelledby="zp-mode-title">
    <div className="zp-mode-section-heading"><div><p className="zp-panel-eyebrow">BUGÜNÜN KEŞFİ</p><h2 id="zp-mode-title">Bugün nasıl çalışmak istersin?</h2><p>Bir başlangıç seç. Gerisini birlikte keşfedelim.</p></div><span className="zp-section-symbol" aria-hidden="true"><Sparkles size={26} /></span></div>
    <div className="zp-mode-grid">{modes.map(({ title, label, text, icon: Icon, tone, tag, action }, index) =>
      <motion.button type="button" key={title} className="zp-mode-card" data-tone={tone}
        initial={reduced ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: reduced ? 0 : index * .035 }}
        whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: .985 }} onClick={() => { sound.playClick(); action(); }}>
        <div className="zp-mode-card-top"><span className="zp-mode-icon"><Icon size={25} aria-hidden="true" /></span><span className="zp-mode-tag">{tag}</span></div>
        <small>{label}</small><h3>{title}</h3><p>{text}</p><span className="zp-mode-open">Keşfetmeye başla <ArrowRight size={17} aria-hidden="true" /></span>
      </motion.button>)}</div>
    <div className="zp-mode-links"><button type="button" onClick={() => { sound.playClick(); p.onNavigate('glossary'); }}><BookOpen size={18} aria-hidden="true" /><span>Bilişsel Sözlük<small>Görsel kavramlar ve mini oyunlar</small></span><ArrowRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => { sound.playClick(); p.onOpenChallenges(); }}><Trophy size={18} aria-hidden="true" /><span>Haftalık Görevler<small>Kendi hedeflerinle bir adım ileri</small></span><ArrowRight size={16} aria-hidden="true" /></button></div>
  </section>;
}
