import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Sparkles, Play, Pause, Shapes, Brain, ScanEye, Trophy, Check, ChevronDown, RotateCcw, Move, Keyboard, ShieldCheck, Heart, Volume2, VolumeX } from 'lucide-react';
import type { QuestionType, UserRole } from '../types';
import { generateQuestionByType } from '../features/questions/generators';
import { evaluateResponse, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../lib/sound';
import { Logo } from './Logo';
import { LearningIsland } from './landing/LearningIsland';
import type { FooterModalTopic } from './FooterInfoModal';
import './landing/landing.css';

const FooterInfoModal = lazy(() => import('./FooterInfoModal').then(m => ({ default: m.FooterInfoModal })));
interface LandingPageProps { onStartDemo?: (role: UserRole) => void; onNavigateToLogin: (role: UserRole) => void; onNavigate: (route: string) => void }
const worlds = [
  { type: 'visual_sequence' as QuestionType, title: 'Örüntü evreni', short: 'Örüntü', text: 'Parçalar arasındaki gizli bağı bul. Sıradaki adımı sen keşfet.', tag: 'Bağlantı kur', icon: Shapes, theme: 'purple', number: '01' },
  { type: 'logic_grid' as QuestionType, title: 'Mantık laboratuvarı', short: 'Mantık', text: 'İpuçlarını birleştir, parçaları sırala. Her soruya yeni bir açıdan bak.', tag: 'Adım adım düşün', icon: Brain, theme: 'mint', number: '02' },
  { type: 'shape_counting' as QuestionType, title: 'Dikkat istasyonu', short: 'Dikkat', text: 'Ayrıntıları yakala. Kalabalığın içinde aradığın şekli fark et.', tag: 'Odaklan ve bul', icon: ScanEye, theme: 'peach', number: '03' },
];
const faqs = [
  ['Hesap açmadan deneyebilir miyim?', 'Evet. Bu sayfadaki örnek soruları hesap açmadan çözebilirsin. Buradaki deneme puanları ve cevaplar hesabına kaydedilmez.'],
  ['Sorular nasıl çözülüyor?', 'Sorunun türüne göre sürükle-bırak, sıralama, eşleştirme veya sayısal cevap kullanabilirsin. İstersen klasik şık seçimine dönebilirsin. Kartları sürüklemek yerine önce karta, sonra hedefe dokunmak da mümkün.'],
  ['Veli olarak neler yapabilirim?', 'Veli girişi üzerinden çocuğunun çalışma ve gelişim bilgilerine ulaşabilirsin. Öğrenci ve veli için ayrı girişler bulunur.'],
  ['Animasyonları kapatabilir miyim?', 'Evet. Üst menüdeki hareket düğmesiyle animasyonları durdurabilirsin. Cihazındaki hareketi azalt tercihi de otomatik olarak dikkate alınır.'],
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, onNavigate }) => {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const moving = !reducedMotion && !paused && pageVisible;
  const [soundActive, setSoundActive] = useState(sound.enabled);
  const [topic, setTopic] = useState<FooterModalTopic | null>(null);
  const [category, setCategory] = useState<QuestionType>('visual_sequence');
  const [question, setQuestion] = useState(() => generateQuestionByType('visual_sequence', 4829, 2));
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [submitted, setSubmitted] = useState(false);
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
    setCategory(type); setQuestion(generateQuestionByType(type, question.seed + 131, 2));
    setResponse(null); setSubmitted(false); submitLock.current = false;
  };
  const goDemo = (type?: QuestionType) => {
    if (type) nextQuestion(type);
    demoHeading.current?.focus({ preventScroll: true });
    document.getElementById('kesfet')?.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' });
  };
  const submit = () => {
    if (submitLock.current || submitted) return;
    const checked = evaluateResponse(question, response);
    if (!checked.complete) return;
    submitLock.current = true; setSubmitted(true); setSolved(n => n + 1);
    if (checked.correct) { setCorrect(n => n + 1); if (soundActive) sound.playSuccess(); }
    else if (soundActive) sound.playError();
  };
  return <div className="zp-landing" data-motion={moving ? 'on' : 'off'}>
    <a className="zp-skip" href="#ana-icerik">İçeriğe geç</a>
    <header className="zp-header"><div className="zp-container zp-nav">
      <button type="button" className="zp-brand-button" aria-label="ZekaPark ana sayfa" onClick={() => { onNavigate('landing'); window.scrollTo({ top: 0, behavior: moving ? 'smooth' : 'instant' }); }}><Logo size="md" showTagline={false} /></button>
      <nav aria-label="Ana menü" className="zp-nav-links"><a href="#dunyalar">Keşif alanları</a><a href="#nasil">Nasıl çalışır?</a><a href="#aile">Aileler için</a></nav>
      <div className="zp-nav-actions"><button type="button" className="zp-icon-button" aria-label={moving ? 'Animasyonları durdur' : 'Animasyonları başlat'} aria-pressed={!moving} disabled={!!reducedMotion} title={reducedMotion ? 'Cihazın hareketi azalt tercihi etkin' : moving ? 'Animasyonları durdur' : 'Animasyonları başlat'} onClick={() => setPaused(!paused)}>{moving ? <Pause size={17} /> : <Play size={17} />}</button><button type="button" className="zp-button zp-button-small zp-button-dark" onClick={() => onNavigateToLogin('student')}>Giriş yap <ArrowUpRight size={16} /></button></div>
    </div></header>
    <main id="ana-icerik">
      <section className="zp-container zp-hero" aria-labelledby="hero-title">
        <motion.div {...reveal} className="zp-hero-copy">
          <div className="zp-eyebrow"><span className="zp-mini-star">✦</span> MERAK EDEN ZİHİNLER İÇİN</div>
          <h1 id="hero-title">Küçük adımlar.<br /><span>Büyük keşifler.</span></h1>
          <p className="zp-hero-description">Düşün, oyna, yeniden dene.<br />Her soruda yeni bir şey keşfettiğin<br className="zp-desktop-break" /> zeka parkına hoş geldin.</p>
          <div className="zp-hero-buttons"><button type="button" className="zp-button zp-button-primary" onClick={() => goDemo()}>Keşfe başla <ArrowRight size={19} /></button><button type="button" className="zp-button zp-button-quiet" onClick={() => onNavigateToLogin('parent')}>Veli girişi <ArrowUpRight size={17} /></button></div>
          <div className="zp-hero-reassurance"><span><Check size={14} /> Hesap açmadan dene</span><span><Check size={14} /> Kendi hızında ilerle</span></div>
          <div className="zp-hero-footnote"><div className="zp-tiny-shapes"><span /><span /><span /></div><p>Bir doğru cevaptan fazlası.<br /><strong>Düşünmenin keyfi.</strong></p></div>
        </motion.div>
        <LearningIsland moving={moving} />
      </section>
      <div className="zp-skill-ribbon" aria-label="Çalışma becerileri"><div className="zp-container"><span><Shapes size={18} /> Örüntüleri keşfet</span><i>✦</i><span><Brain size={18} /> Bağlantı kur</span><i>✦</i><span><ScanEye size={18} /> Ayrıntıları yakala</span><i>✦</i><span><Trophy size={18} /> Kendini geliştir</span></div></div>
      <section id="dunyalar" className="zp-container zp-section" aria-labelledby="worlds-title">
        <motion.div {...reveal} className="zp-section-heading"><div><p className="zp-kicker">KEŞİF HARİTAN</p><h2 id="worlds-title">Merakın hangi yöne?</h2></div><p>Her alanda farklı bir oyun.<br />Her oyunda yeni bir düşünme yolu.</p></motion.div>
        <div className="zp-world-grid">{worlds.map(w => <motion.button {...reveal} type="button" key={w.type} className={`zp-world-card zp-world-${w.theme}`} onClick={() => goDemo(w.type)}>
          <div className="zp-world-top"><span>KEŞİF / {w.number}</span><ArrowUpRight size={22} /></div>
          <div className={`zp-world-art zp-art-${w.theme}`} aria-hidden="true">{w.theme === 'purple' ? <><span /><span /><span /><span /></> : w.theme === 'mint' ? <><span /><span /><span /></> : <><span /><span /><span /><span /><span /></>}</div>
          <span className="zp-world-tag"><w.icon size={14} /> {w.tag}</span><h3>{w.title}</h3><p>{w.text}</p><span className="zp-world-link">Bir soru dene <ArrowRight size={16} /></span>
        </motion.button>)}</div>
      </section>
      <section id="kesfet" className="zp-demo-section" aria-labelledby="demo-title"><div className="zp-container zp-demo-grid">
        <motion.div {...reveal} className="zp-demo-intro"><p className="zp-kicker">İZLEMEK GÜZEL. DENEMEK DAHA GÜZEL.</p><h2 id="demo-title" tabIndex={-1} ref={demoHeading}>Bir küçük soru.<br /><span>Kocaman bir<br />“buldum!”</span></h2><p>Parçaları incele, kuralı keşfet, cevabını yerleştir. Acele yok; burada öğrenmenin yolu denemekten geçiyor.</p>
          <div className="zp-demo-steps"><div><span><Move size={19} /></span><p><strong>Dokun ya da sürükle</strong>Kartı seç, cevap alanına yerleştir.</p></div><div><span><Sparkles size={19} /></span><p><strong>Nasıl çözüldüğünü gör</strong>Cevabından sonra açıklamayı incele.</p></div><div><span><Keyboard size={19} /></span><p><strong>Sana uygun şekilde çöz</strong>Dokunmatik, fare veya klavye kullan.</p></div></div>
          <div className="zp-demo-progress"><span className="zp-progress-icon"><Trophy size={22} /></span><p><strong>{solved ? `${solved} soru denedin, ${correct} doğru buldun.` : 'İlk keşfin seni bekliyor.'}</strong><small>Bu sayfadaki deneme hesabına kaydedilmez.</small></p></div>
        </motion.div>
        <motion.div {...reveal} className="zp-demo-card"><div className="zp-demo-card-header"><span><i /> KEŞİF ALANI</span><button type="button" className="zp-icon-button" aria-label={soundActive ? 'Sesi kapat' : 'Sesi aç'} aria-pressed={soundActive} onClick={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }}>{soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
          <div className="zp-demo-tabs" role="group" aria-label="Örnek soru alanı">{worlds.map(w => <button type="button" key={w.type} aria-pressed={category === w.type} onClick={() => nextQuestion(w.type)}><w.icon size={15} />{w.short}</button>)}</div>
          <h3>{question.prompt}</h3>{question.secondaryPrompt && <p className="zp-question-secondary">{question.secondaryPrompt}</p>}
          <QuestionRenderer question={question} />
          <AnswerWorkspace key={question.id} question={question} response={response} onChange={r => { if (!submitLock.current) setResponse(r); }} submitted={submitted} />
          {!submitted ? <button type="button" className="zp-button zp-button-primary zp-full" disabled={!result.complete} onClick={submit}>Cevabımı kontrol et <ArrowRight size={18} /></button> : <div className="zp-demo-feedback"><p role="status" className={result.correct ? 'zp-correct' : 'zp-try-again'}>{result.correct ? 'Buldun! Güzel bir keşif yaptın.' : 'Birlikte bakalım. Her deneme yeni bir şey öğretir.'}</p><VisualExplanationOverlay explanation={question.explanation} correctOptionId={question.correctOptionId} /><button type="button" className="zp-button zp-button-primary zp-full" onClick={() => nextQuestion()}>Yeni bir keşif <RotateCcw size={17} /></button></div>}
        </motion.div>
      </div></section>
      <section id="nasil" className="zp-container zp-section zp-journey" aria-labelledby="journey-title"><motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker">BÜYÜK KEŞİFLERİN KÜÇÜK RUTİNİ</p><h2 id="journey-title">Her gün, bir adım daha.</h2><p>Başkasının hızına yetişmek için değil, kendi yolunu keşfetmek için.</p></motion.div>
        <div className="zp-journey-grid">{[{ n: '01', title: 'Rotanı seç', text: 'Merak ettiğin bir alandan başla. Örüntü, mantık ya da dikkat… Seçim senin.', icon: Shapes }, { n: '02', title: 'Deneyerek öğren', text: 'Soruyu çöz, açıklamayı incele. Hatalarını bir sonraki keşfin ipucuna dönüştür.', icon: Brain }, { n: '03', title: 'Gelişimini kutla', text: 'Günlük görevlerini tamamla, XP biriktir ve kendi rekorunu geliştirmeye çalış.', icon: Trophy }].map(s => <motion.div {...reveal} key={s.n} className="zp-journey-step"><div className="zp-journey-icon"><s.icon size={28} /><span>{s.n}</span></div><h3>{s.title}</h3><p>{s.text}</p></motion.div>)}</div>
      </section>
      <section id="aile" className="zp-container zp-family-section" aria-labelledby="family-title"><motion.div {...reveal} className="zp-family-panel"><div className="zp-family-visual" aria-hidden="true"><div className="zp-family-ring" /><div className="zp-family-heart"><Heart size={80} fill="currentColor" strokeWidth={1} /></div><div className="zp-family-small-card"><ShieldCheck size={23} /><span>Yanında ol.<br /><strong>Yolunu ona bırak.</strong></span></div><div className="zp-family-spark">✦</div></div><div className="zp-family-copy"><p className="zp-kicker">BİRLİKTE DAHA GÜZEL</p><h2 id="family-title">Onun keşif dünyası.<br />Sizin destek alanınız.</h2><p>Çocuğunuzun çabasını fark edin, ilerleyişine eşlik edin. Veli alanından çalışma ve gelişim bilgilerini takip edin.</p><button type="button" className="zp-button zp-button-dark" onClick={() => onNavigateToLogin('parent')}>Veli alanına geç <ArrowUpRight size={18} /></button></div></motion.div></section>
      <section className="zp-container zp-section zp-faq" aria-labelledby="faq-title"><div><p className="zp-kicker">AKLINDA BİR SORU MU VAR?</p><h2 id="faq-title">Merak etmek<br />işin başlangıcı.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={19} /></summary><p>{a}</p></details>)}</div></section>
      <section className="zp-container zp-final-section"><div className="zp-final-cta"><span aria-hidden="true" className="zp-cta-star">✦</span><p className="zp-kicker">HADİ, BİR ADIM ATALIM.</p><h2>Bir sonraki keşif senin.</h2><button type="button" className="zp-button zp-button-lime" onClick={() => onNavigateToLogin('student')}>ZekaPark’a katıl <ArrowRight size={19} /></button><p className="zp-final-note">Merakını getir. Gerisini birlikte keşfedelim.</p></div></section>
    </main>
    <footer className="zp-footer"><div className="zp-container"><div className="zp-footer-top"><div><Logo size="md" showTagline={false} /><p>Düşünmenin keyfini keşfet.</p></div><div><button type="button" onClick={() => onNavigateToLogin('student')}>Öğrenci girişi</button><button type="button" onClick={() => onNavigateToLogin('parent')}>Veli girişi</button><button type="button" onClick={() => onNavigateToLogin('admin')}>Yönetici girişi</button></div></div><div className="zp-footer-bottom"><span>© {new Date().getFullYear()} ZekaPark</span><div><button type="button" onClick={() => setTopic('kvkk')}>Gizlilik ve KVKK</button><button type="button" onClick={() => setTopic('terms')}>Kullanım koşulları</button><a href="mailto:zeka.kupu.test@gmail.com">İletişim</a></div><span>Merakla büyüyen zihinler için.</span></div></div></footer>
    {topic && <Suspense fallback={<div role="status" className="zp-modal-loading">Bilgiler yükleniyor… <button type="button" onClick={() => setTopic(null)}>Kapat</button></div>}><FooterInfoModal topic={topic} onClose={() => setTopic(null)} /></Suspense>}
  </div>;
};
