import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Brain,
  CheckCircle2,
  Calendar,
  Heart,
  FileText,
  HelpCircle,
  LogIn,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  Send,
} from 'lucide-react';
import { sound } from '../lib/sound';
import { FooterInfoModal, FooterModalTopic } from './FooterInfoModal';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (route: string) => void;
  onStartDemo?: (role: 'student' | 'parent' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onStartDemo }) => {
  const [modalTopic, setModalTopic] = useState<FooterModalTopic | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const handleOpenModal = (topic: FooterModalTopic) => {
    sound.playClick();
    setModalTopic(topic);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      sound.playError();
      return;
    }
    sound.playSuccess();
    setNewsletterSuccess(true);
    setTimeout(() => {
      setNewsletterEmail('');
      setNewsletterSuccess(false);
    }, 4000);
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 text-sm">
      {/* 1. Top Newsletter / Veli Bilgilendirme Bandı */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>2026 BİLSEM Veli Bilgilendirme Bülteni</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-['Outfit',sans-serif]">
              BİLSEM Sınav Tarihleri ve Yeni Soru Tiplerinden Anında Haberdar Olun
            </h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              MEB'in yayımladığı resmi BİLSEM kılavuz güncellemeleri, RAM değerlendirme duyuruları ve haftalık pedagojik zeka egzersizleri e-postanıza gelsin. Sıfır spam garantisi.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex flex-col sm:flex-row gap-2.5">
            <div className="relative min-w-[280px] sm:min-w-[320px]">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Veli e-posta adresinizi girin..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer   transition-all shrink-0 active:scale-98"
            >
              {newsletterSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Kaydedildi!</span>
                </>
              ) : (
                <>
                  <span>Bültene Kaydol</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Main 5-Column Detailed Directory */}
      <div className="max-w-7xl mx-auto py-14 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-9">
          {/* Column 1: Kurumsal & Vizyon */}
          <div className="space-y-4 lg:col-span-1">
            <Logo
              size="md"
              theme="dark"
              showText={true}
              showTagline={true}
              onClick={() => {
                sound.playClick();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <p className="text-xs text-slate-400 leading-relaxed">
              Türkiye'nin ilk parametrik görsel bilişsel soru motoru. 1., 2. ve 3. sınıf öğrencileri için ezberden uzak, analitik düşünceyi ve sınav kondisyonunu güçlendiren bilimsel eğitim platformu.
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-start gap-2 text-slate-400">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <a
                  href="mailto:muratteknofest@gmail.com"
                  className="hover:text-white transition-colors break-all"
                >
                  muratteknofest@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>0850 308 24 10 (Danışma)</span>
              </div>
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>İTÜ Teknokent ARI-3 Maslak / İstanbul</span>
              </div>
            </div>

            {/* Pedagoji & Güvenlik Rozetleri */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />
                <span>%100 Reklamsız</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                <Heart className="w-3 h-3" />
                <span>Çocuk Güvenli</span>
              </span>
            </div>
          </div>

          {/* Column 2: Bilişsel Gelişim Alanları */}
          <div>
            <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 font-['Outfit',sans-serif] flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Bilişsel Alanlar</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Görsel Matris & Örüntü</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Uzamsal Algı & Zihinsel Döndürme</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Sayısal Mantık & Terazi Dengesi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Görsel Dikkat & Detay Ayırt Etme</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Kısa Süreli Çalışma Belleği</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Sembol Şifreleme & Kod Çözme</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('cognitive_domains')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Küp Sayma & 3B Perspektif</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: BİLSEM & Sınav Bilgi Merkezi */}
          <div>
            <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 font-['Outfit',sans-serif] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>BİLSEM Bilgi Merkezi</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => handleOpenModal('bilsem_guide')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer font-semibold text-purple-300"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>2026 BİLSEM Sınav Takvimi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('bilsem_guide')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>1., 2. ve 3. Sınıf Soru Sayıları</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('bilsem_guide')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>ASIS & WISC-IV Zeka Ölçekleri</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('exam_anxiety')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Sınav Kaygısını Önleme Rehberi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('glossary')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer text-indigo-400 font-medium"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Bilişsel Terimler Sözlüğü</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('bilsem_guide')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Tablet Sınavı İpuçları</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Platform & Hızlı Erişim */}
          <div>
            <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 font-['Outfit',sans-serif] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Hızlı Erişim</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('login')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer text-white font-bold"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Giriş Yap & Kayıt Ol</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onStartDemo) onStartDemo('student');
                    else onNavigate('dashboard');
                  }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm">🦊</span>
                  <span>Öğrenci Paneli (Deniz)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onStartDemo) onStartDemo('parent');
                    else onNavigate('parent');
                  }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm">👩‍💼</span>
                  <span>Veli Portalı & Raporlar</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onStartDemo) onStartDemo('admin');
                    else onNavigate('admin');
                  }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm">👨‍💻</span>
                  <span>Soru Mimarı Stüdyosu</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('mistakes')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Akıllı Hata Defteri</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('leaderboard')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>Haftalık Lider Tablosu</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Pedagoji & Yasal İlkeler */}
          <div>
            <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 font-['Outfit',sans-serif] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Pedagoji & Güvenlik</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => handleOpenModal('pedagogy')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer text-emerald-300 font-semibold"
                >
                  <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Pedagojik Güvence İlkeleri</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('kvkk')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>KVKK & Çocuk Verileri Metni</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('terms')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Kullanım Koşulları & Veli Hakları</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('contact')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>İletişim & Kurumsal Destek</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('pedagogy')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  <span>Ekran Süresi & Mavi Işık Koruması</span>
                </button>
              </li>
            </ul>

            <div className="mt-5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-normal">
              <span className="text-slate-300 font-bold block mb-1">Pedagojik Destek Hattı:</span>
              <span>Uzman psikolojik danışmanlarımıza <a href="mailto:muratteknofest@gmail.com" className="text-indigo-400 hover:underline">e-posta ile</a> soru iletebilirsiniz.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Yasal Sorumluluk Reddi (Disclaimer) Notu */}
      <div className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] text-slate-500 leading-relaxed text-center sm:text-left">
            <strong>Resmi Bildirim & Bağımsızlık Beyanı:</strong> ZekaPark, Millî Eğitim Bakanlığı (MEB), Bilim ve Sanat Merkezleri (BİLSEM) veya TÜBİTAK'ın resmi bir alt kuruluşu veya temsilcisi değildir. Platformumuz, bilişsel zeka soruları alanında bağımsız araştırmacı, pedagog ve yazılımcı kadrosu tarafından çocukların analitik yeteneklerini desteklemek ve tablet sınav ergonomisine aşinalık kazandırmak amacıyla hazırlanmış bir eğitim teknolojisi aracıdır. Tüm telif hakları saklıdır.
          </p>
        </div>
      </div>

      {/* 4. Alt Hukuki Bağlantılar & Telif Barı */}
      <div className="border-t border-slate-900 bg-slate-950 py-5 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>© 2026 ZekaPark Eğitim Teknolojileri A.Ş.</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">Tüm Hakları Saklıdır</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={() => handleOpenModal('kvkk')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Gizlilik & KVKK
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => handleOpenModal('terms')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Kullanım Koşulları
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => handleOpenModal('pedagogy')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Pedagojik Güvence
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => handleOpenModal('bilsem_guide')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              2026 BİLSEM Kılavuzu
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => handleOpenModal('contact')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              İletişim
            </button>
          </div>
        </div>
      </div>

      {/* 5. İnteraktif Bilgi Modalı */}
      {modalTopic && (
        <FooterInfoModal
          topic={modalTopic}
          onClose={() => setModalTopic(null)}
          onSelectTopic={(t) => setModalTopic(t)}
        />
      )}
    </footer>
  );
};
