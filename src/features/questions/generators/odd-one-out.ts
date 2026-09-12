import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE, ShapeKind } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateOddOneOutQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const ruleType = rng.nextInt(1, 4); // 1: rotation, 2: marker, 3: color/fill, 4: side count/category

  let optionsData: ShapeItem[] = [];
  let correctIdx = rng.nextInt(0, 3);
  let ruleTitle = '';
  let explanationStep = '';

  const colors = rng.pickUnique(COLORS_POOL, 3);
  const baseColor = colors[0];
  const altColor = colors[1];

  if (ruleType === 1) {
    // Rotation difference: asymmetric shape rotated clockwise 90 deg steps, odd one is wrong angle
    const shape = rng.pick(ASYMMETRIC_SHAPES);
    ruleTitle = 'Dönme Açısı ve Yönü';
    const angles = [0, 90, 180, 270];
    const chosenAngles = rng.shuffle(angles);

    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        // Odd one: 45 deg offset angle
        optionsData.push({
          kind: shape,
          fill: baseColor,
          rotation: (chosenAngles[i] + 45) % 360,
          marker: 'none',
        });
      } else {
        optionsData.push({
          kind: shape,
          fill: baseColor,
          rotation: chosenAngles[i],
          marker: 'none',
        });
      }
    }
    explanationStep = `${String.fromCharCode(65 + correctIdx)} seçeneğindeki şekil diğerleri gibi 90° dik açılarla değil, 45° eğik bir açıyla döndürülmüştür.`;
  } else if (ruleType === 2) {
    // Marker position rule with 4 distinct rotations (0, 90, 180, 270)
    const shape = rng.pick(SHAPES_POOL.filter((s) => s !== 'arrow' && s !== 'circle'));
    ruleTitle = 'İşaretleyici Konumu';
    const angles = [0, 90, 180, 270];
    const markerPositions: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];

    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        // Inverted marker position
        const wrongPos = markerPositions[(i + 2) % 4];
        optionsData.push({
          kind: shape,
          fill: baseColor,
          rotation: angles[i],
          marker: 'dot',
          markerPos: wrongPos,
          markerColor: PALETTE.white,
        });
      } else {
        optionsData.push({
          kind: shape,
          fill: baseColor,
          rotation: angles[i],
          marker: 'dot',
          markerPos: markerPositions[i],
          markerColor: PALETTE.white,
        });
      }
    }
    explanationStep = `Şekil döndürüldükçe işaretleyici de aynı doğrultuda hareket etmelidir. Ancak ${String.fromCharCode(65 + correctIdx)} seçeneğinde işaretleyici kurala uymayan zıt bir konumdadır.`;
  } else if (ruleType === 3) {
    // Color/Fill difference with 4 distinct shapes
    const fourShapes = rng.pickUnique(SHAPES_POOL, 4);
    ruleTitle = 'Renk Uyumu';

    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        optionsData.push({
          kind: fourShapes[i],
          fill: altColor,
          rotation: 0,
          marker: 'none',
        });
      } else {
        optionsData.push({
          kind: fourShapes[i],
          fill: baseColor,
          rotation: 0,
          marker: 'none',
        });
      }
    }
    explanationStep = `Tüm şekiller ${baseColor === PALETTE.indigo ? 'mavi' : 'aynı'} renge sahipken, yalnızca ${String.fromCharCode(65 + correctIdx)} seçeneği farklı bir renktedir.`;
  } else {
    // Shape category: 3 distinct 4-sided shapes, 1 odd shape (triangle, circle, star)
    ruleTitle = 'Geometrik Özellik ve Köşe Sayısı';
    const fourSidedPool: ShapeKind[] = ['square', 'diamond', 'trapezoid'];
    const pickedFourSided = rng.pickUnique(fourSidedPool, 3);
    const oddShape = rng.pick(['circle', 'triangle', 'star', 'hexagon'] as ShapeKind[]);

    let fourSidedIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        optionsData.push({
          kind: oddShape,
          fill: baseColor,
          rotation: 0,
          marker: 'none',
        });
      } else {
        optionsData.push({
          kind: pickedFourSided[fourSidedIdx++],
          fill: baseColor,
          rotation: 0,
          marker: 'none',
        });
      }
    }
    explanationStep = `Diğer 3 seçenek 4 kenarlı/köşeli geometrik şekiller iken, ${String.fromCharCode(65 + correctIdx)} seçeneğindeki şekil farklı sayıda kenar/köşeye sahiptir.`;
  }

  // Build Visual Options
  const optionLetters = ['A', 'B', 'C', 'D'];
  const options: VisualOption[] = optionsData.map((data, idx) => ({
    id: optionLetters[idx],
    label: optionLetters[idx],
    fingerprint: generateVisualFingerprint(data),
    visualData: data,
  }));

  const correctOptionId = optionLetters[correctIdx];

  return {
    id: `ooo-${seed}-${difficulty}`,
    version: 1,
    type: 'odd_one_out',
    category: 'visual_perception',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Aşağıdaki şekillerden hangisi diğerlerinden FARKLI bir kurala sahiptir?',
    secondaryPrompt: 'Detayları, dönüş yönünü ve işaretleyicileri dikkatle incele.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle,
      summary: explanationStep,
      steps: [
        'Tüm seçeneklerin ortak özelliklerini belirle (şekil türü, yön, konum).',
        '3 şeklin uyduğu ancak 1 şeklin bozduğu kuralı tespit et.',
        explanationStep,
      ],
      visualHint: {
        type: 'highlight',
        highlightOptionId: correctOptionId,
      },
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Görsel Ayrıştırma', 'Kural Algılama', 'Detay Odaklanması'],
    seed,
    visualConfig: {
      displayMode: 'options_only',
      optionsData,
    },
  };
}
