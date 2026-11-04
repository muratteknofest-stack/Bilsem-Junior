import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
import {
  Calendar,
  Check,
  Clapperboard,
  Copy,
  Download,
  ExternalLink,
  Film,
  Music,
  Palette,
  PlayCircle,
  RefreshCw,
  Send,
  Share2,
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

type LocalGeneratedEntry = {
  id: string;
  createdAt: string;
  topic: string;
  grade: number;
  extension: string;
  caption: string;
};

type ReelsStatus = {
  configured: boolean;
  runs: ReelRun[];
  schedule: string;
  timezone: string;
  notice?: string;
};

type MonthlyCalendarDay = {
  dayNumber: number;
  dateStr: string;
  grade: 1 | 2 | 3 | 4;
  difficulty: 1 | 2 | 3;
  mechanic: Exclude<Mechanic, 'auto'>;
  mechanicTitle: string;
  themeId: ReelThemeId;
  musicTrack: MusicTrackId;
};

const topics: Array<{ id: Mechanic; title: string; note: string }> = [
  {
    id: 'auto',
    title: 'Otomatik Karışık Konu & Soru Tarzı',
    note: 'Her videoda farklı konu ve soru tarzı otomatik seçilir',
  },
  { id: 'analogy-grid', title: 'Görsel analoji', note: 'Aynı değişimi uygula' },
  { id: 'paired-analogy', title: 'Şekil ilişkileri', note: 'İlişki ve benzetim' },
  { id: 'matrix-attributes', title: 'Raven / matris', note: 'Satır ve sütun muhakemesi' },
  { id: 'feature-classification', title: 'Farklı / ortak özellik', note: 'Sınıflandırma' },
  { id: 'attribute-sequence', title: 'Örüntü', note: 'Şekil dizileri' },
  { id: 'interleaved-sequence', title: 'Karma örüntü', note: 'İç içe diziler' },
];

const SPECIFIC_MECHANICS: Array<Exclude<Mechanic, 'auto'>> = [
  'analogy-grid',
  'paired-analogy',
  'matrix-attributes',
  'feature-classification',
  'attribute-sequence',
  'interleaved-sequence',
];

const ALL_THEMES: ReelThemeId[] = [
  'space_academy',
  'neon_quiz',
  'playful_pop',
  'classic_bilsem',
];

const AUTO_MUSIC_LIST: MusicTrackId[] = [
  'quiz_show',
  'playful_marimba',
  'lofi_focus',
  'cosmic_synth',
];

function buildInstagramCaption(grade: number, topicLabel: string): string {
  return `🦊 BİLSEM Junior Günün Zeka Sorusu! (${grade}. Sınıf • ${topicLabel})\n⏱️ Süre bitmeden soru işaretli yere hangi şeklin geleceğini bulabilir misin?\n👇 Cevabını yorumlara yaz (A, B, C veya D)! Bakalım kimler doğru bilecek? 🧠✨\n\n#bilsem #bilsemjunior #zekasorusu #ilkokul #${grade}sınıf #mantıksorusu #bilsemsınavı #çocukgelişimi #keşfet #reels`;
}

function build30DayMixedCalendar(seedOffset = 0): MonthlyCalendarDay[] {
  const today = new Date();
  const days: MonthlyCalendarDay[] = [];
  const grades: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  for (let i = 0; i < 30; i++) {
    const idx = i + seedOffset;
    const g = grades[(idx + Math.floor(idx / 3)) % grades.length];
    let diff: 1 | 2 | 3 = (((idx + Math.floor(idx / 2)) % 3) + 1) as 1 | 2 | 3;
    if (g === 1 && diff === 3) diff = 2;

    let mech = SPECIFIC_MECHANICS[(idx * 2 + Math.floor(idx / 3)) % SPECIFIC_MECHANICS.length];
    if (g === 1 && (mech === 'matrix-attributes' || mech === 'interleaved-sequence')) {
      mech = 'analogy-grid';
    }
    if (mech === 'interleaved-sequence' && diff < 2) {
      diff = 2;
    }

    const themeId = ALL_THEMES[(idx + Math.floor(idx / 2)) % ALL_THEMES.length];
    const musicTrack =
      AUTO_MUSIC_LIST[(idx + Math.floor(idx / 4)) % AUTO_MUSIC_LIST.length];

    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    days.push({
      dayNumber: i + 1,
      dateStr: `${yyyy}-${mm}-${dd}`,
      grade: g,
      difficulty: diff,
      mechanic: mech,
      mechanicTitle: topics.find((t) => t.id === mech)?.title || mech,
      themeId,
      musicTrack,
    });
  }
  return days;
}

const statusText = (run: ReelRun) => {
  if (run.status === 'completed')
    return run.conclusion === 'success'
      ? 'Video üretildi'
      : run.conclusion === 'failure'
      ? 'GitHub sunucu kotası dolu (Cihazda üretimi kullanın)'
      : 'Tamamlandı: ' + (run.conclusion || 'bilinmiyor');
  if (run.status === 'in_progress') return 'Video hazırlanıyor';
  return 'Üretim kuyruğunda';
};

export function AdminReelsStudio() {
  // 0 means "Otomatik Karışık" (Mixed Grade / Mixed Difficulty)
  const [gradeMode, setGradeMode] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [difficultyMode, setDifficultyMode] = useState<0 | 1 | 2 | 3>(0);
  const [mechanic, setMechanic] = useState<Mechanic>('auto');
  const [themeId, setThemeId] = useState<ReelThemeId>('space_academy');
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>('quiz_show');
  const [autoMixVisualAudio, setAutoMixVisualAudio] = useState(true);
  const [musicVolume, setMusicVolume] = useState(35);
  const [customAudioBuffer, setCustomAudioBuffer] = useState<AudioBuffer | null>(null);
  const [customMp3Name, setCustomMp3Name] = useState('');
  const [showMascot, setShowMascot] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [hideAnswerSpoiler, setHideAnswerSpoiler] = useState(true);
  const [calendarSeed, setCalendarSeed] = useState(0);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  const [autoPilotDaily, setAutoPilotDaily] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bilsem_reels_autopilot') !== 'false';
    } catch {
      return true;
    }
  });

  const [localHistory, setLocalHistory] = useState<LocalGeneratedEntry[]>(() => {
    try {
      const raw = localStorage.getItem('bilsem_reels_local_history');
      return raw ? (JSON.parse(raw) as LocalGeneratedEntry[]) : [];
    } catch {
      return [];
    }
  });

  const monthlyCalendar = useMemo(
    () => build30DayMixedCalendar(calendarSeed),
    [calendarSeed]
  );

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
    blob: Blob;
    extension: string;
    topic: string;
    grade: number;
  } | null>(null);

  const [captionText, setCaptionText] = useState<string>(() =>
    buildInstagramCaption(1, 'Görsel analoji')
  );
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showFailedGithubRuns, setShowFailedGithubRuns] = useState(false);

  const localVideoUrlRef = useRef<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mp3InputRef = useRef<HTMLInputElement | null>(null);
  const musicTestCtxRef = useRef<AudioContext | null>(null);
  const autoPilotTriggeredRef = useRef(false);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(
    () => () => {
      if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current);
      if (musicTestCtxRef.current) {
        musicTestCtxRef.current.close().catch(() => {});
      }
    },
    []
  );

  // Resolves concrete grade, difficulty, mechanic, theme & music when "Otomatik Karışık" is active
  const resolveMixedParams = useCallback(
    (overrideDay?: MonthlyCalendarDay) => {
      if (overrideDay) {
        return {
          grade: overrideDay.grade,
          difficulty: overrideDay.difficulty,
          mechanic: overrideDay.mechanic as Mechanic,
          themeId: overrideDay.themeId,
          musicTrack:
            musicTrack === 'custom_mp3' ? 'custom_mp3' : overrideDay.musicTrack,
        };
      }
      const grades: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
      const resolvedGrade: 1 | 2 | 3 | 4 =
        gradeMode === 0
          ? grades[Math.floor(Math.random() * grades.length)]
          : gradeMode;
      const maxDiff = resolvedGrade === 1 ? 2 : 3;
      const resolvedDifficulty =
        difficultyMode === 0
          ? Math.floor(Math.random() * maxDiff) + 1
          : Math.min(difficultyMode, maxDiff);

      let resolvedMechanic: Mechanic = mechanic;
      if (
        resolvedGrade === 1 &&
        (resolvedMechanic === 'matrix-attributes' ||
          resolvedMechanic === 'interleaved-sequence')
      ) {
        resolvedMechanic = 'auto';
      }
      if (resolvedMechanic === 'interleaved-sequence' && resolvedDifficulty < 2) {
        resolvedMechanic = 'auto';
      }

      const resolvedTheme: ReelThemeId = autoMixVisualAudio
        ? ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)]
        : themeId;
      const resolvedMusic: MusicTrackId =
        musicTrack === 'custom_mp3'
          ? 'custom_mp3'
          : autoMixVisualAudio
          ? AUTO_MUSIC_LIST[Math.floor(Math.random() * AUTO_MUSIC_LIST.length)]
          : musicTrack;

      return {
        grade: resolvedGrade,
        difficulty: resolvedDifficulty,
        mechanic: resolvedMechanic,
        themeId: resolvedTheme,
        musicTrack: resolvedMusic,
      };
    },
    [gradeMode, difficultyMode, mechanic, autoMixVisualAudio, themeId, musicTrack]
  );

  // Generate a live verified preview question
  const refreshPreviewQuestion = useCallback(
    async (overrideDay?: MonthlyCalendarDay) => {
      try {
        const params = resolveMixedParams(overrideDay);
        if (overrideDay || autoMixVisualAudio) {
          setThemeId(params.themeId);
          if (musicTrack !== 'custom_mp3') {
            setMusicTrack(params.musicTrack);
          }
        }
        const q = await selectLocalReelQuestion({
          grade: params.grade,
          difficulty: params.difficulty,
          mechanic: params.mechanic,
        });
        setPreviewQuestion(q);
      } catch {
        try {
          const q = await selectLocalReelQuestion({
            grade: 2,
            difficulty: 2,
            mechanic: 'auto',
          });
          setPreviewQuestion(q);
        } catch {}
      }
    },
    [resolveMixedParams, autoMixVisualAudio, musicTrack]
  );

  useEffect(() => {
    void refreshPreviewQuestion();
  }, [gradeMode, difficultyMode, mechanic]);

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

  const eligibleTopic = (id: Mechanic) => {
    if (
      gradeMode === 1 &&
      (id === 'matrix-attributes' || id === 'interleaved-sequence')
    )
      return false;
    if (id === 'interleaved-sequence' && difficultyMode === 1) return false;
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

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedCaption(true);
      setNotice('Instagram açıklama metni ve hashtagler panoya kopyalandı!');
      window.setTimeout(() => setCopiedCaption(false), 3000);
    } catch {
      setError('Panoya kopyalanamadı. Metin kutusundan seçip kopyalayabilirsiniz.');
    }
  };

  const handleDownloadAndCopy = async () => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 3000);
    } catch {}
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    }
    setNotice(
      '1) MP4 video cihazınıza indirildi ve 2) Instagram açıklama metni kopyalandı! Şimdi Instagram Reels yükleme ekranına yapıştırabilirsiniz.'
    );
  };

  const handleManualShareToInstagram = async () => {
    if (!localVideo) return;
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 3000);
    } catch {}

    const fileName = `bilsem-junior-reels-${Date.now()}.${localVideo.extension}`;
    const mimeType =
      localVideo.extension === 'mp4' ? 'video/mp4' : 'video/webm';
    const file = new File([localVideo.blob], fileName, { type: mimeType });

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    ) {
      try {
        await navigator.share({
          title: `BİLSEM Junior — ${localVideo.topic}`,
          text: captionText,
          files: [file],
        });
        setNotice(
          'Paylaşım menüsü açıldı! Instagram Reels seçip kopyalanan açıklamayı yapıştırabilirsiniz.'
        );
        return;
      } catch {
        // User cancelled or share failed; fallback below
      }
    }

    // Desktop / fallback: trigger download + copy caption + open Instagram
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    }
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setNotice(
      'Video indirildi, açıklama metni panoya kopyalandı ve Instagram açıldı! Instagramda (+) Oluştur > Reels kısmından indirilen MP4 videoyu seçip açıklamayı yapıştırın (Ctrl+V).'
    );
  };

  async function generate() {
    if (busy || !status?.configured) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const params = resolveMixedParams();
      const response = await authenticatedFetch('/api/admin/reels/generate', {
        method: 'POST',
        body: JSON.stringify({
          grade: params.grade,
          difficulty: params.difficulty,
          mechanic: params.mechanic,
        }),
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

  async function generateOnDevice(overrideDay?: MonthlyCalendarDay) {
    if (localBusy || busy) return;
    setLocalBusy(true);
    setError('');
    const params = resolveMixedParams(overrideDay);
    if (overrideDay || autoMixVisualAudio) {
      setThemeId(params.themeId);
      if (musicTrack !== 'custom_mp3') {
        setMusicTrack(params.musicTrack);
      }
    }
    setNotice(
      `Karışık mod (${params.grade}. Sınıf • Seviye ${params.difficulty} • ${REEL_THEME_SPECS[params.themeId].name}) ile 9:16 müzikli Reels videosu hazırlanıyor...`
    );
    setLocalProgress(0);
    try {
      const targetQuestion = overrideDay
        ? await selectLocalReelQuestion({
            grade: params.grade,
            difficulty: params.difficulty,
            mechanic: params.mechanic,
          })
        : previewQuestion || undefined;
      if (targetQuestion) setPreviewQuestion(targetQuestion);

      const result = await createBrowserReel(
        {
          grade: params.grade,
          difficulty: params.difficulty,
          mechanic: params.mechanic,
          themeId: params.themeId,
          musicTrack: params.musicTrack,
          musicVolume,
          customAudioBuffer,
          showMascot,
          showSubtitles,
          hideAnswerSpoiler,
        },
        setLocalProgress,
        targetQuestion
      );
      const url = URL.createObjectURL(result.blob);
      if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current);
      localVideoUrlRef.current = url;

      const generatedCaption = buildInstagramCaption(params.grade, result.topic);
      setCaptionText(generatedCaption);

      setLocalVideo({
        url,
        blob: result.blob,
        extension: result.extension,
        topic: `${params.grade}. Sınıf • ${result.topic}`,
        grade: params.grade,
      });

      const entry: LocalGeneratedEntry = {
        id: String(Date.now()).slice(-8),
        createdAt: new Date().toISOString(),
        topic: `${params.grade}. Sınıf • ${result.topic}`,
        grade: params.grade,
        extension: result.extension,
        caption: generatedCaption,
      };
      setLocalHistory((prev) => {
        const next = [entry, ...prev].slice(0, 12);
        try {
          localStorage.setItem('bilsem_reels_local_history', JSON.stringify(next));
        } catch {}
        return next;
      });

      setNotice(
        result.extension === 'mp4'
          ? 'Müzikli ve animasyonlu 9:16 Reels videosu oluşturuldu! Sağdaki "Manuel Yayınla & Paylaş" kutusundan tek tıkla Instagram\'da paylaşabilirsin.'
          : 'Müzikli ve animasyonlu 9:16 Reels videosu oluşturuldu! Sağdaki kutudan indirebilir veya paylaşabilirsin.'
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

  // Automatic Daily Reel Preparation on Admin Panel open using today's 30-day calendar slot
  useEffect(() => {
    if (!autoPilotDaily || autoPilotTriggeredRef.current || localVideo || localBusy)
      return;
    const todayKey = new Date().toISOString().slice(0, 10);
    try {
      const lastDate = localStorage.getItem('bilsem_reels_last_auto_date');
      if (lastDate !== todayKey && previewQuestion) {
        autoPilotTriggeredRef.current = true;
        localStorage.setItem('bilsem_reels_last_auto_date', todayKey);
        const todaySlot = monthlyCalendar[0];
        void generateOnDevice(todaySlot);
      }
    } catch {
      // ignore storage errors
    }
  }, [autoPilotDaily, previewQuestion, localVideo, localBusy, monthlyCalendar]);

  const manualRuns = (status?.runs || []).filter((run) => run.manual);
  const visibleGithubRuns = showFailedGithubRuns
    ? manualRuns
    : manualRuns.filter((run) => run.conclusion === 'success');
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
                <Clapperboard size={16} /> BİLSEM JUNIOR / 30 GÜNLÜK OTOMATİK REELS STÜDYOSU
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
            <span>Otomatik Karışık Günlük Reels Hazırlama Aktif</span>
          </label>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">
          Karışık sınıf düzeyinde (1–4. Sınıf), karışık konularda ve karışık soru
          tarzlarında 1080 × 1920 dikey Reels videolarını BİLSEM Junior Tilki
          maskotu ve telifsiz yarışma müzikleriyle otomatik hazırlar.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1.5">
            1 Aylık (30 Günlük) Otomatik Takvim
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200">
            Karışık Sınıf (1-4. Sınıf) & Karışık Konu
          </span>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-amber-200">
            Tek Tıkla Manuel Instagram Paylaşım & Açıklama Kopyalama
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.95fr)]">
        {/* Left Controls */}
        <div className="space-y-5 rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <WandSparkles size={22} className="text-amber-300" /> Otomatik
              Karışık Reels & Müzik Ayarları
            </h3>
            <button
              type="button"
              onClick={() => void refreshPreviewQuestion()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-500/30"
            >
              <Sparkles size={14} /> Karışık Yeni Soru Getir
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-200">
              Sınıf düzeyi
              <select
                value={gradeMode}
                onChange={(e) =>
                  setGradeMode(Number(e.target.value) as 0 | 1 | 2 | 3 | 4)
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white"
              >
                <option value={0}>Otomatik Karışık (1–4. Sınıf)</option>
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
                value={difficultyMode}
                onChange={(e) =>
                  setDifficultyMode(Number(e.target.value) as 0 | 1 | 2 | 3)
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white"
              >
                <option value={0}>Otomatik Karışık (Kolay / Orta / Zor)</option>
                <option value={1}>Kolay</option>
                <option value={2}>Orta</option>
                {gradeMode !== 1 && <option value={3}>Zor</option>}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-200 sm:col-span-2">
              Konu ve Soru Tarzı
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
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Palette size={15} /> Sahne ve Arka Plan Teması
              </p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <input
                  type="checkbox"
                  checked={autoMixVisualAudio}
                  onChange={(e) => setAutoMixVisualAudio(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-400"
                />
                <span>Tema ve Müziği Her Videoda Otomatik Karıştır</span>
              </label>
            </div>
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

        {/* Right Column: Live 9:16 Stage & Manual Instagram Publishing Card */}
        <div className="space-y-5 rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
          <h3 className="flex items-center justify-between gap-2 text-lg font-black">
            <span className="flex items-center gap-2">
              <Film size={20} className="text-cyan-300" /> Canlı 9:16 Sahne &
              Manuel Yayınlama
            </span>
            <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-200">
              {previewQuestion
                ? `${previewQuestion.grade}. Sınıf • Seviye ${previewQuestion.difficulty}`
                : '1080 × 1920'}
            </span>
          </h3>

          {/* Live 60 FPS Interactive Canvas Preview */}
          <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-xl">
            <canvas
              ref={previewCanvasRef}
              width={1080}
              height={1920}
              className="aspect-[9/16] w-full object-contain"
            />
          </div>

          {localVideo ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-emerald-300">
                  ✅ Hazır Video: {localVideo.topic} •{' '}
                  {localVideo.extension.toUpperCase()}
                </p>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                  Yayınlamaya Hazır
                </span>
              </div>

              <video
                key={localVideo.url}
                src={localVideo.url}
                controls
                playsInline
                preload="metadata"
                className="mx-auto max-h-[300px] w-full max-w-[190px] rounded-2xl bg-black shadow-lg"
                aria-label="Cihazda oluşturulan Instagram Reels videosunu izle"
              />

              {/* Ready-to-copy Instagram Caption & Hashtags */}
              <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/90 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    Instagram Reels Açıklama Metni & Hashtagler
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyCaption()}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                  >
                    {copiedCaption ? <Check size={13} /> : <Copy size={13} />}
                    {copiedCaption ? 'Kopyalandı!' : 'Metni Kopyala'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs leading-relaxed text-slate-200"
                />
              </div>

              {/* Manual Publishing Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => void handleManualShareToInstagram()}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-lg hover:brightness-110"
                >
                  <Share2 size={18} /> Şimdi Instagram'da Manuel Yayınla (Paylaş)
                </button>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a
                    ref={downloadLinkRef}
                    href={localVideo.url}
                    download={
                      'bilsem-junior-reels-' +
                      Date.now() +
                      '.' +
                      localVideo.extension
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 hover:brightness-110"
                  >
                    <Download size={16} /> Videoyu indir (
                    {localVideo.extension.toUpperCase()})
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleDownloadAndCopy()}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-3 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30"
                  >
                    <Copy size={15} /> İndir + Açıklamayı Kopyala
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-5 text-slate-300">
                  <p className="font-bold text-cyan-300">
                    📌 Manuel Nasıl Yayınlanır? (3 Saniyelik Adım):
                  </p>
                  <ol className="mt-1 list-inside list-decimal space-y-0.5">
                    <li>
                      Üstteki pembe{' '}
                      <strong className="text-white">
                        "Şimdi Instagram'da Manuel Yayınla"
                      </strong>{' '}
                      butonuna basın (Video otomatik iner ve açıklama metni
                      kopyalanır).
                    </li>
                    <li>
                      Instagram'da <strong className="text-white">(+) Oluştur → Reels</strong>{' '}
                      bölümünden indirilen MP4 videoyu seçin.
                    </li>
                    <li>
                      Açıklama alanına basılı tutup{' '}
                      <strong className="text-white">Yapıştır (Ctrl+V)</strong>{' '}
                      deyin ve paylaşın!
                    </li>
                  </ol>
                </div>
              </div>
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

      {/* 1-MONTH (30-DAY) AUTOMATIC MIXED REELS CALENDAR */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black">
              <Calendar size={20} className="text-amber-300" /> 1 Aylık (30
              Günlük) Otomatik Karışık Reels Takvimi
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              30 gün boyunca her gün farklı sınıf düzeyi (1–4. Sınıf), farklı
              konu, farklı soru tarzı, farklı sahne teması ve müzik otomatik
              dağıtılır. İstediğiniz günün yanındaki &quot;Hazırla &amp; Yayınla&quot;
              butonuyla o günün videosunu anında üretip paylaşabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCalendarSeed((s) => s + 7)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 text-xs font-bold text-indigo-100 hover:bg-indigo-500/30"
          >
            <RefreshCw size={15} /> 30 Günlük Karışık Takvimi Yenile
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-800">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-950 text-slate-300">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-3">Gün</th>
                <th className="px-3 py-3">Tarih</th>
                <th className="px-3 py-3">Sınıf & Zorluk</th>
                <th className="px-3 py-3">Konu & Soru Tarzı</th>
                <th className="px-3 py-3">Tema & Müzik</th>
                <th className="px-3 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {monthlyCalendar.map((day) => {
                const isSelected = selectedDayNum === day.dayNumber;
                return (
                  <tr
                    key={day.dayNumber}
                    className={
                      isSelected ? 'bg-indigo-950/60' : 'hover:bg-slate-950/40'
                    }
                  >
                    <td className="px-3 py-2.5 font-black text-cyan-300">
                      {day.dayNumber}. Gün
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-300">
                      {day.dateStr} • 19:00
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-white">
                      {day.grade}. Sınıf •{' '}
                      {day.difficulty === 1
                        ? 'Kolay'
                        : day.difficulty === 2
                        ? 'Orta'
                        : 'Zor'}
                    </td>
                    <td className="px-3 py-2.5 text-indigo-200">
                      {day.mechanicTitle}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {REEL_THEME_SPECS[day.themeId].name} •{' '}
                      {MUSIC_TRACK_SPECS[day.musicTrack].name}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayNum(day.dayNumber);
                            void refreshPreviewQuestion(day);
                          }}
                          className="rounded-lg border border-slate-600 px-2.5 py-1 font-bold text-slate-200 hover:bg-slate-800"
                        >
                          Önizle
                        </button>
                        <button
                          type="button"
                          disabled={localBusy || busy}
                          onClick={() => {
                            setSelectedDayNum(day.dayNumber);
                            void generateOnDevice(day);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 px-2.5 py-1 font-black text-slate-950 hover:brightness-110 disabled:opacity-50"
                        >
                          <Send size={12} /> Hazırla & Yayınla
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIDEO GENERATION HISTORY (Device + GitHub) */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Video üretim geçmişi</h3>
            <p className="text-xs text-slate-400">
              Cihazda üretilen hazır videolarınız ve sunucu kayıtları
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {manualRuns.some((r) => r.conclusion === 'failure') && (
              <button
                type="button"
                onClick={() => setShowFailedGithubRuns((v) => !v)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                {showFailedGithubRuns
                  ? 'Eski Başarısız Sunucu Kayıtlarını Gizle'
                  : 'Eski Sunucu Kayıtlarını Göster'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || busy}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-600 px-4 text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{' '}
              Yenile
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {localHistory.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm"
            >
              <div>
                <p className="font-bold text-emerald-200">
                  ✅ Reels #{item.id} — {item.topic} ({item.extension.toUpperCase()})
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Cihazda Üretildi • Yayınlamaya Hazır
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString('tr-TR', {
                    timeZone: 'Europe/Istanbul',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCaptionText(item.caption);
                    void navigator.clipboard.writeText(item.caption);
                    setNotice('Açıklama metni panoya kopyalandı!');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-amber-200 hover:bg-amber-500/30"
                >
                  <Copy size={13} /> Açıklamayı Kopyala
                </button>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-pink-600 px-3 py-1.5 text-white hover:bg-pink-500"
                >
                  <ExternalLink size={13} /> Instagram'ı Aç
                </a>
              </div>
            </div>
          ))}

          {visibleGithubRuns.slice(0, 8).map((run) => (
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

          {localHistory.length === 0 && visibleGithubRuns.length === 0 && (
            <p className="text-sm text-slate-400">
              Üstteki &quot;Şimdi Video Oluştur (Cihazda)&quot; butonuna veya 30
              günlük takvimdeki &quot;Hazırla &amp; Yayınla&quot; butonuna basarak
              videonuzu saniyeler içinde oluşturup manuel yayınlayabilirsiniz.
            </p>
          )}
        </div>

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
