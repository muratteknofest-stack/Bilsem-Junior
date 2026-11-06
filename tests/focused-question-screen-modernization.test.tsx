import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Faz 5: FocusedQuestionScreen.tsx & FocusedQuestionScreen.css Modernization', () => {
  const tsxContent = readFileSync(resolve(process.cwd(), 'src/components/FocusedQuestionScreen.tsx'), 'utf-8');
  const cssContent = readFileSync(resolve(process.cwd(), 'src/components/FocusedQuestionScreen.css'), 'utf-8');

  // Clock must have tabular-nums
  assert.ok(
    tsxContent.includes('zp-focus-clock tabular-nums') || tsxContent.includes('tabular-nums'),
    'Clock must have tabular-nums class for stable digit rendering'
  );

  // Question progress / status b must have tabular-nums
  assert.ok(
    tsxContent.includes('b className="tabular-nums"'),
    'Question progress counter numbers must have tabular-nums'
  );

  // Dot pattern background texture present in CSS
  assert.ok(
    cssContent.includes('rgba(100, 116, 139, 0.16) 1px, transparent 1px') || cssContent.includes('#f8fafc'),
    'FocusedQuestionScreen background must use calm surface with lightweight dot pattern texture'
  );

  // Answer options must not use distracting pastel floods
  assert.ok(
    !cssContent.includes('linear-gradient(135deg, rgba(238, 242, 255, 0.95)'),
    'Answer options must avoid distracting pastel gradients'
  );

  // High contrast active/correct/incorrect states for answer badges
  assert.ok(
    cssContent.includes('[aria-pressed="true"] .zp-answer-badge') || cssContent.includes('.zp-answer-badge'),
    'Answer badges must have clear high-contrast states'
  );

  // Spatial controls & zoom button positioning outside diagram
  assert.ok(
    cssContent.includes('.zp-spatial-mode') && cssContent.includes('.zp-zoom-button'),
    'Spatial mode and zoom button styles must be defined as corner toolbars'
  );

  // Responsive narrow screens (<=380px)
  assert.ok(
    cssContent.includes('@media (max-width: 380px)'),
    'Mobile narrow screen optimizations (<380px) must be present'
  );
});

test('Faz 5: Setup & Results Panels Modernization', () => {
  const setupTsx = readFileSync(resolve(process.cwd(), 'src/components/student/LearningSetupPanel.tsx'), 'utf-8');
  const resultTsx = readFileSync(resolve(process.cwd(), 'src/components/student/LearningResultPanel.tsx'), 'utf-8');
  const setupCss = readFileSync(resolve(process.cwd(), 'src/components/student/learning-setup.css'), 'utf-8');
  const resultCss = readFileSync(resolve(process.cwd(), 'src/components/student/learning-results.css'), 'utf-8');

  // Kicker headers converted to Title Case
  assert.ok(
    setupTsx.includes('Hazır mısın, kaşif?'),
    'Setup panel kicker must be Title Case'
  );
  assert.ok(
    resultTsx.includes('Bir keşif daha tamamlandı'),
    'Result panel kicker must be Title Case'
  );

  // Decorative spark/star inflation removed in results
  assert.ok(
    !resultTsx.includes('<i>✦</i><i>✧</i>'),
    'Decorative star glyphs around medal must be removed'
  );

  // Tabular-nums on result numbers
  assert.ok(
    resultTsx.includes('tabular-nums'),
    'Result metrics must use tabular-nums'
  );

  // Single-elevation card structure in CSS
  assert.ok(
    setupCss.includes('border-radius:24px') || setupCss.includes('border-radius: 24px') || setupCss.includes('border:1px solid'),
    'Setup panel must use clean single-elevation card styling'
  );
  assert.ok(
    resultCss.includes('border-radius:24px') || resultCss.includes('border-radius: 24px') || resultCss.includes('border:1px solid'),
    'Result panel must use clean single-elevation card styling'
  );
});
