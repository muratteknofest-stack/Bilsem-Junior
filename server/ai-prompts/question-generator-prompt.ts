import { z } from 'zod';
import { PlannerOutput } from './question-planner-prompt';

export const GENERATOR_PROMPT_VERSION = '1.0.0';

export interface GeneratorParams {
  plannerOutput: PlannerOutput;
  category: string;
  questionType: string;
  targetGrade: number;
  difficulty: number;
}

export const generatorOutputSchema = z.object({
  type: z.enum([
    'odd_one_out', 'visual_sequence', 'matrix_2x2', 'figure_rotation', 'mirror_reflection', 'symmetry_completion', 'figure_completion', 'spatial_relationship', 'visual_analogy', 'shape_counting', 'direction_path', 'visual_memory', 'symbol_coding', 'classification', 'visual_attention', 'number_pattern', 'logical_sequence', 'matrix_3x3', 'shape_equation', 'latin_square', 'shadow_matching', 'balance_scale', 'gear_rotation', 'paper_folding', 'venn_diagram', 'cube_counting', 'dice_unfold', 'cryptogram', 'operation_machine', 'top_view', 'shape_combination', 'verbal_analogy', 'number_pyramid', 'story_logic', 'tangram_puzzle', 'maze_path', 'logic_grid', 'punch_folding', 'detail_detection', 'weight_comparison', 'multiview_perspective', 'raven_matrix', 'word_scramble_logic', 'spatial_origami'
  ]),
  category: z.enum([
    'visual_perception', 'pattern', 'matrix', 'spatial', 'logic', 'attention', 'memory', 'numerical', 'verbal', 'coding'
  ]),
  difficulty: z.number().min(1).max(6),
  prompt: z.string().min(12).max(700),
  options: z.array(z.object({
    id: z.enum(['A', 'B', 'C', 'D']),
    label: z.string(),
    visualData: z.string().optional()
  })).length(4),
  correctOptionId: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.object({
    summary: z.string(),
    ruleTitle: z.string(),
    steps: z.array(z.string()).min(2)
  }),
  estimatedSeconds: z.number().min(10).max(600),
  skills: z.array(z.string()),
  distractorNotes: z.record(z.enum(['A', 'B', 'C', 'D']), z.string())
});

export type GeneratorOutput = z.infer<typeof generatorOutputSchema>;

/**
 * Builds the prompt for the Question Generator stage.
 * It takes the planner output and generates a full question in BaseQuestion format.
 * @param params The parameters and planned blueprint for the question
 * @returns The formatted prompt string
 */
export function buildGeneratorPrompt(params: GeneratorParams): string {
  return `Sen uzman bir BİLSEM (Bilim ve Sanat Merkezleri) sınav sorusu tasarımcısısın.
Daha önce oluşturulmuş olan soru planını (blueprint) kullanarak tam bir soru üretmen gerekiyor.

Plan (Blueprint) Verileri:
${JSON.stringify(params.plannerOutput, null, 2)}

Soru Parametreleri:
- Kategori: ${params.category}
- Soru Tipi: ${params.questionType}
- Hedef Sınıf: ${params.targetGrade}. Sınıf
- Zorluk Seviyesi (1-6): ${params.difficulty}

Lütfen bu planı kullanarak tam donanımlı, çözülebilir ve çocukların diline uygun bir soru üret.
- Soru metni (prompt) anlaşılır olmalıdır.
- 4 seçenek üret (A, B, C, D). Görsel verileri (visualData) gerektiğinde detaylı bir şekilde metin olarak (örn. SVG kodu, şekil tasviri vb.) belirt.
- Açıklamalar (explanation) çocuğun (7-11 yaş) anlayabileceği kadar net, öğretici ve arkadaşça (Türkçe) olmalıdır.
- Yanlış seçeneklerin (çeldiricilerin) her biri için pedagojik bir sebep (distractorNotes) sunmalısın (Örn: A şıkkı, sadece rengi dikkate alan çocukların çeldiricisidir).

Çıktın kesinlikle belirtilen JSON şemasına tam olarak uymalıdır.`;
}
