import React, { useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { Sparkles, RotateCcw, Trophy, Orbit } from 'lucide-react';

function Cube({ className = '' }: { className?: string }) {
  return <div className={`zp-cube ${className}`}>{['front', 'back', 'right', 'left', 'top', 'bottom'].map(face => <span key={face} className={`zp-cube-${face}`} />)}</div>;
}

export function LearningIsland({ moving }: { moving: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: '80px' });
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 90, damping: 22 });
  const rotateY = useSpring(y, { stiffness: 90, damping: 22 });
  const [turned, setTurned] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const reset = () => { x.set(0); y.set(turned ? -12 : 0); };
  return <div ref={ref} className="zp-island-wrap" data-active={moving && visible}>
    <div className="zp-scene-halo" aria-hidden="true" />
    <div className="zp-scene-caption"><span className="zp-status-dot" /> BİLSEM JUNIOR · HAZIRLIK STÜDYOSU</div>
    <div className="zp-island-viewport" onPointerMove={e => {
      if (!moving || e.pointerType !== 'mouse') return;
      const rect = e.currentTarget.getBoundingClientRect();
      x.set((0.5 - (e.clientY - rect.top) / rect.height) * 9);
      y.set(((e.clientX - rect.left) / rect.width - 0.5) * 16 + (turned ? -12 : 0));
    }} onPointerLeave={reset}>
      <motion.div className="zp-island-stage" style={{ rotateX: moving ? rotateX : 0, rotateY: moving ? rotateY : 0 }}>
        <div className="zp-island-art" role="img" aria-label="Rengârenk keşif adasında mor Zeki robotu, üç boyutlu küpler, gökkuşağı, ağaçlar ve yıldızlar">
          <div className="zp-park-rainbow" />
          <div className="zp-orbit zp-orbit-back" />
          <div className="zp-planet"><span /></div>
          <div className="zp-star zp-star-one">✦</div><div className="zp-star zp-star-two">✦</div><div className="zp-star zp-star-three">✧</div>
          <div className="zp-island-shadow" />
          <div className="zp-island-base"><div className="zp-island-surface"><div className="zp-surface-grid" /></div></div>
          <div className="zp-park-tree zp-park-tree-left"><span /><i /></div><div className="zp-park-tree zp-park-tree-right"><span /><i /></div>
          <div className="zp-park-path" /><div className="zp-park-flower zp-park-flower-one" /><div className="zp-park-flower zp-park-flower-two" />
          <div className="zp-platform zp-platform-back" /><div className="zp-platform zp-platform-front" />
          <div className="zp-float-cube zp-float-cube-one"><Cube /></div>
          <div className="zp-float-cube zp-float-cube-two"><Cube className="zp-cube-mint" /></div>
          <div className="zp-block-stack"><Cube className="zp-cube-peach" /><Cube className="zp-cube-peach" /></div>
          <div className="zp-arch"><div /></div>
          <div className={`zp-robot ${greeted ? 'zp-robot-greeting' : ''}`}>
            <div className="zp-antenna"><i /></div>
            <div className="zp-robot-ear zp-ear-left" /><div className="zp-robot-ear zp-ear-right" />
            <div className="zp-robot-head"><div className="zp-robot-screen"><i className="zp-eye" /><i className="zp-eye" /><span className="zp-smile" /></div><span className="zp-cheek zp-cheek-left" /><span className="zp-cheek zp-cheek-right" /></div>
            <div className="zp-robot-body"><span>j</span></div>
            <div className="zp-arm zp-arm-left" /><div className="zp-arm zp-arm-right" />
            <div className="zp-foot zp-foot-left" /><div className="zp-foot zp-foot-right" />
          </div>
          <div className="zp-orbit zp-orbit-front" />
        </div>
        <div className="zp-floating-note zp-note-quest"><span className="zp-note-icon"><Sparkles size={20} /></span><div><small>DÜŞÜN. KEŞFET. GELİŞ.</small><strong>Hazırlığa başlayalım!</strong></div></div>
        <div className="zp-floating-note zp-note-trophy"><span className="zp-trophy-icon"><Trophy size={24} /></span><div><strong>Dene. Öğren. Parla!</strong><small>Her adımın çok değerli</small></div></div>
      </motion.div>
    </div>
    <div className="zp-scene-controls">
      <button type="button" aria-pressed={turned} disabled={!moving} onClick={() => { setTurned(!turned); y.set(turned ? 0 : -12); }}><RotateCcw size={14} /> Bakış açısını değiştir</button>
      <button type="button" aria-pressed={greeted} onClick={() => setGreeted(!greeted)}><Orbit size={14} /> {greeted ? 'Merhaba, kaşif!' : 'Zeki’ye selam ver'}</button>
    </div>
    <span className="sr-only" role="status">{greeted ? 'Zeki sana el sallıyor. Keşfe hazır!' : ''}</span>
  </div>;
}
