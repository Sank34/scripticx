"""Reproducible layered welcome artwork; never overwrites the game rig."""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'public/game/welcome')
os.makedirs(OUT,exist_ok=True)
scene=bpy.context.scene
character=[o for o in bpy.data.objects if any(c.name.startswith('Mousey') for c in o.users_collection)]
for o in bpy.data.objects:
    if o not in character: o.hide_render=True
for o in character:
    o.animation_data_clear()
    if o.type=='ARMATURE':
        for b in o.pose.bones:
            b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
        o.pose.bones['head'].rotation_euler.y=math.radians(-7)
    if o.type=='MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks: k.value=0
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.07,.095,.13,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
def area(name,loc,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector((0,0,1.8))-o.location).to_track_quat('-Z','Y').to_euler()
area('Welcome mint softbox',(-3,-4,5),480,(.68,1,.79),3)
area('Welcome lavender rim',(2,2,4.5),750,(.52,.47,1),2)
area('Welcome eye fill',(1,-4,2),80,(.85,.9,1),2)
camdata=bpy.data.cameras.new('Welcome camera');cam=bpy.data.objects.new('Welcome camera',camdata);scene.collection.objects.link(cam)
cam.location=(.7,-9,3.1);cam.rotation_euler=(Vector((0,0,1.96))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.type='ORTHO';camdata.ortho_scale=4.65;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
pupils=[o for o in character if o.name.startswith(('Pupil','Catchlight'))]
for o in pupils:o.hide_render=True
scene.render.filepath=os.path.join(OUT,'mousey-body.png');bpy.ops.render.render(write_still=True)
for o in character:o.hide_render=o not in pupils
scene.render.filepath=os.path.join(OUT,'mousey-gaze.png');bpy.ops.render.render(write_still=True)
for o in character:o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'welcome-mousey.blend'))
# A separate dim architectural backdrop with soft, physically rendered shadows.
for o in character:o.hide_render=True
def mat(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.82
    return m
floor=mat('Welcome charcoal',(.013,.02,.023))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.2));bpy.context.object.data.materials.append(floor)
for i in range(5):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(3+i*1.8,2+i*.5,.2+i*.15))
    o=bpy.context.object;o.scale=(.35,12,.4+i*.15);o.rotation_euler.z=-.5;o.data.materials.append(floor)
cam.location=(0,-9,9);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=16
scene.render.resolution_x=1800;scene.render.resolution_y=1100;scene.render.film_transparent=False
scene.render.filepath=os.path.join(OUT,'backdrop.png');bpy.ops.render.render(write_still=True)
print('WELCOME_RENDER_DONE',OUT)
