import { BaseQuestion, QuestionAiHint, AiHintStep, QuestionType } from '../types';

class AiHintService {
  private cache: Map<string, QuestionAiHint> = new Map();

  /**
   * Fetches an AI-powered or Socratic step-by-step hint for a given question.
   */
  public async getHintForQuestion(
    question: BaseQuestion,
    unlockedStepsCount: number = 1
  ): Promise<QuestionAiHint> {
    const cacheKey = `${question.id}_${question.seed}`;

    // If already cached, just update unlocked steps count
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return {
        ...cached,
        unlockedSteps: Math.min(cached.totalSteps, Math.max(cached.unlockedSteps, unlockedStepsCount)),
      };
    }

    try {
      // Attempt to query server-side Gemini API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast UI fallback

      const response = await fetch('/api/ai-hint', {
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
          correctOptionId: question.correctOptionId,
          stepRequested: unlockedStepsCount,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.fallback && Array.isArray(data.steps) && data.steps.length > 0) {
          const result: QuestionAiHint = {
            questionId: question.id,
            category: question.category,
            questionType: question.type,
            difficulty: question.difficulty,
            totalSteps: data.steps.length,
            unlockedSteps: Math.min(data.steps.length, unlockedStepsCount),
            introEncouragement: data.introEncouragement || 'Harika bir dedektifsin! Bu soruyu adım adım çözelim.',
            steps: data.steps,
            isAiGenerated: true,
            modelUsed: data.modelUsed || 'gemini-3.8-flash',
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // Non-blocking catch; fallback to algorithmic pedagogical hints seamlessly
      console.warn('AI Hint API unavailable or timed out, switching to Socratic engine:', err);
    }

    // Fallback: Rich Pedagogical Socratic Hint Generator
    const proceduralHint = this.generateProceduralSocraticHint(question, unlockedStepsCount);
    this.cache.set(cacheKey, proceduralHint);
    return proceduralHint;
  }

  /**
   * Generates tailored pedagogical step-by-step hints based on cognitive question types
   */
  private generateProceduralSocraticHint(
    question: BaseQuestion,
    unlockedStepsCount: number
  ): QuestionAiHint {
    const steps: AiHintStep[] = [];
    const qType = question.type;
    const expl = question.explanation;

    // Step 1: Observation / Focus
    steps.push({
      stepNumber: 1,
      title: '1. Adım: Nereye Bakmalısın?',
      type: 'focus',
      content: this.getFocusHintContent(qType, question),
      keyObservation: this.getKeyObservation(qType, question),
      suggestedAction: 'Sorudaki şeklin başlangıç noktasına veya ilk kutucuğa dikkatle odaklan.',
    });

    // Step 2: Secret Rule / Transformation
    steps.push({
      stepNumber: 2,
      title: '2. Adım: Gizli Kuralı Keşfet',
      type: 'rule',
      content: this.getRuleHintContent(qType, question, expl),
      keyObservation: expl?.ruleTitle ? `Kural: ${expl.ruleTitle}` : 'Şekiller belli bir ritim veya simetriyle değişiyor.',
      suggestedAction: 'Bir önceki şekilden bir sonrakine geçerken neyin değiştiğini zihninde canlandır.',
    });

    // Step 3: Elimination / Target Key
    steps.push({
      stepNumber: 3,
      title: '3. Adım: Seçenekleri Ele ve Kontrol Et',
      type: 'elimination',
      content: this.getEliminationHintContent(qType, question, expl),
      keyObservation: `Aradığımız doğru parça kuralı tam olarak sağlayan tek şıktır.`,
      suggestedAction: 'Kurala uymayan seçenekleri hemen zihninde ele; kalan tek doğru seçeneği işaretle.',
    });

    return {
      questionId: question.id,
      category: question.category,
      questionType: question.type,
      difficulty: question.difficulty,
      totalSteps: 3,
      unlockedSteps: Math.min(3, Math.max(1, unlockedStepsCount)),
      introEncouragement: 'Takıldın mı? Hiç sorun değil! Bir bilişsel zeka dedektifi gibi adım adım ipuçlarını takip edelim.',
      steps,
      isAiGenerated: false,
      modelUsed: 'Bilişsel Pedagoji Motoru',
    };
  }

  private getFocusHintContent(qType: QuestionType, q: BaseQuestion): string {
    switch (qType) {
      case 'matrix_2x2':
      case 'matrix_3x3':
        return 'Matris sorularında önce soldan sağa (satır), ardından yukarıdan aşağıya (sütun) bak. Değişim sadece bir yönde mi ilerliyor, yoksa her satırda aynı kural mı tekrarlanıyor?';
      case 'figure_rotation':
        return 'Şeklin ucundaki belirgin bir noktayı (örneğin sivri köşeyi veya renkli parçayı) referans al. Bu parça bir saat kolu gibi hangi yöne dönüyor?';
      case 'mirror_reflection':
        return 'Ayna çizgisine (dikey veya yatay eksene) dikkat et. Aynaya en yakın olan parça, yansımada da aynaya en yakın yerde durmalıdır!';
      case 'symmetry_completion':
        return 'Eksik olan yarının simetri eksenine göre katlandığında tam birleşip birleşmediğini hayal et.';
      case 'visual_sequence':
      case 'number_pattern':
        return 'Örüntüdeki her adımda eklenen, çıkarılan veya yer değiştiren parçaları say. Ritim 1-2-3 diye mi artıyor, yoksa şekil sırayla mı değişiyor?';
      case 'visual_analogy':
        return 'İlk iki şekil arasındaki ilişkiyi bir dedektif gibi oku: "İlk şekil ikinci şekle dönüşürken ne yapıldıysa, üçüncü şekle de aynısı yapılmalıdır."';
      case 'odd_one_out':
        return 'Seçeneklerin 3 tanesi ortak bir kuralı paylaşır (köşe sayısı, yön, simetri vb.). Sadece 1 tanesi bu kuralı bozar. Farkı yaratan özelliği ara!';
      case 'figure_completion':
        return 'Boş kalan parçanın kenar sınırlarına ve çizgilerin devamına odaklan. Yapboz parçası oraya tam oturmalı.';
      default:
        return 'Sorudaki şekillerin yönlerine, renk dağılımlarına ve parça sayılarına dikkatlice odaklan.';
    }
  }

  private getKeyObservation(qType: QuestionType, q: BaseQuestion): string {
    switch (qType) {
      case 'matrix_2x2':
      case 'matrix_3x3':
        return 'Satır ve sütunlardaki elemanların ortak özelliklerini (renk, şekil, yön) karşılaştır.';
      case 'figure_rotation':
        return 'Dönüş açısına dikkat: Genellikle 45°, 90° veya 180° adımlarla saat yönünde döner.';
      case 'mirror_reflection':
        return 'Yansımada sağ ile sol yer değiştirir; yukarı ile aşağı aynı kalır.';
      case 'symmetry_completion':
        return 'Sol taraftaki çizgi ve desenlerin simetri çizgisinin sağına tam aynasını ara.';
      case 'visual_sequence':
      case 'number_pattern':
        return 'Adımlar arasındaki artış veya azalış miktarını not et.';
      case 'visual_analogy':
        return 'A ile B arasındaki değişim (iç içe geçme, dönme, renk değişimi) neyse C ile D arasında da aynısı olmalıdır.';
      case 'odd_one_out':
        return 'Dört seçeneğin üçünde olan ama birinde OLMAYAN kuralı keşfet.';
      case 'figure_completion':
        return 'Eksik kutucuğun çevresindeki komşu desen çizgilerini takip et.';
      default:
        return 'Belirgin bir ayrıntıyı referans al ve seçenekleri buna göre süz.';
    }
  }

  private getRuleHintContent(qType: QuestionType, q: BaseQuestion, expl: any): string {
    if (expl?.summary) {
      return `Bu sorunun anahtar mantığı: "${expl.summary}". Şekilleri bu kuralın süzgecinden geçirerek incele.`;
    }
    if (expl?.steps && expl.steps.length > 0) {
      return `İpuçları adımı: ${expl.steps[0]}. Parçalar arasındaki dönüşümü adım adım takip et.`;
    }
    return 'Şekiller arasında düzenli bir dönüşüm var: Renk değişimi, açısal dönüş veya parça ekleme kuralını yakala.';
  }

  private getEliminationHintContent(qType: QuestionType, q: BaseQuestion, expl: any): string {
    if (expl?.steps && expl.steps.length > 1) {
      return `Son eleme aşaması: ${expl.steps[1]}. Seçeneklere bak ve bu kurala uymayan şıkları hemen ele!`;
    }
    return 'Seçeneklerde ters duran veya fazladan parça içeren şıkları hemen ele. Kalan şık aradığın doğru cevap olacaktır.';
  }
}

export const aiHintService = new AiHintService();
