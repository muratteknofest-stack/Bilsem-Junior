import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppAudio } from '../../src/components/AppAudio';
import { StudentExperienceControls } from '../../src/components/student/StudentExperienceControls';
import { useRouteAudio } from '../../src/hooks/useAppAudio';
import { sound } from '../../src/lib/sound';
import { MUSIC_THEMES, scheduleMusicNote } from '../../src/lib/audio-themes';
import '../../src/index.css';
import '../../src/components/VerifiedLearningView.css';
const root = createRoot(document.getElementById('root')!);
Object.assign(window, { audioTest: { sound, unmount: () => root.unmount(), MUSIC_THEMES, scheduleMusicNote } });
function Fixture() {
  const [route, setRoute] = useState('dashboard');
  useRouteAudio(route, true);
  return <main style={{padding:20}}><AppAudio/><nav>{[['dashboard','Lobi'],['student-profile','Profil'],['practice','Sorular'],['student-lessons','Konu']].map(([id,label])=><button style={{minHeight:44,padding:12}} key={id} onClick={()=>setRoute(id)}>{label}</button>)}</nav><h1>{route}</h1><button id="effect" style={{padding:16}}>Keşfet</button><StudentExperienceControls variant="playful"/></main>;
}
root.render(<StrictMode><Fixture/></StrictMode>);
