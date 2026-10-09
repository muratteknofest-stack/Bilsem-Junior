import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Sparkles, Shapes, Brain, ScanEye, Trophy, Check, ChevronDown, Move, Keyboard, ShieldCheck, Heart, Volume2, VolumeX, Rocket, Target, Zap, Medal, GraduationCap, Rotate3D, Hash, Puzzle } from 'lucide-react';
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
import type { FooterModalTopic } from './FooterInfoModal';
import './landing/landing.css';
import './landing/design-system.css';
import './landing/colorful-home.css';

const FooterInfoModal = lazy(() => import('./FooterInfoModal').then(m => ({ default: m.FooterInfoModal })));
interface LandingPageProps { onStartDemo?: (role: UserRole) => void; onNavigateToLogin: (role: UserRole) => void; onNavigate: (route: string) => void }
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
    if (landingQuestionAnswered()) return;
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
    if (!useLandingQuestion()) return;
    submitLock.current = true; setSubmitted(true); setSolved(n => n + 1);
    if (checked.correct) { setCorrect(n => n + 1); if (soundActive) sound.playSuccess(); }
    else if (soundActive) sound.playError();
  };
  return <div className="zp-landing zp-colorful-home" data-motion={moving ? 'on' : 'off'}>
    <a className="zp-skip" href="#ana-icerik">İçeriğe geç</a>
    <LandingNav onLogin={onNavigateToLogin} onRegister={() => onNavigate('register')}
      onHome={() => { onNavigate('landing'); window.scrollTo({ top: 0, behavior: moving ? 'smooth' : 'instant' }); }}
      onDemo={goDemo} moving={moving} reducedMotion={!!reducedMotion} onToggleMotion={() => setPaused(!paused)}
      soundActive={soundActive} onToggleSound={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }} />
    <main id="ana-icerik">
      <section className="zp-hero-section" aria-labelledby="hero-title">
        <div className="zp-sky-decor" aria-hidden="true"><span className="zp-cloud zp-cloud-one" /><span className="zp-cloud zp-cloud-two" /><span className="zp-sky-sun" /><span className="zp-sky-spark">✦</span></div>
        <div className="zp-container zp-hero">
        <motion.div {...reveal} className="zp-hero-copy">
          <div className="zp-eyebrow"><Sparkles size={16} /> BİLSEM HAZIRLIK · 1–4. SINIF</div>
          <h1 id="hero-title">Oyun başlasın.<br /><span>Merak büyüsün!</span></h1>
          <p className="zp-hero-description">Zeki ile rengârenk bir keşfe çık!<br />Şekillerin sırrını çöz, ipuçlarını birleştir.<br className="zp-desktop-break" /> Düşünmenin en eğlenceli halini keşfet.</p>
          <div className="zp-hero-buttons"><PremiumButton onClick={() => goDemo()}>Hemen dene <ArrowRight size={19} /></PremiumButton><PremiumButton tone="quiet" onClick={() => onNavigate('register')}>Macera hesabı aç <ArrowUpRight size={17} /></PremiumButton></div>
          <div className="zp-hero-reassurance"><span><Check size={14} /> Hesap açmadan dene</span><span><Check size={14} /> Kendi hızında ilerle</span></div>
          <div className="zp-hero-footnote"><span className="zp-hero-mini-medal"><Trophy size={23} /></span><p>Her çaba bir adım.<br /><strong>Her keşif bir “başardım!”</strong></p></div>
        </motion.div>
        <LearningIsland moving={moving} />
        </div>
      </section>
      <div className="zp-container zp-start-path" aria-label="ZekaPark’ta ilk adımın">
        <button type="button" onClick={() => goDemo()}><span className="zp-path-icon zp-path-purple"><Rocket size={24} /></span><span><strong>Önce bir soru dene</strong><small>Hesap açmadan ilk keşfin</small></span><ArrowUpRight size={20} /></button>
        <button type="button" onClick={() => onNavigate('register')}><span className="zp-path-icon zp-path-yellow"><GraduationCap size={25} /></span><span><strong>Sınıfına uygun çalış</strong><small>1, 2, 3 ve 4. sınıf için</small></span><ArrowUpRight size={20} /></button>
        <button type="button" onClick={() => onNavigateToLogin('parent')}><span className="zp-path-icon zp-path-mint"><Heart size={24} /></span><span><strong>Birlikte gelişimini izle</strong><small>Ailelere özel veli alanı</small></span><ArrowUpRight size={20} /></button>
      </div>
      <div className="zp-skill-ribbon" aria-label="Çalışma becerileri"><div className="zp-container"><span><Shapes size={18} /> Örüntüleri keşfet</span><i>✦</i><span><Brain size={18} /> Bağlantı kur</span><i>✦</i><span><ScanEye size={18} /> Ayrıntıları yakala</span><i>✦</i><span><Trophy size={18} /> Kendini geliştir</span></div></div>
      <section id="dunyalar" className="zp-container zp-section" aria-labelledby="worlds-title">
        <motion.div {...reveal} className="zp-section-heading"><div><p className="zp-kicker"><Shapes size={16} /> KEŞİF HARİTAN</p><h2 id="worlds-title">Bir dünya seç.<br /><span>Macerana başla.</span></h2></div><p>Birbirinden farklı düşünme oyunları.<br />İlk örnek soru için bir kart seçmen yeterli.</p></motion.div>
        <div className="zp-world-grid">{worlds.map(w => <motion.button {...reveal} type="button" key={w.type} className={`zp-world-card zp-ui-card zp-world-${w.theme}`} onClick={() => goDemo(w.type)}>
          <div className="zp-world-top"><span>KEŞİF / {w.number}</span><ArrowUpRight size={22} /></div>
          <WorldArtwork theme={w.theme} />
          <span className="zp-world-tag"><w.icon size={14} /> {w.tag}</span><h3>{w.title}</h3><p>{w.text}</p><span className="zp-world-link">Bir soru dene <ArrowRight size={16} /></span>
        </motion.button>)}</div>
      </section>
      <section id="kesfet" className="zp-demo-section" aria-labelledby="demo-title"><div className="zp-container zp-demo-grid">
        <motion.div {...reveal} className="zp-demo-intro"><p className="zp-kicker">İZLEMEK GÜZEL. DENEMEK DAHA GÜZEL.</p><h2 id="demo-title" tabIndex={-1} ref={demoHeading}>Bir küçük soru.<br /><span>Kocaman bir<br />“buldum!”</span></h2><p>Parçaları incele, kuralı keşfet, cevabını yerleştir. Acele yok; burada öğrenmenin yolu denemekten geçiyor.</p>
          <div className="zp-demo-steps"><div><span><Move size={19} /></span><p><strong>Dokun ya da sürükle</strong>Kartı seç, cevap alanına yerleştir.</p></div><div><span><Sparkles size={19} /></span><p><strong>Nasıl çözüldüğünü gör</strong>Cevabından sonra açıklamayı incele.</p></div><div><span><Keyboard size={19} /></span><p><strong>Sana uygun şekilde çöz</strong>Dokunmatik, fare veya klavye kullan.</p></div></div>
          <div className="zp-demo-progress"><span className="zp-progress-icon"><Trophy size={22} /></span><p><strong>{solved ? `${solved} soru denedin, ${correct} doğru buldun.` : 'İlk keşfin seni bekliyor.'}</strong><small>Bu sayfadaki deneme hesabına kaydedilmez.</small></p></div>
        </motion.div>
        <motion.div {...reveal} className="zp-demo-card zp-ui-card"><div className="zp-demo-card-header"><span><i /> KEŞİF ALANI</span><button type="button" className="zp-icon-button" aria-label={soundActive ? 'Sesi kapat' : 'Sesi aç'} aria-pressed={soundActive} onClick={() => { sound.enabled = !soundActive; setSoundActive(!soundActive); }}>{soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
          <div className="zp-demo-tabs" role="group" aria-label="Örnek soru alanı">{worlds.map(w => <button type="button" key={w.type} aria-pressed={category === w.type} onClick={() => nextQuestion(w.type)}><w.icon size={15} />{w.short}</button>)}</div>
          <h3>{question.prompt}</h3>{question.secondaryPrompt && <p className="zp-question-secondary">{question.secondaryPrompt}</p>}
          <QuestionRenderer question={question} />
          <AnswerWorkspace key={question.id} question={question} response={response} onChange={r => { if (!submitLock.current) setResponse(r); }} submitted={submitted} />
          {!submitted ? <PremiumButton className="zp-full" disabled={!result.complete} onClick={submit}>Cevabımı kontrol et <ArrowRight size={18} /></PremiumButton> : <div className="zp-demo-feedback"><p role="status" className={result.correct ? 'zp-correct' : 'zp-try-again'}>{landingQuestionAnswered() && solved === 0 ? 'Örnek soruyu daha önce tamamladın.' : result.correct ? 'Buldun! Güzel bir keşif yaptın.' : 'Birlikte bakalım. Her deneme yeni bir şey öğretir.'}</p>{solved > 0 && <VisualExplanationOverlay explanation={question.explanation} correctOptionId={question.correctOptionId} />}<PremiumButton className="zp-full" onClick={() => onNavigate('register')}>Hesap oluştur <ArrowRight size={17} /></PremiumButton></div>}
        </motion.div>
      </div></section>
      <section className="zp-rewards-section" aria-labelledby="rewards-title"><div className="zp-container">
        <motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker"><Trophy size={16} /> KEŞFET, GELİŞ, KUTLA</p><h2 id="rewards-title">Öğrenmek bir macera.<br /><span>İlerlemek ayrı bir heyecan!</span></h2><p>Günlük görevler, puanlar ve rozetlerle her yeni adımı görünür kıl.</p></motion.div>
        <div className="zp-rewards-grid">{rewards.map(r => <motion.article {...reveal} key={r.title} className={`zp-reward zp-reward-${r.theme}`}><span className="zp-reward-icon" aria-hidden="true"><r.icon size={34} /></span><h3>{r.title}</h3><p>{r.text}</p></motion.article>)}</div>
        <div className="zp-rewards-action"><PremiumButton onClick={() => onNavigate('register')}>Kendi keşif yolumu aç <ArrowRight size={18} /></PremiumButton><p>Kazanımlar öğrenci hesabında takip edilir.</p></div>
      </div></section>
      <section id="nasil" className="zp-container zp-section zp-journey" aria-labelledby="journey-title"><motion.div {...reveal} className="zp-centered-heading"><p className="zp-kicker">BÜYÜK KEŞİFLERİN KÜÇÜK RUTİNİ</p><h2 id="journey-title">Her gün, bir adım daha.</h2><p>Başkasının hızına yetişmek için değil, kendi yolunu keşfetmek için.</p></motion.div>
        <div className="zp-journey-grid">{[{ n: '01', title: 'Rotanı seç', text: 'Merak ettiğin bir alandan başla. Örüntü, mantık ya da dikkat… Seçim senin.', icon: Shapes }, { n: '02', title: 'Deneyerek öğren', text: 'Soruyu çöz, açıklamayı incele. Hatalarını bir sonraki keşfin ipucuna dönüştür.', icon: Brain }, { n: '03', title: 'Gelişimini kutla', text: 'Günlük görevlerini tamamla, XP biriktir ve kendi rekorunu geliştirmeye çalış.', icon: Trophy }].map(s => <motion.div {...reveal} key={s.n} className="zp-journey-step"><div className="zp-journey-icon"><s.icon size={28} /><span>{s.n}</span></div><h3>{s.title}</h3><p>{s.text}</p></motion.div>)}</div>
      </section>
      <section id="aile" className="zp-container zp-family-section" aria-labelledby="family-title"><motion.div {...reveal} className="zp-family-panel zp-ui-card"><div className="zp-family-visual" aria-hidden="true"><div className="zp-family-ring" /><div className="zp-family-heart"><Heart size={80} fill="currentColor" strokeWidth={1} /></div><div className="zp-family-small-card"><ShieldCheck size={23} /><span>Yanında ol.<br /><strong>Yolunu ona bırak.</strong></span></div><div className="zp-family-spark">✦</div></div><div className="zp-family-copy"><p className="zp-kicker">BİRLİKTE DAHA GÜZEL</p><h2 id="family-title">Onun keşif dünyası.<br />Sizin destek alanınız.</h2><p>Çocuğunuzun çabasını fark edin, ilerleyişine eşlik edin. Veli alanından çalışma ve gelişim bilgilerini takip edin.</p><PremiumButton tone="dark" onClick={() => onNavigateToLogin('parent')}>Veli alanına geç <ArrowUpRight size={18} /></PremiumButton></div></motion.div></section>
      <section id="yardim" className="zp-container zp-section zp-faq" aria-labelledby="faq-title"><div><p className="zp-kicker">AKLINDA BİR SORU MU VAR?</p><h2 id="faq-title">Merak etmek<br />işin başlangıcı.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={19} /></summary><p>{a}</p></details>)}</div></section>
      <section className="zp-container zp-final-section"><div className="zp-final-cta"><span aria-hidden="true" className="zp-cta-star">✦</span><p className="zp-kicker">HADİ, BİR ADIM ATALIM.</p><h2>Bir sonraki keşif senin.</h2><PremiumButton tone="lime" onClick={() => onNavigate('register')}>ZekaPark’a katıl <ArrowRight size={19} /></PremiumButton><p className="zp-final-note">Merakını getir. Gerisini birlikte keşfedelim.</p></div></section>
    </main>
    <footer className="zp-footer"><div className="zp-container"><div className="zp-footer-top"><div><Logo size="md" showTagline={false} /><p>Düşünmenin keyfini keşfet.</p></div><div><button type="button" onClick={() => onNavigateToLogin('student')}>Öğrenci girişi</button><button type="button" onClick={() => onNavigateToLogin('parent')}>Veli girişi</button><button type="button" onClick={() => onNavigateToLogin('admin')}>Yönetici girişi</button></div></div><div className="zp-footer-bottom"><span>© {new Date().getFullYear()} ZekaPark</span><div><button type="button" onClick={() => setTopic('kvkk')}>Gizlilik ve KVKK</button><button type="button" onClick={() => setTopic('terms')}>Kullanım koşulları</button><a href="mailto:zeka.kupu.test@gmail.com">İletişim</a></div><span>Merakla büyüyen zihinler için.</span></div></div></footer>
    {topic && <Suspense fallback={<div role="status" className="zp-modal-loading">Bilgiler yükleniyor… <button type="button" onClick={() => setTopic(null)}>Kapat</button></div>}><FooterInfoModal topic={topic} onClose={() => setTopic(null)} /></Suspense>}
  </div>;
};
