import React, { useState } from 'react';
import { GlossaryDemoType } from '../types';
import { sound } from '../lib/sound';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Play,
  CheckCircle2,
  HelpCircle,
  Sun,
  Eye,
  Sparkles,
} from 'lucide-react';

interface GlossaryInteractiveDemoProps {
  demoType: GlossaryDemoType;
}

export const GlossaryInteractiveDemo: React.FC<GlossaryInteractiveDemoProps> = ({ demoType }) => {
  // --- ROTATION DEMO STATE ---
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // --- SYMMETRY DEMO STATE ---
  const [symmetryMode, setSymmetryMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [showMirror, setShowMirror] = useState<boolean>(true);

  // --- MATRIX DEMO STATE ---
  const [selectedMatrixAnswer, setSelectedMatrixAnswer] = useState<string | null>(null);

  // --- PATTERN DEMO STATE ---
  const [patternStep, setPatternStep] = useState<number>(3);

  // --- FOLDING DEMO STATE ---
  const [foldingState, setFoldingState] = useState<'open' | 'folded' | 'unfolded'>('unfolded');

  // --- ANALOGY DEMO STATE ---
  const [analogyRevealed, setAnalogyRevealed] = useState<boolean>(false);

  // --- SHADOW DEMO STATE ---
  const [lightOn, setLightOn] = useState<boolean>(true);

  // --- ODD DEMO STATE ---
  const [oddSelected, setOddSelected] = useState<number | null>(null);

  // Render by demo type
  if (demoType === 'rotation_demo') {
    const rotateClockwise = () => {
      sound.playClick();
      setRotationAngle((prev) => (prev + 90) % 360);
    };

    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Canlı Rotasyon Simülatörü
          </span>
          <span className="text-xs font-mono font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            Açı: {rotationAngle}°
          </span>
        </div>

        {/* Visual Box with Compass */}
        <div className="relative w-36 h-36 bg-white rounded-xl border-2 border-indigo-100  flex items-center justify-center">
          {/* Faint crosshair */}
          <div className="absolute inset-x-0 top-1/2 border-t border-zinc-200" />
          <div className="absolute inset-y-0 left-1/2 border-l border-zinc-200" />

          {/* Rotating Figure */}
          <div
            className="transition-transform duration-500 ease-out flex flex-col items-center"
            style={{ transform: `rotate(${rotationAngle}deg)` }}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-t-lg flex items-center justify-center text-white text-xs font-bold">
              ▲
            </div>
            <div className="flex">
              <div className="w-8 h-8 bg-indigo-500" />
              <div className="w-8 h-8 bg-amber-400 rounded-r-lg flex items-center justify-center text-white text-[10px] font-bold">
                ●
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={rotateClockwise}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5  cursor-pointer transition-all active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>+90° Saat Yönünde Çevir</span>
          </button>
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => {
                sound.playClick();
                setRotationAngle(deg);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                rotationAngle === deg
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (demoType === 'symmetry_demo') {
    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ayna Yansıması Simülatörü
          </span>
          <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-zinc-200">
            <button
              onClick={() => {
                sound.playClick();
                setSymmetryMode('vertical');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                symmetryMode === 'vertical' ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              Dikey Ayna
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setSymmetryMode('horizontal');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                symmetryMode === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              Yatay Ayna
            </button>
          </div>
        </div>

        {/* Visual Mirror Stage */}
        <div
          className={`relative bg-white rounded-xl border border-zinc-200 p-4 flex ${
            symmetryMode === 'vertical' ? 'flex-row items-center' : 'flex-col items-center'
          } gap-4 `}
        >
          {/* Original Shape */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-slate-400 mb-1">Orijinal Şekil</span>
            <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-400 rounded-xl flex items-center justify-center relative overflow-hidden">
              {/* Distinctive Asymmetric Pattern */}
              <div className="w-10 h-10 border-t-4 border-l-4 border-indigo-600 relative">
                <div className="w-3 h-3 rounded-full bg-amber-500 absolute -top-2 -left-2" />
                <div className="w-4 h-4 bg-emerald-500 absolute bottom-0 right-0" />
              </div>
            </div>
          </div>

          {/* Mirror Divider Line */}
          <div
            className={`relative flex items-center justify-center ${
              symmetryMode === 'vertical' ? 'h-24 w-4 flex-col' : 'w-24 h-4'
            }`}
          >
            <div
              className={`${
                symmetryMode === 'vertical' ? 'h-full w-0.5' : 'w-full h-0.5'
              } border-dashed border-2 border-amber-400`}
            />
            <span className="text-[9px] font-black bg-amber-400 text-amber-950 px-1 rounded absolute whitespace-nowrap">
              {symmetryMode === 'vertical' ? 'Dikey Ayna' : 'Yatay Ayna'}
            </span>
          </div>

          {/* Reflected Shape */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-emerald-600 mb-1">Yansıma</span>
            <div
              className={`w-20 h-20 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
                showMirror ? 'opacity-100 scale-100' : 'opacity-20 scale-95'
              }`}
            >
              <div
                className="w-10 h-10 border-t-4 border-l-4 border-indigo-600 relative transition-transform duration-300"
                style={{
                  transform:
                    symmetryMode === 'vertical' ? 'scaleX(-1)' : 'scaleY(-1)',
                }}
              >
                <div className="w-3 h-3 rounded-full bg-amber-500 absolute -top-2 -left-2" />
                <div className="w-4 h-4 bg-emerald-500 absolute bottom-0 right-0" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            setShowMirror(!showMirror);
          }}
          className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showMirror ? 'Yansımayı Gizle (Kendin Hayal Et)' : 'Yansımayı Göster'}</span>
        </button>
      </div>
    );
  }

  if (demoType === 'matrix_demo') {
    const isCorrect = selectedMatrixAnswer === 'c';

    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2x2 İnteraktif Matris Örneği
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Kural: Şekiller sırayla 1 renk değiştirir
          </span>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-200 rounded-xl">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center ">
            <div className="w-8 h-8 rounded-full bg-indigo-600" />
          </div>
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center ">
            <div className="w-8 h-8 rounded-full bg-amber-500" />
          </div>
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center ">
            <div className="w-8 h-8 bg-indigo-600 rounded-md" />
          </div>
          <div
            className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed transition-all ${
              selectedMatrixAnswer
                ? isCorrect
                  ? 'bg-emerald-50 border-emerald-500'
                  : 'bg-rose-50 border-rose-400'
                : 'bg-indigo-50/70 border-indigo-300'
            }`}
          >
            {selectedMatrixAnswer === 'c' ? (
              <div className="w-8 h-8 bg-amber-500 rounded-md" />
            ) : selectedMatrixAnswer === 'a' ? (
              <div className="w-8 h-8 bg-indigo-600 rounded-md" />
            ) : selectedMatrixAnswer === 'b' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500" />
            ) : (
              <span className="text-xl font-extrabold text-indigo-400">?</span>
            )}
          </div>
        </div>

        {/* Answer Options */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Soru işareti yerine hangisi gelmeli?</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedMatrixAnswer('a');
              }}
              className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <div className="w-4 h-4 bg-indigo-600 rounded-xs" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setSelectedMatrixAnswer('b');
              }}
              className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500" />
            </button>
            <button
              onClick={() => {
                sound.playSuccess();
                setSelectedMatrixAnswer('c');
              }}
              className="w-8 h-8 rounded-lg bg-white border-2 border-amber-300 flex items-center justify-center hover:bg-amber-50 cursor-pointer "
            >
              <div className="w-4 h-4 bg-amber-500 rounded-xs" />
            </button>
          </div>
        </div>

        {selectedMatrixAnswer && (
          <p
            className={`text-xs font-bold flex items-center gap-1 ${
              isCorrect ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Harika! Daireler sarıya döndüğü gibi, kare de sarıya dönüşür!</span>
              </>
            ) : (
              <span>Tekrar dene: Satır kuralına dikkat et (Daire: Mavi→Sarı, Kare: Mavi→?).</span>
            )}
          </p>
        )}
      </div>
    );
  }

  if (demoType === 'pattern_demo') {
    const patternItems = [
      { shape: 'circle', color: 'bg-indigo-600', label: '1. Adım' },
      { shape: 'square', color: 'bg-amber-500', label: '2. Adım' },
      { shape: 'circle', color: 'bg-indigo-600', label: '3. Adım' },
      { shape: 'square', color: 'bg-amber-500', label: '4. Adım' },
      { shape: 'circle', color: 'bg-indigo-600', label: '5. Adım (?)' },
    ];

    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Adım Adım Örüntü İlerlemesi
          </span>
          <span className="text-xs font-mono font-bold text-slate-600">
            Adım: {patternStep + 1} / 5
          </span>
        </div>

        {/* Sequence Track */}
        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-white rounded-xl border border-zinc-200">
          {patternItems.map((item, idx) => {
            const isRevealed = idx <= patternStep;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                    isRevealed
                      ? 'bg-slate-50 border border-zinc-200'
                      : 'bg-slate-100 border-2 border-dashed border-slate-300'
                  }`}
                >
                  {isRevealed ? (
                    <div
                      className={`w-6 h-6 ${item.color} ${
                        item.shape === 'circle' ? 'rounded-full' : 'rounded-md'
                      } transition-all duration-300 scale-100`}
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">?</span>
                  )}
                </div>
                {idx < patternItems.length - 1 && (
                  <span className="text-slate-300 text-xs font-bold">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Step / Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setPatternStep((prev) => (prev < 4 ? prev + 1 : 0));
            }}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5  cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{patternStep < 4 ? 'Sonraki Adımı Aç' : 'Baştan Başlat'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (demoType === 'folding_demo') {
    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Kağıt Katlama & Açma Simülasyonu
          </span>
          <span className="text-xs text-slate-500 font-medium">Durum: {foldingState}</span>
        </div>

        {/* Paper Stage */}
        <div className="flex items-center justify-center p-3 bg-white rounded-xl border border-zinc-200  min-h-[120px]">
          {foldingState === 'open' && (
            <div className="w-24 h-24 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-center justify-center relative">
              <span className="text-[11px] font-bold text-amber-800">Düz Kare Kağıt</span>
              <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-amber-500" />
            </div>
          )}

          {foldingState === 'folded' && (
            <div className="w-12 h-24 bg-amber-100 border-2 border-amber-400 rounded-r-lg flex items-center justify-center relative ">
              <span className="text-[10px] font-bold text-amber-900 text-center px-1">
                İkiye Katlandı & Delindi
              </span>
              {/* Hole punch simulation */}
              <div className="absolute top-4 right-2 w-3 h-3 rounded-full bg-slate-900 " />
            </div>
          )}

          {foldingState === 'unfolded' && (
            <div className="w-24 h-24 bg-amber-50 border-2 border-emerald-400 rounded-lg flex items-center justify-center relative">
              <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300" />
              {/* Symmetrical Holes after unfolding */}
              <div className="absolute top-4 left-3 w-3 h-3 rounded-full bg-slate-900 " />
              <div className="absolute top-4 right-3 w-3 h-3 rounded-full bg-slate-900 " />
              <span className="text-[10px] font-bold text-emerald-800 absolute bottom-1">
                2 Simetrik Delik Oluştu!
              </span>
            </div>
          )}
        </div>

        {/* Phase Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              setFoldingState('open');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
              foldingState === 'open' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-zinc-200'
            }`}
          >
            1. Düz Kağıt
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFoldingState('folded');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
              foldingState === 'folded' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-zinc-200'
            }`}
          >
            2. Katla ve Del
          </button>
          <button
            onClick={() => {
              sound.playSuccess();
              setFoldingState('unfolded');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
              foldingState === 'unfolded' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-zinc-200'
            }`}
          >
            3. Geri Aç (Sonuç)
          </button>
        </div>
      </div>
    );
  }

  if (demoType === 'analogy_demo') {
    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            A:B :: C:? Analoji Kuralı
          </span>
          <span className="text-xs text-indigo-600 font-bold">Kural: İçi Boş → İçi Dolu</span>
        </div>

        {/* Visual Analogy Flow */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3.5 rounded-xl border border-zinc-200">
          {/* Pair 1: A -> B */}
          <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
            <div className="w-10 h-10 border-2 border-indigo-600 bg-white rounded-md flex items-center justify-center text-xs font-bold text-indigo-600">
              A
            </div>
            <span className="text-xs font-extrabold text-indigo-400">➔</span>
            <div className="w-10 h-10 bg-indigo-600 rounded-md flex items-center justify-center text-xs font-bold text-white ">
              B
            </div>
          </div>

          <span className="text-base font-black text-slate-400">::</span>

          {/* Pair 2: C -> ? */}
          <div className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100">
            <div className="w-10 h-10 border-2 border-amber-500 bg-white rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
              C
            </div>
            <span className="text-xs font-extrabold text-amber-500">➔</span>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                analogyRevealed
                  ? 'bg-amber-500 text-white  scale-100'
                  : 'bg-white border-2 border-dashed border-amber-300 text-amber-400'
              }`}
            >
              {analogyRevealed ? '?' : '?'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playSuccess();
            setAnalogyRevealed(!analogyRevealed);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold  cursor-pointer"
        >
          {analogyRevealed ? 'Gizle' : 'Cevap Dönüşümünü Gör'}
        </button>
      </div>
    );
  }

  if (demoType === 'shadow_demo') {
    return (
      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Işık & Gölge İzdüşümü
          </span>
          <button
            onClick={() => {
              sound.playClick();
              setLightOn(!lightOn);
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
              lightOn ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-600'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{lightOn ? 'Işık Açık' : 'Işık Kapalı'}</span>
          </button>
        </div>

        {/* Shadow Display */}
        <div className="flex items-center justify-around w-full bg-white p-4 rounded-xl border border-zinc-200">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">Renkli Cisim</span>
            <div className="text-4xl">🚀</div>
          </div>

          <span className="text-xs font-extrabold text-slate-300">İzdüşüm ➔</span>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">Oluşan Gölge</span>
            <div
              className={`text-4xl filter grayscale contrast-200 transition-opacity duration-300 ${
                lightOn ? 'opacity-90 brightness-0' : 'opacity-10'
              }`}
            >
              🚀
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Gölgede roketin kanatları ve sivri burnu görünür; pencereleri ve renkleri yok olur!
        </p>
      </div>
    );
  }

  // Fallback / Odd One Out Demo
  return (
    <div className="bg-slate-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Farklı Olanı Bul (Dışlama)
        </span>
        <span className="text-xs text-indigo-600 font-bold">Kural: 4 Kenarlı Şekiller</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 1, shape: 'Kare (4)', icon: '🟦', isOdd: false },
          { id: 2, shape: 'Dikdörtgen (4)', icon: '▭', isOdd: false },
          { id: 3, shape: 'Daire (0)', icon: '🔴', isOdd: true },
          { id: 4, shape: 'Eşkenar Dörtgen (4)', icon: '◇', isOdd: false },
        ].map((item) => {
          const isSelected = oddSelected === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isOdd) sound.playSuccess();
                else sound.playClick();
                setOddSelected(item.id);
              }}
              className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center text-xl transition-all cursor-pointer ${
                isSelected
                  ? item.isOdd
                    ? 'bg-emerald-50 border-emerald-500 '
                    : 'bg-rose-50 border-rose-400'
                  : 'bg-white border-zinc-200 hover:border-indigo-300'
              }`}
            >
              <span>{item.icon}</span>
            </button>
          );
        })}
      </div>

      {oddSelected !== null && (
        <p className="text-xs font-bold text-center">
          {oddSelected === 3 ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
              Doğru! Diğer üçü 4 kenarlıyken, dairenin kenarı yoktur!
            </span>
          ) : (
            <span className="text-rose-600">Bu şekil 4 kenarlıdır. Farklı olan kenarsız olanı bul!</span>
          )}
        </p>
      )}
    </div>
  );
};
