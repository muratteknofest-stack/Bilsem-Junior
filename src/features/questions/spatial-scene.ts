export interface SpatialSceneData {size:number;maxHeight:number;cubes:Array<{x:number;y:number;z:number}>}
export interface SpatialQuality {dpr:[number,number];shadows:boolean;shadowResolution:number;bevelSegments:number}
export function createSpatialScene(size:number,heights:readonly number[]):SpatialSceneData {
 if(!Number.isInteger(size)||size<1||size>6||heights.length!==size*size||heights.some(h=>!Number.isInteger(h)||h<0||h>6)||!heights.some(h=>h>0))throw Error('Invalid cube grid');
 return {size,maxHeight:Math.max(...heights),cubes:heights.flatMap((height,index)=>Array.from({length:height},(_,z)=>({x:index%size,y:Math.floor(index/size),z})))};
}
export function spatialQuality(device:{cores?:number;memoryGb?:number;pixelRatio?:number;reducedMotion?:boolean}):SpatialQuality{
 const low=(device.cores??4)<=4||(device.memoryGb??4)<=4;
 return {dpr:[1,Math.max(1,Math.min(low?1.25:2,device.pixelRatio||1))],shadows:!low,shadowResolution:low?256:512,bevelSegments:low?2:4};
}
