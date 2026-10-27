import { useCallback,useEffect,useRef,useState } from 'react';
import type { LessonAudio } from '../../features/lessons/catalog';
import { authenticatedFetch } from '../../lib/api-client';

// No recording is claimed unless an approved human-recording asset is provided.
export function useLessonVoice(text:string,recording:LessonAudio|null){
 const [speaking,setSpeaking]=useState(false),[error,setError]=useState('');
 const audio=useRef<HTMLAudioElement|null>(null),url=useRef<string|null>(null),sequence=useRef(0);
 const stop=useCallback(()=>{sequence.current++;audio.current?.pause();audio.current=null;if(url.current)URL.revokeObjectURL(url.current);url.current=null;
  if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();setSpeaking(false);},[]);
 useEffect(()=>{stop();setError('');return stop;},[text,recording,stop]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[stop]);
 async function play(){
  if(speaking){stop();return;}stop();setError('');const current=sequence.current;
  if(recording){
   try {if(!/^\/api\/student\/lessons\/[a-z0-9_]+\/audio\/[0-9]+$/.test(recording.url))throw Error();
    const response=await authenticatedFetch(recording.url);if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))throw Error();
    const blob=await response.blob();if(current!==sequence.current)return;
    url.current=URL.createObjectURL(blob);const player=new Audio(url.current);audio.current=player;player.onended=stop;player.onerror=()=>{stop();setError('Ses kaydı oynatılamadı. Metinle devam edebilirsin.');};
    await player.play();if(current===sequence.current)setSpeaking(true);
   } catch {if(current===sequence.current){stop();setError('Ses kaydı yüklenemedi. Tekrar deneyebilir veya metinle ilerleyebilirsin.');}}return;
  }
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){setError('Bu cihazda sesli okuma bulunmuyor. Anlatımın tamamını aşağıda okuyabilirsin.');return;}
  try {
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='tr-TR';utterance.rate=.9;
  const voice=window.speechSynthesis.getVoices().find(item=>item.lang.toLowerCase().startsWith('tr')&&item.localService);
  if(!voice){setError('Bu cihazda yerel Türkçe ses bulunamadı. Metni okuyarak devam edebilirsin.');return;}
  utterance.voice=voice;utterance.onend=()=>{if(current===sequence.current)setSpeaking(false);};utterance.onerror=()=>{if(current===sequence.current){setSpeaking(false);setError('Cihaz sesi kesildi. Yeniden deneyebilirsin.');}};
  setSpeaking(true);window.speechSynthesis.speak(utterance);
  } catch {stop();setError('Cihaz sesi başlatılamadı. Metni okuyarak devam edebilirsin.');}
 }
 return {speaking,error,play,stop};
}
