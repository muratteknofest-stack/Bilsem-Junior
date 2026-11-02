import {createSpatialScene} from './spatial-scene';
export type Point=[number,number];
/** Equal projected unit-edge lengths, with the exact same x/y/z convention as
 * the height plan and voxel solver. Faces inside the solid are never painted. */
export function cubeIsometricGeometry(size:number,heights:readonly number[]){
 const scene=createSpatialScene(size,heights),edge=32,u=Math.sqrt(3)*edge/2,v=edge/2;
 const project=(x:number,y:number,z:number):Point=>[(x-y)*u,(x+y)*v-z*edge];
 const floor=Array.from({length:size*size},(_,i)=>{const x=i%size,y=Math.floor(i/size);return [project(x,y,0),project(x+1,y,0),project(x+1,y+1,0),project(x,y+1,0)];});
 const cubes=[...scene.cubes].sort((a,b)=>a.x+a.y-b.x-b.y||a.z-b.z||a.y-b.y).map(c=>{
  const {x,y,z}=c,occupied=(a:number,b:number)=>a>=0&&b>=0&&a<size&&b<size&&heights[b*size+a]>z;
  return {...c,top:heights[y*size+x]===z+1?[project(x,y,z+1),project(x+1,y,z+1),project(x+1,y+1,z+1),project(x,y+1,z+1)]:null,
   left:!occupied(x,y+1)?[project(x,y+1,z+1),project(x+1,y+1,z+1),project(x+1,y+1,z),project(x,y+1,z)]:null,
   right:!occupied(x+1,y)?[project(x+1,y,z+1),project(x+1,y+1,z+1),project(x+1,y+1,z),project(x+1,y,z)]:null};
 });
 const all=[...floor.flat(),...cubes.flatMap(c=>[...(c.top||[]),...(c.left||[]),...(c.right||[])])];
 const minX=Math.min(...all.map(p=>p[0]))-40,maxX=Math.max(...all.map(p=>p[0]))+40,minY=Math.min(...all.map(p=>p[1]))-14,maxY=Math.max(...all.map(p=>p[1]))+48;
 return {cubes,floor,viewBox:[minX,minY,maxX-minX,maxY-minY],front:[project(size/2,size+.7,0),project(size/2,size+.06,0)],right:[project(size+.7,size/2,0),project(size+.06,size/2,0)]};
}
