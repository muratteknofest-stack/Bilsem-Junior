import type { ObjectArt } from './colorful-engine';

/** Original toy silhouettes. Every variant changes an actual contour or cut-out.
 * Decoration is deliberately absent here: painted eyes/windows cannot change a shadow. */
export function objectSilhouette({shape,variant}:Pick<ObjectArt,'shape'|'variant'>):string[] {
  if(shape===0){
    const cups=[
      'M17 24H65V70Q65 83 41 83Q17 83 17 70Z M65 31H78Q92 31 92 47Q92 65 65 65Z M72 39V57Q84 56 84 47Q84 39 78 39Z',
      'M23 14H67V72Q67 86 45 86Q23 86 23 72Z M67 26H79Q92 26 92 45Q92 65 67 65Z M74 35V56Q84 54 84 45Q84 35 79 35Z',
      'M28 22H72V70Q72 83 50 83Q28 83 28 70Z M28 31H18Q6 31 6 47Q6 64 28 64Z M21 39V56Q14 54 14 47Q14 39 21 39Z M72 31H82Q94 31 94 47Q94 64 72 64Z M79 39V56Q86 54 86 47Q86 39 79 39Z',
      'M18 24H64V66Q64 78 41 78Q18 78 18 66Z M64 31H78Q91 31 91 46Q91 62 64 62Z M71 39V54Q83 53 83 46Q83 39 78 39Z M10 83H82L76 90H16Z',
    ];return [cups[variant]];
  }
  if(shape===1){
    const rockets=[
      'M50 7Q69 22 66 65L82 82L64 78L59 88H41L36 78L18 82L34 65Q31 22 50 7Z',
      'M50 6Q65 27 62 65L77 87L59 78L55 91H45L41 78L23 87L38 65Q35 27 50 6Z',
      'M50 8Q76 29 68 66L87 78L68 83L60 91H40L32 83L13 78L32 66Q24 29 50 8Z',
      'M50 7Q69 22 66 65L82 82L64 78L59 88H41L36 78L18 82L34 65Q31 22 50 7Z M45 43A5 5 0 1 0 55 43A5 5 0 1 0 45 43Z',
    ];return [rockets[variant]];
  }
  const fish=[
    'M24 50Q51 17 89 50Q51 83 24 50L7 72V28Z',
    'M24 50Q52 5 89 50Q52 95 24 50L7 74V26Z',
    'M24 50Q35 32 45 29L51 10L63 28Q79 34 89 50Q51 83 24 50L7 72V28Z',
    'M24 50Q51 17 89 50Q51 83 24 50L5 77L12 50L5 23Z',
  ];return [fish[variant]];
}
