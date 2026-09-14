import type { QuestionType } from '../../types';
export const TASK_TYPES: Partial<Record<QuestionType,string>> = {
  mirror_reflection:'reflection',symmetry_completion:'reflection',figure_completion:'polygon_piece',tangram_puzzle:'polygon_piece',shape_combination:'union',shadow_matching:'silhouette',paper_folding:'fold',punch_folding:'fold',multiview_perspective:'projection',top_view:'projection',cube_counting:'projection',raven_matrix:'boolean_matrix',logic_grid:'assignment',story_logic:'ordering',verbal_analogy:'analogy',word_scramble_logic:'word_order',dice_unfold:'cube_net',spatial_origami:'cube_net',
};
export function puzzlePrompt(type:QuestionType, t:any): string {
  const prompts: Partial<Record<QuestionType,string>> = {
    mirror_reflection:`Desenin ${t.axis==='vertical'?'dikey':'yatay'} ayna eksenine göre yansıması hangisidir?`,
    symmetry_completion:`Verilen yarının ${t.axis==='vertical'?'dikey':'yatay'} eksene göre simetrik eşini seç.`,
    figure_completion:'Kesikli sınırla gösterilen boşluğa hangi parça tam oturur? Parçalar döndürülebilir; boyutları değiştirilemez.',
    tangram_puzzle:'Tangram karesindeki boşluğa hangi parça tam oturur? Parçalar döndürülebilir; boyutları değiştirilemez.',
    shape_combination:'Izgaralar kaydırılmadan üst üste konulursa dolu karelerin birleşimi hangisi olur?',
    shadow_matching:'Renkler kaldırıldığında desenin silüeti hangi seçenekteki gibi olur?',
    paper_folding:'Kağıt gösterilen eksenden katlanıp işaretli noktadan delinmiştir. Tam açıldığında delikler nerede olur?',
    punch_folding:'Kağıt belirtilen sırayla katlanıp delinmiştir. Katlar ters sırayla açıldığında deliklerin tamamı nerede olur?',
    multiview_perspective:`Yükseklik planındaki küp yapısının ${t.view==='front'?'ÖNDEN':t.view==='right'?'SAĞDAN':'ÜSTTEN'} görünüşü hangisidir?`,
    top_view:'Yükseklik planındaki küp yapısına ÜSTTEN bakıldığında dolu kareler nasıl görünür?',
    cube_counting:'Planda her karede yazan sayı o konumdaki küp yüksekliğidir. Yapıda toplam kaç küp vardır?',
    raven_matrix:`Her satırda ilk iki desen için ${t.operation==='xor'?'yalnızca birinde bulunan kareler kalır (ortak kareler silinir)':t.operation==='intersection'?'yalnızca ortak dolu kareler kalır':'dolu karelerin birleşimi alınır'}. Eksik desen hangisidir?`,
    logic_grid:`Her kişi farklı bir nesneyle eşleşir. İpuçlarına göre ${t.names?.[t.asked]} hangi nesneyle eşleşir?`,
    story_logic:`Yalnızca listelenen kişiler sıralanıyor. Verilen sıraya göre ${t.askedPosition===0?'ilk':'son'} sırada kim vardır?`,
    verbal_analogy:`Bilgi tablosundaki ilişkilere göre ${t.example?.[0]} → ${t.example?.[1]} ilişkisi, ${t.asked} → ? için hangi sözcükle tamamlanır?`,
    word_scramble_logic:'Harfleri gösterilen sıra numaralarına göre yeniden diz. Şifreli sonuç hangisidir?',
    dice_unfold:`Açılım katlandığında ${t.labels?.[t.target]} yüzünün karşısındaki yüz hangisidir?`,
    spatial_origami:`Kutu kapatıldığında ${t.labels?.[t.target]} simgesinin tam karşısına hangi simge gelir?`,
  };
  return prompts[type] || '';
}
