"""Build the ScripticX robot with a rigid-joint FK rig and glTF skin."""
import bpy, math, os, json
from mathutils import Vector
from pathlib import Path

# Reuse Mousey's materials, mesh helpers and studio for a consistent set.
source=(Path(__file__).parent.parent/'mousey/3d/build_mousey.py').read_text()
exec(source.split('# Narrow silhouette')[0])
OUT=str(Path(__file__).parent/'3d')
os.makedirs(OUT,exist_ok=True)
character.name='Robot • character'
shell=material('Shell • porcelain sage',(.76,.82,.75),.62)
joint=material('Joints • muted silver sage',(.35,.43,.38))
screenmat=material('Display • deep charcoal',(.008,.022,.014),.36)
bs=eye.node_tree.nodes.get('Principled BSDF')
bs.inputs['Emission Color'].default_value=(.55,1,.49,1)
bs.inputs['Emission Strength'].default_value=.25
bindings={}
def bind(o,bone): bindings[o.name]=bone;return o
def box(name,loc,size,mat,radius,bone):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=put(bpy.context.object,name,mat);o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('Soft moulded corners','BEVEL');b.width=radius;b.segments=5
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return bind(o,bone)
def ball(name,loc,size,mat,bone):return bind(sphere(name,loc,size,mat),bone)
def segment(name,a,b,r,mat,bone):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=put(bpy.context.object,name,mat);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    bevel=o.modifiers.new('Rounded segment ends','BEVEL');bevel.width=.045;bevel.segments=3
    for p in o.data.polygons:p.use_smooth=True
    return bind(o,bone)

# Compact monitor shell, with genuine depth and an inset face.
box('Monitor • back',(0,.06,2.46),(1.80,.91,1.57),joint,.22,'head')
box('Monitor • mint seam',(0,-.105,2.46),(1.83,.67,1.59),mint,.22,'head')
box('Monitor • front shell',(0,-.20,2.46),(1.78,.62,1.55),shell,.20,'head')
box('Display • bezel',(0,-.506,2.62),(1.48,.075,1.10),joint,.16,'head')
box('Display • glass',(0,-.55,2.62),(1.36,.075,.99),screenmat,.15,'head')
for side in (-1,1):
    x=side*.34
    o=tube('Happy eye.'+str(side),[(x-.17,-.606,2.56),(x,-.613,2.78),(x+.17,-.606,2.56)],.045,eye)
    bind(o,'head')
    for p in o.data.splines[0].bezier_points:p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'
    for i,xx in enumerate((x-.17,x+.17)):
        ball('Eye round end '+str(side)+str(i),(xx,-.606,2.56),(.045,.045,.045),eye,'head')
# Exact X shape, inset into the chin rather than floating in front.
polys=[[(36.6756,32.1014),(21.6211,19.6272),(32.9464,5.95932),(36.3138,8.7496),(27.943,18.852),(39.63,28.5359)],[(11.3264,1.40809),(26.3809,13.8823),(15.0556,27.5502),(11.6881,24.7599),(20.059,14.6576),(8.37196,4.97363)]]
for k,poly in enumerate(polys):
    coords=[((x-24)*.014,-.526,1.97+(17-y)*.009) for x,y in poly]
    me=bpy.data.meshes.new('Emblem');me.from_pydata(coords,[],[tuple(range(len(coords)))]);me.update()
    o=bpy.data.objects.new('ScripticX emblem '+str(k),me);character.objects.link(o);me.materials.append(mint)
    o.modifiers.new('Emblem thickness','SOLIDIFY').thickness=.015;bind(o,'head')
    outline=tube('Emblem outline '+str(k),coords+[coords[0]],.010,darktrim);bind(outline,'head')
    for p in outline.data.splines[0].bezier_points:p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'
