import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  LayoutGrid,
  Map as MapIcon,
  Maximize,
  Play,
  Search,
  Shapes,
  Sparkles,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import {
  filterWordwallActivities,
  WORDWALL_ACTIVITIES,
  wordwallInitialGrade,
  type WordwallActivity
} from '../features/student/wordwall-model';
import {
  buildMapStops,
  buildMapSvgPath,
  getGradeWorld,
  loadCompletedWordwallIds,
  saveCompletedWordwallIds,
  toggleWordwallCompleted
} from '../features/student/wordwall-map-model';
import {
  recordWordwallActivityStart,
  recordWordwallActivityClose
} from '../features/student/wordwall-telemetry';
import { sound } from '../lib/sound';

interface WordwallLibraryProps {
  initialGrade?: number;
  headingLevel?: 1 | 2;
  progressOwnerId?: string;
}

export function WordwallLibrary(props: WordwallLibraryProps) {
  return <WordwallLibraryContent key={props.progressOwnerId ? `user:${props.progressOwnerId}` : 'guest'} {...props} />;
}

function WordwallLibraryContent({
  initialGrade,
  headingLevel = 2,
  progressOwnerId,
}: WordwallLibraryProps) {
  const Title = headingLevel === 1 ? 'h1' : 'h2';
  const [grade, setGrade] = useState<number | 'all'>(() => wordwallInitialGrade(initialGrade));
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<WordwallActivity | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [soundOn, setSoundOn] = useState<boolean>(() => sound.enabled);
  const [tipIndex, setTipIndex] = useState(0);
  const [customMascotLine, setCustomMascotLine] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>(() => loadCompletedWordwallIds(progressOwnerId));

  const player = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gameButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (initialGrade) {
      setGrade(wordwallInitialGrade(initialGrade));
      setCategory('');
      setPage(0);
      setSelected(null);
      setFullscreenError('');
      setCustomMascotLine(null);
    }
  }, [initialGrade]);

  useEffect(() => sound.subscribe(() => setSoundOn(sound.enabled)), []);

  useEffect(() => {
    if (!selected) return;
    recordWordwallActivityStart(selected);
    // Filters, another game, account switches and page exit also end the session.
    return () => { recordWordwallActivityClose(selected.id); };
  }, [selected]);

  const gradePool = useMemo(
    () => WORDWALL_ACTIVITIES.filter(item => grade === 'all' || item.grade === grade),
    [grade]
  );

  const categories = useMemo(
    () => [...new Set(gradePool.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'tr')),
    [gradePool]
  );

  const filtered = useMemo(
    () => filterWordwallActivities(WORDWALL_ACTIVITIES, grade, category, query),
    [grade, category, query]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages - 1);
  const pageOffset = currentPage * 12;
  const visible = filtered.slice(pageOffset, (currentPage + 1) * 12);

  const world = useMemo(() => getGradeWorld(grade), [grade]);
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const mapStops = useMemo(
    () => buildMapStops(visible, completedSet, pageOffset),
    [visible, completedSet, pageOffset]
  );
  const svgPathD = useMemo(
    () => buildMapSvgPath(mapStops.map(stop => stop.point)),
    [mapStops]
  );

  const completedInGradeCount = useMemo(
    () => gradePool.filter(item => completedSet.has(item.id)).length,
    [gradePool, completedSet]
  );
  const totalStarsInGrade = completedInGradeCount * 3;

  const reset = () => {
    setPage(0);
    setSelected(null);
    setFullscreenError('');
  };

  const open = (item: WordwallActivity, button: HTMLButtonElement, stepIdx = 0) => {
    sound.unlock();
    sound.playMapStep(stepIdx);
    gameButton.current = button;
    setSelected(item);
    setFullscreenError('');
    setCustomMascotLine(
      `Harika seçim! "${item.title}" durağını açtım. Testi bitirdiğinde yıldızlarını toplamayı unutma! 🌟`
    );
    requestAnimationFrame(() => {
      heading.current?.focus();
      player.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };

  const close = () => {
    sound.playClick();
    setSelected(null);
    setFullscreenError('');
    requestAnimationFrame(() => gameButton.current?.focus());
  };

  const fullscreen = async () => {
    try {
      if (!player.current?.requestFullscreen) throw Error();
      await player.current.requestFullscreen();
    } catch {
      setFullscreenError(
        'Bu tarayıcı tam ekranı desteklemiyor. Oyunu aşağıdaki ekranda oynamaya devam edebilirsin.'
      );
    }
  };

  const handleToggleCompleted = (activity: WordwallActivity, e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlock();
    const { nextIds, completed } = toggleWordwallCompleted(completedIds, activity.id);
    setCompletedIds(nextIds);
    saveCompletedWordwallIds(nextIds, progressOwnerId);
    if (completed) {
      sound.playSuccess();
      setCustomMascotLine(
        `Tebrikler kaşif! "${activity.title}" durağından 3 parlak yıldız kazandın! ⭐⭐⭐`
      );
    } else {
      sound.playClick();
    }
  };

  const handleCycleTip = () => {
    sound.unlock();
    sound.playMascotCheer();
    const nextIdx = (tipIndex + 1) % world.mascotTips.length;
    setTipIndex(nextIdx);
    setCustomMascotLine(world.mascotTips[nextIdx]);
  };

  const handleToggleSound = () => {
    const next = !sound.enabled;
    sound.enabled = next;
    setSoundOn(next);
    if (next) {
      sound.unlock();
      sound.playMascotCheer();
    }
  };

  const displayedMascotText = customMascotLine || world.mascotGreeting;

  return (
    <section id="wordwall-testleri" className="ww-library" aria-labelledby="wordwall-title">
      <div className="ww-header">
        <div>
          <span className="ww-eyebrow">
            <Shapes size={17} aria-hidden="true" /> OYNA, DÜŞÜN, KEŞFET · 3B MACERA HARİTASI
          </span>
          <Title id="wordwall-title">Zeka Testleri</Title>
          <p>
            Bilge Baykuş Zeki eşliğinde sınıf düzeyine göre ilerleyen 3B kabartmalı macera haritasında
            şekilleri keşfet, sayıların sırrını çöz ve yıldızları topla!
          </p>
        </div>
        <span className="ww-total">{WORDWALL_ACTIVITIES.length} test</span>
      </div>

      {/* Bilge Baykuş Zeki 3D Mascot Guide & Sound/View Bar */}
      <div className="ww-map-mascot-bar" role="region" aria-label="Bilge Baykuş Zeki Macera Rehberi">
        <div
          className="ww-mascot-avatar-wrap"
          onClick={handleCycleTip}
          role="button"
          tabIndex={0}
          aria-label="Bilge Baykuş Zeki'den ipucu al"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCycleTip();
            }
          }}
        >
          <img src="/logo.svg" alt="Bilge Baykuş Zeki" />
          <span className="ww-mascot-badge">3B REHBER</span>
        </div>

        <div className="ww-mascot-speech">
          <div className="ww-mascot-speech-head">
            <span className="ww-mascot-name">🦉 Bilge Baykuş Zeki</span>
            <span className="ww-mascot-world-tag">
              {world.biomeEmoji} {world.badgeText}
            </span>
          </div>
          <p className="ww-mascot-text">{displayedMascotText}</p>
        </div>

        <div className="ww-mascot-controls">
          <button
            type="button"
            className="ww-3d-control-btn"
            onClick={handleCycleTip}
            aria-label="Zeki'den yeni ipucu iste"
          >
            <Sparkles size={15} aria-hidden="true" /> Zeki İpucu
          </button>

          <button
            type="button"
            className={`ww-3d-control-btn${soundOn ? ' is-active' : ''}`}
            onClick={handleToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Harita seslerini kapat' : 'Harita seslerini aç'}
          >
            {soundOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
            {soundOn ? 'Ses Açık' : 'Ses Kapalı'}
          </button>

          <button
            type="button"
            className={`ww-3d-control-btn${viewMode === 'map' ? ' is-active' : ''}`}
            onClick={() => {
              sound.unlock();
              sound.playTransition();
              setViewMode(prev => (prev === 'map' ? 'grid' : 'map'));
            }}
            aria-label={
              viewMode === 'map' ? 'Klasik kart görünümüne geç' : '3B macera haritası görünümüne geç'
            }
          >
            {viewMode === 'map' ? <MapIcon size={15} aria-hidden="true" /> : <LayoutGrid size={15} aria-hidden="true" />}
            {viewMode === 'map' ? '3B Harita Modu' : 'Klasik Görünüm'}
          </button>
        </div>
      </div>

      <div className="ww-grade-picker" role="group" aria-label="Testler için sınıf seçimi">
        {([1, 2, 3, 4, 'all'] as const).map(value => (
          <button
            type="button"
            key={value}
            aria-pressed={grade === value}
            onClick={() => {
              sound.unlock();
              sound.playTransition();
              setGrade(value);
              setCategory('');
              setCustomMascotLine(null);
              reset();
            }}
          >
            {value === 'all' ? 'Tüm sınıflar' : `${value}. sınıf`}{' '}
            <span>
              {WORDWALL_ACTIVITIES.filter(item => value === 'all' || item.grade === value).length}
            </span>
          </button>
        ))}
      </div>

      <div className="ww-filters">
        <label className="ww-search">
          <span className="sr-only">Zeka testlerinde ara</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Test adı veya konu ara…"
            onChange={event => {
              setQuery(event.target.value);
              reset();
            }}
          />
        </label>
        <label className="ww-category">
          <span>Konu</span>
          <select
            value={category}
            onChange={event => {
              sound.unlock();
              sound.playClick();
              setCategory(event.target.value);
              reset();
            }}
          >
            <option value="">Tüm konular</option>
            {categories.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div
          ref={player}
          className="ww-player"
          onKeyDown={event => {
            if (event.key === 'Escape' && document.fullscreenElement !== player.current) close();
          }}
        >
          <div className="ww-player-header">
            <div>
              <span>
                {selected.grade}. sınıf · {selected.category}
              </span>
              <h3 ref={heading} tabIndex={-1}>
                {selected.title}
              </h3>
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleToggleCompleted(selected)}
                aria-label="Testi tamamlandı olarak işaretle"
              >
                <CheckCircle2 size={18} aria-hidden="true" />{' '}
                {completedSet.has(selected.id) ? 'Tamamlandı (3⭐)' : 'Tamamla'}
              </button>
              <button type="button" onClick={fullscreen} aria-label="Oyunu tam ekran aç">
                <Maximize size={20} />
              </button>
              <button type="button" onClick={close} aria-label="Oyunu kapat">
                <X size={20} />
              </button>
            </div>
          </div>
          <iframe
            key={selected.id}
            title={`${selected.title} — Zeka testi`}
            src={selected.embedUrl}
            allow="fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {fullscreenError && (
            <p role="status" className="ww-feedback">
              {fullscreenError}
            </p>
          )}
        </div>
      )}

      <p className="ww-results" role="status">
        {filtered.length} test bulundu{category ? ` · ${category}` : ''}
      </p>

      {filtered.length > 0 && (
        <div
          className="ww-adventure-board"
          style={{ background: world.skyGradient }}
          data-map-grade={String(grade)}
          data-view-mode={viewMode}
        >
          <div className="ww-adventure-board-head">
            <div className="ww-world-title-box">
              <span className="ww-world-emoji" aria-hidden="true">
                {world.biomeEmoji}
              </span>
              <div>
                <h3>{world.worldName}</h3>
                <p>{world.worldSubtitle}</p>
              </div>
            </div>

            <div className="ww-world-progress-pill" aria-label="Harita ilerleme durumu">
              <Compass size={16} aria-hidden="true" />
              <span>
                Keşfedilen: {completedInGradeCount} / {gradePool.length} Durak
              </span>
              <span aria-hidden="true">·</span>
              <span>⭐ {totalStarsInGrade} Yıldız</span>
            </div>
          </div>

          <div className="ww-map-path-stage">
            {viewMode === 'map' && mapStops.length > 1 && (
              <svg
                className="ww-map-trail-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.88)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d={svgPathD}
                  fill="none"
                  stroke={world.pathColor}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  className="ww-map-trail-dash"
                />
              </svg>
            )}

            <div className={viewMode === 'map' ? 'ww-map-nodes-grid' : 'ww-grid'}>
              {mapStops.map((stop, idx) => {
                const { activity: item, stepNumber, status, stars, biomeIcon } = stop;
                const isCurrent = status === 'current';
                const isCompleted = status === 'completed';

                return (
                  <article className="ww-card" key={item.id} data-node-status={status}>
                    {isCurrent && (
                      <div className="ww-node-mascot-marker">🦉 Zeki Burada · Sıradaki!</div>
                    )}

                    <div className="ww-node-step-medallion" aria-label={`Durak ${stepNumber}`}>
                      <span>{biomeIcon}</span>
                      <span>Durak {stepNumber}</span>
                    </div>

                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="400"
                      height="300"
                    />
                    <div>
                      <p>
                        {item.grade}. sınıf · {item.category}
                      </p>
                      <h3>{item.title}</h3>

                      <div className="ww-node-stars-row">
                        <span
                          className="ww-node-stars"
                          aria-label={isCompleted ? '3 yıldız kazanıldı' : 'Henüz tamamlanmadı'}
                        >
                          {isCompleted ? '⭐⭐⭐' : '☆☆☆'}
                          <small
                            style={{
                              marginLeft: '0.3rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#64748b'
                            }}
                          >
                            {stars}/3
                          </small>
                        </span>

                        <button
                          type="button"
                          className={`ww-node-complete-toggle${isCompleted ? ' is-done' : ''}`}
                          onClick={e => handleToggleCompleted(item, e)}
                        >
                          {isCompleted ? '✓ Tamamlandı' : '☆ Tamamla'}
                        </button>
                      </div>

                      <button
                        type="button"
                        className="ww-play-3d-btn"
                        onClick={event => open(item, event.currentTarget, idx)}
                        aria-label={`${item.title} testini oyna`}
                      >
                        <Play size={16} aria-hidden="true" /> Testi oyna{' '}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="ww-empty">
          <Search size={28} aria-hidden="true" />
          <h3>Bu aramada test bulunamadı</h3>
          <p>Başka bir kelime dene veya konu filtresini kaldır.</p>
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setQuery('');
              reset();
            }}
          >
            Aramayı temizle
          </button>
        </div>
      )}

      {pages > 1 && (
        <nav className="ww-pagination" aria-label="Zeka testi sayfaları">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => {
              sound.unlock();
              sound.playTransition();
              setPage(currentPage - 1);
              setSelected(null);
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Önceki Bölge
          </button>
          <span>
            Harita Bölgesi {currentPage + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={currentPage === pages - 1}
            onClick={() => {
              sound.unlock();
              sound.playTransition();
              setPage(currentPage + 1);
              setSelected(null);
            }}
          >
            Sonraki Bölge <ArrowRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}

      <p className="ww-note">
        Bu testlerin puanları Bilsem Junior çalışma raporlarına otomatik aktarılmaz.
      </p>
    </section>
  );
}

export function WordwallPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6">
        <a href="/" className="text-2xl font-extrabold text-violet-700">
          Bilsem Junior
        </a>
        <a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">
          <ArrowLeft size={17} aria-hidden="true" /> Öğrenci alanına dön
        </a>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <WordwallLibrary headingLevel={1} />
      </main>
    </div>
  );
}
