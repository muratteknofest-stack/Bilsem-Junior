/** Browser-only fallback for manual Reels when GitHub Actions runners are unavailable.
 * Generates solver-verified original questions; records a real 9:16 movie.
 * It never accesses storage keys, student information, or Instagram credentials.
 */
import type { PerceptualBoard, PerceptualMechanic, PerceptualValue } from '../questions/perceptual-engine';

export type LocalReelRequest = { grade: 1 | 2 | 3 | 4; difficulty: number; mechanic: PerceptualMechanic | 'auto' };
export type LocalReelResult = { blob: Blob; extension: 'mp4' | 'webm'; mimeType: string; topic: string };
type LocalQuestion = { board: PerceptualBoard; options: Array<{ id: string; card: PerceptualValue }>; correctId: string; mechanic: PerceptualMechanic; grade: number; difficulty: number };

const W = 1080, H = 1920, LENGTH = 19;
const BG = '#101a46', SKY = '#9fe9ff', WHITE = '#f7faff', PINK = '#f76db6', GOLD = '#ffd76a';
const titles: Record<PerceptualMechanic, string> = {
  'analogy-grid': 'GÖRSEL ANALOJİ', 'paired-analogy': 'ŞEKİL İLİŞKİLERİ',
  'matrix-attributes': 'RAVEN MATRİS', 'feature-classification': 'SINIFLANDIRMA',
  'attribute-sequence': 'GÖRSEL ÖRÜNTÜ', 'interleaved-sequence': 'KARMA ÖRÜNTÜ',
};

async function questionFor(request: LocalReelRequest): Promise<LocalQuestion> {
  const [perceptual, quality, solver] = await Promise.all([
    import('../questions/perceptual-engine'),
    import('../questions/quality'),
    import('../questions/universal-solver'),
  ]);
  const mechanisms = perceptual.PERCEPTUAL_MECHANICS.filter(m =>
    (request.mechanic === 'auto' || m === request.mechanic) &&
    perceptual.perceptualAllowed(m, request.grade, request.difficulty));
  if (!mechanisms.length) throw Error('Bu sınıf ve seviyede seçilen soru türü desteklenmiyor.');
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  for (let attempt = 0; attempt < 96; attempt++) {
    const mechanic = mechanisms[attempt % mechanisms.length];
    const seed = (random[0] % 2000000000 + 104729 * attempt) % 2000000000 + 1;
    try {
      const q = perceptual.generatePerceptualQuestion(mechanic, seed, request.difficulty as 1 | 2 | 3 | 4, request.grade);
      const audit = quality.auditQuestion(q);
      const proof = solver.solveQuestion(q);
      if (audit.errors.length || audit.reviewRequired.length || !audit.solverVerified ||
        !proof.canSolve || !proof.isMatch || proof.ambiguityDetected ||
        proof.expectedAnswerId !== q.correctOptionId || q.options.length !== 4) continue;
      const board = perceptual.validatePerceptualBoard(q.visualConfig);
      const options = q.options.map(option => ({
        id: option.id,
        card: perceptual.perceptualValueSchema.parse(option.visualData),
      }));
      if (options.filter(option => option.id === q.correctOptionId).length !== 1) continue;
      return { board, options, correctId: q.correctOptionId, mechanic, grade: request.grade, difficulty: request.difficulty };
    } catch {
      // A failed proof never becomes a published or downloaded question.
    }
  }
  throw Error('Bu ayarlarda doğrulanmış soru bulunamadı. Farklı soru türü veya zorluk seçin.');
}

