import { useEffect, useRef } from 'react';
import { sound } from '../lib/sound';
import type { MusicScene } from '../lib/audio-themes';

export function useMusicScene(scene: MusicScene | null, priority=10) {
  const owner=useRef(Symbol('music-scene'));
  useEffect(()=>sound.claimScene(owner.current,scene,priority),[scene,priority]);
}

export function useRouteAudio(route: string, student: boolean) {
  const previous=useRef(route);
  const scene: MusicScene | null=student ? route==='dashboard'?'lobby':route==='student-profile'?'profile':null : null;
  // A test/lesson route outranks outgoing views during their exit animation.
  useMusicScene(scene,scene?10:100);
  useEffect(()=>{if(previous.current!==route){previous.current=route;if(sound.unlocked)sound.playTransition();}},[route]);
}
