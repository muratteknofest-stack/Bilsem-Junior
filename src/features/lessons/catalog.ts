import type { QuestionType } from '../../types';

export type LessonGroup = 'Görsel düşünme' | 'Mantık ve sayılar' | 'Dikkat ve hafıza';
export interface LessonCard { id: QuestionType; title: string; description: string; group: LessonGroup; symbol: string; tone: string; preview?: boolean }
export const LESSON_CATALOG: readonly LessonCard[] = [
  {id:'visual_sequence',title:'Örüntü Dedektifi',description:'Tekrar eden küçük grubu bul, sıradaki şekli keşfet.',group:'Görsel düşünme',symbol:'● ▲',tone:'mint',preview:true},
  {id:'visual_analogy',title:'Şekillerin İlişkisi',description:'İlk çiftteki değişimi yeni bir şekle uygula.',group:'Görsel düşünme',symbol:'↗',tone:'violet'},
  {id:'dice_unfold',title:'Küpü Keşfet',description:'Yüzleri, köşeleri ve karşılıklı yüzleri incele.',group:'Görsel düşünme',symbol:'⬡',tone:'sky'},
  {id:'matrix_2x2',title:'Görsel Matris',description:'Satırın kuralını bul, boş kutuyu tamamla.',group:'Görsel düşünme',symbol:'⊞',tone:'peach'},
  {id:'symmetry_completion',title:'Aynanın Öteki Yanı',description:'Ayna çizgisinin iki tarafını eşleştir.',group:'Görsel düşünme',symbol:'↔',tone:'rose'},
  {id:'visual_attention',title:'Dikkatli Gözler',description:'Küçük ayrıntıyı izle, aynı şekli yakala.',group:'Dikkat ve hafıza',symbol:'◎',tone:'violet'},
  {id:'direction_path',title:'Haritada Adım Adım',description:'Okları sırayla takip ederek hedefe ulaş.',group:'Görsel düşünme',symbol:'➜',tone:'mint'},
  {id:'symbol_coding',title:'Şifre Atölyesi',description:'Simgelerin anahtarını kullan, mesajı çöz.',group:'Mantık ve sayılar',symbol:'⌘',tone:'sky'},
  {id:'shadow_matching',title:'Gölge Avcısı',description:'Renkler gidince kalan dış çizgiyi tanı.',group:'Görsel düşünme',symbol:'◐',tone:'peach'},
  {id:'spatial_relationship',title:'Katmanların Sırrı',description:'Örtülen kenarlardan parçaların sırasını bul.',group:'Görsel düşünme',symbol:'▱',tone:'rose'},
  {id:'verbal_analogy',title:'Sözcük Köprüleri',description:'İki sözcük arasındaki bağı yeni çifte taşı.',group:'Mantık ve sayılar',symbol:'∞',tone:'violet'},
  {id:'top_view',title:'Yukarıdan Bak',description:'Bir yapının üstten görünüşünü keşfet.',group:'Görsel düşünme',symbol:'⌑',tone:'mint'},
  {id:'shape_combination',title:'Parçadan Bütüne',description:'Küçük parçaları birleştir, bütünü gör.',group:'Görsel düşünme',symbol:'◩',tone:'sky'},
  {id:'figure_completion',title:'Eksik Parçayı Bul',description:'Şeklin boşluğuna uyan parçayı seç.',group:'Görsel düşünme',symbol:'▧',tone:'peach'},
  {id:'weight_comparison',title:'Hangisi Daha Ağır?',description:'Terazinin alçalan kefesindeki ipucunu oku.',group:'Mantık ve sayılar',symbol:'⚖',tone:'rose'},
  {id:'shape_equation',title:'Terazide Eşitlik',description:'Eşit gruplarla bilinmeyen değeri bul.',group:'Mantık ve sayılar',symbol:'=',tone:'violet'},
  {id:'visual_memory',title:'Hafıza Bahçesi',description:'Gör, gruplandır, gizlenince hatırla.',group:'Dikkat ve hafıza',symbol:'✿',tone:'mint'},
  {id:'number_pattern',title:'Sayıların Ritmi',description:'Sayılar arasındaki adımları keşfet.',group:'Mantık ve sayılar',symbol:'+2',tone:'sky'},
];
export interface LessonStep { title: string; narration: string }
export interface LessonAudio { narrator: string; source: 'human-recording'; url: string }
export interface LessonDocument { id: QuestionType; version: number; steps: LessonStep[]; question: string; options: string[]; correctIndex: number; explanation: string; tip: string; audio: Array<LessonAudio | null> }
export const LESSON_GROUPS: readonly LessonGroup[] = ['Görsel düşünme','Mantık ve sayılar','Dikkat ve hafıza'];
