import { RELATION_OBJECTS, type RelationObject } from '../relation-objects';

export function RealObjectToken({ object }: { object: RelationObject }) {
  const asset = RELATION_OBJECTS[object];
  return <span className="bj-real-object-token" role="img" aria-label={asset.label} data-real-object={object}>
    <img src={asset.src} alt="" width={96} height={96} decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
    <small aria-hidden="true">{asset.label}</small>
  </span>;
}
