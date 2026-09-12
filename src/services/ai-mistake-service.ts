import { BaseQuestion, AiMistakeExplanation, QuestionType } from '../types';

class AiMistakeService {
  private cache: Map<string, AiMistakeExplanation> = new Map();

  /**
   * Fetches an AI-powered or pedagogical mistake explanation for a given question and wrong answer.
   */
  public async explainMistake(
    question: BaseQuestion,
    selectedOptionId: string
  ): Promise<AiMistakeExplanation> {
    const cacheKey = `${question.id}_${question.seed}_${selectedOptionId}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('/api/ai-explain-mistake', {
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
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.fallback) {
          const result: AiMistakeExplanation = {
            questionId: question.id,
            selectedOptionId,
            correctOptionId: question.correctOptionId,
            category: question.category,
            questionType: question.type,
            difficulty: question.difficulty,
            empatheticIntro: data.empatheticIntro,
            misconceptionTrap: data.misconceptionTrap,
            differenceAnalysis: data.differenceAnalysis,
            goldenRuleTip: data.goldenRuleTip,
            bilsemSuperPower: data.bilsemSuperPower,
            isAiGenerated: true,
            modelUsed: data.modelUsed || 'gemini-3.8-flash',
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('AI Mistake service API call failed, falling back to procedural analyzer:', err);
    }

    // High quality procedural fallback based on question domain
    const fallback = this.generateProceduralMistakeExplanation(question, selectedOptionId);
    this.cache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Generates a pedagogical fallback explanation for mistaken answer choices
   */
  private generateProceduralMistakeExplanation(
    question: BaseQuestion,
    selectedOptionId: string
  ): AiMistakeExplanation {
    const qType = question.type;
    const cat = question.category;
    const correctOpt = question.correctOptionId;

    let empatheticIntro = `${selectedOptionId} seçeneğini işaretlemen çok doğal, çünkü bu soru ilk bakışta zihni yanıltabilecek güçlü bir çeldiriciye sahip!`;
    let misconceptionTrap = 'Sorudaki ana kuralı ararken şeklin sadece bir özelliğine (örneğin yalnızca rengine veya dış sınırına) odaklanmış olabilirsin.';
    let differenceAnalysis = `Senin seçtiğin ${selectedOptionId} şıkkı ile doğru olan ${correctOpt} şıkkı arasındaki temel fark; doğru seçenekteki parçaların kurala tam uyum sağlamasıdır.`;
    let goldenRuleTip = 'BİLSEM Sorularında Altın Kural: Seçenekleri incelerken "Bu şık kuralı %100 sağlıyor mu, yoksa sadece bana tanıdık mı geliyor?" diye kendine sor.';
    let bilsemSuperPower = 'Çeldirici Avcısı & Bütünsel Bakış';

    if (cat === 'matrix' || qType === 'matrix_2x2' || qType === 'matrix_3x3') {
      empatheticIntro = `${selectedOptionId} şıkkını seçmen gayet anlaşılır; matris sorularında bir satırdaki kural sütunda farklı görünebilir!`;
      misconceptionTrap = 'Muhtemelen yalnızca soldan sağa (satır) kuralına baktın, ancak yukarıdan aşağıya (sütun) kuralını da aynı anda sağlamak gerekiyordu.';
      differenceAnalysis = `${selectedOptionId} şıkkı matrisin yalnızca tek yönlü kuralını karşılarken, doğru seçenek olan ${correctOpt} hem satır hem de sütun kesişimindeki simetriyi ve eksik elemanı eksiksiz tamamlıyor.`;
      goldenRuleTip = 'Matris Kuralı: Karar vermeden önce cevabını hem satırda hem de sütunda iki kez çapraz kontrol et!';
      bilsemSuperPower = 'Çapraz Matris Gözü';
    } else if (cat === 'spatial' || qType === 'figure_rotation' || qType === 'spatial_relationship' || qType === 'mirror_reflection') {
      empatheticIntro = `${selectedOptionId} seçeneğindeki şekil doğru şekille neredeyse ikiz gibi duruyor, bu yüzden zihnin bu yöne kaymış olabilir!`;
      misconceptionTrap = 'Uzamsal döndürmede veya yansımada açı derecesi ya da ayna ekseni yönü karıştırılmış olabilir.';
      differenceAnalysis = `${selectedOptionId} şıkkında şekil ayna simetrisi veya ters açı almış; oysa doğru seçenek olan ${correctOpt}, kurala uygun olarak döndürülmüş halidir.`;
      goldenRuleTip = 'Uzamsal Taktik: Şeklin belirgin bir köşesini (örneğin sivri ucunu veya renkli noktasını) "pusula ibresi" gibi takip et.';
      bilsemSuperPower = '3 Boyutlu Zihin Pusulası';
    } else if (cat === 'pattern' || qType === 'visual_sequence' || qType === 'number_pattern') {
      empatheticIntro = `${selectedOptionId} seçeneği dizideki ritme çok yakın göründüğü için seni kendine çekmiş olabilir!`;
      misconceptionTrap = 'Örüntü adım sayısında (+1, +2, +3 gibi artışlarda) veya döngünün başlangıç periyodunda küçük bir atlama yaşanmış olabilir.';
      differenceAnalysis = `${selectedOptionId} şıkkı bir önceki adımın tekrarı veya yanlış sıradaki halkası iken, ${correctOpt} seçeneği örüntü kuralının tam sıradaki mantıklı devamıdır.`;
      goldenRuleTip = 'Örüntü Taktiği: Adımların altına farkları (+2, -1, dönme 90°) ritmik bir melodi gibi mırıldanarak yaz.';
      bilsemSuperPower = 'Ritim ve Dizi Dedektifi';
    } else if (cat === 'attention' || qType === 'visual_attention' || qType === 'odd_one_out') {
      empatheticIntro = `${selectedOptionId} şıkkı görsel olarak o kadar benzer ki, hızlı bakışta gözü kolayca kandırabiliyor!`;
      misconceptionTrap = 'Gözün genel şekle odaklanırken, iç kısımdaki minik bir çizgi kalınlığı, nokta adedi veya açı farkını kaçırmış olabilirsin.';
      differenceAnalysis = `${selectedOptionId} şıkkındaki detay doğru olan ${correctOpt} şıkkına göre ufak bir eksik veya fazlalık barındırıyor.`;
      goldenRuleTip = 'Dikkat Taktiği: İki seçenek arasında kaldığında parmağınla tek tek şeklin kenarlarını takip ederek farkı bul.';
      bilsemSuperPower = 'Büyüteçli Odak Gücü';
    }

    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: correctOpt,
      category: cat,
      questionType: qType,
      difficulty: question.difficulty,
      empatheticIntro,
      misconceptionTrap,
      differenceAnalysis,
      goldenRuleTip,
      bilsemSuperPower,
      isAiGenerated: false,
      modelUsed: 'Bilişsel Pedagoji Motoru',
    };
  }
}

export const aiMistakeService = new AiMistakeService();
