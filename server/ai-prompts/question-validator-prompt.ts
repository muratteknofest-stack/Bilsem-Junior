import { z } from 'zod';

export const VALIDATOR_PROMPT_VERSION = '1.0.0';

export interface ValidatorParams {
  category: string;
  questionType: string;
  promptText: string;
  options: Array<{
    id: 'A' | 'B' | 'C' | 'D';
    label: string;
    visualData?: string;
  }>;
}

export const validatorOutputSchema = z.object({
  solverAnswer: z.enum(['A', 'B', 'C', 'D', 'NONE', 'MULTIPLE']).describe('The answer chosen by the independent solver, or NONE/MULTIPLE if the question is flawed'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence in the answer'),
  optionAnalysis: z.record(z.enum(['A', 'B', 'C', 'D']), z.enum(['definitely_wrong', 'possibly_correct', 'correct', 'ambiguous'])).describe('Analysis of each option'),
  multipleCorrectAnswers: z.boolean().describe('True if more than one option could be considered correct under a valid interpretation'),
  reasoning: z.string().describe('Detailed step-by-step reasoning used to solve the question independently'),
  flawsFound: z.array(z.string()).describe('Any logical flaws, ambiguities, or errors found in the question design')
});

export type ValidatorOutput = z.infer<typeof validatorOutputSchema>;

/**
 * Builds the prompt for the independent Question Solver/Validator stage.
 * CRITICAL: The validator must NOT receive the correct answer. It receives only the prompt and options.
 * @param params The question details for the validator to solve
 * @returns The formatted prompt string
 */
export function buildValidatorPrompt(params: ValidatorParams): string {
  return `Sen bağımsız, zeki ve son derece eleştirel bir BİLSEM soru çözücüsü ve denetmenisin.
Sana BİLSEM sınavına hazırlanan öğrenciler için tasarlanmış bir soru verilecek. Doğru cevabın ne olduğu SANA SÖYLENMEYECEK.
Senin görevin, bu soruyu sıfırdan bağımsız bir şekilde çözmek ve kalitesini, mantıksal tutarlılığını test etmektir.

Soru Verileri:
- Kategori: ${params.category}
- Soru Tipi: ${params.questionType}
- Soru Metni: ${params.promptText}
- Seçenekler:
${JSON.stringify(params.options, null, 2)}

Görevlerin:
1. Soruyu sanki sınava giren çok zeki bir öğrenciymişsin gibi adım adım kendi kendine çöz (reasoning).
2. Kendi bulduğun cevabı belirt (solverAnswer). Eğer hiçbir seçenek doğru değilse NONE, birden fazla seçenek doğruysa MULTIPLE olarak işaretle.
3. Bulduğun cevaptan ne kadar emin olduğunu belirt (confidence).
4. Her bir seçeneğin durumunu analiz et (optionAnalysis). Sadece BİR tane 'correct' (veya possibly_correct) olmalı, diğerleri kesin yanlış (definitely_wrong) veya belirsiz (ambiguous) olabilir.
5. Soruda geçerli bir yorumla birden fazla seçeneğin doğru sayılıp sayılamayacağını kontrol et (multipleCorrectAnswers).
6. Soruda herhangi bir mantık hatası, belirsizlik, eksik bilgi veya ifade bozukluğu varsa listele (flawsFound).

Çıktın kesinlikle belirtilen JSON şemasına tam olarak uymalıdır.`;
}
