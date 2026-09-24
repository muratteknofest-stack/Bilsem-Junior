import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import type { BaseQuestion } from '../src/types';
import { generateVisualFingerprint } from '../src/features/questions/fingerprint';
import { generateProfessionalQuestion, solveBoard, type Board } from '../src/features/questions/professional-engine';
import { questionVisualKey } from '../src/features/questions/quality';
import { socialQuestionRejection } from './social-draft-core';

const common = { seed: z.number().int().min(1).max(1_000_000_000), caption: z.string().trim().min(15).max(240) };
export const qwenSocialPlanSchema = z.discriminatedUnion('type', [
  z.object({ ...common, type: z.literal('number_pattern'), rule: z.enum(['add', 'growing', 'alternate']), values: z.array(z.number().int().min(1).max(90)).length(6) }).strict(),
  z.object({ ...common, type: z.enum(['matrix_2x2', 'visual_sequence']) }).strict(),
]);
export type QwenSocialPlan = z.infer<typeof qwenSocialPlanSchema>;

export function qwenSocialStatus(): 'configured' | 'incomplete' | 'absent' {
  const values = [process.env.QWEN_API_KEY, process.env.QWEN_BASE_URL, process.env.QWEN_MODEL].map(v => v?.trim());
  return values.every(Boolean) ? 'configured' : values.some(Boolean) ? 'incomplete' : 'absent';
}

/** Qwen provides the sequence or selects a visual variation; the answer is computed separately. */
export function buildQwenSocialQuestion(plan: QwenSocialPlan, model: string, durationMs: number): BaseQuestion {
  const parsed = qwenSocialPlanSchema.parse(plan);
  const question = generateProfessionalQuestion(parsed.type, parsed.seed, 2);
  if (parsed.type === 'number_pattern') {
    const values = parsed.values;
    const differences = values.slice(1).map((value, index) => value - values[index]);
    if (differences.some(value => value < 1 || value > 12) ||
        (parsed.rule === 'growing' && differences[1] === differences[0]) ||
        (parsed.rule === 'alternate' && (differences[0] === differences[1] ||
          differences[2] !== differences[0] || differences[3] !== differences[1]))) {
      throw new Error('Qwen sayı dizisi eğitimsel kurala uygun değil.');
    }
    const board: Board = { displayMode: 'verified_board', kind: 'numbers', values, rule: parsed.rule };
    const answer = solveBoard(board);
    if (!('textNumber' in answer) || typeof answer.textNumber !== 'number' || !Number.isInteger(answer.textNumber) || answer.textNumber > 120) {
      throw new Error('Qwen sayı dizisi karta sığmıyor.');
    }
    const next = answer.textNumber;
    const alternatives = [next, next + 1, next - 1, next + 2];
    const ids = ['A', 'B', 'C', 'D'];
    const correctIndex = parsed.seed % 4;
    const distractorNotes: Record<string, string> = {};
    question.options = ids.map((id, index) => {
      const value = alternatives[(index + 4 - correctIndex) % 4];
      distractorNotes[id] = index === correctIndex ? 'Bütün verilenlerle uyumlu.' : 'Dizinin artış kuralıyla uyuşmuyor.';
      const visualData = { textNumber: value };
      return { id, label: id, fingerprint: generateVisualFingerprint(visualData), visualData };
    });
    question.correctOptionId = ids[correctIndex];
    question.visualConfig = board;
    const explanation = parsed.rule === 'add' ? `Her adımda ${differences[0]} eklenir.` :
      parsed.rule === 'growing' ? `Artışlar ${differences[0]} ile başlar ve her adımda ${differences[1] - differences[0]} büyür.` :
      `Artışlar sırayla ${differences[0]} ve ${differences[1]} olarak tekrar eder.`;
    question.explanation = { ruleTitle: 'Artışları karşılaştır', summary: explanation,
      steps: ['Yan yana iki sayının farkını bul.', explanation, `Son sayıya sıradaki artışı ekle. Doğru seçenek: ${question.correctOptionId}.`] };
    question.authoring!.distractorNotes = distractorNotes;
  }
  question.id = 'social-qwen-' + createHash('sha256').update(questionVisualKey(question)).digest('hex').slice(0, 32);
  question.aiMeta = { generationId: question.id, model, promptVersion: 'social-qwen-1', qualityScore: 90,
    solverVerified: true, solverAnswer: question.correctOptionId, generatedAt: new Date().toISOString(), durationMs };
  const rejection = socialQuestionRejection(question, 90, true);
  if (rejection) throw new Error(rejection);
  return question;
}

export async function createQwenSocialCandidate(slotKey: string): Promise<{ question: BaseQuestion; caption: string }> {
  if (qwenSocialStatus() !== 'configured') throw new Error('Qwen API yapılandırması eksik.');
  const model = process.env.QWEN_MODEL!.trim();
  const client = new OpenAI({ apiKey: process.env.QWEN_API_KEY!.trim(), baseURL: process.env.QWEN_BASE_URL!.trim(), timeout: 25_000, maxRetries: 0 });
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await client.chat.completions.create({ model, temperature: 0.7, max_tokens: 400,
      response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: 'Sen Zekapark için BİLSEM hazırlık görsel sorusu tasarlıyorsun. Yalnızca JSON nesnesi üret. Tip: number_pattern, matrix_2x2 veya visual_sequence. number_pattern için 1-90 arasında 6 pozitif tam sayı ve bunlara uyan add, growing veya alternate kuralı ver; artışlar pozitif olsun, yeni değer 120 aşmasın. Diğer tipler için sadece 1-1000000000 arasında seed ver; matematiksel şekilleri sunucu üretir. Her tip için 15-240 karakter arası kısa Türkçe caption ver; cevap, çözüm, başarı vaadi ve bağlantı verme. Şema: sayı için {"type":"number_pattern","seed":123,"rule":"add","values":[2,5,8,11,14,17],"caption":"Görsel örüntüyü keşfedin."}; şekil için {"type":"matrix_2x2","seed":123,"caption":"Eksik kareyi bulabilir misiniz?"}. Başka anahtar veya Markdown ekleme.' },
        { role: 'user', content: `Sosyal paylaşım dilimi: ${slotKey}. ${attempt ? 'Önceki aday doğrulanamadı; yeni bir aday üret.' : 'Özgün bir soru varyasyonu üret.'}` },
      ],
    });
    try {
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Boş Qwen yanıtı.');
      const plan = qwenSocialPlanSchema.parse(JSON.parse(content));
      const question = buildQwenSocialQuestion(plan, model, Date.now() - started);
      return { question, caption: `${plan.caption} Cevap ve açıklama ikinci görselde. #BİLSEM #Zekapark` };
    } catch {
      if (attempt === 1) throw new Error('Qwen iki kez geçerli ve doğrulanmış bir sosyal soru üretemedi.');
    }
  }
  throw new Error('Qwen sosyal soru üretimi başarısız.');
}
