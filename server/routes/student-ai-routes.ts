import { Router } from 'express';
import { z } from 'zod';
import { Type } from '@google/genai';
import {
  requireAppCheck,
  requireFirebaseAuth,
  requireProfileRole,
  sanitizeForPrompt,
} from '../security';
import { aiLimiter } from '../rate-limiters';
import { getGeminiClient } from '../gemini-client';

const studentAiRoutes = Router();

const questionOptionSchema = z.object({
  id: z.string().min(1).max(32),
  label: z.string().max(500).default(''),
}).passthrough();

const explanationSchema = z.object({
  summary: z.string().max(4000).optional().default(''),
  ruleTitle: z.string().max(500).optional().default(''),
  steps: z.array(z.string().max(1000)).max(12).optional().default([]),
}).passthrough().optional();

const questionRequestSchema = z.object({
  questionId: z.string().min(1).max(160),
  questionType: z.string().min(1).max(80),
  category: z.string().min(1).max(80),
  difficulty: z.number().int().min(1).max(6),
  prompt: z.string().min(1).max(4000),
  secondaryPrompt: z.string().max(2000).optional(),
  explanation: explanationSchema,
  options: z.array(questionOptionSchema).min(2).max(8),
  correctOptionId: z.string().min(1).max(32),
});

const hintRequestSchema = questionRequestSchema.extend({
  stepRequested: z.number().int().min(1).max(3).optional().default(1),
});
const mistakeRequestSchema = questionRequestSchema.extend({
  selectedOptionId: z.string().min(1).max(32),
});
const stepExplanationRequestSchema = mistakeRequestSchema.extend({
  isCorrect: z.boolean(),
});
const dailyPlanRequestSchema = z.object({
  studentName: z.string().trim().min(1).max(50).default('Öğrenci'),
  grade: z.number().int().min(1).max(4).default(3),
  level: z.number().int().min(1).max(1000).default(1),
  streak: z.number().int().min(0).max(3660).default(0),
  dailyGoalQuestions: z.number().int().min(1).max(200).default(10),
  dailyGoalMinutes: z.number().int().min(1).max(180).default(15),
  todayQuestionsSolved: z.number().int().min(0).max(1000).default(0),
  unresolvedMistakes: z.array(z.object({
    category: z.string().max(80),
    questionType: z.string().max(80),
    difficulty: z.number().int().min(1).max(6),
    prompt: z.string().max(1000),
  }).passthrough()).max(50).default([]),
  masteries: z.array(z.object({
    category: z.string().max(80),
    categoryName: z.string().max(120),
    mastery: z.number().min(0).max(100),
    accuracy: z.number().min(0).max(100),
    recentTrend: z.string().max(20),
  }).passthrough()).max(20).default([]),
});

studentAiRoutes.post('/ai-hint', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole('student', 'admin'), async (req, res) => {
  try {
    const validation = hintRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'İpucu isteği geçersiz.' });
    }
    const {
      questionId,
      questionType,
      category,
      difficulty,
      prompt,
      secondaryPrompt,
      explanation,
      options,
      correctOptionId,
      stepRequested = 1,
    } = validation.data;

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'Gemini API key is not configured; using procedural Socratic engine.',
      });
    }

    const sanitizedPrompt = sanitizeForPrompt(prompt);
    const sanitizedSecondaryPrompt = secondaryPrompt ? sanitizeForPrompt(secondaryPrompt) : undefined;

    const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için özel tasarlanmış şefkatli, eğlenceli ve cesaret verici bir "Bilişsel Zeka ve Pedagoji Rehberisin".

