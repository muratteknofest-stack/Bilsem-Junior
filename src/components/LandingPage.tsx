import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Shapes, Brain, ScanEye, Trophy, Check, ChevronDown, Move, Keyboard, ShieldCheck, Heart, Volume2, VolumeX, Target, Zap, Medal, GraduationCap, Rotate3D, Hash, Puzzle, Compass, Timer, MousePointer2, Smartphone } from 'lucide-react';
import type { QuestionType, UserRole } from '../types';
import { generateQuestionByType } from '../features/questions/generators';
import { evaluateResponse, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../lib/sound';
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
  const [submitted, setSubmitted] = useState(landingQuestionAnswered);
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
    if (submitted || landingQuestionAnswered()) { setSubmitted(true); return; }
    try {
      const next = generateQuestionByType(type, question.seed + 131, 2);
      setCategory(type); setQuestion(next); setPreviewGrade(null); setDemoError('');
      setResponse(null); submitLock.current = false;
    } catch { setDemoError('Bu örnek şu anda hazırlanamadı. Başka bir keşif alanını deneyebilirsin.'); }
  };
  const goDemo = (type?: QuestionType) => {
    if (type) nextQuestion(type);
    demoHeading.current?.focus({ preventScroll: true });
    document.getElementById('kesfet')?.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' });
  };
  const tryGrade = (grade: PreviewGrade) => {
    if (!submitted && !landingQuestionAnswered()) {
      try {
        const next = createGradePreview(grade);
        setQuestion(next); setCategory(next.type); setPreviewGrade(grade); setDemoError('');
        setResponse(null); submitLock.current = false;
      } catch { setDemoError('Bu sınıfın örneği şu anda hazırlanamadı. Bir keşif alanı seçerek devam edebilirsin.'); }
    } else { setSubmitted(true); }
    goDemo();
  };
  const submit = () => {
    if (submitLock.current || submitted) return;
    const checked = evaluateResponse(question, response);
    if (!checked.complete) return;
    if (!useLandingQuestion()) { setSubmitted(true); return; }
    submitLock.current = true; setSubmitted(true); setSolved(n => n + 1);
    if (checked.correct) { setCorrect(n => n + 1); if (soundActive) sound.playSuccess(); }
    else if (soundActive) sound.playError();
  };
  const discovery = (<section id="kesfet" className="zp-demo-section" aria-labelledby="demo-title"><div className="zp-container zp-demo-grid">
        <motion.div {...reveal} className="zp-demo-intro"><p className="zp-kicker">İzlemek güzel, denemek daha güzel.</p><h2 id="demo-title" tabIndex={-1} ref={demoHeading}>Bir küçük soru. <br /><span>Kocaman bir <br />“buldum!”</span></h2><p>Parçaları incele, kuralı keşfet, cevabını yerleştir. Acele yok; burada öğrenmenin yolu denemekten geçiyor.</p>
          <div className="zp-demo-steps"><div><span><Move size={19} /></span><p><strong>Dokun ya da sürükle</strong>Kartı seç, cevap alanına yerleştir.</p></div><div><span><Compass size={19} /></span><p><strong>Nasıl çözüldüğünü gör</strong>Cevabından sonra açıklamayı incele.</p></div><div><span><Keyboard size={19} /></span><p><strong>Sana uygun şekilde çöz</strong>Dokunmatik, fare veya klavye kullan.</p></div></div>
          <div className="zp-demo-progress"><span className="zp-progress-icon"><Trophy size={22} /></span><p><strong>{solved ? `${solved} soru denedin, ${correct} doğru buldun.` : 'İlk keşfin seni bekliyor.'}</strong><small>Bu cihazda 1 örnek soru. Sonuç hesabına kaydedilmez.</small></p></div>
        </motion.div>
        <motion.div {...reveal} className="zp-demo-card zp-ui-card bj-discovery"><div className="zp-demo-card-header"><span><span className="bj-discovery-compass" aria-hidden="true"><Compass size={24} /></span><span>Keşif Alanı<small>Küçük bir düşünme macerası</small></span></span><button type="button" className="zp-icon-button" aria-label={soundActive ? 'Sesi kapat' : 'Sesi aç'} aria-pressed={soundActive} onClick={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }}>{soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
          {demoError && <p role="alert" className="zp-demo-error">{demoError}</p>}
          {submitted && solved === 0 ? <div className="zp-demo-complete"><span className="zp-complete-medal"><Trophy size={44} /></span><p className="zp-kicker">İlk adım tamam!</p><h3>Bir keşif, yeni bir başlangıç.</h3><p>Bu cihazdaki tek örnek sorunu tamamladın. {registration === 'closed' ? 'Yeni hesap oluşturma şu anda kapalı. Mevcut hesabınla giriş yapabilir veya hazırlık rehberini inceleyebilirsin.' : registrationNote}</p><PremiumButton onClick={() => onNavigate('register')}>{registerLabel} <ArrowRight size={18} /></PremiumButton><button type="button" className="zp-complete-login" onClick={() => onNavigateToLogin('student')}>Zaten hesabım var</button><button type="button" className="zp-complete-login" onClick={() => { const guide = document.getElementById('bilsem-rehberi'); const heading = guide?.querySelector<HTMLElement>('h2'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } guide?.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' }); }}>Hazırlık rehberini incele</button></div> : <>
          <div className="zp-demo-level"><span className="bj-discovery-badge"><Compass size={15} aria-hidden="true" />{previewGrade ? `${previewGrade}. sınıf örneği` : 'Serbest keşif örneği'}</span><span className="bj-discovery-time"><Timer size={14} aria-hidden="true" />1 örnek soru · Süre sınırı yok</span></div><p className="bj-discovery-invitation">Bugün ne keşfedelim?</p>
          <div className="zp-demo-tabs" role="group" aria-label="Örnek soru alanı">{worlds.map(w => <button type="button" key={w.type} data-world={w.theme} aria-pressed={category === w.type} disabled={submitted} onClick={() => { if (soundActive) sound.playClick(); nextQuestion(w.type); }}><span className="bj-discovery-tab-icon"><w.icon size={21} aria-hidden="true" /></span><span>{w.short}</span>{category === w.type && <Check size={13} className="bj-discovery-tab-check" aria-hidden="true" />}</button>)}</div>
          <div className="bj-discovery-workspace"><div className="bj-discovery-puzzle" key={`puzzle-${question.id}`}><div className="bj-discovery-task-label"><span><ScanEye size={16} aria-hidden="true" /> İncele ve keşfet</span></div><h3>{question.prompt}</h3>{question.secondaryPrompt && <p className="zp-question-secondary">{question.secondaryPrompt}</p>}
          <QuestionRenderer question={question} /></div><div className="bj-discovery-answers"><div className="bj-discovery-answer-label"><span><MousePointer2 size={17} aria-hidden="true" /> Sıra sende!</span><small>Düşün, dene, yerleştir.</small></div>
          <AnswerWorkspace key={question.id} question={question} response={response} onChange={r => { if (!submitted && !submitLock.current) setResponse(r); }} submitted={submitted} /></div></div>
          {!submitted ? <PremiumButton className="zp-full bj-discovery-submit" disabled={!result.complete} onClick={submit}>Cevabımı kontrol et <ArrowRight size={18} /></PremiumButton> : <div className="zp-demo-feedback"><p role="status" className={result.correct ? 'zp-correct' : 'zp-try-again'}>{landingQuestionAnswered() && solved === 0 ? 'Örnek soruyu daha önce tamamladın.' : result.correct ? 'Buldun! Güzel bir keşif yaptın.' : 'Birlikte bakalım. Her deneme yeni bir şey öğretir.'}</p>{solved > 0 && <VisualExplanationOverlay explanation={question.explanation} correctOptionId={question.correctOptionId} />}<p className="bj-registration-notice">{registrationNote}</p><PremiumButton className="zp-full" onClick={() => onNavigate('register')}>{registerLabel} <ArrowRight size={17} /></PremiumButton></div>}
          </>}
        </motion.div>
      </div></section>);
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
        <div className="zp-world-grid">{worlds.map(w => (
          <motion.div {...reveal} key={w.type} className="h-full">
            <SpotlightSurface
              className={`zp-world-card-surface zp-world-${w.theme} h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              spotlightColor={
                w.theme === 'purple' ? 'rgba(100, 53, 204, 0.14)' :
                w.theme === 'mint' ? 'rgba(8, 118, 92, 0.14)' :
                w.theme === 'peach' ? 'rgba(180, 83, 9, 0.14)' :
                w.theme === 'blue' ? 'rgba(29, 78, 216, 0.14)' :
                w.theme === 'yellow' ? 'rgba(161, 98, 7, 0.14)' :
                'rgba(190, 24, 93, 0.14)'
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
      <details className="bj-home-more zp-container"><summary>Görevler, ödüller ve çalışma alışkanlığı <ChevronDown size={20} /></summary><div>
      <section className="zp-rewards-section" aria-labelledby="rewards-title"><div className="zp-container">
        <motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker"><Trophy size={16} /> Keşfet, geliş, kutla</p><h2 id="rewards-title">Öğrenmek bir macera.<br /><span>İlerlemek ayrı bir heyecan!</span></h2><p>Günlük görevler, puanlar ve rozetlerle her yeni adımı görünür kıl.</p></motion.div>
        <div className="zp-rewards-grid">{rewards.map(r => (
          <motion.div {...reveal} key={r.title} className="h-full">
            <SpotlightSurface
              className={`zp-reward zp-reward-${r.theme} h-full border border-white/15 bg-white/5 transition-all duration-300 hover:-translate-y-1`}
              spotlightColor={
                r.theme === 'purple' ? 'rgba(210, 180, 255, 0.15)' :
                r.theme === 'mint' ? 'rgba(158, 230, 199, 0.15)' :
                r.theme === 'peach' ? 'rgba(255, 219, 137, 0.15)' :
                'rgba(158, 216, 255, 0.15)'
              }
            >
              <article className="p-6 text-center h-full flex flex-col justify-between">
                <div>
                  <span className="zp-reward-icon" aria-hidden="true"><r.icon size={34} /></span>
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
      </div></details>
      <section id="aile" className="zp-container zp-family-section" aria-labelledby="family-title"><motion.div {...reveal} className="zp-family-panel zp-ui-card"><div className="zp-parent-preview"><div className="zp-parent-preview-top"><span><Heart size={20} /> Veli alanı</span><span>Örnek görünüm</span></div><div className="zp-parent-preview-main"><span className="zp-parent-avatar"><GraduationCap size={30} /></span><div><strong>Her küçük adımı fark edin.</strong><p>Birlikte bakın, birlikte kutlayın.</p></div></div><div className="zp-parent-preview-rows"><div><span className="zp-parent-dot zp-path-purple"><Shapes size={20} /></span><span><strong>Çalışma alanları</strong><small>Hangi beceriler üzerinde çalışıyor?</small></span><Check size={17} /></div><div><span className="zp-parent-dot zp-path-mint"><Target size={20} /></span><span><strong>Günlük alışkanlıklar</strong><small>Çalışma düzeni nasıl ilerliyor?</small></span><Check size={17} /></div><div><span className="zp-parent-dot zp-path-yellow"><Trophy size={20} /></span><span><strong>Gelişim yolculuğu</strong><small>Hangi adımları birlikte kutlayabilirsiniz?</small></span><Check size={17} /></div></div><p className="zp-parent-preview-note"><ShieldCheck size={16} /> Gerçek bilgiler, bağlı öğrenci hesabından gelir.</p></div><div className="zp-family-copy"><p className="zp-kicker">Birlikte daha güzel</p><h2 id="family-title">Onun hazırlık yolculuğu.<br />Sizin destek alanınız.</h2><p>Çocuğunuzun çabasını fark edin, ilerleyişine eşlik edin. Veli alanından çalışma ve gelişim bilgilerini takip edin.</p><PremiumButton tone="dark" onClick={() => onNavigateToLogin('parent')}>Veli alanına geç <ArrowUpRight size={18} /></PremiumButton></div></motion.div></section>
      <BilsemGuide />
      <section id="yardim" className="zp-container zp-section zp-faq" aria-labelledby="faq-title"><div><p className="zp-kicker">Aklında bir soru mu var?</p><h2 id="faq-title">Merak etmek<br />işin başlangıcı.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={19} /></summary><p>{a}</p></details>)}</div></section>
      <section className="zp-container zp-final-section"><div className="zp-final-cta"><span aria-hidden="true" className="zp-cta-star" /><p className="zp-kicker">Hadi, bir adım atalım.</p><h2>BİLSEM yolculuğunda ilk adım.</h2><PremiumButton tone="lime" onClick={() => onNavigate('register')}>{registerLabel} <ArrowRight size={19} /></PremiumButton><p className="zp-final-note">Bilsem Junior ile düşünmenin farklı yollarını keşfet.</p></div></section>
    </main>
    <Footer downloads={downloads} onNavigate={onNavigate} onNavigateToLogin={onNavigateToLogin} />
  </div>;
};
