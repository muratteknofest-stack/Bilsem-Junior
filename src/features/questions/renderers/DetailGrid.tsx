import React from 'react';
export function DetailGrid({ cells, size }: { cells: number[]; size: number }) {
  return <svg viewBox="0 0 120 120" role="img" aria-label={`${size} satır ve sütunlu nokta deseni`} className="w-full h-28 sm:h-36">
    <rect x="2" y="2" width="116" height="116" rx="8" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
    {Array.from({length: size*size}, (_, i) => <circle key={i} cx={16+(i%size)*88/(size-1)} cy={16+Math.floor(i/size)*88/(size-1)} r={size === 4 ? 7 : 9} fill={cells.includes(i) ? '#334155' : '#e2e8f0'} />)}
  </svg>;
}