Öğrenci bir soru üzerinde düşünürken takıldı ve "İpucu" butonuna bastı.
GÖREVİN: Çocuğa doğrudan cevabı söylemeden (KESİNLİKLE "Cevap A şıkkı", "Doğru seçenek C" gibi doğrudan spoiler vermeden), Sokratik yöntemle kendi aklıyla sonuca ulaşmasını sağlayacak 3 KADEMELİ ADIM ADIM İPUCU seti üretmektir.

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${sanitizedPrompt}" ${sanitizedSecondaryPrompt ? `(${sanitizedSecondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Seçenekler: ${JSON.stringify(options?.map((o: any) => ({ id: o.id, label: o.label })) || [])}
- Doğru Seçenek: ${correctOptionId}

Üreteceğin 3 Adım Şunlardır:
1. "focus" (Nereye Bakmalısın?): Çocuğun dikkatini sorudaki anahtar bölgeye, değişen parçaya veya eksene yönlendir.
2. "rule" (Gizli Kuralı Keşfet): Şekiller arasındaki ilişkiyi (dönme açısı, satır/sütun kuralı, simetri aynası, parça sayısı vb.) merak uyandıran bir soruyla düşündür.
3. "elimination" (Seçenekleri Ele): Hangi bariz seçeneklerin neden elenebileceğini ve doğru cevabı ele veren kritik ayrıntıyı fısılda (ama doğrudan doğru seçeneğin harfini söyleme).

Üslup Kuralları:
- Dil: Çok samimi, sevimli, Türkçe, çocuk dostu, motive edici ("Harika bir dedektifsin!", "Birlikte parçaları inceleyelim!").
- Uzunluk: Her adım 2-3 kısa, net cümle olsun.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction:
          'Sen çocuklar için bilişsel zeka sorularında rehberlik eden pedagojik bir AI koçusun. Çocuğa asla direkt cevabı söyleme; Sokratik ipuçları ver.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            introEncouragement: {
              type: Type.STRING,
              description: 'Çocuğu motive eden kısa sevimli bir giriş cümlesi.',
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'focus | rule | elimination' },
                  content: { type: Type.STRING, description: 'İpucu açıklaması' },
                  keyObservation: { type: Type.STRING, description: 'Dikkat edilmesi gereken kısa püf nokta' },
                  suggestedAction: { type: Type.STRING, description: 'Çocuğun şimdi yapmasını önerdiğin eylem' },
                },
                required: ['stepNumber', 'title', 'type', 'content'],
              },
            },
          },
          required: ['introEncouragement', 'steps'],
        },
      },
    });

    const rawJson = response.text?.trim();
    if (!rawJson) {
      return res.status(200).json({ fallback: true });
    }

    const parsed = JSON.parse(rawJson);
    return res.json({
      success: true,
      fallback: false,
      questionId,
      category,
      questionType,
      difficulty,
      totalSteps: 3,
      unlockedSteps: Math.min(3, Math.max(1, stepRequested)),
      introEncouragement: parsed.introEncouragement,
      steps: parsed.steps,
      isAiGenerated: true,
      modelUsed: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    console.log('AI fallback triggered: AI hint unavailable');
    return res.status(200).json({
      fallback: true,
      error: 'AI service unavailable',
    });
  }
});

studentAiRoutes.post('/ai-explain-mistake', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole('student', 'admin'), async (req, res) => {
  try {
    const validation = mistakeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Hata açıklama isteği geçersiz.' });
    }
    const {
      questionId,
      questionType,
      category,
      difficulty,
      prompt,
      secondaryPrompt,
      explanation,
      options,
      selectedOptionId,
      correctOptionId,
    } = validation.data;

    const sanitizedPrompt = sanitizeForPrompt(prompt);
    const sanitizedSecondaryPrompt = secondaryPrompt ? sanitizeForPrompt(secondaryPrompt) : undefined;

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'Gemini API key is not configured; using procedural mistake analyzer.',
      });
    }

    const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için uzman, şefkatli bir "Çocuk Bilişsel Pedagoji Uzmanı"sın.

