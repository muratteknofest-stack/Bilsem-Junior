import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
import {
  Clapperboard,
  Download,
  Film,
  Music,
  Palette,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  WandSparkles,
  Zap,
} from 'lucide-react';
import {
  createBrowserReel,
  selectLocalReelQuestion,
  renderPreviewReelFrame,
  scheduleReelMusic,
  REEL_THEME_SPECS,
  MUSIC_TRACK_SPECS,
  type LocalQuestion,
  type ReelThemeId,
  type MusicTrackId,
} from '../../features/reels/browser-reel';

type Mechanic =
  | 'auto'
  | 'analogy-grid'
  | 'paired-analogy'
  | 'matrix-attributes'
  | 'feature-classification'
  | 'attribute-sequence'
  | 'interleaved-sequence';

type ReelRun = {
  id: number;
  manual: boolean;
  status: string;
  conclusion: string | null;
  createdAt: string | null;
  runUrl: string;
  videoUrl: string | null;
};

type ReelsStatus = {
  configured: boolean;
  runs: ReelRun[];
  schedule: string;
  timezone: string;
  notice?: string;
};

const topics: Array<{ id: Mechanic; title: string; note: string }> = [
  { id: 'auto', title: 'Karışık sorular', note: 'Her videoda farklı soru türü' },
  { id: 'analogy-grid', title: 'Görsel analoji', note: 'Aynı değişimi uygula' },
  { id: 'paired-analogy', title: 'Şekil ilişkileri', note: 'İlişki ve benzetim' },
  { id: 'matrix-attributes', title: 'Raven / matris', note: 'Satır ve sütun muhakemesi' },
  { id: 'feature-classification', title: 'Farklı / ortak özellik', note: 'Sınıflandırma' },
  { id: 'attribute-sequence', title: 'Örüntü', note: 'Şekil dizileri' },
  { id: 'interleaved-sequence', title: 'Karma örüntü', note: 'İç içe diziler' },
];

const statusText = (run: ReelRun) => {
  if (run.status === 'completed')
    return run.conclusion === 'success'
      ? 'Video üretildi'
      : run.conclusion === 'failure'
      ? 'Üretim başarısız'
      : 'Tamamlandı: ' + (run.conclusion || 'bilinmiyor');
  if (run.status === 'in_progress') return 'Video hazırlanıyor';
  return 'Üretim kuyruğunda';
};

