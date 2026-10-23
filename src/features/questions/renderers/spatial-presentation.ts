import {createContext} from 'react';
/** Camera controls are reserved for editorial preview. Assessment cameras stay fixed. */
export const SpatialPresentation=createContext<{method:'svg'|'webgl';perspective:boolean;controls:boolean;onUnavailable?:()=>void}>({method:'svg',perspective:false,controls:true});