Bir öğrenci bir soru üzerinde düşünürken yanlış bir seçenek işaretledi.
Amacın: Çocuğu ASLA yargılamadan, suçlamadan, şefkatle ve yapıcı bir dille:
1. Öğrencinin seçtiği yanlış seçeneğin mantığını anlamak (neden bu seçeneğe yönelmiş olabilir, görsel/mantıksal tuzak neydi?).
2. Çocuğun seçtiği seçenek ile DOĞRU seçenek arasındaki kritik farkı net ve somut bir dille açıklamak.
3. Çocuğun bir sonraki soruda hatayı tekrarlamaması için akılda kalıcı bir "Altın Kural / Bilişsel Taktik" kazandırmak.

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${sanitizedPrompt}" ${sanitizedSecondaryPrompt ? `(${sanitizedSecondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Seçenekler: ${JSON.stringify(options || [])}
- Öğrencinin İşaretlediği Yanlış Seçenek: ${selectedOptionId}
- Doğru Seçenek: ${correctOptionId}

Üslup Kuralları:
- Dil: Çok samimi, sevecen, cesaret verici, Türkçe ("Çok güzel bir denemeydi!", "Hadi zihnimizin nerede şaşırdığını birlikte görelim!").
- Yaş Grubu: 7-11 yaş ilkokul çocukları. Cümleler akıcı, açık ve pozitif olmalı.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction:
          'Sen çocuklar için bilişsel zeka sorularında hatanın nedenini şefkatle, pedagojik ve Sokratik olarak açıklayan bir uzmansın. Çocuğu yüreklendir.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            empatheticIntro: {
              type: Type.STRING,
              description: 'Çocuğun bu seçeneği seçmesini anlayışla karşılayan, şefkatli giriş cümlesi.',
            },
            misconceptionTrap: {
              type: Type.STRING,
              description: 'Sorudaki görsel yanılsama, çeldirici veya gözden kaçan kuralın analizi.',
            },
            differenceAnalysis: {
              type: Type.STRING,
              description: 'İşaretlenen seçenek ile doğru seçenek arasındaki somut farkın açıklaması.',
            },
            goldenRuleTip: {
              type: Type.STRING,
              description: 'Bir sonraki benzer soruda çocuğa rehberlik edecek akılda kalıcı altın kural.',
            },
            bilsemSuperPower: {
              type: Type.STRING,
              description: 'Bu hatadan kazanılan bilişsel süper güç unvanı (örn: Parça-Bütün Dedektifi).',
            },
          },
          required: [
            'empatheticIntro',
            'misconceptionTrap',
            'differenceAnalysis',
            'goldenRuleTip',
            'bilsemSuperPower',
          ],
        },
      },
    });

    const rawJson = response.text?.trim();
    if (!rawJson) {
      return res.status(200).json({ fallback: true });
    }

    const parsed = JSON.parse(rawJson);
    return res.json({
      success: true,
      fallback: false,
      questionId,
      selectedOptionId,
      correctOptionId,
      category,
      questionType,
      difficulty,
      empatheticIntro: parsed.empatheticIntro,
      misconceptionTrap: parsed.misconceptionTrap,
      differenceAnalysis: parsed.differenceAnalysis,
      goldenRuleTip: parsed.goldenRuleTip,
      bilsemSuperPower: parsed.bilsemSuperPower,
      isAiGenerated: true,
      modelUsed: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    console.log('AI fallback triggered: AI mistake explanation unavailable');
    return res.status(200).json({
      fallback: true,
      error: 'AI service unavailable',
    });
  }
});

studentAiRoutes.post('/ai-step-explanation', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole('student', 'admin'), async (req, res) => {
  try {
    const validation = stepExplanationRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Çözüm açıklaması isteği geçersiz.' });
    }

    const {
      questionId,
      questionType,
      category,
      difficulty,
      prompt,
      secondaryPrompt,
      explanation,
      options,
      selectedOptionId,
      correctOptionId,
      isCorrect,
    } = validation.data;
    const sanitizedPrompt = sanitizeForPrompt(prompt);
    const sanitizedSecondaryPrompt = secondaryPrompt ? sanitizeForPrompt(secondaryPrompt) : undefined;

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'Gemini API key is not configured; using procedural step engine.',
      });
    }

    const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve üstün bilişsel yetenek sınavlarına hazırlanan ilkokul öğrencileri (7-11 yaş) için özel tasarlanmış uzman, şefkatli bir "Bilişsel Zeka ve Pedagojik Çözüm Rehberisin".

