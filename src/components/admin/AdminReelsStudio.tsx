import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
import { Clapperboard, Download, Film, PlayCircle, RefreshCw, ShieldCheck, WandSparkles } from 'lucide-react';

type Mechanic = 'auto' | 'analogy-grid' | 'paired-analogy' | 'matrix-attributes' |
  'feature-classification' | 'attribute-sequence' | 'interleaved-sequence';
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
  {id: 'auto', title: 'Karışık sorular', note: 'Her videoda farklı soru türü'},
  {id: 'analogy-grid', title: 'Görsel analoji', note: 'Aynı değişimi uygula'},
  {id: 'paired-analogy', title: 'Şekil ilişkileri', note: 'İlişki ve benzetim'},
  {id: 'matrix-attributes', title: 'Raven / matris', note: 'Satır ve sütun muhakemesi'},
  {id: 'feature-classification', title: 'Farklı / ortak özellik', note: 'Sınıflandırma'},
  {id: 'attribute-sequence', title: 'Örüntü', note: 'Şekil dizileri'},
  {id: 'interleaved-sequence', title: 'Karma örüntü', note: 'İç içe diziler'},
];

const statusText = (run: ReelRun) => {
  if (run.status === 'completed') return run.conclusion === 'success' ? 'Video üretildi' : run.conclusion === 'failure' ? 'Üretim başarısız' : 'Tamamlandı: ' + (run.conclusion || 'bilinmiyor');
  if (run.status === 'in_progress') return 'Video hazırlanıyor';
  return 'Üretim kuyruğunda';
};