function rectangle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string = WHITE) {
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 ' + size + 'px system-ui, Arial, sans-serif'; ctx.fillText(value, x, y);
}
function symbol(ctx: CanvasRenderingContext2D, shape: PerceptualValue['shape'], x: number, y: number, size: number, rotation: number, filled: boolean, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation * Math.PI / 2);
  ctx.lineWidth = Math.max(3, size * .085); ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.fillStyle = filled ? color : '#edf5ff';
  ctx.beginPath();
  if (shape === 'arrow') {
    ctx.moveTo(0, -size*.44); ctx.lineTo(size*.40, 0);
    ctx.lineTo(size*.17, 0); ctx.lineTo(size*.17, size*.42);
    ctx.lineTo(-size*.17, size*.42); ctx.lineTo(-size*.17, 0);
    ctx.lineTo(-size*.40, 0);
  } else if (shape === 'flag') {
    ctx.moveTo(-size*.30, -size*.44); ctx.lineTo(size*.40, -size*.26);
    ctx.lineTo(size*.10, size*.12); ctx.lineTo(-size*.30, size*.03);
    ctx.moveTo(-size*.30, -size*.44); ctx.lineTo(-size*.30, size*.45);
  } else if (shape === 'key') {
    ctx.arc(-size*.12, -size*.15, size*.22, 0, Math.PI * 2);
    ctx.moveTo(size*.04, size*.02); ctx.lineTo(size*.39, size*.40);
    ctx.moveTo(size*.27, size*.27); ctx.lineTo(size*.13, size*.37);
  } else {
    ctx.ellipse(0, -size*.08, size*.33, size*.39, -.2, 0, Math.PI*2);
    ctx.moveTo(-size*.24, size*.40); ctx.lineTo(size*.14, -size*.24);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function card(ctx: CanvasRenderingContext2D, v: PerceptualValue | null, x: number, y: number, w: number, h: number) {
  rectangle(ctx, x, y, w, h, 22, '#fafcff', '#b8c9f5');
  if (!v) { label(ctx, '?', x+w/2, y+h/2, Math.min(110,h*.55), '#6761da'); return; }
  const palette: Record<PerceptualValue['shape'], string> = { arrow: '#5465ea', flag: '#dd52a2', key: '#00a6b0', leaf: '#8b56de' };
  const cols = v.count <= 3 ? v.count : v.count === 4 ? 2 : 3;
  const rows = Math.ceil(v.count / cols);
  const tile = Math.max(20, Math.min(84, (w-38)/cols, (h-24)/rows));
  const cellX = Math.min((w-22)/cols, tile+8);
  const cellY = Math.min((h-16)/rows, tile+8);
  for (let i=0;i<v.count;i++) {
    const px = x+w/2+(i%cols-(cols-1)/2)*cellX;
    const py = y+h/2+(Math.floor(i/cols)-(rows-1)/2)*cellY;
    symbol(ctx,v.shape,px,py,tile*.82,v.rotation,v.filled,palette[v.shape]);
  }
}
function frame(ctx: CanvasRenderingContext2D, q: LocalQuestion, second: number) {
  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,BG);bg.addColorStop(.6,'#222e73');bg.addColorStop(1,'#12436e');
  ctx.fillStyle = bg;ctx.fillRect(0,0,W,H);
  for (let i=0;i<25;i++) {
    const x=(i*213+39)%W,y=(i*149+126)%H;
    ctx.fillStyle='rgba(143,183,255,.22)';ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.fill();
  }
  rectangle(ctx,55,75,970,132,44,'#5143aa','#a197f4');
  label(ctx,'✦ BİLSEM JUNIOR ✦',W/2,138,51);
  label(ctx,'GÜNÜN ZEKA SORUSU',W/2,276,49,GOLD);
  rectangle(ctx,300,330,480,68,25,'#284881');
  label(ctx,q.grade+'. SINIF   •   '+q.difficulty+'. SEVİYE',W/2,365,28);
  label(ctx,titles[q.mechanic],W/2,452,34,SKY);

  rectangle(ctx,56,503,968,690,44,'#243b83','#6279c9');
  const cards=q.board.cards;
  const total=cards.length;
  const cols=total===9||total===3?3:q.mechanic==='paired-analogy'?2:
    q.mechanic==='attribute-sequence'||q.mechanic==='interleaved-sequence'?4:2;
  const rows=Math.ceil(total/cols);
  const gap=17,bw=860,bh=rows===1?245:rows===2?498:600;
  const cw=(bw-(cols-1)*gap)/cols,ch=(bh-(rows-1)*gap)/rows;
  const x0=(W-bw)/2,y0=546+(rows===1?165:rows===2?53:0);
  cards.forEach((v,i)=>card(ctx,v,x0+(i%cols)*(cw+gap),y0+Math.floor(i/cols)*(ch+gap),cw,ch));
  label(ctx,q.mechanic === 'feature-classification' ? 'ORTAK ÖZELLİĞİ BUL' : 'EKSİK OLANI BUL',W/2,1152,33,'#dbeaff');

  rectangle(ctx,62,1230,956,344,35,'#fbfcff');
  for(let i=0;i<q.options.length;i++){
    const item=q.options[i],x=78+(i%2)*478,y=1250+Math.floor(i/2)*150;
    const answered=second>=13&&item.id===q.correctId;
    rectangle(ctx,x,y,456,132,22,answered?'#ccffe1':'#e7ecff',answered?'#2db77e':'#c3d0eb');
    rectangle(ctx,x+10,y+15,68,100,15,answered?'#178d5d':'#314b99');
    label(ctx,'ABCD'[i],x+44,y+64,40);
    card(ctx,item.card,x+92,y+9,355,114);
  }
  if(second<2)label(ctx,'Hazır mısın? Şimdi düşün!',W/2,1650,39);
  else if(second<13) {
    label(ctx,'CEVAP İÇİN '+Math.ceil(13-second)+' SANİYE',W/2,1650,45,GOLD);
    rectangle(ctx,120,1717,840,34,16,'#364d8e');
    rectangle(ctx,120,1717,Math.max(28,840*(13-second)/11),34,16,PINK);
  } else if(second<16) {
    const index=q.options.findIndex(o=>o.id===q.correctId);
    label(ctx,'DOĞRU CEVAP: '+'ABCD'[index],W/2,1650,54,'#43eaa0');
    label(ctx,'Bravo! Doğru cevabı buldun mu?',W/2,1730,30);
  } else {
    label(ctx,'KAÇ SANİYEDE BULDUN?',W/2,1650,42,GOLD);
    label(ctx,'Yorumlara yaz!',W/2,1730,33);
  }
  label(ctx,'Daha fazlası Bilsem Junior uygulamasında',W/2,1845,27,'#d8edff');
}