Öğrenci soruyu çözdü ve cevabını gönderdi.
- Öğrencinin Cevabı: ${selectedOptionId}
- Doğru Cevap: ${correctOptionId}
- Sonuç: ${isCorrect ? 'DOĞRU! Tebrik et ve mantığı pekiştir.' : 'YANLIŞ. Neden yanıldığını ve doğru yolu şefkatle açıkla.'}

Soru Bilgileri:
- Kategori: ${category}
- Soru Tipi: ${questionType}
- Zorluk Seviyesi: ${difficulty} / 6
- Soru Metni: "${sanitizedPrompt}" ${sanitizedSecondaryPrompt ? `(${sanitizedSecondaryPrompt})` : ''}
- Sorunun Mantık Özeti ve Çözüm Adımları: "${explanation?.summary || ''}" - "${explanation?.steps?.join(' | ') || ''}"
- Kural Başlığı: "${explanation?.ruleTitle || ''}"
- Seçenekler: ${JSON.stringify(options || [])}

GÖREVİN: Çocuğun zihninde soru çözümünü netleştirecek 4 KADEMELİ ADIM ADIM (Step-by-Step) Pedagojik Akordiyon Açıklaması oluşturmaktır:
1. "focus" (Görsel Odak & İlk Bakış): Çocuğun gözünü nereye dikmesi gerektiğini ve sorunun kalbini göster. (Rozet: "1. Odaklanma")
2. "rule" (Gizli Kural & Örüntü): Şekillerin veya sayıların arkasındaki değişim kuralını (dönme, parça artışı, simetri, analoji vb.) açıkla. (Rozet: "2. Kural Keşfi")
3. "elimination" (Çeldiricileri Eleme & Doğrulama): Yanıltıcı seçeneklerin neden yanlış olduğunu ve doğru seçeneğin neden tam oturduğunu netleştir. (Rozet: "3. Eleme & Sonuç")
4. "tactic" (Bilişsel Altın Taktik & BİLSEM Püf Noktası): Gelecek sorularda işine yarayacak akılda kalıcı pratik bir zeka taktiği ver. (Rozet: "4. Altın Taktik")

Üslup:
- Çok sevimli, cesaret verici, samimi, Türkçe ve 7-11 yaş çocuk seviyesine uygun.
- Her adımın açıklaması 2-3 cümle, net ve merak uyandırıcı olmalı.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction:
          'Sen çocuklar için bilişsel zeka sorularında akordiyon yapısıyla adım adım çözüm sunan pedagojik bir AI eğitmenisin.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headlineTitle: {
              type: Type.STRING,
              description: 'Çözüm için ilgi çekici kısa başlık (örn: Matris Çözüm Dedektifi)',
            },
            pedagogicalSummary: {
              type: Type.STRING,
              description: 'Çözümün ana fikrini özetleyen tek cümlelik dostane açıklama',
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  badge: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    description: 'focus | rule | elimination | tactic',
                  },
                  explanation: { type: Type.STRING },
                  keyObservation: { type: Type.STRING },
                  visualAnchor: { type: Type.STRING },
                },
                required: ['stepNumber', 'title', 'badge', 'type', 'explanation'],
              },
            },
          },
          required: ['headlineTitle', 'pedagogicalSummary', 'steps'],
        },
      },
    });

    const rawJson = response.text?.trim();
    if (!rawJson) {
      return res.status(200).json({ fallback: true });
    }

    const parsed = JSON.parse(rawJson);
    return res.json({
      success: true,
      fallback: false,
      questionId,
      selectedOptionId,
      correctOptionId,
      isCorrect: Boolean(isCorrect),
      category,
      questionType,
      difficulty,
      headlineTitle: parsed.headlineTitle,
      pedagogicalSummary: parsed.pedagogicalSummary,
      steps: parsed.steps,
      isAiGenerated: true,
      modelUsed: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    console.log('AI fallback triggered: AI step explanation unavailable');
    return res.status(200).json({
      fallback: true,
      error: 'AI service unavailable',
    });
  }
});

