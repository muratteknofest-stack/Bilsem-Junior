import {Box3,Mesh,Vector3,type Object3D} from 'three';
export function readUnitCubeAsset(scene:Object3D){
 const meshes:Mesh[]=[];scene.traverse(object=>{if(object instanceof Mesh)meshes.push(object);});
 if(meshes.length!==1)throw Error('Cube asset must contain exactly one mesh');
 const mesh=meshes[0],box=new Box3().setFromObject(mesh),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
 if(size.toArray().some(v=>Math.abs(v-1)>.001)||center.length()>.001||mesh.geometry.getAttribute('position').count>3000)throw Error('Cube asset must be a centered unit cube');
 return {geometry:mesh.geometry,material:mesh.material};
}
