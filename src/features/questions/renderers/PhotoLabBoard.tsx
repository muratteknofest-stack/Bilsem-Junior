import React from 'react';
import { PHOTO_ASSETS, type PhotoId, type PhotoBoard, type PhotoValue } from '../photo-lab';
import { useMemoryStudy } from './MemoryStudy';

export function PhotoCard({ id, position }: { id: PhotoId; position?: number }) {
  const asset = PHOTO_ASSETS[id];
  return <figure className="bj-photo-card"><img src={asset.src} alt={`${asset.label} fotoğrafı`} width="768" height="768" decoding="async" draggable={false} />{position !== undefined && <figcaption>{position}</figcaption>}</figure>;
}
export function PhotoValueArt({ value }: { value: PhotoValue }) {
  return value.photoAnswer === 'photo' ? <PhotoCard id={value.id} /> : <span className="bj-photo-number">{value.number}<small>{value.photoAnswer === 'position' ? '. kart' : ' kart'}</small></span>;
}
export function PhotoLabBoard({ board: b }: { board: PhotoBoard }) {
  const memory = useMemoryStudy();
  const grid = (cards: readonly PhotoId[], columns: number, numbered = false) => <div className="bj-photo-grid" style={{ '--photo-columns': columns } as React.CSSProperties}>{cards.map((id, i) => <PhotoCard key={i} id={id} position={numbered ? i + 1 : undefined} />)}</div>;
  let content: React.ReactNode;
  if (b.mechanic === 'photo-sequence') content = <><div className="bj-photo-sequence">{b.sequence.map((id, i) => <PhotoCard key={i} id={id} />)}<span className="bj-photo-hole" aria-label="Sıradaki boş kart">?</span></div><p>Soldan sağa aynı sıra tekrar ediyor.</p></>;
  else if (b.mechanic === 'photo-difference') content = <div className="bj-photo-comparison"><div><h3>İlk pano</h3>{grid(b.left, b.columns, true)}</div><div><h3>İkinci pano</h3>{grid(b.right, b.columns, true)}</div></div>;
  else if (b.mechanic === 'photo-count') content = <><div className="bj-photo-target"><span>Hedef fotoğraf</span><PhotoCard id={b.target} /></div>{grid(b.cards, b.columns)}</>;
  else content = <>{!memory.hidden && <div className="bj-photo-sequence">{b.cards.map((id, i) => <PhotoCard key={i} id={id} position={i + 1} />)}</div>}{!memory.locked && <p role="status">Soldan sağa {b.position}. kartta hangi fotoğraf vardı?</p>}</>;
  return <section className="bj-photo-board" data-photo-mechanic={b.mechanic} aria-label="Gerçek fotoğraflarla düşün">{content}<details className="bj-photo-credits"><summary>Fotoğraf kaynakları</summary><p>Marko Blažević · Bordercolliez · Yinan Chen. CC0 / kamu malı.</p><a href="/question-photos/v1/credits.json" target="_blank" rel="noreferrer">Kaynaklar ve kullanım bilgileri</a></details></section>;
}