studentAiRoutes.post('/ai-daily-plan', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole('student', 'admin'), async (req, res) => {
  try {
    const validation = dailyPlanRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Çalışma planı isteği geçersiz.' });
    }
    const {
      studentName = 'Öğrenci',
      grade = 3,
      level = 4,
      streak = 5,
      dailyGoalQuestions = 10,
      dailyGoalMinutes = 15,
      todayQuestionsSolved = 0,
      unresolvedMistakes = [],
      masteries = [],
    } = validation.data;

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'Gemini API key is not configured; using procedural pedagogical plan generator.',
      });
    }

    const promptContext = `
Sen BİLSEM (Bilim ve Sanat Merkezleri) ve üstün yetenekli ilkokul öğrencileri (7-11 yaş) için çalışan uzman bir "Yapay Zeka Bilişsel Koç ve Eğitim Tasarımcısısın".

Öğrenci Bilgileri:
- İsim: ${studentName}
- Sınıf: ${grade}. Sınıf
- Seviye: Seviye ${level}
- Günlük Seri: ${streak} Gün
- Günlük Hedef: ${dailyGoalQuestions} Soru, ${dailyGoalMinutes} Dakika
- Bugün Şu Ana Kadar Çözülen Soru Sayısı: ${todayQuestionsSolved}

Öğrencinin Bilişsel Beceri Başarı Durumu (Mastery):
${JSON.stringify(
  masteries.map((m: any) => ({
    kategori: m.category,
    ad: m.categoryName,
    ustalikYuzdesi: m.mastery,
    dogrulukOrani: m.accuracy,
    trend: m.recentTrend,
  })),
  null,
  2
)}

Hata Defterinde Çözüm Bekleyen Sorular (${unresolvedMistakes.length} adet):
${JSON.stringify(
  unresolvedMistakes.slice(0, 5).map((m: any) => ({
    kategori: m.category,
    tip: m.questionType,
    zorluk: m.difficulty,
    metin: m.prompt,
  })),
  null,
  2
)}

GÖREVİN:
Her sabah güncellenen, bu öğrencinin GERÇEK EKSİK OLDUĞU (en düşük başarı yüzdesine sahip veya hata defterinde bekleyen soruları bulunan) konuları hedef alan KİŞİSELLEŞTİRİLMİŞ BİR "BUGÜNÜN ÇALIŞMA PLANI" üretmektir.

Plan Şunları İçermelidir:
1. "greetingTitle": Sabah enerjisi veren, neşeli, kişiselleştirilmiş başlık (örn: "Günaydın Deniz! Bugün Zihnini Parlatma Vakti 🚀")
2. "morningCoachMessage": Çocuğun dünkü serisini öven, bugün hangi 2 zayıf alanını (örn. Matris & Örüntü) güçlendireceğini anlatan samimi 2-3 cümlelik koçluk notu.
3. "motivationalQuote": Güne başlarken ilham verecek kısa bir zeka/özgüven sözü.
4. "focusWeaknesses": Öğrencinin en zayıf olduğu 2 veya 3 kategori için teşhis ve neden bugün üzerinde durulması gerektiğinin çocuk diliyle pedagojik açıklaması.
5. "tasks": Tam olarak 3 adet günlük hedef görevi:
   - Görev 1: En zayıf kategoride pratik (örn. "Zayıf Alan Güçlendirme: 4 Soru Matris Pratiği", actionType: "practice_category", category: en zayıf kategori, targetCount: 4)
   - Görev 2: Varsa Hata Defteri tekrarı veya 2. zayıf konu (örn. "Hata Avı: Bekleyen Soruları Fetheyle", actionType: "review_mistakes" veya "practice_category")
   - Görev 3: Destekleyici pratik veya adaptif antrenman (actionType: "adaptive_session" veya "practice_category")
6. "dailySuperpowerTarget": Bugün kazanılacak bilişsel süper güç unvanı (örn: "Matris Sihirbazı & 3D Pusula")
7. "totalTargetQuestions": ${dailyGoalQuestions || 10}
8. "estimatedMinutes": ${dailyGoalMinutes || 15}

Üslup:
- Çok sıcak, cesaretlendirici, motive edici, Türkçe ve çocuk dostu olmalıdır.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction:
          'Sen BİLSEM öğrencileri için her sabah kişiselleştirilmiş zeka antrenman programı hazırlayan pedagojik bir AI eğitim koçusun. Eksik konuları hedefler ve çocuğu yüreklendirirsin.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greetingTitle: {
              type: Type.STRING,
              description: 'Sabah karşılama başlığı',
            },
            morningCoachMessage: {
              type: Type.STRING,
              description: 'Sabah motivasyon ve rehberlik koçluk mesajı (2-3 cümle)',
            },
            motivationalQuote: {
              type: Type.STRING,
              description: 'Günün ilham veren zeka sözü',
            },
            focusWeaknesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  categoryName: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  currentMastery: { type: Type.NUMBER },
                },
                required: ['category', 'categoryName', 'reason', 'currentMastery'],
              },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  targetCount: { type: Type.NUMBER },
                  completedCount: { type: Type.NUMBER },
                  rewardXP: { type: Type.NUMBER },
                  isCompleted: { type: Type.BOOLEAN },
                  priority: { type: Type.STRING },
                  actionType: { type: Type.STRING },
                },
                required: [
                  'id',
                  'title',
                  'description',
                  'category',
                  'targetCount',
                  'completedCount',
                  'rewardXP',
                  'isCompleted',
                  'priority',
                  'actionType',
                ],
              },
            },
            dailySuperpowerTarget: {
              type: Type.STRING,
              description: 'Bugün hedeflenen bilişsel süper güç rozeti unvanı',
            },
            totalTargetQuestions: {
              type: Type.NUMBER,
              description: 'Toplam soru adedi hedefi',
            },
            estimatedMinutes: {
              type: Type.NUMBER,
              description: 'Tahmini tamamlanma süresi (dakika)',
            },
          },
          required: [
            'greetingTitle',
            'morningCoachMessage',
            'motivationalQuote',
            'focusWeaknesses',
            'tasks',
            'dailySuperpowerTarget',
            'totalTargetQuestions',
            'estimatedMinutes',
          ],
        },
      },
    });

    const rawJson = response.text?.trim();
    if (!rawJson) {
      return res.status(200).json({ fallback: true });
    }

    const parsed = JSON.parse(rawJson);
    return res.json({
      success: true,
      fallback: false,
      greetingTitle: parsed.greetingTitle,
      morningCoachMessage: parsed.morningCoachMessage,
      motivationalQuote: parsed.motivationalQuote,
      focusWeaknesses: parsed.focusWeaknesses,
      tasks: parsed.tasks,
      dailySuperpowerTarget: parsed.dailySuperpowerTarget,
      totalTargetQuestions: parsed.totalTargetQuestions || dailyGoalQuestions,
      estimatedMinutes: parsed.estimatedMinutes || dailyGoalMinutes,
      isAiGenerated: true,
      modelUsed: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    console.log('AI fallback triggered: AI daily plan unavailable');
    return res.status(200).json({
      fallback: true,
      error: 'AI plan service unavailable',
    });
  }
});

export default studentAiRoutes;
