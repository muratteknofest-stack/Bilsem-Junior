import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE, ShapeKind } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateOddOneOutQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Determine rule type based on difficulty for professional scaling
  let ruleType: number;
  if (difficulty <= 2) {
    ruleType = rng.pick([3, 4]); // Easy: simple color difference or side count
  } else if (difficulty <= 4) {
    ruleType = rng.pick([1, 2]); // Medium: rotation offsets or marker position
  } else {
    ruleType = 5; // Hard/Expert: Multi-rule composite (inner marker rotation vs outer shape rotation)
  }

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
        optionsData.push({
          kind: shape, fill: baseColor, rotation: (chosenAngles[i] + 45) % 360, marker: 'none'
        });
      } else {
        optionsData.push({
          kind: shape, fill: baseColor, rotation: chosenAngles[i], marker: 'none'
        });
      }
    }
    explanationStep = `${String.fromCharCode(65 + correctIdx)} seçeneğindeki şekil diğerleri gibi 90° dik açılarla değil, ara bir açıyla (45°) döndürülmüştür.`;
  } else if (ruleType === 2) {
    // Marker position rule with 4 distinct rotations (0, 90, 180, 270)
    const shape = rng.pick(SHAPES_POOL.filter((s) => s !== 'arrow' && s !== 'circle'));
    ruleTitle = 'Bağıl İşaretleyici Konumu';
    const angles = [0, 90, 180, 270];
    const markerPositions: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];

    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        // Inverted marker position relative to rotation
        const wrongPos = markerPositions[(i + 2) % 4];
        optionsData.push({
          kind: shape, fill: baseColor, rotation: angles[i], marker: 'dot', markerPos: wrongPos, markerColor: PALETTE.white
        });
      } else {
        optionsData.push({
          kind: shape, fill: baseColor, rotation: angles[i], marker: 'dot', markerPos: markerPositions[i], markerColor: PALETTE.white
        });
      }
    }
    explanationStep = `Şekil döndürüldükçe (0°, 90°, 180°, 270°) işaretleyicinin konumu da aynı doğrultuda hareket etmelidir. Ancak ${String.fromCharCode(65 + correctIdx)} seçeneğinde işaretleyici kurala uymayan zıt bir konumdadır.`;
  } else if (ruleType === 3) {
    // Color/Fill difference with 4 distinct shapes
    const fourShapes = rng.pickUnique(SHAPES_POOL, 4);
    ruleTitle = 'Renk Uyumu';
    for (let i = 0; i < 4; i++) {
      optionsData.push({
        kind: fourShapes[i], fill: i === correctIdx ? altColor : baseColor, rotation: 0, marker: 'none'
      });
    }
    explanationStep = `Tüm şekiller aynı ana renge sahipken, yalnızca ${String.fromCharCode(65 + correctIdx)} seçeneği farklı bir renktedir.`;
  } else if (ruleType === 4) {
    // Shape category: 3 distinct 4-sided shapes, 1 odd shape
    ruleTitle = 'Geometrik Sınıflandırma';
    const fourSidedPool: ShapeKind[] = ['square', 'diamond', 'trapezoid'];
    const pickedFourSided = rng.pickUnique(fourSidedPool, 3);
    const oddShape = rng.pick(['circle', 'triangle', 'star', 'hexagon'] as ShapeKind[]);

    let fourSidedIdx = 0;
    for (let i = 0; i < 4; i++) {
      optionsData.push({
        kind: i === correctIdx ? oddShape : pickedFourSided[fourSidedIdx++],
        fill: baseColor, rotation: 0, marker: 'none'
      });
    }
    explanationStep = `Diğer 3 seçenek 4 kenarlı/köşeli geometrik şekiller iken, ${String.fromCharCode(65 + correctIdx)} seçeneğindeki şekil geometri sınıfı (köşe sayısı) olarak onlardan farklıdır.`;
  } else {
    // Expert/Hard (Rule 5): Multi-rule anomaly. All shapes share EXACTLY TWO properties (e.g. Shape + Color), except one that shares Shape but breaks Color AND has a Marker.
    ruleTitle = 'Çoklu Kural Anomalisi (Şekil + Renk + Detay)';
    const baseShape = rng.pick(SHAPES_POOL);
    const oddShapeBase = rng.pick(SHAPES_POOL.filter(s => s !== baseShape));
    
    for (let i = 0; i < 4; i++) {
      if (i === correctIdx) {
        // Double anomaly
        optionsData.push({
          kind: oddShapeBase, fill: altColor, rotation: 90, marker: 'plus', markerColor: PALETTE.white, markerPos: 'center'
        });
      } else {
        optionsData.push({
          kind: baseShape, fill: baseColor, rotation: i * 90, marker: 'dot', markerColor: PALETTE.white, markerPos: 'top'
        });
      }
    }
    explanationStep = `Diğer 3 şekil bir örüntü ailesine aittir (Aynı ana şekil, aynı renk, aynı nokta işareti), sadece rotasyonları farklıdır. Ancak ${String.fromCharCode(65 + correctIdx)} seçeneği hem şekil, hem renk, hem de içindeki sembol (+ işareti) bakımından tamamen uyumsuzdur.`;
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
