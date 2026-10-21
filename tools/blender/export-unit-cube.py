"""Deterministic Blender 5 asset; geometry encodes one centered unit, never answers."""
from pathlib import Path
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0,0,0))
obj=bpy.context.object
obj.name='BilsemUnitCube'
bevel=obj.modifiers.new('Soft exact edges','BEVEL');bevel.width=.035;bevel.segments=3
bpy.ops.object.modifier_apply(modifier=bevel.name)
for polygon in obj.data.polygons:polygon.use_smooth=True
normals=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL');normals.keep_sharp=True
bpy.ops.object.modifier_apply(modifier=normals.name)
material=bpy.data.materials.new('Calm blue');material.diffuse_color=(.18,.39,.78,1);material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.18,.39,.78,1);bsdf.inputs['Roughness'].default_value=.36;bsdf.inputs['Metallic'].default_value=.06
obj.data.materials.append(material)
output=Path(__file__).resolve().parents[2]/'public/models/bilsem-unit-cube.glb';output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=True)
print(output)
