import bpy,math,os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
out=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../public/game'))
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.55
 return m
green=material('ScripticX evergreen',(.06,.18,.14),.25);mint=material('Mint trim',(.56,.86,.49));black=material('Rubber',(.017,.022,.027));seat=material('Warm leather',(.25,.15,.16));metal=material('Graphite',(.08,.09,.12),.5)
def box(name,loc,scale,mat,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
box('Chassis',(0,0,.48),(1.5,2.65,.36),green)
box('Hood',(0,-.9,.85),(1.4,.83,.42),green)
box('Rear deck',(0,.99,.78),(1.4,.47,.42),green)
for x in [-.72,.72]:box('Side trim',(x,.12,.79),(.13,1.55,.34),mint,.04)
box('Seat cushion',(0,.23,.75),(.86,.66,.16),seat)
box('Seat back',(0,.59,1.03),(.88,.18,.69),seat)
for x in [-.84,.84]:
 for y in [-.85,.86]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.43,depth=.28,location=(x,y,.43),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Wheel';o.data.materials.append(black)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.23,depth=.30,location=(x,y,.43),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Hub';o.data.materials.append(mint)
for y in [-1.39,1.39]:box('Bumper',(0,y,.47),(1.55,.12,.18),metal,.04)
for x in [-.49,.49]:box('Headlight',(x,-1.327,.85),(.32,.06,.18),mint,.025)
for angle in [-.7,.7]:
 o=box('ScripticX X',(0,-.94,1.075),(.1,.5,.026),mint,.012);o.rotation_euler.z=angle
for x in [-.62,.62]:box('Roll bar',(x,.62,1.37),(.09,.09,1.15),metal,.035)
box('Roll bar top',(0,.62,1.92),(1.32,.09,.09),metal,.035)
box('Steering column',(0,-.35,1.05),(.07,.07,.45),metal,.025)
bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.035,major_segments=16,minor_segments=6,location=(0,-.35,1.28));bpy.context.object.name='Steering wheel';bpy.context.object.data.materials.append(metal)
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=os.path.join(out,'scripticx-rover.glb'),export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'scripticx-rover.blend'))
print('ROVER_EXPORTED')
