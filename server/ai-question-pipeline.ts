import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import { BaseQuestion, CognitiveCategory, QuestionType, DifficultyLevel } from '../src/types';
import { auditQuestion, questionContentKey } from '../src/features/questions/quality';
import { AI_MODELS } from './ai-prompts/ai-config';

export interface PipelineConfig {
  category?: string;
  questionType?: string;
  targetGrade: 1 | 2 | 3 | 4;
  difficulty: number;
  minQualityScore?: number;
  aiModel?: string;
}

export interface PipelineResult {
  success: boolean;
  question?: BaseQuestion;
  qualityScore: number;
  solverVerified: boolean;
  solverAnswer?: string;
  generatedAnswer?: string;
  validationErrors: string[];
  validationWarnings: string[];
  rejectionReasons: string[];
  plannerOutput?: any;
  rawGeneratorResponse?: string;
  rawSolverResponse?: string;
  durationMs: number;
  model: string;
  promptVersion: string;
}

let qwenClient: OpenAI | null = null;
function getQwenClient() {
  if (!qwenClient) {
    qwenClient = new OpenAI({
      apiKey: process.env.QWEN_API_KEY || '',
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
  }
  return qwenClient;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 45000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callAiWithRetry(
  aiClient: GoogleGenAI,
  modelName: string,
  prompt: string,
  schema: any,
  systemInstruction?: string,
  temperature?: number
) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let responseText = '';

      if (modelName.toLowerCase().includes('qwen') || modelName.toLowerCase().includes('gpt')) {
        const openai = getQwenClient();
        const sysMsg = systemInstruction ? systemInstruction + '\n\n' : '';
        const schemaStr = JSON.stringify(schema, null, 2);
        const fullSystemMsg = sysMsg + `Lütfen aşağıdaki JSON şemasına kesinlikle uyarak (SADECE JSON formatında) cevap ver:\n${schemaStr}`;

        const res = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: fullSystemMsg },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: temperature || 0.7,
        }, { signal: controller.signal as any });

        responseText = res.choices[0]?.message?.content || '{}';
      } else {
        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        responseText = response.text?.trim() || '{}';
      }

      clearTimeout(timeoutId);

      if (!responseText) throw new Error('Empty response from AI');
      
      return JSON.parse(responseText);
    } catch (err: any) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw err;
      }
      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}

export function calculateQualityScore(result: Partial<PipelineResult>): number {
  let score = 0;
  if (result.solverVerified) score += 35;
  if (result.generatedAnswer === result.solverAnswer) score += 20;
  if (!result.validationErrors?.length) score += 10;
  
  // Grade appropriateness
  if (!result.validationWarnings?.some(w => w.includes('Zorluk bu sınıf için yüksek'))) score += 12;
  
  // Distractor quality
  if (result.question?.authoring?.distractorNotes && Object.keys(result.question.authoring.distractorNotes).length >= 3) {
    score += 13;
  }
  
  // Uniqueness (assumed if no duplicate error)
  if (!result.validationErrors?.some(e => e.includes('zaten var'))) score += 5;
  
  // Language quality (prompt length/clarity)
  const promptLen = result.question?.prompt?.length || 0;
  if (promptLen >= 15 && promptLen <= 150) score += 5;

  return Math.min(100, Math.max(0, score));
}

function getSolverConfig(difficulty: number): { attempts: number; minConsensus: number } {
  if (difficulty <= 2) return { attempts: 3, minConsensus: 2 };
  if (difficulty <= 4) return { attempts: 5, minConsensus: 4 };
  return { attempts: 10, minConsensus: 7 };
}

