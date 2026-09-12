import React from 'react';
import { CognitiveCategory, QuestionType, QUESTION_TYPE_LABELS } from '../../types';
import { CATEGORY_TYPES_MAP } from '../../features/questions/generators';
import { sound } from '../../lib/sound';
import {
  Compass,
  Grid,
  Layers,
  Eye,
  Brain,
  Target,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface CategoryCurriculumData {
  id: CognitiveCategory;
  name: string;
  pedagogicalRole: string;
  chcConstruct: string; // Cattell-Horn-Carroll Cognitive Construct (Gf, Gv, etc.)
  bilsemStage1Weight: number; // % in Tablet Screen exam
  bilsemStage2Weight: number; // % in Individual Assessment
  recommendedGrades: string;
  types: QuestionType[];
  color: string;
  bgBadge: string;
  icon: React.ReactNode;
}

interface AdminCurriculumMatrixProps {
  onSelectTypeForStudio: (type: QuestionType) => void;
}

export const AdminCurriculumMatrix: React.FC<AdminCurriculumMatrixProps> = ({
  onSelectTypeForStudio,
}) => {
  const curriculumData: CategoryCurriculumData[] = [
    {
      id: 'matrix',
      name: 'Matris Tamamlama',
      pedagogicalRole: 'Raven Progresif Matrisleri modelinde soyut ilişkileri ve iki boyutlu mantık kuralını keşfetme.',
      chcConstruct: 'Akıcı Zeka (Gf - Fluid Intelligence)',
      bilsemStage1Weight: 22,
      bilsemStage2Weight: 25,
      recommendedGrades: '1, 2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.matrix,
      color: 'text-indigo-700 border-indigo-200 bg-indigo-50/70',
      bgBadge: 'bg-indigo-100 text-indigo-800',
      icon: <Grid className="w-5 h-5 text-indigo-600" />,
    },
    {
      id: 'spatial',
      name: 'Uzamsal Zeka ve Döndürme',
      pedagogicalRole: '3B veya 2B şekilleri zihinde döndürme, ayna yansıması, rota takip ve simetri tamamlama.',
      chcConstruct: 'Görsel İşleme & Zihinsel Döndürme (Gv - Visual Processing)',
      bilsemStage1Weight: 20,
      bilsemStage2Weight: 25,
      recommendedGrades: '1, 2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.spatial,
      color: 'text-purple-700 border-purple-200 bg-purple-50/70',
      bgBadge: 'bg-purple-100 text-purple-800',
      icon: <Compass className="w-5 h-5 text-purple-600" />,
    },
    {
      id: 'pattern',
      name: 'Örüntü ve Dizi Analizi',
      pedagogicalRole: 'Görsel adımlardaki artış, azalış, renk veya şekil döngüsü kuralını saptayıp sonraki elemanı tahmin etme.',
      chcConstruct: 'Tümevarımsal Akıl Yürütme (Gf - Inductive Reasoning)',
      bilsemStage1Weight: 18,
      bilsemStage2Weight: 15,
      recommendedGrades: '1, 2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.pattern,
      color: 'text-emerald-700 border-emerald-200 bg-emerald-50/70',
      bgBadge: 'bg-emerald-100 text-emerald-800',
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
    },
    {
      id: 'logic',
      name: 'Mantık ve Muhakeme',
      pedagogicalRole: 'Sembol şifreleme, görsel analoji (A:B :: C:?), sınıflandırma ve mantıksal nedensellik akışı.',
      chcConstruct: 'Genel Muhakeme & Analoji (Gf / Gc)',
      bilsemStage1Weight: 15,
      bilsemStage2Weight: 15,
      recommendedGrades: '2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.logic,
      color: 'text-amber-700 border-amber-200 bg-amber-50/70',
      bgBadge: 'bg-amber-100 text-amber-800',
      icon: <Brain className="w-5 h-5 text-amber-600" />,
    },
    {
      id: 'visual_perception',
      name: 'Görsel Algı',
      pedagogicalRole: 'Detaylardaki farklı olanı ayıklama, eksik parça-bütün ilişkisi ve geometrik örtüşme algısı.',
      chcConstruct: 'Görsel Ayrıştırma & Algı (Gv)',
      bilsemStage1Weight: 10,
      bilsemStage2Weight: 8,
      recommendedGrades: '1 ve 2. Sınıf (Öncelikli)',
      types: CATEGORY_TYPES_MAP.visual_perception,
      color: 'text-sky-700 border-sky-200 bg-sky-50/70',
      bgBadge: 'bg-sky-100 text-sky-800',
      icon: <Eye className="w-5 h-5 text-sky-600" />,
    },
    {
      id: 'attention',
      name: 'Dikkat ve Odaklanma',
      pedagogicalRole: 'Karmaşık sahnede hedef şekil adedini sayma, çeldiriciler arasında odaklanmayı sürdürme.',
      chcConstruct: 'İşlem Hızı & Seçici Dikkat (Gs - Processing Speed)',
      bilsemStage1Weight: 7,
      bilsemStage2Weight: 5,
      recommendedGrades: '1, 2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.attention,
      color: 'text-rose-700 border-rose-200 bg-rose-50/70',
      bgBadge: 'bg-rose-100 text-rose-800',
      icon: <Target className="w-5 h-5 text-rose-600" />,
    },
    {
      id: 'memory',
      name: 'Görsel Bellek',
      pedagogicalRole: 'Kısa süre gösterilen karmaşık sembol ve konum matrisini zihinde tutup geri çağırma.',
      chcConstruct: 'Çalışma Belleği & Kısa Süreli Hafıza (Gsm - Working Memory)',
      bilsemStage1Weight: 5,
      bilsemStage2Weight: 5,
      recommendedGrades: '1, 2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.memory,
      color: 'text-teal-700 border-teal-200 bg-teal-50/70',
      bgBadge: 'bg-teal-100 text-teal-800',
      icon: <Sparkles className="w-5 h-5 text-teal-600" />,
    },
    {
      id: 'numerical',
      name: 'Sayısal Muhakeme',
      pedagogicalRole: 'Aritmetik örüntüler, şekil-sayı bağıntıları ve sayısal mantık akışları.',
      chcConstruct: 'Niceliksel Bilgi & Akıl Yürütme (Gq - Quantitative Knowledge)',
      bilsemStage1Weight: 3,
      bilsemStage2Weight: 2,
      recommendedGrades: '2, 3 ve 4. Sınıf',
      types: CATEGORY_TYPES_MAP.numerical,
      color: 'text-orange-700 border-orange-200 bg-orange-50/70',
      bgBadge: 'bg-orange-100 text-orange-800',
      icon: <BookOpen className="w-5 h-5 text-orange-600" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-extrabold text-slate-900">
            BİLSEM Müfredat Standardı & 8 Bilişsel Alan Matrisi
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Cattell-Horn-Carroll (CHC) bilişsel kuramı ve MEB BİLSEM Genel Yetenek Sınavı standartlarına göre modellenmiş 8 zeka alanı ve bunlara bağlı 18 parametrik motor mimarisi.
        </p>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {curriculumData.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl p-5 border border-zinc-200  space-y-3.5 hover:border-purple-300 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-50 border border-zinc-200 shrink-0">
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] font-mono text-purple-700 font-bold">
                    {cat.chcConstruct}
                  </span>
                </div>
              </div>

              {/* BİLSEM Exam Weight Badge */}
              <div className="text-right shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${cat.bgBadge}`}>
                  %{cat.bilsemStage1Weight} Sınav Ağırlığı
                </span>
              </div>
            </div>

            {/* Pedagogical Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              {cat.pedagogicalRole}
            </p>

            {/* Recommended Grades */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-zinc-200 pt-2 font-medium">
              <span>Hedef Düzey: <strong className="text-slate-700">{cat.recommendedGrades}</strong></span>
              <span>2. Aşama Mülakat: <strong className="text-indigo-700 font-bold">%{cat.bilsemStage2Weight}</strong></span>
            </div>

            {/* Associated Procedural Question Engines */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Bağlı Parametrik Soru Motorları ({cat.types.length} Motor):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {cat.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      sound.playClick();
                      onSelectTypeForStudio(type);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-800 border border-zinc-200 hover:border-purple-300 text-xs font-semibold transition-colors cursor-pointer group"
                    title="Bu motoru Soru Stüdyosunda Aç"
                  >
                    <span>{QUESTION_TYPE_LABELS[type]}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-purple-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
