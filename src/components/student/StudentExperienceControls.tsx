import React, { useId, useSyncExternalStore } from 'react';
import { AudioLines, Play, SlidersHorizontal, Volume2, VolumeX, Waves } from 'lucide-react';
import { sound } from '../../lib/sound';
import { studentMotion, useStudentReducedMotion } from '../../features/student/experience-preferences';
export function StudentExperienceControls() {
  const id = useId();
  const soundOn = useSyncExternalStore(sound.subscribe, sound.getSnapshot, sound.getServerSnapshot);
  const volume = useSyncExternalStore(sound.subscribe, sound.getVolumeSnapshot, sound.getServerVolumeSnapshot);
  const motionOn = useSyncExternalStore(studentMotion.subscribe, studentMotion.getSnapshot, studentMotion.getServerSnapshot);
  const reduced = useStudentReducedMotion();
  return <details className="zp-experience-controls">
    <summary><SlidersHorizontal size={16} aria-hidden="true" /> Görünüm ve ses</summary>
    <div className="zp-experience-panel">
      <div className="zp-experience-panel-heading"><AudioLines size={18} aria-hidden="true" /><strong>Kendi ritmini seç</strong></div>
      <p>Sakin bir çalışma alanı ya da küçük kutlamalar. Tercihlerin bu cihazda hatırlanır.</p>
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
