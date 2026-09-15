import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { z } from 'zod';
import { app } from './firebase';

const env = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : ((process.env as Record<string, string | undefined>) || {});

const modelName = env.VITE_FIREBASE_AI_MODEL || 'gemini-3.8-flash';

export async function generateFirebaseAiJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  timeoutMs = 6500,
): Promise<T | null> {
  try {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: modelName,
      systemInstruction:
        'Sen 6-10 yaş arası çocuklar için çalışan güvenli bir BİLSEM öğretmenisin. Yalnızca istenen JSON yapısını döndür; kişisel veri isteme ve kesinlikle cevap anahtarını ipucu aşamasında doğrudan açıklama.',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35,
        maxOutputTokens: 1800,
      },
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
    });
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    if (timeoutId) clearTimeout(timeoutId);

    const raw = result.response.text().trim();
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
    const validated = schema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch (error) {
    console.warn('Firebase AI Logic kullanılamadı; pedagojik yedek içerik kullanılacak.', error);
    return null;
  }
}
