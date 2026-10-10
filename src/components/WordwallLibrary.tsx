import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Maximize, Play, Search, Shapes, X } from 'lucide-react';
import { filterWordwallActivities, WORDWALL_ACTIVITIES, wordwallInitialGrade, type WordwallActivity } from '../features/student/wordwall-model';

export function WordwallLibrary({ initialGrade, headingLevel = 2 }: { initialGrade?: number; headingLevel?: 1 | 2 }) {
  const Title = headingLevel === 1 ? 'h1' : 'h2';
  const [grade, setGrade] = useState<number | 'all'>(() => wordwallInitialGrade(initialGrade));
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<WordwallActivity | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const player = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gameButton = useRef<HTMLButtonElement | null>(null);
  const categories = [...new Set(WORDWALL_ACTIVITIES.filter(item => grade === 'all' || item.grade === grade).map(item => item.category))].sort((a, b) => a.localeCompare(b, 'tr'));
  const filtered = filterWordwallActivities(WORDWALL_ACTIVITIES, grade, category, query);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 12, (currentPage + 1) * 12);
  const reset = () => { setPage(0); setSelected(null); setFullscreenError(''); };
  const open = (item: WordwallActivity, button: HTMLButtonElement) => {
    gameButton.current = button; setSelected(item); setFullscreenError('');
    requestAnimationFrame(() => { heading.current?.focus(); player.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  };
  const close = () => {
    setSelected(null); setFullscreenError('');
    requestAnimationFrame(() => gameButton.current?.focus());
  };
  const fullscreen = async () => {
    try { if (!player.current?.requestFullscreen) throw Error(); await player.current.requestFullscreen(); }
    catch { setFullscreenError('Bu tarayıcı tam ekranı desteklemiyor. Oyunu aşağıdaki ekranda oynamaya devam edebilirsin.'); }
  };
  return <section id="wordwall-testleri" className="ww-library" aria-labelledby="wordwall-title">
    <div className="ww-header"><div><span className="ww-eyebrow"><Shapes size={17} aria-hidden="true" /> OYNA, DÜŞÜN, KEŞFET</span><Title id="wordwall-title">Zeka Testleri</Title><p>Şekilleri keşfet, sayıların sırrını çöz. Sınıfını seç ve bir teste başla.</p></div><span className="ww-total">{WORDWALL_ACTIVITIES.length} test</span></div>
    <div className="ww-grade-picker" role="group" aria-label="Testler için sınıf seçimi">
      {([1, 2, 3, 4, 'all'] as const).map(value => <button type="button" key={value} aria-pressed={grade === value} onClick={() => { setGrade(value); setCategory(''); reset(); }}>{value === 'all' ? 'Tüm sınıflar' : `${value}. sınıf`} <span>{WORDWALL_ACTIVITIES.filter(item => value === 'all' || item.grade === value).length}</span></button>)}
    </div>
    <div className="ww-filters"><label className="ww-search"><span className="sr-only">Zeka testlerinde ara</span><Search size={18} aria-hidden="true" /><input type="search" value={query} placeholder="Test adı veya konu ara…" onChange={event => { setQuery(event.target.value); reset(); }} /></label><label className="ww-category"><span>Konu</span><select value={category} onChange={event => { setCategory(event.target.value); reset(); }}><option value="">Tüm konular</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label></div>
    {selected && <div ref={player} className="ww-player" onKeyDown={event => { if (event.key === 'Escape' && document.fullscreenElement !== player.current) close(); }}>
      <div className="ww-player-header"><div><span>{selected.grade}. sınıf · {selected.category}</span><h3 ref={heading} tabIndex={-1}>{selected.title}</h3></div><div><button type="button" onClick={fullscreen} aria-label="Oyunu tam ekran aç"><Maximize size={20} /></button><button type="button" onClick={close} aria-label="Oyunu kapat"><X size={20} /></button></div></div>
      <iframe key={selected.id} title={`${selected.title} — Zeka testi`} src={selected.embedUrl} allow="fullscreen" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="strict-origin-when-cross-origin" />
      {fullscreenError && <p role="status" className="ww-feedback">{fullscreenError}</p>}
    </div>}
    <p className="ww-results" role="status">{filtered.length} test bulundu{category ? ` · ${category}` : ''}</p>
    <div className="ww-grid">{visible.map(item => <article className="ww-card" key={item.id}><img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" width="400" height="300" /><div><p>{item.grade}. sınıf · {item.category}</p><h3>{item.title}</h3><button type="button" onClick={event => open(item, event.currentTarget)} aria-label={`${item.title} testini oyna`}><Play size={16} aria-hidden="true" /> Testi oyna <ArrowRight size={16} aria-hidden="true" /></button></div></article>)}</div>
    {filtered.length === 0 && <div className="ww-empty"><Search size={28} aria-hidden="true" /><h3>Bu aramada test bulunamadı</h3><p>Başka bir kelime dene veya konu filtresini kaldır.</p><button type="button" onClick={() => { setCategory(''); setQuery(''); reset(); }}>Aramayı temizle</button></div>}
    {pages > 1 && <nav className="ww-pagination" aria-label="Zeka testi sayfaları"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelected(null); }}><ArrowLeft size={16} aria-hidden="true" /> Önceki</button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage === pages - 1} onClick={() => { setPage(currentPage + 1); setSelected(null); }}>Sonraki <ArrowRight size={16} aria-hidden="true" /></button></nav>}
    <p className="ww-note">Bu testlerin puanları ZekaPark çalışma raporlarına otomatik aktarılmaz.</p>
  </section>;
}

export function WordwallPage() {
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6"><a href="/" className="text-2xl font-extrabold text-violet-700">ZekaPark</a><a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={17} aria-hidden="true" /> Öğrenci alanına dön</a></header><main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6"><WordwallLibrary headingLevel={1} /></main></div>;
}