function recordingFormat(): {mimeType:string;extension:'mp4'|'webm'} {
  if(typeof MediaRecorder==='undefined' || typeof HTMLCanvasElement.prototype.captureStream!=='function')
    throw Error('Bu tarayıcı video kaydını desteklemiyor. Güncel Chrome veya Edge kullanın.');
  const formats: Array<{mimeType:string;extension:'mp4'|'webm'}> = [
    {mimeType:'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',extension:'mp4'},
    {mimeType:'video/mp4',extension:'mp4'},
    {mimeType:'video/webm;codecs=vp9,opus',extension:'webm'},
    {mimeType:'video/webm;codecs=vp8,opus',extension:'webm'},
    {mimeType:'video/webm',extension:'webm'},
  ];
  const supported=formats.find(format=>MediaRecorder.isTypeSupported(format.mimeType));
  if(!supported)throw Error('Tarayıcı video kaydetme biçimlerini desteklemiyor.');
  return supported;
}

/** Recording happens in this tab, not on a GitHub or external video server.
 * The browser must remain open for the full 19s. */
export async function createBrowserReel(request:LocalReelRequest,onProgress:(percent:number)=>void):Promise<LocalReelResult> {
  const format=recordingFormat();
  onProgress(2);
  const audioContext = new AudioContext();
  // Resume immediately, while the user gesture is still active. Never hang
  // the entire video if a mobile browser disallows audio playback.
  void audioContext.resume().catch(() => {});
  let startedRecording = false;
  try {
  const q=await questionFor(request);
  onProgress(9);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Telefon bu video boyutunda çizim oluşturamıyor.');
  frame(ctx,q,0);
  const stream=canvas.captureStream(15);
  const audioDestination=audioContext.createMediaStreamDestination();
  const sound=audioContext.createGain();
  sound.gain.value=.18;sound.connect(audioDestination);
  audioDestination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  try {
    const tone=(when:number,frequency:number,length:number)=>{
      const o=audioContext.createOscillator(),gain=audioContext.createGain();
      o.type='sine';o.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,when);
      gain.gain.exponentialRampToValueAtTime(.2,when+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,when+length);
      o.connect(gain);gain.connect(sound);o.start(when);o.stop(when+length+.02);
    };
    for(let i=0;i<13;i++)tone(audioContext.currentTime+i,i===0?523:880,i===0?.3:.1);
    tone(audioContext.currentTime+13,523,.35);
    tone(audioContext.currentTime+13.22,659,.35);
    tone(audioContext.currentTime+13.44,784,.4);

    const recorder=new MediaRecorder(stream,{mimeType:format.mimeType,videoBitsPerSecond:3_000_000});
    const chunks:BlobPart[]=[];
    const recorded=new Promise<Blob>((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>reject(Error('Tarayıcı video kodlamasını tamamlayamadı.'));
      recorder.onstop=()=>{
        const blob=new Blob(chunks,{type:recorder.mimeType||format.mimeType});
        blob.size>12000?resolve(blob):reject(Error('Video dosyası boş çıktı. Başka bir tarayıcı deneyin.'));
      };
    });
    recorder.start(1000);
    const started=performance.now();
    startedRecording = true;
    let lastProgress = 10;
    await new Promise<void>((resolve,reject)=>{
      const tick=()=>{
        if(recorder.state==='inactive'){reject(Error('Video kaydı tarayıcı tarafından durduruldu.'));return;}
        const elapsed=(performance.now()-started)/1000;
        frame(ctx,q,Math.min(LENGTH-.001,elapsed));
        const progress = Math.min(99,Math.round(10+elapsed/LENGTH*89));
        if (progress !== lastProgress) { lastProgress = progress; onProgress(progress); }
        if(elapsed>=LENGTH){resolve();return;}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    recorder.stop();
    const blob=await recorded;
    onProgress(100);
    return {blob,extension:format.extension,mimeType:blob.type,topic:titles[q.mechanic]};
  }finally{
    stream.getTracks().forEach(track=>track.stop());
    if (startedRecording) onProgress(99);
  }
  } finally {
    await audioContext.close().catch(() => {});
  }
}
