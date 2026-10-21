import React,{Suspense,useEffect,useMemo} from 'react';import {Canvas,useThree} from '@react-three/fiber';
import {AdaptiveDpr,Bounds,ContactShadows,RoundedBox,useGLTF} from '@react-three/drei';
import type {SpatialSceneData,SpatialQuality} from '../spatial-scene';import {readUnitCubeAsset} from './unit-cube-asset';
type Block={key:string;position:[number,number,number]};
function BlenderBlocks({blocks}:{blocks:Block[]}){const {scene}=useGLTF('/models/bilsem-unit-cube.glb');const asset=useMemo(()=>readUnitCubeAsset(scene),[scene]);return <>{blocks.map(b=><mesh key={b.key} position={b.position} geometry={asset.geometry} material={asset.material} scale={.96} castShadow receiveShadow dispose={null}/>)}</>;}
function ContextGuard({onLost}:{onLost:()=>void}){const gl=useThree(s=>s.gl);useEffect(()=>{const canvas=gl.domElement,lost=(event:Event)=>{event.preventDefault();onLost();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onLost]);return null;}
export default function SpatialCanvas({scene,quality,onLost,perspective=false}:{scene:SpatialSceneData;quality:SpatialQuality;onLost:()=>void;perspective?:boolean}){
 const blocks=useMemo(()=>scene.cubes.map(c=>({key:`${c.x}:${c.y}:${c.z}`,position:[c.x-(scene.size-1)/2,c.z+.5,c.y-(scene.size-1)/2] as [number,number,number]})),[scene]);
 return <Canvas orthographic={!perspective} camera={{position:[8,8,8],near:.1,far:100,fov:36}} frameloop="demand" resize={{offsetSize:true}} dpr={quality.dpr} shadows={quality.shadows} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} fallback={<span>Net çizim kullanılabilir.</span>}>
  <ambientLight intensity={.8}/><hemisphereLight intensity={1.1} groundColor="#a0add0" color="#fff7ed"/><directionalLight position={[6,10,4]} intensity={2.1} castShadow={quality.shadows} shadow-mapSize={[quality.shadowResolution,quality.shadowResolution]}/><directionalLight position={[-5,3,-4]} intensity={.7} color="#b6d8ff"/>
  <Bounds fit clip observe margin={1.25}><group><Suspense fallback={<>{blocks.map(b=><RoundedBox key={b.key} position={b.position} args={[.96,.96,.96]} radius={.035} smoothness={quality.bevelSegments} castShadow receiveShadow><meshStandardMaterial color="#6597ee" roughness={.36} metalness={.06}/></RoundedBox>)}</>}><BlenderBlocks blocks={blocks}/></Suspense></group></Bounds>
  {quality.shadows&&<ContactShadows position={[0,-.02,0]} scale={scene.size+3} opacity={.3} blur={2.5} far={scene.maxHeight+1} resolution={quality.shadowResolution} frames={1}/>}
  <AdaptiveDpr/><ContextGuard onLost={onLost}/>
 </Canvas>;
}
