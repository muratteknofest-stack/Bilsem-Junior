import type { QuestionType } from '../../types';
import { generateQuestionForGrade } from '../../features/questions/generators';

export type PreviewGrade = 1 | 2 | 3 | 4;
export const GRADE_PREVIEWS = [
  { grade: 1, title: 'Meraklı minikler', description: 'Şekilleri tanı, benzerlikleri bul. İlk keşiflerine küçük ve anlaşılır adımlarla başla.', skills: ['Şekil örüntüleri', 'Görsel dikkat', 'Parça ve bütün'], type: 'visual_sequence', color: 'mint', symbol: '✿' },
  { grade: 2, title: 'İpucu avcıları', description: 'Şekillere başka bir açıdan bak. Döndür, karşılaştır ve aralarındaki ilişkiyi keşfet.', skills: ['Şekil döndürme', 'Ayna yansımaları', 'Kural keşfi'], type: 'figure_rotation', color: 'blue', symbol: '✦' },
  { grade: 3, title: 'Şifre dedektifleri', description: 'Sembollerin dilini çöz. İpuçlarını birleştirerek her sorunun arkasındaki kuralı bul.', skills: ['Sembol şifreleri', 'Sayı örüntüleri', 'Mantık ilişkileri'], type: 'symbol_coding', color: 'peach', symbol: '◆' },
  { grade: 4, title: 'Keşif kaptanları', description: 'Birden fazla ipucunu birlikte düşün. Bağlantıları kur, olasılıkları ele ve kendi yolunu bul.', skills: ['Mantık tabloları', 'Çok adımlı düşünme', 'Uzamsal ilişkiler'], type: 'logic_grid', color: 'purple', symbol: '★' },
] as const satisfies ReadonlyArray<{ grade: PreviewGrade; title: string; description: string; skills: readonly string[]; type: QuestionType; color: string; symbol: string }>;

export function createGradePreview(grade: PreviewGrade) {
  const profile = GRADE_PREVIEWS.find(item => item.grade === grade);
  if (!profile) throw new Error('Önizleme sınıfı 1–4 arasında olmalı.');
  return generateQuestionForGrade(grade, 4829 + grade * 131, profile.type);
}
