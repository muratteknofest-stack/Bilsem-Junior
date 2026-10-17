import React, { useId, useSyncExternalStore } from 'react';
import { AudioLines, Play, SlidersHorizontal, Volume2, VolumeX, Waves, X } from 'lucide-react';
import { sound } from '../../lib/sound';
import { studentMotion, useStudentReducedMotion } from '../../features/student/experience-preferences';
export function StudentExperienceControls({ variant = 'standard' }: { variant?: 'standard' | 'playful' }) {
  const id = useId();
  const soundOn = useSyncExternalStore(sound.subscribe, sound.getSnapshot, sound.getServerSnapshot);
  const volume = useSyncExternalStore(sound.subscribe, sound.getVolumeSnapshot, sound.getServerVolumeSnapshot);
  const motionOn = useSyncExternalStore(studentMotion.subscribe, studentMotion.getSnapshot, studentMotion.getServerSnapshot);
  const reduced = useStudentReducedMotion();
  const preset = !soundOn && !motionOn ? 'quiet' : soundOn && motionOn && volume === .35 ? 'balanced' : soundOn && motionOn && volume === .6 ? 'lively' : '';
  return <details onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }} className={`zp-experience-controls ${variant === 'playful' ? 'zp-experience-playful' : ''}`}>
    <summary><SlidersHorizontal size={16} aria-hidden="true" /> Görünüm ve ses</summary>
    <div className="zp-experience-panel">
      <div className="zp-experience-panel-heading"><AudioLines size={18} aria-hidden="true" /><strong>Kendi ritmini seç</strong><button className="zp-experience-close" type="button" aria-label="Tercihleri kapat" onClick={event => { const details = event.currentTarget.closest('details'); if (details) { details.open = false; details.querySelector('summary')?.focus(); } }}><X size={18} aria-hidden="true" /></button></div>
      <p>Sakin bir çalışma alanı ya da küçük kutlamalar. Tercihlerin bu cihazda hatırlanır.</p>
      <div className="zp-experience-presets" role="group" aria-label="Deneyim tercihi">{([
        ['quiet', 'Sessiz', 0, false], ['balanced', 'Dengeli', .35, true], ['lively', 'Canlı', .6, true],
      ] as const).map(([value, label, level, animated]) => <button key={value} type="button" aria-pressed={preset === value} onClick={() => { sound.volume = level; sound.enabled = level > 0; studentMotion.setEnabled(animated); if (level > 0) { sound.unlock(); sound.playTransition(); } }}><span aria-hidden="true">{value === 'quiet' ? '☁' : value === 'balanced' ? '✦' : '⚡'}</span>{label}</button>)}</div>
      <button type="button" aria-label={soundOn ? 'Öğrenci seslerini kapat' : 'Öğrenci seslerini aç'} aria-pressed={soundOn}
        onClick={() => { sound.enabled = !soundOn; if (!soundOn) { sound.unlock(); sound.playClick(); } }}>
        {soundOn ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />} Ses efektleri <span>{soundOn ? 'Açık' : 'Kapalı'}</span>
      </button>
      <label htmlFor={id}>Ses düzeyi <output htmlFor={id}>%{Math.round(volume * 100)}</output></label>
      <input id={id} aria-label="Ses düzeyi" type="range" min="0" max="100" step="5" value={Math.round(volume * 100)} onChange={event => { sound.volume = Number(event.target.value) / 100; }} />
      <div className="zp-experience-actions"><button type="button" disabled={!soundOn || volume === 0} onClick={() => { sound.unlock(); sound.playSuccess(); }}><Play size={14} aria-hidden="true" /> Sesi dene</button><small>Arka plan müziği çalmaz.</small></div>
      <button type="button" aria-pressed={motionOn} onClick={() => studentMotion.setEnabled(!motionOn)}><Waves size={18} aria-hidden="true" /> Hareketli efektler <span>{motionOn ? 'Açık' : 'Kapalı'}</span></button>
      <small>{reduced ? 'Hareket azaltıldı. Cihazının erişilebilirlik tercihi de dikkate alınır.' : 'Yumuşak geçişler ve kısa başarı kutlamaları.'}</small>
    </div>
  </details>;
}