export function AdminReelsStudio() {
  const [grade, setGrade] = useState<1 | 2 | 3 | 4>(2);
  const [difficulty, setDifficulty] = useState(2);
  const [mechanic, setMechanic] = useState<Mechanic>('auto');
  const [status, setStatus] = useState<ReelsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localVideo, setLocalVideo] = useState<{ url: string; extension: string; topic: string } | null>(null);
  const localVideoUrlRef = useRef<string | null>(null);

  useEffect(() => () => { if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/reels');
      const payload: ReelsStatus & { error?: string } = await response.json();
      if (!response.ok) throw Error(payload.error || 'Video kayıtları okunamadı.');
      setStatus(payload);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Video kayıtları okunamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const gradeChanged = (next: 1 | 2 | 3 | 4) => {
    setGrade(next);
    if (next === 1) {
      setDifficulty(current => Math.min(current, 2));
      if (mechanic === 'matrix-attributes' || mechanic === 'interleaved-sequence') setMechanic('auto');
    }
  };

  const eligibleTopic = (id: Mechanic) => {
    if (grade === 1 && (id === 'matrix-attributes' || id === 'interleaved-sequence')) return false;
    if (id === 'interleaved-sequence' && difficulty < 2) return false;
    return true;
  };

  async function generate() {
    if (busy || !status?.configured) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch('/api/admin/reels/generate', {
        method: 'POST',
        body: JSON.stringify({ grade, difficulty, mechanic }),
      });
      const payload: { error?: string; message?: string } = await response.json();
      if (!response.ok) throw Error(payload.error || 'Video üretimi başlatılamadı.');
      setNotice(payload.message || 'Video üretimi sıraya alındı.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Video üretimi başlatılamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function generateOnDevice() {
    if (localBusy || busy) return;
    setLocalBusy(true);
    setError('');
    setNotice('Cihazda orijinal soru doğrulanıyor ve video hazırlanıyor. Bu sayfayı kapatmayın.');
    setLocalProgress(0);
    try {
      const { createBrowserReel } = await import('../../features/reels/browser-reel');
      const result = await createBrowserReel({ grade, difficulty, mechanic }, setLocalProgress);
      const url = URL.createObjectURL(result.blob);
      if (localVideoUrlRef.current) URL.revokeObjectURL(localVideoUrlRef.current);
      localVideoUrlRef.current = url;
      setLocalVideo({ url, extension: result.extension, topic: result.topic });
      setNotice(result.extension === 'mp4'
        ? 'Video oluşturuldu! Önizleyebilir veya MP4 indirebilirsin. Instagram paylaşımı yapılmadı.'
        : 'Video oluşturuldu! Tarayıcın MP4 yerine WebM destekliyor. WebM olarak indirilebilir; Instagram için MP4’e dönüştürülmesi gerekir.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cihazda video üretilemedi. Güncel Chrome deneyin.');
      setNotice('');
    } finally {
      setLocalBusy(false);
    }
  }

  const manualRuns = (status?.runs || []).filter(run => run.manual);
  const lastVideo = manualRuns.find(run => !!run.videoUrl);

  return <section className="space-y-6" aria-labelledby="admin-reels-title">
    <div className="overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-900 via-slate-900 to-fuchsia-950 p-5 sm:p-7">
      <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-cyan-300">
        <Clapperboard size={16} /> BİLSEM JUNIOR / İÇERİK STÜDYOSU
      </p>
      <h2 id="admin-reels-title" className="text-2xl font-black sm:text-3xl">Instagram Reels Stüdyosu</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
        Kendi BİLSEM tarzı soru videonu tek tuşla hazırla. 1080 × 1920 dikey MP4, dört seçenek, geri sayım, cevap açıklaması ve ses efektleri.
        Bu işlem <strong>Instagram'a gönderi yayınlamaz</strong>; videoyu önce izle ve indir.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-2">Günlük otomasyon: 19.00 Türkiye</span>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-cyan-200">Manuel üretim: istediğin zaman</span>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">Yalnızca yönetici</span>
      </div>
    </div>

    {error && <p role="alert" className="rounded-2xl border border-rose-700 bg-rose-950/70 p-4 text-sm text-rose-100">{error}</p>}
    {notice && <p role="status" className="rounded-2xl border border-emerald-600 bg-emerald-950/70 p-4 text-sm text-emerald-100">{notice}</p>}
    {status && !status.configured && <p role="status" className="rounded-2xl border border-amber-500/50 bg-amber-900/20 p-4 text-sm text-amber-100">
      <strong>Video üretim bağlantısı henüz etkinleştirilmedi.</strong> Vercel sunucu ayarına <code>GITHUB_REELS_TOKEN</code> eklenmeli.
      Anahtarı hiçbir zaman bu sayfaya veya sohbete yazma. Bu sırada GitHub Actions ekranından manuel önizleme üretebilirsin.
    </p>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(290px,.8fr)]">
      <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-black"><WandSparkles size={22} className="text-amber-300"/> Yeni Reels videosu oluştur</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-200">Sınıf düzeyi
            <select value={grade} onChange={e => gradeChanged(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white">
              {[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}. sınıf</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Zorluk
            <select value={difficulty} onChange={e => {const v=Number(e.target.value);setDifficulty(v);if(v<2 && mechanic==='interleaved-sequence')setMechanic('auto');}}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white">
              <option value={1}>Kolay</option>
              <option value={2}>Orta</option>
              {grade !== 1 && <option value={3}>Zor</option>}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200 sm:col-span-2">Soru türü
            <select value={mechanic} onChange={e=>setMechanic(e.target.value as Mechanic)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-white">
              {topics.filter(t => eligibleTopic(t.id)).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <span className="mt-2 block text-xs font-normal text-slate-400">{topics.find(t=>t.id===mechanic)?.note}</span>
          </label>
        </div>
        <button type="button" disabled={localBusy || busy} onClick={() => void generateOnDevice()}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-800/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          <Clapperboard size={22}/> {localBusy ? 'Cihazında video hazırlanıyor… %' + localProgress : 'Şimdi Video Oluştur (Cihazda)'}
        </button>
        {localBusy && <div role="progressbar" aria-valuenow={localProgress} aria-valuemin={0} aria-valuemax={100}
          aria-label="Video oluşturma ilerlemesi" className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
          <div style={{width: localProgress + '%'}} className="h-full bg-cyan-400 transition-all duration-500"/>
        </div>}
        <p className="mt-2 text-xs text-slate-400">Bu seçenek GitHub sunucusu çalışmasa da video hazırlar. Yaklaşık 19 saniyelik gerçek video kaydı için sayfayı açık tutmalısın. MP4 desteği tarayıcına bağlıdır; desteklenmeyen cihazlarda WebM oluşturulur.</p>
        <button type="button" disabled={busy || localBusy || loading || !status?.configured} onClick={() => void generate()}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-500 px-5 py-3 font-black text-white shadow-lg shadow-fuchsia-800/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          <PlayCircle size={21}/> {busy ? 'Üretim isteği gönderiliyor…' : 'Alternatif: GitHub sunucusunda üret'}
        </button>
        <a href="https://github.com/muratteknofest-stack/Bilsem-Junior/actions/workflows/bilsem-junior-reels.yml"
          target="_blank" rel="noopener noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-slate-600 px-4 text-sm font-bold text-indigo-200 hover:bg-slate-800">
          Alternatif: GitHub Actions'ta manuel video oluştur
        </a>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          GitHub üzerinden üretim, GitHub Actions çalıştırıcısına bağlıdır. Son denemelerde işler çalıştırıcı başlamadan başarısız oldu. Üstteki cihazda üretim seçeneği bu soruna bağımlı değildir. Günlük 19.00 yayını bu işlemden etkilenmez.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-black"><Film size={20} className="text-cyan-300"/> Son oluşturulan video</h3>
        {localVideo ? <div className="mt-4 space-y-3">
          <p className="text-center text-sm font-bold text-cyan-200">{localVideo.topic} • {localVideo.extension.toUpperCase()}</p>
          <video key={localVideo.url} src={localVideo.url} controls playsInline preload="metadata"
            className="mx-auto max-h-[430px] w-full max-w-[244px] rounded-2xl bg-black"
            aria-label="Cihazda oluşturulan Instagram Reels videosunu izle"/>
          <a href={localVideo.url} download={'bilsem-junior-reels-' + Date.now() + '.' + localVideo.extension}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 font-black text-slate-950">
            <Download size={18}/> Videoyu indir ({localVideo.extension.toUpperCase()})
          </a>
          <p className="text-xs text-slate-400">Video bu tarayıcıda oluşturuldu. Sayfa yenilenirse bağlantı kaybolur; önce indir. Instagram otomatik paylaşımı yapılmadı.</p>
        </div> : lastVideo?.videoUrl ? <div className="mt-4 space-y-3">
          <video key={lastVideo.id} src={lastVideo.videoUrl} controls playsInline preload="metadata"
            className="mx-auto max-h-[430px] w-full max-w-[244px] rounded-2xl bg-black"
            aria-label="Oluşturulan Instagram Reels videosunu izle"/>
          <a href={lastVideo.videoUrl} target="_blank" rel="noreferrer noopener"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 font-black text-slate-950">
            <Download size={18}/> Videoyu aç / indir
          </a>
        </div> : <div className="mt-5 flex min-h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-600 bg-slate-950/60 px-4 text-center">
          <Clapperboard size={44} className="text-slate-500" aria-hidden="true"/>
          <p className="font-semibold text-slate-200">Henüz indirilebilir video yok</p>
          <p className="text-xs leading-5 text-slate-400">Üretim tamamlandığında video burada görünecek. GitHub'daki işlem kayıtları ayrıca aşağıdaki listede yer alır.</p>
        </div>}
      </div>
    </div>

    <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black">Video üretim geçmişi</h3>
        <button type="button" onClick={()=>void load()} disabled={loading || busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Yenile
        </button>
      </div>
      {manualRuns.length === 0 ? <p className="text-sm text-slate-400">Henüz manuel Reels üretimi başlatılmadı veya GitHub bağlantısı etkin değil.</p>
        : <div className="space-y-2">{manualRuns.slice(0, 8).map(run => <div key={run.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm">
          <div>
            <p className="font-bold">Reels #{run.id} <span className="ml-2 text-xs font-normal text-slate-400">{statusText(run)}</span></p>
            <p className="mt-1 text-xs text-slate-400">{run.createdAt ? new Date(run.createdAt).toLocaleString('tr-TR', {timeZone:'Europe/Istanbul'}) : 'Tarih bilinmiyor'}</p>
          </div>
          <div className="flex gap-3 text-xs font-semibold">
            <a href={run.runUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-indigo-300">GitHub durumu</a>
            {run.videoUrl && <a href={run.videoUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-emerald-300">MP4 aç</a>}
          </div>
        </div>)}</div>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400">
        <ShieldCheck size={16} className="shrink-0 text-emerald-400"/>
        Her soru bağımsız çözüm ve kalite denetiminden geçer. Yalnızca yöneticiler video üretebilir.
        Instagram'da paylaşma yetkileri ayrı tutulur.
      </p>
    </div>
  </section>;
}
