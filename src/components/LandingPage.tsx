import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Shapes, Brain, ScanEye, Trophy, Check, ChevronDown, ChevronUp, Move, Keyboard, ShieldCheck, Heart, Volume2, VolumeX, Target, Zap, Medal, GraduationCap, Rotate3D, Hash, Puzzle, Compass, Timer, MousePointer2, Smartphone, RotateCcw, Star, Sparkles } from 'lucide-react';
import type { QuestionType, UserRole } from '../types';
import { generateQuestionByType } from '../features/questions/generators';
import { evaluateResponse, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../lib/sound';
import confetti from 'canvas-confetti';
import { landingQuestionAnswered, useLandingQuestion } from '../lib/demo-access';
import { Logo } from './Logo';
import { LearningIsland } from './landing/LearningIsland';
import { LandingNav } from './landing/LandingNav';
import { PremiumButton } from './landing/PremiumUI';
import { GradeExplorer } from './landing/GradeExplorer';
import { createGradePreview, type PreviewGrade } from './landing/grade-preview';
import { SpotlightSurface } from './ui/SpotlightSurface';
import { Footer } from './Footer';
import { AppDownloadLinks } from './AppDownloadLinks';
import { useAppDownloads } from '../hooks/useAppDownloads';
import { isAndroidApp } from '../lib/native-app';
import './landing/landing.css';
import './landing/design-system.css';
import './landing/colorful-home.css';
import './landing/bilsem-junior.css';
import './landing/discovery-playground.css';
import { useRegistrationAvailability } from '../hooks/useRegistrationAvailability';
import './landing/interface-refinements.css';
import { BilsemGuide } from './landing/BilsemGuide';

interface LandingPageProps { demoOnly?: boolean; onCloseDemo?: () => void; onStartDemo?: (role: UserRole) => void; onNavigateToLogin: (role: UserRole) => void; onNavigate: (route: string) => void }
const worlds = [
  { type: 'visual_sequence' as QuestionType, title: 'Örüntü evreni', short: 'Örüntü', text: 'Parçalar arasındaki gizli bağı bul. Sıradaki adımı sen keşfet.', tag: 'Bağlantı kur', icon: Shapes, theme: 'purple', number: '01' },
  { type: 'logic_grid' as QuestionType, title: 'Mantık laboratuvarı', short: 'Mantık', text: 'İpuçlarını birleştir, parçaları sırala. Her soruya yeni bir açıdan bak.', tag: 'Adım adım düşün', icon: Brain, theme: 'mint', number: '02' },
  { type: 'shape_counting' as QuestionType, title: 'Dikkat istasyonu', short: 'Dikkat', text: 'Ayrıntıları yakala. Kalabalığın içinde aradığın şekli fark et.', tag: 'Odaklan ve bul', icon: ScanEye, theme: 'peach', number: '03' },
  { type: 'figure_rotation' as QuestionType, title: 'Şekil gezegeni', short: 'Uzamsal', text: 'Şekilleri zihninde döndür. Aynı parçayı yeni bir açıdan tanı.', tag: 'Döndür ve keşfet', icon: Rotate3D, theme: 'blue', number: '04' },
  { type: 'number_pattern' as QuestionType, title: 'Sayı macerası', short: 'Sayılar', text: 'Sayıların izini sür. Dizinin sakladığı kuralı ortaya çıkar.', tag: 'Kuralı yakala', icon: Hash, theme: 'yellow', number: '05' },
  { type: 'symbol_coding' as QuestionType, title: 'Şifre atölyesi', short: 'Şifreler', text: 'Her sembol bir ipucu. Eşleştir, çöz ve gizli kodu bul.', tag: 'İpuçlarını birleştir', icon: Puzzle, theme: 'pink', number: '06' },
];
const rewards = [
  { title: 'Günlük görevler', text: 'Küçük hedeflerle çalışma alışkanlığı kazan.', icon: Target, theme: 'mint' },
  { title: 'XP ve seviyeler', text: 'Doğru cevaplarla puan topla, yeni seviyelere ilerle.', icon: Zap, theme: 'purple' },
  { title: 'Rozet koleksiyonu', text: 'Çabanı, serilerini ve keşiflerini rozetlerle kutla.', icon: Medal, theme: 'peach' },
  { title: 'Kendi rekorun', text: 'Geçen haftaki kendinle yarış; gelişimini fark et.', icon: Trophy, theme: 'blue' },
];
function WorldArtwork({ theme }: { theme: string }) {
  let artwork: React.ReactNode;
  switch (theme) {
    case 'purple': artwork = <><span /><span /><span /><span /></>; break;
    case 'mint': artwork = <><span /><span /><span /></>; break;
    case 'peach': artwork = <><span /><span /><span /><span /><span /></>; break;
    case 'blue': artwork = <><span /><span /><span /><Rotate3D size={58} /></>; break;
    case 'yellow': artwork = <><span>2</span><span>4</span><span>?</span></>; break;
    case 'pink': artwork = <><span /><span /><span /><Puzzle size={62} /></>; break;
  }
  return <div className={`zp-world-art zp-art-${theme}`} aria-hidden="true">{artwork}</div>;
}
const faqs = [
  ['Hesap açmadan deneyebilir miyim?', 'Evet. Bu sayfada bir örnek soru çözebilirsin. Buradaki deneme puanları ve cevaplar hesabına kaydedilmez.'],
  ['Sorular nasıl çözülüyor?', 'Sorunun türüne göre sürükle-bırak, sıralama, eşleştirme veya sayısal cevap kullanabilirsin. İstersen klasik şık seçimine dönebilirsin. Kartları sürüklemek yerine önce karta, sonra hedefe dokunmak da mümkün.'],
  ['Veli olarak neler yapabilirim?', 'Veli girişi üzerinden çocuğunun çalışma ve gelişim bilgilerine ulaşabilirsin. Öğrenci ve veli için ayrı girişler bulunur.'],
  ['Hangi sınıflar için kullanabilirim?', 'Bilsem Junior’da 1, 2, 3 ve 4. sınıflara göre alıştırmalar bulunur. Resmî BİLSEM adaylık koşulları ilgili yılın MEB kılavuzunda belirlenir. Ana sayfada sınıf seçerek örnek soruyu inceleyebilirsin. Bu seçim, hesabındaki sınıf bilgisini değiştirmez.'],
  ['BİLSEM sınavının resmî uygulaması mı?', 'Hayır. Bilsem Junior bağımsız bir alıştırma platformudur; MEB veya BİLSEM ile kurumsal bağlantısı yoktur. Etkinlikler bir tanı ya da sınav başarısı garantisi sunmaz.'],
  ['Animasyonları kapatabilir miyim?', 'Evet. Üst menüdeki hareket düğmesiyle animasyonları durdurabilirsin. Cihazındaki hareketi azalt tercihi de otomatik olarak dikkate alınır.'],
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, onNavigate, demoOnly = false, onCloseDemo }) => {
  const registration = useRegistrationAvailability();
  const downloads = useAppDownloads();
  const registerLabel = registration === 'open' ? 'Veli hesabı oluştur' : 'Kayıt bilgilerini incele';
  const registrationNote = registration === 'open' ? 'Kaydı veli tamamlar; öğrenci ayrı giriş bilgileriyle devam eder.' : registration === 'closed' ? 'Yeni hesap oluşturma şu anda kapalı. Bir örnek soru deneyebilir, mevcut hesabınla giriş yapabilirsin.' : registration === 'loading' ? 'Kayıt durumu kontrol ediliyor… Örnek soru için hesap gerekmez.' : 'Kayıt durumu şu anda doğrulanamadı. Kayıt sayfasında yeniden kontrol edebilirsin.';
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const moving = !reducedMotion && !paused && pageVisible;
  const [soundActive, setSoundActive] = useState(sound.enabled);
  const [category, setCategory] = useState<QuestionType>('visual_sequence');
  const [question, setQuestion] = useState(() => generateQuestionByType('visual_sequence', 4829, 2));
  const [previewGrade, setPreviewGrade] = useState<PreviewGrade | null>(null);
  const [demoError, setDemoError] = useState('');
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [solved, setSolved] = useState(0);
  const [correct, setCorrect] = useState(0);
  const submitLock = useRef(false);
  const demoHeading = useRef<HTMLHeadingElement>(null);
  const result = evaluateResponse(question, response);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const reveal = { initial: moving ? { opacity: 0, y: 20 } : false as const, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.12 }, transition: { duration: moving ? 0.5 : 0 } };
  const nextQuestion = (type = category) => {
    try {
      const next = generateQuestionByType(type, question.seed + 131, previewGrade ?? 2);
      setCategory(type); setQuestion(next); setDemoError('');
      setResponse(null); setSubmitted(false); setShowExplanation(false); submitLock.current = false;
    } catch { setDemoError('Bu örnek şu anda hazırlanamadı. Başka bir keşif alanını deneyebilirsin.'); }
  };
  const goDemo = (type?: QuestionType) => {
    if (type) nextQuestion(type);
    demoHeading.current?.focus({ preventScroll: true });
    document.getElementById('kesfet')?.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' });
  };
  const tryGrade = (grade: PreviewGrade) => {
    try {
      const next = createGradePreview(grade);
      setQuestion(next); setCategory(next.type); setPreviewGrade(grade); setDemoError('');
      setResponse(null); setSubmitted(false); setShowExplanation(false); submitLock.current = false;
    } catch { setDemoError('Bu sınıfın örneği şu anda hazırlanamadı. Bir keşif alanı seçerek devam edebilirsin.'); }
    goDemo();
  };
  const retryQuestion = () => {
    setSubmitted(false);
    setShowExplanation(false);
    submitLock.current = false;
  };
  const submit = () => {
    if (submitLock.current || submitted) return;
    const checked = evaluateResponse(question, response);
    if (!checked.complete) return;
    useLandingQuestion();
    submitLock.current = true;
    setSubmitted(true);
    setSolved(n => n + 1);
    if (checked.correct) {
      setCorrect(n => n + 1);
      if (soundActive) sound.playSuccess();
      if (moving) {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      }
    } else if (soundActive) sound.playError();
  };
  const discovery = (
    <section id="kesfet" className="zp-demo-section" aria-labelledby="demo-title">
      <div className="zp-container zp-demo-grid">
        <motion.div {...reveal} className="zp-demo-intro">
          <p className="zp-kicker">İzlemek güzel, denemek daha güzel.</p>
          <h2 id="demo-title" tabIndex={-1} ref={demoHeading}>
            Bir küçük soru. <br /><span>Kocaman bir <br />“buldum!”</span>
          </h2>
          <p>Parçaları incele, kuralı keşfet, doğru cevaba dokun. Acele yok; burada öğrenmenin yolu merak etmekten geçiyor.</p>
          <div className="zp-demo-steps">
            <div><span><MousePointer2 size={19} /></span><p><strong>1 Dokunuşla Şıkkını Seç</strong>Görselleri incele, doğrudan doğru cevaba dokun.</p></div>
            <div><span><Compass size={19} /></span><p><strong>Çözüm Mantığını Gör</strong>Cevabından sonra adım adım açıklamayı keşfet.</p></div>
            <div><span><Sparkles size={19} /></span><p><strong>Farklı Alanları Dene</strong>Örüntü, mantık, dikkat ve şifre soruları çöz.</p></div>
          </div>
          <div className="zp-demo-progress">
            <span className="zp-progress-icon"><Trophy size={22} /></span>
            <p>
              <strong>{solved > 0 ? `${solved} soru çözdün, ${correct} doğru buldun.` : 'İlk denemen seni bekliyor.'}</strong>
              <small>Canlı soru motoru · Sınırsız örnek deneme</small>
            </p>
          </div>
        </motion.div>

        <motion.div {...reveal} className="zp-demo-card zp-ui-card bj-discovery">
          <div className="zp-demo-card-header">
            <span>
              <span className="bj-discovery-compass" aria-hidden="true"><Compass size={22} /></span>
              <span>
                Keşif Alanı
                <small>Canlı BİLSEM alıştırma motoru</small>
              </span>
            </span>
            <div className="flex items-center gap-2">
              {solved > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Star size={13} className="text-amber-500 fill-amber-400" /> {correct}/{solved} Doğru
                </span>
              )}
              <button
                type="button"
                className="zp-icon-button"
                aria-label={soundActive ? 'Sesi kapat' : 'Sesi aç'}
                aria-pressed={soundActive}
                onClick={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }}
              >
                {soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
            </div>
          </div>

          {demoError && <p role="alert" className="zp-demo-error">{demoError}</p>}

          <div className="bj-discovery-controls">
            <div className="bj-grade-pills" role="group" aria-label="Sınıf seçimi">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Sınıf:</span>
              {([1, 2, 3, 4] as PreviewGrade[]).map(g => (
                <button
                  type="button"
                  key={`grade-${g}`}
                  className={`bj-grade-pill ${previewGrade === g ? 'active' : ''}`}
                  onClick={() => { if (soundActive) sound.playClick(); tryGrade(g); }}
                >
                  {g}. Sınıf
                </button>
              ))}
            </div>

            <div className="zp-demo-tabs bj-category-ribbon" role="group" aria-label="Örnek soru alanı">
              {worlds.map(w => (
                <button
                  type="button"
                  key={w.type}
                  data-world={w.theme}
                  aria-pressed={category === w.type && previewGrade === null}
                  onClick={() => {
                    if (soundActive) sound.playClick();
                    setPreviewGrade(null);
                    nextQuestion(w.type);
                  }}
                >
                  <span className="bj-discovery-tab-icon"><w.icon size={15} aria-hidden="true" /></span>
                  <span>{w.short}</span>
                  {category === w.type && previewGrade === null && <Check size={12} className="bj-discovery-tab-check" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bj-discovery-workspace">
            <div className="bj-discovery-puzzle" key={`puzzle-${question.id}`}>
              <div className="bj-discovery-task-label">
                <span><ScanEye size={15} aria-hidden="true" /> İncele ve keşfet</span>
                <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {previewGrade ? `${previewGrade}. Sınıf Seviyesi` : `${worlds.find(w => w.type === category)?.short || 'Keşif'} Sorusu`}
                </span>
              </div>
              <h3 className="bj-question-prompt">{question.prompt}</h3>
              {question.secondaryPrompt && <p className="zp-question-secondary">{question.secondaryPrompt}</p>}
              <div className="bj-discovery-canvas-wrap">
                <QuestionRenderer question={question} />
              </div>
            </div>

            <div className="bj-discovery-answers">
              <div className="bj-discovery-answer-label">
                <span><MousePointer2 size={16} aria-hidden="true" /> Doğru şıkkı seç:</span>
                <small>{submitted ? (result.correct ? 'Harika seçim!' : 'Çözümü incele') : 'Dokun ve kontrol et'}</small>
              </div>

              <div className="bj-options-grid">
                {question.options.map(o => (
                  <OptionRenderer
                    key={o.id}
                    option={o}
                    question={question}
                    questionType={question.type}
                    isSelected={response?.mode === 'choice' && response.optionId === o.id}
                    onSelect={() => {
                      if (!submitted) {
                        if (soundActive) sound.playClick();
                        setResponse({ mode: 'choice', optionId: o.id });
                      }
                    }}
                    disabled={submitted}
                    showCorrect={submitted}
                    isCorrectOption={o.id === question.correctOptionId}
                  />
                ))}
              </div>

              <div className="bj-discovery-actions">
                {!submitted ? (
                  <PremiumButton
                    className="zp-full bj-discovery-submit"
                    disabled={!response || response.mode !== 'choice' || !response.optionId}
                    onClick={submit}
                  >
                    Cevabımı Kontrol Et <ArrowRight size={18} />
                  </PremiumButton>
                ) : (
                  <div className="bj-feedback-panel space-y-2.5 animate-in fade-in duration-200">
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${result.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <div className="flex items-center gap-2">
                        {result.correct ? (
                          <>
                            <span className="text-xl">🎉</span>
                            <div>
                              <strong className="block text-sm font-bold">Harika! İlk adım tamam!</strong>
                              <span className="text-xs text-emerald-700">Düşünme becerine 1 yıldız daha ekledin! ⭐</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">💡</span>
                            <div>
                              <strong className="block text-sm font-bold">Farklı bir ayrıntı var!</strong>
                              <span className="text-xs text-amber-700">Tekrar deneyebilir ya da çözümü inceleyebilirsin.</span>
                            </div>
                          </>
                        )}
                      </div>
                      {result.correct && (
                        <span className="shrink-0 px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black">
                          +10 XP
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        onClick={() => nextQuestion()}
                      >
                        Sonraki Soru <ArrowRight size={16} />
                      </button>

                      {!result.correct && (
                        <button
                          type="button"
                          className="px-3.5 min-h-[44px] py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          onClick={retryQuestion}
                        >
                          <RotateCcw size={14} /> Tekrar Dene
                        </button>
                      )}

                      <button
                        type="button"
                        className="px-3.5 min-h-[44px] py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        onClick={() => setShowExplanation(!showExplanation)}
                      >
                        {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Çözümü Gör
                      </button>
                    </div>

                    {showExplanation && (
                      <div className="mt-2.5 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in fade-in duration-150">
                        <VisualExplanationOverlay explanation={question.explanation} correctOptionId={question.correctOptionId} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
  if (demoOnly) return <div className="zp-landing bj-entry-discovery"><header><button type="button" onClick={onCloseDemo}>← Ana sayfa</button><Logo size="xs" showTagline={false} /></header><main>{discovery}</main></div>;
  return <div className="zp-landing zp-colorful-home" data-motion={moving ? 'on' : 'off'}>
    <a className="zp-skip" href="#ana-icerik">İçeriğe geç</a>
    <LandingNav registration={registration} onLogin={onNavigateToLogin} onRegister={() => onNavigate('register')}
      onHome={() => { onNavigate('landing'); window.scrollTo({ top: 0, behavior: moving ? 'smooth' : 'instant' }); }}
      onDemo={goDemo} moving={moving} reducedMotion={!!reducedMotion} onToggleMotion={() => setPaused(!paused)}
      soundActive={soundActive} onToggleSound={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }} />
    <main id="ana-icerik">
      <div className="zp-welcome-strip"><Compass size={14} aria-hidden="true" /><span>BİLSEM hazırlığında düşün, keşfet, geliş.</span><a href="#kesfet" onClick={e => { e.preventDefault(); goDemo(); }}>Bir soru dene <ArrowRight size={14} /></a></div>
      <section className="zp-hero-section" aria-labelledby="hero-title">
        <div className="zp-sky-decor" aria-hidden="true"><span className="zp-cloud zp-cloud-one" /><span className="zp-cloud zp-cloud-two" /><span className="zp-sky-sun" /><span className="zp-sky-spark" /></div>
        <div className="zp-container zp-hero">
        <motion.div {...reveal} className="zp-hero-copy">
          <div className="zp-eyebrow"><GraduationCap size={16} /> BİLSEM hazırlığı · 1–4. sınıf alıştırmaları</div>
          <h1 id="hero-title">BİLSEM’e hazırlık,<br /><span>merakla başlar.</span></h1>
          <p className="zp-hero-description">Bilsem Junior ile görsel düşünme, mantık, örüntü ve dikkat çalış. Sınıfına uygun alıştırmaları çöz, açıklamaları keşfet; her gün kendi gelişiminde bir adım at.</p>
          <div className="zp-hero-buttons"><PremiumButton onClick={() => goDemo()}>Bir soru dene <ArrowRight size={19} /></PremiumButton><PremiumButton tone="quiet" onClick={() => onNavigate('register')}>{registerLabel} <ArrowUpRight size={17} /></PremiumButton></div>
          <p className="bj-registration-notice" role="status">{registrationNote}</p><div className="zp-hero-reassurance"><span><Check size={14} /> Hesap açmadan dene</span><span><Check size={14} /> Kendi hızında ilerle</span></div>
          {!isAndroidApp && <div className="bj-hero-downloads"><p>Keşif cebinde de devam etsin.</p><AppDownloadLinks downloads={downloads} compact/></div>}
          <div className="zp-hero-footnote"><span className="zp-hero-mini-medal"><Trophy size={23} /></span><p>Küçük adımlarla düzenli çalışma.<br /><strong>Büyük bir merak, sana ait bir yol.</strong></p></div>
        </motion.div>
        <LearningIsland moving={moving} />
        </div>
      </section>
      <div className="zp-skill-ribbon" aria-label="Çalışma becerileri"><div className="zp-container"><span><Shapes size={18} /> Örüntüleri keşfet</span><i>·</i><span><Brain size={18} /> Bağlantı kur</span><i>·</i><span><ScanEye size={18} /> Ayrıntıları yakala</span><i>·</i><span><Trophy size={18} /> Kendini geliştir</span></div></div>
      {!isAndroidApp && <section id="uygulamayi-indir" className="zp-container bj-download-section" aria-labelledby="download-title"><div className="bj-download-panel"><div className="bj-download-orbit" aria-hidden="true"><Smartphone size={52}/><span /><i>●</i></div><div className="bj-download-intro"><p className="zp-kicker">Küçük ekran, büyük merak</p><h2 id="download-title" tabIndex={-1}>Bir dokunuşla<br/><span>keşfe devam!</span></h2><p>Telefonunda ya da tabletinde düşün, çöz, keşfet. Cihazına uygun mağazadan Bilsem Junior’a ulaş.</p></div><div className="bj-download-stores"><AppDownloadLinks downloads={downloads}/><p className="bj-download-note">Mağaza bağlantıları yeni sekmede açılır. iPhone ve iPad’de web sürümünü de kullanabilirsin.</p></div></div></section>}
      {discovery}
      <GradeExplorer onTry={tryGrade} completed={submitted} />
      <section id="dunyalar" className="zp-container zp-section" aria-labelledby="worlds-title">
        <motion.div {...reveal} className="zp-section-heading"><div><p className="zp-kicker"><Shapes size={16} /> BİLSEM hazırlık alanları</p><h2 id="worlds-title">Becerini seç.<br /><span>Hazırlığını güçlendir.</span></h2></div><p>Birbirinden farklı düşünme oyunları.<br />Bir alan seç, düşünmenin farklı yollarıyla tanış.</p></motion.div>
        <div className="zp-world-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6 w-full">
          {worlds.map((w, index) => (
            <motion.div
              {...reveal}
              key={w.type}
              className={`zp-world-bento-item ${index < 2 ? 'zp-world-bento-featured col-span-1 md:col-span-1 lg:col-span-6' : 'zp-world-bento-compact col-span-1 md:col-span-1 lg:col-span-3'} min-w-0 h-full w-full`}
            >
            <SpotlightSurface
              unstyled
              className="zp-world-card-surface h-full transition-transform duration-200 hover:-translate-y-1"
              spotlightColor={
                w.theme === 'purple' ? 'rgba(84, 52, 186, 0.12)' :
                w.theme === 'mint' ? 'rgba(15, 118, 110, 0.12)' :
                w.theme === 'peach' ? 'rgba(180, 83, 9, 0.12)' :
                w.theme === 'blue' ? 'rgba(29, 78, 216, 0.12)' :
                w.theme === 'yellow' ? 'rgba(161, 98, 7, 0.12)' :
                'rgba(190, 24, 93, 0.12)'
              }
            >
              <button type="button" className={`zp-world-card zp-ui-card zp-world-${w.theme} w-full h-full text-left`} onClick={() => goDemo(w.type)}>
                <div className="zp-world-top"><span>Keşif · {w.number}</span><ArrowUpRight size={22} className="zp-world-arrow transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                <WorldArtwork theme={w.theme} />
                <span className="zp-world-tag"><w.icon size={14} /> {w.tag}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
                <span className="zp-world-link">{submitted ? 'Deneme sonucuna git' : 'Bir soru dene'} <ArrowRight size={16} /></span>
              </button>
            </SpotlightSurface>
          </motion.div>
        ))}</div>
      </section>
      <section className="zp-rewards-section" aria-labelledby="rewards-title"><div className="zp-container">
        <motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker"><Trophy size={16} /> Keşfet, geliş, kutla</p><h2 id="rewards-title">Öğrenmek bir macera.<br /><span>İlerlemek ayrı bir heyecan!</span></h2><p>Günlük görevler, puanlar ve rozetlerle her yeni adımı görünür kıl.</p></motion.div>
        <div className="zp-rewards-grid">{rewards.map(r => (
          <motion.div {...reveal} key={r.title} className="min-w-0 h-full">
            <SpotlightSurface
              unstyled
              className={`zp-reward zp-reward-${r.theme} h-full transition-transform duration-200 hover:-translate-y-1`}
              spotlightColor={
                r.theme === 'purple' ? 'rgba(84, 52, 186, 0.10)' :
                r.theme === 'mint' ? 'rgba(15, 118, 110, 0.10)' :
                r.theme === 'peach' ? 'rgba(180, 83, 9, 0.10)' :
                'rgba(29, 78, 216, 0.10)'
              }
            >
              <article className="text-center h-full flex flex-col justify-between">
                <div>
                  <span className="zp-reward-icon" aria-hidden="true"><r.icon size={30} /></span>
                  <h3>{r.title}</h3>
                </div>
                <p>{r.text}</p>
              </article>
            </SpotlightSurface>
          </motion.div>
        ))}</div>
        <div className="zp-rewards-action"><PremiumButton onClick={() => onNavigate('register')}>{registerLabel} <ArrowRight size={18} /></PremiumButton><p>Kazanımlar öğrenci hesabında takip edilir.</p></div>
      </div></section>
      <section id="nasil" className="zp-container zp-section zp-journey" aria-labelledby="journey-title"><motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker">Büyük keşiflerin küçük rutini</p><h2 id="journey-title">Her gün, bir adım daha.</h2><p>Başkasının hızına yetişmek için değil, kendi yolunu keşfetmek için.</p></motion.div>
        <div className="zp-journey-grid">{[{ n: '01', title: 'Rotanı seç', text: 'Merak ettiğin bir alandan başla. Örüntü, mantık ya da dikkat… Seçim senin.', icon: Shapes }, { n: '02', title: 'Deneyerek öğren', text: 'Soruyu çöz, açıklamayı incele. Hatalarını bir sonraki keşfin ipucuna dönüştür.', icon: Brain }, { n: '03', title: 'Gelişimini kutla', text: 'Günlük görevlerini tamamla, XP biriktir ve kendi rekorunu geliştirmeye çalış.', icon: Trophy }].map(s => <motion.div {...reveal} key={s.n} className="zp-journey-step"><div className="zp-journey-icon"><s.icon size={28} /><span>{s.n}</span></div><h3>{s.title}</h3><p>{s.text}</p></motion.div>)}</div>
      </section>
      <section id="aile" className="zp-container zp-family-section" aria-labelledby="family-title"><motion.div {...reveal} className="zp-family-panel zp-ui-card"><div className="zp-parent-preview"><div className="zp-parent-preview-top"><span><Heart size={20} /> Veli alanı</span><span>Örnek görünüm</span></div><div className="zp-parent-preview-main"><span className="zp-parent-avatar"><GraduationCap size={30} /></span><div><strong>Her küçük adımı fark edin.</strong><p>Birlikte bakın, birlikte kutlayın.</p></div></div><div className="zp-parent-preview-rows"><div><span className="zp-parent-dot zp-path-purple"><Shapes size={20} /></span><span><strong>Çalışma alanları</strong><small>Hangi beceriler üzerinde çalışıyor?</small></span><Check size={17} /></div><div><span className="zp-parent-dot zp-path-mint"><Target size={20} /></span><span><strong>Günlük alışkanlıklar</strong><small>Çalışma düzeni nasıl ilerliyor?</small></span><Check size={17} /></div><div><span className="zp-parent-dot zp-path-yellow"><Trophy size={20} /></span><span><strong>Gelişim yolculuğu</strong><small>Hangi adımları birlikte kutlayabilirsiniz?</small></span><Check size={17} /></div></div><p className="zp-parent-preview-note"><ShieldCheck size={16} /> Gerçek bilgiler, bağlı öğrenci hesabından gelir.</p></div><div className="zp-family-copy"><p className="zp-kicker">Birlikte daha güzel</p><h2 id="family-title">Onun hazırlık yolculuğu.<br />Sizin destek alanınız.</h2><p>Çocuğunuzun çabasını fark edin, ilerleyişine eşlik edin. Veli alanından çalışma ve gelişim bilgilerini takip edin.</p><PremiumButton tone="dark" onClick={() => onNavigateToLogin('parent')}>Veli alanına geç <ArrowUpRight size={18} /></PremiumButton></div></motion.div></section>
      <BilsemGuide />
      <section id="yardim" className="zp-container zp-section zp-faq" aria-labelledby="faq-title"><div><p className="zp-kicker">Aklında bir soru mu var?</p><h2 id="faq-title">Merak etmek<br />işin başlangıcı.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={19} /></summary><p>{a}</p></details>)}</div></section>
      <section className="zp-container zp-final-section"><div className="zp-final-cta"><span aria-hidden="true" className="zp-cta-star" /><p className="zp-kicker">Hadi, bir adım atalım.</p><h2>BİLSEM yolculuğunda ilk adım.</h2><PremiumButton tone="lime" onClick={() => onNavigate('register')}>{registerLabel} <ArrowRight size={19} /></PremiumButton><p className="zp-final-note">Bilsem Junior ile düşünmenin farklı yollarını keşfet.</p></div></section>
    </main>
    <Footer downloads={downloads} onNavigate={onNavigate} onNavigateToLogin={onNavigateToLogin} />
  </div>;
};
