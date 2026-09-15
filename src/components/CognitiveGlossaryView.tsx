import React, { useState, useMemo } from 'react';
import { GLOSSARY_TERMS } from '../data/glossary-terms';
import { GlossaryTerm, CognitiveCategory } from '../types';
import { GlossaryInteractiveDemo } from './GlossaryInteractiveDemo';
import { sound } from '../lib/sound';
import {
  BookOpen,
  Search,
  Lightbulb,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Brain,
  Layers,
  ChevronDown,
  ChevronUp,
  Compass,
  CheckCircle2,
  Bookmark,
  Share2,
} from 'lucide-react';

interface CognitiveGlossaryViewProps {
  onStartPractice: (category?: string) => void;
  onNavigateHome: () => void;
}

export const CognitiveGlossaryView: React.FC<CognitiveGlossaryViewProps> = ({
  onStartPractice,
  onNavigateHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTermId, setExpandedTermId] = useState<string | null>('matris');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['matris']));

  const categoryOptions = [
    { id: 'all', label: 'Tüm Terimler' },
    { id: 'spatial', label: 'Uzamsal & Şekil' },
    { id: 'matrix', label: 'Matris' },
    { id: 'pattern', label: 'Örüntü' },
    { id: 'logic', label: 'Mantık & Çıkarım' },
  ];

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.term.toLowerCase().includes(q) ||
        item.englishTerm.toLowerCase().includes(q) ||
        item.shortDefinition.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    sound.playClick();
    setExpandedTermId((prev) => (prev === id ? null : id));
  };

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    sound.playSuccess();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-28 space-y-6">
      {/* Header Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 ">
        <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                İnteraktif Kavram Rehberi
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold">
                BİLSEM Hazırlık
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] tracking-tight">
              📖 Bilişsel Terimler Sözlüğü
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
              Soru çözümlerinde ve açıklamalarda karşılaştığın zor terimleri canlı simülasyonlarla dene, mantığını kavra ve sınavda fark yarat!
            </p>
          </div>

          {/* Quick Practice Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-xs text-indigo-100 flex flex-col gap-2 shrink-0 max-w-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Dokunarak Öğren!</span>
            </div>
            <p className="text-[11px] text-indigo-200">
              Her terimin altında yer alan canlı simülatörlerle döndürme, ayna yansıması ve örüntü mantığını test edebilirsin.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200  space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Terim ara... (örn: matris, rotasyon, simetri, analoji, kağıt katlama)"
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categoryOptions.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sound.playClick();
                setSelectedCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white '
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="text-xs text-slate-400 font-medium ml-auto hidden sm:inline">
            {filteredTerms.length} terim listeleniyor
          </span>
        </div>
      </div>

      {/* Terms Accordion & Interactive Cards */}
      <div className="space-y-4">
        {filteredTerms.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-zinc-200 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-700 text-base">Aradığınız kriterde terim bulunamadı</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Farklı bir arama kelimesi yazabilir veya kategori filtresini sıfırlayabilirsiniz.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold  cursor-pointer"
            >
              Tüm Terimleri Göster
            </button>
          </div>
        ) : (
          filteredTerms.map((term) => {
            const isExpanded = expandedTermId === term.id;
            const isBookmarked = bookmarkedIds.has(term.id);

            return (
              <div
                key={term.id}
                id={`term-card-${term.id}`}
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-300  ring-1 ring-indigo-200/50'
                    : 'border-zinc-200 hover:border-slate-300 '
                }`}
              >
                {/* Header Row (Clickable) */}
                <div
                  onClick={() => toggleExpand(term.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all ${
                        isExpanded
                          ? 'bg-indigo-600 text-white  '
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      <Brain className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                          {term.term}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono">({term.englishTerm})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {term.badge}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        {term.shortDefinition}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={(e) => toggleBookmark(e, term.id)}
                      title={isBookmarked ? 'Kaydedildi' : 'Kaydet'}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isBookmarked
                          ? 'text-amber-500 bg-amber-50'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                    >
                      <Bookmark
                        className="w-4 h-4"
                        fill={isBookmarked ? 'currentColor' : 'none'}
                      />
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Section */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-zinc-200 bg-slate-50/40 space-y-5">
                    {/* 2-Column Content: Detailed Explanation & Interactive Simulation */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                      {/* Left: Detailed Concept & BİLSEM Exam Tip */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Nasıl Çalışır & Sınav Mantığı
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-zinc-200/80">
                            {term.detailedExplanation}
                          </p>
                        </div>

                        {/* BİLSEM Tip Highlight Box */}
                        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                            <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                            <span>BİLSEM Sınav Taktikleri & Pratik İpucu</span>
                          </div>
                          <p className="text-xs text-amber-950 font-medium leading-relaxed">
                            {term.bilsemTip}
                          </p>
                        </div>

                        {/* Example Scenario */}
                        <div className="text-xs text-slate-600 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                          <strong className="text-indigo-900 block font-bold mb-0.5">
                            💡 Örnek Durum:
                          </strong>
                          {term.exampleScenario}
                        </div>
                      </div>

                      {/* Right: Live Interactive Simulator */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          İnteraktif Deneme & Simülasyon
                        </h4>
                        <GlossaryInteractiveDemo demoType={term.demoType} />
                      </div>
                    </div>

                    {/* Footer Row: Tags & Practice Button */}
                    <div className="pt-3 border-t border-zinc-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 mr-1">Etiketler:</span>
                        {term.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white text-slate-600 text-[11px] font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          sound.playClick();
                          onStartPractice(term.practiceCategory);
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs   active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Bu Kavramla İlgili Pratik Yap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cognitive Tips for Parents & Mentors Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-400 text-amber-950">
              <Lightbulb className="w-4 h-4" />
            </span>
            <h4 className="font-extrabold text-sm sm:text-base text-amber-950 font-['Outfit',sans-serif]">
              Öğretmen & Veli Notu: Bilişsel Dil Neden Önemlidir?
            </h4>
          </div>
          <p className="text-xs text-amber-900 max-w-2xl leading-relaxed">
            Çocuklar soru çözerken "rotasyon", "simetri ekseni" veya "analoji" gibi terimleri kavradıklarında, sorunun çözüm algoritmasını zihinlerinde çok daha hızlı ve sistematik olarak kurabilirler.
          </p>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onStartPractice();
          }}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs   active:scale-98 transition-all cursor-pointer whitespace-nowrap"
        >
          Genel Pratiğe Başla
        </button>
      </div>
    </div>
  );
};