box('Waist',(0,.04,1.57),(1.13,.64,.30),joint,.12,'body')
box('Waist • lower band',(0,.015,1.47),(1.13,.65,.09),shell,.04,'body')
bones=[('root',(0,0,0),(0,0,.30),None),('body',(0,0,1.40),(0,0,1.72),'root'),('head',(0,0,1.72),(0,0,2.60),'body')]
for side,label in [(-1,'L'),(1,'R')]:
    shoulder=(side*.84,0,2.10);elbow=(side*1.12,-.015,1.65);wrist=(side*1.23,-.075,1.19)
    arm='upper_arm.'+label;fore='forearm.'+label;hand='hand.'+label
    bones.extend([(arm,shoulder,elbow,'body'),(fore,elbow,wrist,arm),(hand,wrist,(side*1.25,-.08,.94),fore)])
    ball('Shoulder.'+label,shoulder,(.17,.18,.17),joint,arm)
    segment('Upper arm.'+label,shoulder,elbow,.14,fur,arm)
    ball('Elbow.'+label,elbow,(.145,.145,.145),joint,fore)
    segment('Forearm.'+label,elbow,wrist,.15,fur,fore)
    for idx,t in enumerate((.32,.70)):
        for prefix,a,b,bn in [('Upper',shoulder,elbow,arm),('Lower',elbow,wrist,fore)]:
            a,b=Vector(a),Vector(b);c=a.lerp(b,t);v=(b-a).normalized()*.018
            segment(prefix+' arm seam '+label+str(idx),c-v,c+v,.153,joint,bn)
    ball('Palm.'+label,(side*1.245,-.095,1.035),(.18,.15,.21),shell,hand)
    for i in (-1,1):
        ball('Finger.'+label+str(i),(side*1.245+i*.077,-.10,.884),(.073,.11,.14),shell,hand)
    ball('Thumb.'+label,(side*1.09,-.14,1.025),(.08,.105,.125),shell,hand)
    hip=(side*.35,.03,1.45);knee=(side*.38,.015,.87);ankle=(side*.40,-.005,.29)
    thigh='thigh.'+label;shin='shin.'+label;foot='foot.'+label
    bones.extend([(thigh,hip,knee,'body'),(shin,knee,ankle,thigh),(foot,ankle,(side*.40,-.35,.19),shin)])
    segment('Thigh.'+label,hip,knee,.19,fur,thigh)
    ball('Knee.'+label,knee,(.185,.18,.16),joint,shin)
    segment('Shin.'+label,knee,ankle,.19,fur,shin)
    for name,a,b,bn in [('Leg upper seam',hip,knee,thigh),('Leg lower seam',knee,ankle,shin)]:
        c=Vector(a).lerp(Vector(b),.55);v=Vector((0,0,.016))
        segment(name+label,c-v,c+v,.196,joint,bn)
    box('Foot.'+label,(side*.42,-.15,.19),(.48,.69,.29),shell,.125,foot)
    box('Sole.'+label,(side*.42,-.15,.08),(.49,.70,.09),joint,.04,foot)

# Same warm studio as Mousey; no stage geometry goes into the GLB.
exec(source.split('# Presentation is intentionally separate')[1].split('\n',1)[1].split('# Make an editable')[0])
target=Vector((0,0,1.63));cam.location=(4.4,-8,3.8)
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=4.45
scene.cycles.samples=40
bpy.ops.object.select_all(action='DESELECT')
for o in character.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(character.objects));bpy.ops.object.convert(target='MESH')
for o in character.objects:
    bpy.context.view_layer.objects.active=o
    for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
armdata=bpy.data.armatures.new('Robot skeleton');rig=bpy.data.objects.new('Robot • Rig',armdata);character.objects.link(rig)
rig.show_in_front=True;armdata.display_type='OCTAHEDRAL'
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,a,b,parent in bones:
    bone=armdata.edit_bones.new(name);bone.head=a;bone.tail=b
    if parent:bone.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in character.objects:
    if o.type!='MESH':continue
    vg=o.vertex_groups.new(name=bindings[o.name]);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Rigid robot skin','ARMATURE');mod.object=rig;o.parent=rig
rig['Rig notes']='FK mechanical rig: body/head, upper arms/forearms/hands, thighs/shins/feet. Rigid segments. No facial rig or animation clips.'
bpy.ops.object.select_all(action='DESELECT')
for o in character.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'robot.glb'),export_format='GLB',use_selection=True,export_animations=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in character.objects if o.type=='MESH')
Path(OUT,'asset-info.json').write_text(json.dumps({'triangles':triangles,'bones':len(bones),'rigged':True,'animated':False,'pose':'idle'},indent=2))
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.type='MATERIAL'
scene.render.filepath=os.path.join(OUT,'robot-three-quarter.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'robot.blend'))
bpy.ops.render.render(write_still=True)
cam.location=(0,-8,2.6);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(OUT,'robot-front.png');bpy.ops.render.render(write_still=True)
# Visible FK pose test; exported file remains in neutral idle/rest pose.
rig.pose.bones['upper_arm.R'].rotation_mode='XYZ';rig.pose.bones['upper_arm.R'].rotation_euler.y=-.65
rig.pose.bones['forearm.R'].rotation_mode='XYZ';rig.pose.bones['forearm.R'].rotation_euler.x=-.75
rig.pose.bones['head'].rotation_mode='XYZ';rig.pose.bones['head'].rotation_euler.y=.12
scene.render.filepath=os.path.join(OUT,'robot-rig-test.png');bpy.ops.render.render(write_still=True)
print('ROBOT_DONE',triangles,len(bones))
