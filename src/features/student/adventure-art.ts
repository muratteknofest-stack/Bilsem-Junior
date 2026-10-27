/** Bundled photography: no remote image requests are needed at runtime. */
export const ADVENTURE_PHOTOS = {
  forest:{src:'/adventure/photos/forest.webp',alt:'Yosunlu ağaçlar ve güneş ışığıyla aydınlanan yemyeşil bir orman',author:'Klaudia Borowiec',url:'https://unsplash.com/photos/moss-covered-trees-in-a-lush-green-forest-m2p993_GcBk'},
  sky:{src:'/adventure/photos/sky.webp',alt:'Bulutların arasından yükselen dağ zirveleri',author:'Jonas Degener',url:'https://unsplash.com/photos/mountains-peak-out-of-thick-fog-and-clouds-bk0EHOvg_Po'},
  valley:{src:'/adventure/photos/valley.webp',alt:'Dağların arasında uzanan yeşil vadi ve nehir',author:'Manu Alesanco',url:'https://unsplash.com/photos/lush-green-valley-with-winding-river-and-mountains-6TpQxTgWBb8'},
  cave:{src:'/adventure/photos/cave.webp',alt:'Işığın aydınlattığı doğal mağara kayaları',author:'Ksenia Kudelkina',url:'https://unsplash.com/photos/brown-rock-inside-cave-Wvas_uTO8wQ'},
  harbor:{src:'/adventure/photos/harbor.webp',alt:'Dağların önündeki sakin gölde ilerleyen tekne',author:'SERGEI BEZZUBOV',url:'https://unsplash.com/photos/long-tail-boat-sailing-on-calm-lake-with-mountains-b2yuoeMK-pw'},
  stars:{src:'/adventure/photos/stars.webp',alt:'Dağların üzerindeki yıldızlı gece gökyüzü ve Samanyolu',author:'Dns Dgn',url:'https://unsplash.com/photos/milky-way-on-mountains-9wH624ALFQA'},
  puzzles:{src:'/adventure/photos/puzzles.webp',alt:'Renkli gerçek ahşap oyun blokları',author:'Michał Bożek',url:'https://unsplash.com/photos/assorted-color-wooden-blocks-RcxR1aLw8X0'},
  notebook:{src:'/adventure/photos/notebook.webp',alt:'Defterin yanındaki renkli kalemler',author:'Kelly Brito',url:'https://unsplash.com/photos/coloring-pencils-on-notebook-lI1z94nf0RM'},
  compass:{src:'/adventure/photos/compass.webp',alt:'Haritanın üzerindeki gerçek pusula',author:'Chris Lawton',url:'https://unsplash.com/photos/compass-on-map-book-page-o0l-M8W_7wA'},
} as const;
export type AdventurePhoto = keyof typeof ADVENTURE_PHOTOS;
export const FEATURE_PHOTOS:Record<string,AdventurePhoto>={adaptive:'puzzles',exams:'notebook',practice:'valley','student-tests':'puzzles','student-topics':'notebook','student-lessons':'notebook',mistakes:'notebook','student-plan':'compass','student-skills':'forest',glossary:'notebook','student-challenges':'compass',achievements:'stars',leaderboard:'sky','student-progress':'harbor'};
export const STUDY_GROUPS=[
  {id:'tests',label:'Testler',routes:['adaptive','exams','practice','student-tests','student-topics','student-lessons']},
  {id:'tools',label:'Araçlar',routes:['mistakes','glossary']},
  {id:'growth',label:'Gelişim',routes:['student-plan','student-skills']},
] as const;
