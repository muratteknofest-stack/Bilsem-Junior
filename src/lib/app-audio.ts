import { sound, type SoundEngine } from './sound';

const INTERACTIVE='button,a[href],summary,[role="button"],[role="tab"],input[type="checkbox"],input[type="radio"],select';
/** One delegated listener covers mouse, touch and keyboard clicks without editing every button. */
export function installAppAudio(engine: SoundEngine=sound, doc: Document=document, win: Window=window) {
  let visible=doc.visibilityState!=='hidden',pageActive=true,nativeActive=true;
  const update=()=>engine.setAppActive(visible&&pageActive&&nativeActive);
  const ignored=(target: Element)=>Boolean(target.closest('[data-audio-control],[data-ui-sound="off"],[aria-disabled="true"],fieldset[disabled]'));
  const gesture=(event: Event)=>{
    if(!event.isTrusted||!(event.target instanceof Element)||ignored(event.target))return;
    if(event instanceof KeyboardEvent&&(event.repeat||!['Enter',' '].includes(event.key)))return;
    if(event instanceof PointerEvent&&(!event.isPrimary||event.button!==0))return;
    engine.unlock();
  };
  const click=(event: MouseEvent)=>{
    if(!event.isTrusted||!(event.target instanceof Element)||ignored(event.target))return;
    const target=event.target.closest<HTMLElement>(INTERACTIVE);
    if(!target||target.matches(':disabled'))return;
    engine.unlock(); // Includes trusted clicks produced by assistive technology.
    engine.playInterfaceClick(target.matches('input[type="checkbox"],input[type="radio"]') ? (target as HTMLInputElement).checked : undefined);
  };
  const visibility=()=>{visible=doc.visibilityState!=='hidden';update();};
  const hide=()=>{pageActive=false;update();};
  const show=()=>{pageActive=true;visible=doc.visibilityState!=='hidden';update();};
  doc.addEventListener('pointerdown',gesture,true);doc.addEventListener('keydown',gesture,true);doc.addEventListener('click',click);
  doc.addEventListener('visibilitychange',visibility);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);update();
  return {
    setNativeActive(value: boolean){nativeActive=value;update();},
    dispose(){
      doc.removeEventListener('pointerdown',gesture,true);doc.removeEventListener('keydown',gesture,true);doc.removeEventListener('click',click);
      doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);
      engine.setAppActive(false);
    },
  };
}
