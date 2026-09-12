import { BaseQuestion, AiStepByStepExplanation, AiExplanationStep } from '../types';

class AiStepExplanationService {
  private cache: Map<string, AiStepByStepExplanation> = new Map();

  /**
   * Fetches an AI-generated step-by-step explanation for a question after answer submission.
   */
  public async getStepExplanation(
    question: BaseQuestion,
    selectedOptionId: string
  ): Promise<AiStepByStepExplanation> {
    const isCorrect = selectedOptionId === question.correctOptionId;
    const cacheKey = `${question.id}_${question.seed}_${selectedOptionId}_${isCorrect ? 'c' : 'w'}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch('/api/ai-step-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          questionId: question.id,
          questionType: question.type,
          category: question.category,
          difficulty: question.difficulty,
          prompt: question.prompt,
          secondaryPrompt: question.secondaryPrompt,
          explanation: question.explanation,
          options: question.options.map((o) => ({ id: o.id, label: o.label })),
          selectedOptionId,
          correctOptionId: question.correctOptionId,
          isCorrect,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.fallback && Array.isArray(data.steps) && data.steps.length > 0) {
          const result: AiStepByStepExplanation = {
            questionId: question.id,
            selectedOptionId,
            correctOptionId: question.correctOptionId,
            isCorrect,
            category: question.category,
            questionType: question.type,
            difficulty: question.difficulty,
            headlineTitle: data.headlineTitle || `${question.explanation.ruleTitle} Çözümü`,
            pedagogicalSummary: data.pedagogicalSummary || question.explanation.summary,
            steps: data.steps,
            isAiGenerated: true,
            modelUsed: data.modelUsed || 'gemini-3.8-flash',
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('AI step explanation server error, using procedural fallback:', e);
    }

    // Procedural Fallback generator if offline, timeout, or no API key
    const fallback = this.generateProceduralExplanation(question, selectedOptionId, isCorrect);
    this.cache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * High quality procedural fallback ensuring seamless UX without delays.
   */
  private generateProceduralExplanation(
    question: BaseQuestion,
    selectedOptionId: string,
    isCorrect: boolean
  ): AiStepByStepExplanation {
    const steps: AiExplanationStep[] = [];
    const expl = question.explanation;

    // Step 1: Visual Focus / Observation
    steps.push({
      stepNumber: 1,
      title: '1. Görsel Odak & Soru Kökü Analizi',
      badge: '1. Odaklanma',
      type: 'focus',
      explanation: `Soruda "${question.prompt}" isteniyor. İlk olarak görseldeki ana nesnelerin dizilişine ve referans noktalarına dikkatlice bakmalıyız.`,
      keyObservation: expl.visualHint?.details || 'Gözlerini sorunun eksenine sabitle ve temel desenleri incele.',
      visualAnchor: 'Referans Eksen',
    });

    // Step 2: Hidden Logic & Pattern Discovery
    const ruleDetail = expl.steps && expl.steps.length > 0
      ? expl.steps[0]
      : expl.summary;
    steps.push({
      stepNumber: 2,
      title: '2. Gizli Mantık & Değişim Kuralı',
      badge: '2. Kural Keşfi',
      type: 'rule',
      explanation: `${expl.ruleTitle}: ${ruleDetail}`,
      keyObservation: expl.steps?.[1] || 'Şekiller veya simgeler belirli bir matematiksel / geometrik kurala göre değişmektedir.',
      visualAnchor: 'Dönüşüm Kuralı',
    });

    // Step 3: Option Elimination & Validation
    if (isCorrect) {
      steps.push({
        stepNumber: 3,
        title: '3. Seçenek Eleme & Doğrulama',
        badge: '3. Eleme & Sonuç',
        type: 'elimination',
        explanation: `Seçtiğin "${selectedOptionId}" seçeneği, kuralın tüm gereksinimlerini eksiksiz karşılıyor. Diğer seçenekler açı, parça sayısı veya yön uyumsuzluğu nedeniyle elenir.`,
        keyObservation: `Doğru cevap kesin olarak "${question.correctOptionId}" şıkkıdır. Harika bir akıl yürütme!`,
        visualAnchor: 'Doğrulama',
      });
    } else {
      steps.push({
        stepNumber: 3,
        title: '3. Çeldirici Analizi & Fark Tespiti',
        badge: '3. Eleme & Sonuç',
        type: 'elimination',
        explanation: `İşaretlediğin "${selectedOptionId}" seçeneği ilk bakışta doğru gibi görünse de kritik bir ayrıntıda yanıltıcıdır. Doğru seçenek olan "${question.correctOptionId}", kuraldaki tüm açı ve parça dizilimini kusursuz tamamlar.`,
        keyObservation: `Doğru cevap: ${question.correctOptionId} şıkkı. Aralarındaki farkı dikkatle inceleyelim.`,
        visualAnchor: 'Kritik Fark',
      });
    }

    // Step 4: Cognitive Golden Tactic (BİLSEM Superpower)
    const categoryTips: Record<string, string> = {
      matrix: 'Matris sorularında önce satırları soldan sağa, ardından sütunları yukarıdan aşağıya kontrol et.',
      pattern: 'Örüntülerde her adımda neyin arttığını, azaldığını veya döndüğünü bir parmağınla sayarak takip et.',
      spatial: 'Şekli zihninde 90 derece çevirirken belirgin bir köşeyi (örneğin tepe noktasını) pusula gibi izle.',
      logic: 'Önce zıtlıkları ve ortak özellikleri grupla; sonra eşleştirmeyi kur.',
      visual_perception: 'Parçayı bütüne yerleştirirken dış kenar çizgilerinin uyumuna dikkat et.',
      attention: 'Birbirine çok benzeyen şekillerde farklı olan tek bir minik noktayı büyüteçle bakar gibi tara.',
      memory: 'Gördüğün renkleri veya sıralamayı bir hikaye gibi zihninde canlandır.',
      numerical: 'Sayılar arasındaki artış veya azalış farklarını zihinden ardışık olarak yaz.',
    };

    steps.push({
      stepNumber: 4,
      title: '4. BİLSEM Bilişsel Altın Taktik',
      badge: '4. Altın Taktik',
      type: 'tactic',
      explanation: categoryTips[question.category] || 'Bir sonraki soruda seçeneklere bakmadan önce zihninde cevabı canlandırmayı dene.',
      keyObservation: 'Bilişsel Esneklik: Tek bir ipucuna takılmayıp bütün resmi görmek başarıyı getirir.',
      visualAnchor: 'Zeka Stratejisi',
    });

    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      isCorrect,
      category: question.category,
      questionType: question.type,
      difficulty: question.difficulty,
      headlineTitle: `${expl.ruleTitle || 'Adım Adım Çözüm Mantığı'}`,
      pedagogicalSummary: expl.summary,
      steps,
      isAiGenerated: false,
      modelUsed: 'procedural-socratic-v2',
    };
  }
}

export const aiStepExplanationService = new AiStepExplanationService();
