import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { installAppAudio } from '../lib/app-audio';

export function AppAudio() {
  useEffect(()=>{
    const controller=installAppAudio();let disposed=false,listener:PluginListenerHandle|undefined;
    if(Capacitor.isNativePlatform()) {
      void NativeApp.addListener('appStateChange',state=>controller.setNativeActive(state.isActive)).then(handle=>{
        if(disposed)void handle.remove().catch(()=>{});else listener=handle;
      }).catch(()=>{});
      void NativeApp.getState().then(state=>{if(!disposed)controller.setNativeActive(state.isActive);}).catch(()=>{});
    }
    return()=>{disposed=true;controller.dispose();void listener?.remove().catch(()=>{});};
  },[]);
  return null;
}