export async function runQuestionPipeline(
  aiClient: GoogleGenAI,
  config: PipelineConfig
): Promise<PipelineResult> {
  const startTime = Date.now();
  const plannerModel = config.aiModel || AI_MODELS.QUESTION_PLANNER;
  const generatorModel = config.aiModel || AI_MODELS.QUESTION_GENERATOR;
  const validatorModel = config.aiModel || AI_MODELS.QUESTION_VALIDATOR;
  
  const result: PipelineResult = {
    success: false,
    qualityScore: 0,
    solverVerified: false,
    validationErrors: [],
    validationWarnings: [],
    rejectionReasons: [],
    durationMs: 0,
    model: generatorModel,
    promptVersion: '1.0',
  };

  try {
    // 1. Planning Stage
    const plannerSchema = {
      type: Type.OBJECT,
      properties: {
        concept: { type: Type.STRING },
        visualElements: { type: Type.ARRAY, items: { type: Type.STRING } },
        rule: { type: Type.STRING },
        distractorStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['concept', 'visualElements', 'rule', 'distractorStrategies'],
    };

    const plannerPrompt = `Sen BİLSEM soruları hazırlayan uzman bir öğretmensin. 
Aşağıdaki kriterlere göre bir soru taslağı (blueprint) oluştur:
Kategori: ${config.category || 'Herhangi'}
Soru Tipi: ${config.questionType || 'Herhangi'}
Hedef Sınıf: ${config.targetGrade}. Sınıf
Zorluk: ${config.difficulty} / 6

Yaş-Zorluk Kılavuzu:
- 1. Sınıf (7 yaş): Somut nesneler, tek kural, 3-4 eleman. Zorluk 4+ bu sınıf için UYGUN DEĞİLDİR.
- 2. Sınıf (8 yaş): Basit örüntüler, 2 kural, 4-5 eleman. Zorluk 5+ bu sınıf için UYGUN DEĞİLDİR.
- 3. Sınıf (9 yaş): Soyut şekiller, çoklu dönüşümler, 5-6 eleman.
- 4. Sınıf (10-11 yaş): Tam soyutlama, iç içe kurallar, 6-8 eleman.
Her zaman hedef sınıfa uygun karmaşıklıkta kal.`;

    const plannerOutput = await callAiWithRetry(aiClient, plannerModel, plannerPrompt, plannerSchema);
    result.plannerOutput = plannerOutput;

    // 2. Generation Stage
    const generatorSchema = {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING },
        secondaryPrompt: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              visualData: { 
                type: Type.OBJECT,
                properties: { textNumber: { type: Type.STRING } }
              },
            },
            required: ['id', 'label', 'visualData'],
          }
        },
        correctOptionId: { type: Type.STRING },
        explanation: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            ruleTitle: { type: Type.STRING },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['summary', 'ruleTitle', 'steps'],
        },
        distractorNotes: {
          type: Type.OBJECT,
          additionalProperties: { type: Type.STRING },
        },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['prompt', 'options', 'correctOptionId', 'explanation', 'distractorNotes', 'skills'],
    };

    const generatorPrompt = `Şu taslağa dayanarak tam bir JSON soru nesnesi üret (ZekaPark BaseQuestion formatına uygun):
Taslak: ${JSON.stringify(plannerOutput)}
4 seçenek oluştur (A, B, C, D). Doğru cevabın hangisi olduğunu 'correctOptionId' içinde belirt.
'distractorNotes' içine her yanlış seçeneğin (çeldiricinin) neden seçilebileceğini açıklayan notlar yaz.
Görsel data şimdilik sadece metin tabanlı (textNumber) olarak temsil edilebilir.

Kullanabileceğin VisualData türleri:
- textNumber: { type: "textNumber", value: number | string }
- shape: { type: "shape", kind: "circle"|"square"|"triangle"|"star"|"hexagon", fill: string, rotation?: number }
- grid2D: { type: "grid2D", rows: number, cols: number, cells: { fill: string, kind: string }[] }
- stack: { type: "stack", items: { kind: string, fill: string }[] }
Her seçenek için MUTLAKA uygun bir VisualData türü kullan.`;

    const generatedRaw = await callAiWithRetry(aiClient, generatorModel, generatorPrompt, generatorSchema);
    result.rawGeneratorResponse = JSON.stringify(generatedRaw);
    result.generatedAnswer = generatedRaw.correctOptionId;

    // 3. Independent Solving Stage
    const solverSchema = {
      type: Type.OBJECT,
      properties: {
        reasoning: { type: Type.STRING },
        chosenOptionId: { type: Type.STRING },
      },
      required: ['reasoning', 'chosenOptionId'],
    };

    const solverPrompt = `Aşağıdaki soruyu çöz. Çözüm mantığını açıkla ve en uygun seçeneği seç.
Soru Metni: ${generatedRaw.prompt}
Ek Bilgi: ${generatedRaw.secondaryPrompt || ''}
Soru Görsel Yapısı (visualConfig): ${JSON.stringify(generatedRaw.visualConfig || {})}
Seçenekler: ${JSON.stringify(generatedRaw.options.map((o: any) => ({ id: o.id, label: o.label, data: o.visualData })))}`;

    const { attempts: SOLVER_ATTEMPTS, minConsensus } = getSolverConfig(config.difficulty);
    const solverPromises = Array.from({ length: SOLVER_ATTEMPTS }).map(() =>
      callAiWithRetry(aiClient, validatorModel, solverPrompt, solverSchema, 'Sen mantık bulmacalarını hatasız çözen bir yapay zekasın.', 0.7)
    );
    const solverResults = await Promise.all(solverPromises);

    const answerCounts: Record<string, number> = {};
    for (const res of solverResults) {
      const ans = res?.chosenOptionId || 'UNKNOWN';
      answerCounts[ans] = (answerCounts[ans] || 0) + 1;
    }

    let bestAnswer = '';
    let maxCount = 0;
    for (const [ans, count] of Object.entries(answerCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestAnswer = ans;
      }
    }

    result.rawSolverResponse = JSON.stringify({ answerCounts, consensus: bestAnswer });
    result.solverAnswer = bestAnswer;

    if (result.solverAnswer === result.generatedAnswer && maxCount >= minConsensus) {
      result.solverVerified = true;
    } else if (result.solverAnswer === result.generatedAnswer && maxCount < minConsensus) {
      result.rejectionReasons.push(`Bağımsız çözüm testinde AI doğru cevabı buldu ama tutarlılık düşük (${maxCount}/${SOLVER_ATTEMPTS}).`);
    } else {
      result.rejectionReasons.push(`Bağımsız çözüm testinde AI farklı bir cevap buldu (Çoğunluk: ${bestAnswer}, Üretilen: ${result.generatedAnswer}).`);
    }

    // 4. Validation
    const baseQuestion: Partial<BaseQuestion> = {
      id: `ai-${Date.now()}`,
      version: 1,
      type: (config.questionType as QuestionType) || 'logic_grid',
      category: (config.category as CognitiveCategory) || 'logic',
      difficulty: config.difficulty as DifficultyLevel,
      ageGroup: config.targetGrade <= 2 ? '1-2' : '3-4',
      prompt: generatedRaw.prompt,
      secondaryPrompt: generatedRaw.secondaryPrompt,
      options: generatedRaw.options.map((o: any) => ({
        ...o,
        fingerprint: o.id // simplify for now
      })),
      correctOptionId: generatedRaw.correctOptionId,
      explanation: generatedRaw.explanation,
      estimatedSeconds: Math.round(30 + (config.difficulty || 3) * 12 + ((config.targetGrade || 3) <= 2 ? 15 : 0)),
      skills: generatedRaw.skills,
      seed: Math.floor(Math.random() * 1000000),
      visualConfig: { displayMode: 'text' },
      targetGrade: config.targetGrade,
      createdAt: new Date().toISOString(),
      isCustom: false,
      status: 'draft',
      authoring: {
        engine: 'ai-gen-v1',
        objective: plannerOutput.concept,
        distractorNotes: generatedRaw.distractorNotes,
      }
    };

    // 4.1 Distractor Diversity Check
    const visualDataStrings = generatedRaw.options.map((o: any) => JSON.stringify(o.visualData));
    const uniqueVisuals = new Set(visualDataStrings);
    if (uniqueVisuals.size < generatedRaw.options.length) {
      result.rejectionReasons.push('Seçeneklerin görsel verileri (visualData) tamamen aynı olanlar var. Çeldiriciler birbirinden farklı olmalıdır.');
      result.validationErrors.push('DUPLICATE_VISUAL_OPTIONS');
    }

    const auditResult = auditQuestion(baseQuestion);
    result.validationErrors = auditResult.errors;
    result.validationWarnings = auditResult.warnings;
    
    // We append our own solver check result
    if (result.solverVerified) auditResult.solverVerified = true;

    // 5. Quality Scoring
    result.question = baseQuestion as BaseQuestion;
    result.qualityScore = calculateQualityScore(result);

    if (result.validationErrors.length > 0) {
      result.rejectionReasons.push(...result.validationErrors);
    }

    const minScore = config.minQualityScore ?? 70;
    if (result.qualityScore >= minScore && result.rejectionReasons.length === 0) {
      result.success = true;
      result.question.aiMeta = {
        generationId: result.question.id,
        model: result.model,
        promptVersion: result.promptVersion,
        qualityScore: result.qualityScore,
        solverVerified: result.solverVerified,
        solverAnswer: result.solverAnswer,
        plannerOutput: result.plannerOutput,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    } else {
      if (result.qualityScore < minScore) {
        result.rejectionReasons.push(`Kalite skoru (${result.qualityScore}) hedeflenenin (${minScore}) altında.`);
      }
    }

  } catch (error: any) {
    result.validationErrors.push(`Pipeline Error: ${error.message}`);
    result.rejectionReasons.push('Pipeline çalıştırılırken hata oluştu.');
  } finally {
    result.durationMs = Date.now() - startTime;
  }

  return result;
}