export function AdminReelsStudio() {
  const [grade, setGrade] = useState<1 | 2 | 3 | 4>(2);
  const [difficulty, setDifficulty] = useState(2);
  const [mechanic, setMechanic] = useState<Mechanic>('auto');
  const [themeId, setThemeId] = useState<ReelThemeId>('space_academy');
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>('quiz_show');
  const [musicVolume, setMusicVolume] = useState(35);
  const [customAudioBuffer, setCustomAudioBuffer] = useState<AudioBuffer | null>(null);
  const [customMp3Name, setCustomMp3Name] = useState('');
  const [showMascot, setShowMascot] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [hideAnswerSpoiler, setHideAnswerSpoiler] = useState(true);
  const [autoPilotDaily, setAutoPilotDaily] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bilsem_reels_autopilot') !== 'false';
    } catch {
      return true;
    }
  });

  const [previewQuestion, setPreviewQuestion] = useState<LocalQuestion | null>(null);
  const [isTestingMusic, setIsTestingMusic] = useState(false);

  const [status, setStatus] = useState<ReelsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localVideo, setLocalVideo] = useState<{
    url: string;
    extension: string;
    topic: string;
  } | null>(null);

  const localVideoUrlRef = useRef<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mp3InputRef = useRef<HTMLInputElement | null>(null);
  const musicTestCtxRef = useRef<AudioContext | null>(null);
  const autoPilotTriggeredRef = useRef(false);

  useEffect(
    () => () => {
      if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current);
      if (musicTestCtxRef.current) {
        musicTestCtxRef.current.close().catch(() => {});
      }
    },
    []
  );

  // Generate a live verified preview question whenever grade/difficulty/mechanic changes
  const refreshPreviewQuestion = useCallback(async () => {
    try {
      const q = await selectLocalReelQuestion({ grade, difficulty, mechanic });
      setPreviewQuestion(q);
    } catch {
      // ignore if combination unsupported
    }
  }, [grade, difficulty, mechanic]);

  useEffect(() => {
    void refreshPreviewQuestion();
  }, [refreshPreviewQuestion]);

  // 60 FPS Live Canvas Preview Loop
  useEffect(() => {
    if (!previewQuestion) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sec = ((performance.now() - start) / 1000) % 19;
          renderPreviewReelFrame(ctx, previewQuestion, sec, {
            themeId,
            showMascot,
            showSubtitles,
            hideAnswerSpoiler,
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewQuestion, themeId, showMascot, showSubtitles, hideAnswerSpoiler]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/reels');
      const payload: ReelsStatus & { error?: string } = await response.json();
      if (!response.ok) throw Error(payload.error || 'Video kayıtları okunamadı.');
      setStatus(payload);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Video kayıtları okunamadı.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gradeChanged = (next: 1 | 2 | 3 | 4) => {
    setGrade(next);
    if (next === 1) {
      setDifficulty((current) => Math.min(current, 2));
      if (mechanic === 'matrix-attributes' || mechanic === 'interleaved-sequence')
        setMechanic('auto');
    }
  };

  const eligibleTopic = (id: Mechanic) => {
    if (
      grade === 1 &&
      (id === 'matrix-attributes' || id === 'interleaved-sequence')
    )
      return false;
    if (id === 'interleaved-sequence' && difficulty < 2) return false;
    return true;
  };

  const handleToggleMusicPreview = async () => {
    if (isTestingMusic) {
      if (musicTestCtxRef.current) {
        await musicTestCtxRef.current.close().catch(() => {});
        musicTestCtxRef.current = null;
      }
      setIsTestingMusic(false);
      return;
    }
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      musicTestCtxRef.current = ctx;
      setIsTestingMusic(true);
      scheduleReelMusic(
        ctx,
        ctx.destination,
        musicTrack,
        8,
        (musicVolume / 100) * 0.5,
        customAudioBuffer
      );
      window.setTimeout(() => {
        if (musicTestCtxRef.current === ctx) {
          ctx.close().catch(() => {});
          musicTestCtxRef.current = null;
          setIsTestingMusic(false);
        }
      }, 8000);
    } catch {
      setIsTestingMusic(false);
    }
  };

  const handleCustomMp3Upload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      await ctx.close().catch(() => {});
      setCustomAudioBuffer(decoded);
      setCustomMp3Name(file.name);
      setMusicTrack('custom_mp3');
      setNotice(`Özel MP3 müziği yüklendi: ${file.name}`);
    } catch {
      setError('MP3 dosyası çözümlenemedi. Geçerli bir ses dosyası seçin.');
    }
  };

  async function generate() {
    if (busy || !status?.configured) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await authenticatedFetch('/api/admin/reels/generate', {
        method: 'POST',
        body: JSON.stringify({ grade, difficulty, mechanic }),
      });
      const payload: { error?: string; message?: string } =
        await response.json();
      if (!response.ok)
        throw Error(payload.error || 'Video üretimi başlatılamadı.');
      setNotice(payload.message || 'Video üretimi sıraya alındı.');
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Video üretimi başlatılamadı.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateOnDevice() {
    if (localBusy || busy) return;
    setLocalBusy(true);
    setError('');
    setNotice(
      'Cihazda orijinal soru doğrulanıyor, arka plan müziği ve BİLSEM Junior Tilki maskotu ile 9:16 video hazırlanıyor...'
    );
    setLocalProgress(0);
    try {
      const result = await createBrowserReel(
        {
          grade,
          difficulty,
          mechanic,
          themeId,
          musicTrack,
          musicVolume,
          customAudioBuffer,
          showMascot,
          showSubtitles,
          hideAnswerSpoiler,
        },
        setLocalProgress,
        previewQuestion || undefined
      );
      const url = URL.createObjectURL(result.blob);
      if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current);
      localVideoUrlRef.current = url;
      setLocalVideo({
        url,
        extension: result.extension,
        topic: result.topic,
      });
      setNotice(
        result.extension === 'mp4'
          ? 'Müzikli ve animasyonlu 9:16 Reels videosu oluşturuldu! Önizleyebilir veya MP4 olarak indirebilirsin.'
          : 'Müzikli ve animasyonlu 9:16 Reels videosu oluşturuldu! WebM olarak indirilebilir.'
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Cihazda video üretilemedi. Güncel Chrome deneyin.'
      );
      setNotice('');
    } finally {
      setLocalBusy(false);
    }
  }

  // Automatic Daily Reel Preparation on Admin Panel open if today's video hasn't been generated yet
  useEffect(() => {
    if (!autoPilotDaily || autoPilotTriggeredRef.current || localVideo || localBusy)
      return;
    const todayKey = new Date().toISOString().slice(0, 10);
    try {
      const lastDate = localStorage.getItem('bilsem_reels_last_auto_date');
      if (lastDate !== todayKey && previewQuestion) {
        autoPilotTriggeredRef.current = true;
        localStorage.setItem('bilsem_reels_last_auto_date', todayKey);
        void generateOnDevice();
      }
    } catch {
      // ignore storage errors
    }
  }, [autoPilotDaily, previewQuestion, localVideo, localBusy]);

  const manualRuns = (status?.runs || []).filter((run) => run.manual);
  const lastVideo = manualRuns.find((run) => !!run.videoUrl);

  return (
    <section className="space-y-6" aria-labelledby="admin-reels-title">
      <div className="overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-900 via-slate-900 to-fuchsia-950 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/assets/aistudio/B_LSEM_Junior_tilki_ikonu_e352f23b.png"
              alt="BİLSEM Junior Tilki Maskotu"
              className="h-16 w-16 rounded-2xl border-2 border-amber-300 object-cover shadow-lg"
            />
            <div>
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-cyan-300">
                <Clapperboard size={16} /> BİLSEM JUNIOR / OTOMATİK REELS STÜDYOSU
              </p>
              <h2 id="admin-reels-title" className="text-2xl font-black sm:text-3xl">
                Instagram Reels Stüdyosu
              </h2>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-black text-emerald-200">
            <input
              type="checkbox"
              checked={autoPilotDaily}
              onChange={(e) => {
                const val = e.target.checked;
                setAutoPilotDaily(val);
                try {
                  localStorage.setItem('bilsem_reels_autopilot', String(val));
                } catch {}
              }}
              className="h-4 w-4 accent-emerald-400"
            />
            <Zap size={15} className="text-emerald-300" />
            <span>Otomatik Günlük Reels Hazırlama Aktif</span>
          </label>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">
          BİLSEM Junior Tilki maskotu, telifsiz yarışma müzikleri, kelime kelime
          karaoke altyazılar ve TV yarışması geri sayım halkasıyla 1080 × 1920
          dikey Reels videolarını otomatik hazırlar. GitHub sunucusuna ihtiyaç
          duymadan doğrudan Admin panelinde çalışır.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1.5">
            Günlük otomasyon: 19.00 Türkiye
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200">
            4 Sahne Teması & Telifsiz Müzik Mikseri
          </span>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-amber-200">
            BİLSEM Junior Tilki Maskotu & Canlı Ekolayzır
          </span>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-700 bg-rose-950/70 p-4 text-sm text-rose-100"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-600 bg-emerald-950/70 p-4 text-sm text-emerald-100"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.85fr)]">
        {/* Left Controls */}
        <div className="space-y-5 rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <WandSparkles size={22} className="text-amber-300" /> Yeni Reels
              Videosu ve Müzik Ayarları
            </h3>
            <button
              type="button"
              onClick={() => void refreshPreviewQuestion()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-500/30"
            >
              <Sparkles size={14} /> Yeni Soru Değiştir
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-200">
              Sınıf düzeyi
              <select
                value={grade}
                onChange={(e) =>
                  gradeChanged(Number(e.target.value) as 1 | 2 | 3 | 4)
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white"
              >
                {[1, 2, 3, 4].map((g) => (
                  <option key={g} value={g}>
                    {g}. sınıf
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-200">
              Zorluk
              <select
                value={difficulty}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDifficulty(v);
                  if (v < 2 && mechanic === 'interleaved-sequence')
                    setMechanic('auto');
                }}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white"
              >
                <option value={1}>Kolay</option>
                <option value={2}>Orta</option>
                {grade !== 1 && <option value={3}>Zor</option>}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-200 sm:col-span-2">
              Soru türü
              <select
                value={mechanic}
                onChange={(e) => setMechanic(e.target.value as Mechanic)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white"
              >
                {topics
                  .filter((t) => eligibleTopic(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                {topics.find((t) => t.id === mechanic)?.note}
              </span>
            </label>
          </div>

          {/* 4 Visual Themes */}
          <div className="border-t border-slate-800 pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <Palette size={15} /> Sahne ve Arka Plan Teması
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(REEL_THEME_SPECS) as ReelThemeId[]).map((id) => {
                const spec = REEL_THEME_SPECS[id];
                const active = themeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-white'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-white/40"
                      style={{
                        background: `linear-gradient(135deg, ${spec.bgStops[0]}, ${spec.accent})`,
                      }}
                    />
                    <span className="truncate">{spec.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Music & MP3 Upload */}
          <div className="border-t border-slate-800 pt-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Music size={15} /> Arka Plan Müziği & Ses Mikseri
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleToggleMusicPreview()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                >
                  <Volume2 size={14} />
                  {isTestingMusic ? 'Müziği Durdur' : 'Müziği Dinle'}
                </button>
                <input
                  ref={mp3InputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleCustomMp3Upload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mp3InputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Upload size={14} />
                  {customMp3Name ? customMp3Name.slice(0, 12) : 'MP3 Yükle'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <select
                  value={musicTrack}
                  onChange={(e) =>
                    setMusicTrack(e.target.value as MusicTrackId)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs font-semibold text-white"
                >
                  {(Object.keys(MUSIC_TRACK_SPECS) as MusicTrackId[]).map(
                    (id) => (
                      <option key={id} value={id}>
                        {MUSIC_TRACK_SPECS[id].name} —{' '}
                        {MUSIC_TRACK_SPECS[id].subtitle}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="sm:col-span-5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Müzik Seviyesi</span>
                  <span>%{musicVolume}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="mt-2 w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Toggles: Fox Mascot, Subtitles, No-Spoiler Comment Mode */}
          <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-200">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showMascot}
                onChange={(e) => setShowMascot(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              <span>BİLSEM Junior Tilki Maskotu & Ses Dalgası</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showSubtitles}
                onChange={(e) => setShowSubtitles(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              <span>Kelime Kelime Karaoke Altyazı</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hideAnswerSpoiler}
                onChange={(e) => setHideAnswerSpoiler(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              <span>Cevabı Gizle (Yorumlara Yazdır)</span>
            </label>
          </div>

          <button
            type="button"
            disabled={localBusy || busy}
            onClick={() => void generateOnDevice()}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-800/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clapperboard size={22} />{' '}
            {localBusy
              ? 'Cihazında müzikli video hazırlanıyor… %' + localProgress
              : 'Şimdi Video Oluştur (Cihazda)'}
          </button>

          {localBusy && (
            <div
              role="progressbar"
              aria-valuenow={localProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Video oluşturma ilerlemesi"
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700"
            >
              <div
                style={{ width: localProgress + '%' }}
                className="h-full bg-cyan-400 transition-all duration-500"
              />
            </div>
          )}

          <button
            type="button"
            disabled={busy || localBusy || loading || !status?.configured}
            onClick={() => void generate()}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-500 px-5 py-3 font-black text-white shadow-lg shadow-fuchsia-800/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle size={21} />{' '}
            {busy
              ? 'Üretim isteği gönderiliyor…'
              : 'Alternatif: GitHub sunucusunda üret'}
          </button>
        </div>

        {/* Right Column: Live 9:16 Stage & Recorded Video Download */}
        <div className="space-y-5 rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
          <h3 className="flex items-center justify-between gap-2 text-lg font-black">
            <span className="flex items-center gap-2">
              <Film size={20} className="text-cyan-300" /> Canlı 9:16 Sahne &
              Video
            </span>
            <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-200">
              1080 × 1920
            </span>
          </h3>

          {/* Live 60 FPS Interactive Canvas Preview */}
          <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-xl">
            <canvas
              ref={previewCanvasRef}
              width={1080}
              height={1920}
              className="aspect-[9/16] w-full object-contain"
            />
          </div>

          {localVideo ? (
            <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
              <p className="text-center text-sm font-bold text-emerald-300">
                Hazır Video: {localVideo.topic} •{' '}
                {localVideo.extension.toUpperCase()}
              </p>
              <video
                key={localVideo.url}
                src={localVideo.url}
                controls
                playsInline
                preload="metadata"
                className="mx-auto max-h-[360px] w-full max-w-[220px] rounded-2xl bg-black"
                aria-label="Cihazda oluşturulan Instagram Reels videosunu izle"
              />
              <a
                href={localVideo.url}
                download={
                  'bilsem-junior-reels-' +
                  Date.now() +
                  '.' +
                  localVideo.extension
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 font-black text-slate-950"
              >
                <Download size={18} /> Videoyu indir (
                {localVideo.extension.toUpperCase()})
              </a>
            </div>
          ) : (
            lastVideo?.videoUrl && (
              <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                <video
                  key={lastVideo.id}
                  src={lastVideo.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="mx-auto max-h-[360px] w-full max-w-[220px] rounded-2xl bg-black"
                  aria-label="Oluşturulan Instagram Reels videosunu izle"
                />
                <a
                  href={lastVideo.videoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 font-black text-slate-950"
                >
                  <Download size={18} /> Videoyu aç / indir
                </a>
              </div>
            )
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black">Video üretim geçmişi</h3>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{' '}
            Yenile
          </button>
        </div>
        {manualRuns.length === 0 ? (
          <p className="text-sm text-slate-400">
            Henüz manuel GitHub Reels üretimi başlatılmadı. Üstteki yeşil butonla
            anında cihazda müzikli Reels üretebilirsiniz.
          </p>
        ) : (
          <div className="space-y-2">
            {manualRuns.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm"
              >
                <div>
                  <p className="font-bold">
                    Reels #{run.id}{' '}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {statusText(run)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {run.createdAt
                      ? new Date(run.createdAt).toLocaleString('tr-TR', {
                          timeZone: 'Europe/Istanbul',
                        })
                      : 'Tarih bilinmiyor'}
                  </p>
                </div>
                <div className="flex gap-3 text-xs font-semibold">
                  <a
                    href={run.runUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 underline underline-offset-2"
                  >
                    GitHub durumu
                  </a>
                  {run.videoUrl && (
                    <a
                      href={run.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 underline underline-offset-2"
                    >
                      MP4 aç
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400">
          <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
          Her soru bağımsız çözüm ve kalite denetiminden geçer. Yalnızca
          yöneticiler video üretebilir. Instagram'da paylaşma yetkileri ayrı
          tutulur.
        </p>
      </div>
    </section>
  );
}
