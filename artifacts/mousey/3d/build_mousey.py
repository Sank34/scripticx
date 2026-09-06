import bpy, math, os, json
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fuller')
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablock in list(bpy.data.materials): bpy.data.materials.remove(datablock)
character = bpy.data.collections.new('Mousey • character')
bpy.context.scene.collection.children.link(character)
stage = bpy.data.collections.new('Presentation • not exported')
bpy.context.scene.collection.children.link(stage)

def material(name, rgb, roughness=.75):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*rgb,1); bs.inputs['Roughness'].default_value=roughness
    return m
fur=material('Fur • soft silver sage',(.52,.58,.54))
inner=material('Inner ears • muted sage',(.32,.43,.35))
muzzle=material('Muzzle • warm pale grey',(.68,.73,.66))
dark=material('Robe and hat • ScripticX charcoal',(.025,.044,.033))
darktrim=material('Hat trim',(.015,.024,.018))
mint=material('ScripticX mint',(.52,.91,.59))
eye=material('Eyes • pale mint',(.66,1,.54),.55)
pupil=material('Pupils • deep green',(.008,.023,.014),.38)
white=material('Eye highlights',(.97,1,.93),.35)
ground=material('Warm ochre clay',(.56,.24,.105))
edge=material('Terracotta plinth',(.31,.11,.06))
stone=material('Warm stone',(.74,.47,.25))
grass=material('Sage grass',(.26,.39,.15))

def put(obj,name,mat,collection=character):
    obj.name=name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)
    if mat: obj.data.materials.append(mat)
    return obj
def sphere(name,loc,scale,mat,segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=put(bpy.context.object,name,mat); o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return o
def tube(name,pts,radius,mat,collection=character):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=10; c.bevel_depth=radius; c.bevel_resolution=2
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(pts)-1)
    for p,co in zip(s.bezier_points,pts):p.co=co; p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); collection.objects.link(o);o.data.materials.append(mat);return o
def lathe(name,rings,mat,n=32,depth=1):
    verts=[]
    for z,r,cx,cy in rings:
        for i in range(n):
            a=2*math.pi*i/n;verts.append((cx+r*math.cos(a),cy+depth*r*math.sin(a),z))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.append(tuple(reversed(range(n))));faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);character.objects.link(o);me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    return o

# Narrow silhouette, big round ears, and a long robe: no global squash.
lathe('Robe • tapered soft hem',[(.32,.39,0,0),(.35,.47,0,0),(.43,.49,0,0),(.66,.43,0,0),(1.2,.32,0,0),(1.7,.235,0,0),(1.83,.23,0,0)],dark,32,.8)
sphere('Foot.L',(-.20,-.10,.20),(.17,.25,.19),fur)
sphere('Foot.R',(.20,-.10,.20),(.17,.25,.19),fur)
tube('Tail',[(.25,.19,.44),(.57,.24,.34),(.80,.21,.27),(.94,.10,.20),(.90,-.015,.17),(.78,-.045,.19)],.047,fur)
sphere('Head',(0,0,2.27),(.65,.47,.63),fur,32,20)
for side in (-1,1):
    sphere('Ear.'+('L' if side<0 else 'R'),(side*.73,.02,2.72),(.40,.18,.42),fur)
    sphere('Inner-ear.'+str(side),(side*.73,-.142,2.73),(.275,.043,.295),inner)
sphere('Muzzle',(0,-.356,2.04),(.34,.135,.23),muzzle)
for side in (-1,1):
    x=side*.285
    sphere('Eye-mint.'+str(side),(x,-.410,2.34),(.245,.132,.32),eye)
    sphere('Pupil.'+str(side),(x+.02,-.527,2.365),(.115,.057,.209),pupil)
    sphere('Catchlight.'+str(side),(x-.025,-.577,2.48),(.049,.018,.065),white,16,10)
sphere('Nose',(0,-.499,2.103),(.051,.036,.038),inner,16,10)
tube('Smile',[(-.125,-.477,1.995),(0,-.497,1.955),(.125,-.477,1.995)],.012,darktrim)
for side in (-1,1):
    tube('Whisker-upper.'+str(side),[(side*.48,-.20,2.10),(side*.68,-.22,2.11),(side*.87,-.20,2.14)],.012,inner)
    tube('Whisker-lower.'+str(side),[(side*.47,-.18,2.015),(side*.65,-.205,1.98),(side*.80,-.18,1.945)],.012,inner)

lathe('Hat • softly pointed',[(2.72,.41,0,.02),(2.79,.43,0,.02),(2.91,.39,0,.02),(3.20,.29,-.025,.025),(3.52,.17,-.055,.03),(3.79,.07,-.083,.03),(3.90,.015,-.09,.03),(3.91,.005,-.09,.03)],dark,32,.86)
lathe('Hat • mint band',[(2.77,.435,0,.02),(2.85,.425,0,.02),(2.88,.414,0,.02)],mint,32,.86)
lathe('Hat • rounded brim',[(2.695,.43,0,.02),(2.715,.50,0,.02),(2.755,.51,0,.02),(2.79,.47,0,.02)],darktrim,32,.86)

# The actual ScripticX X, with a dark contour following each stroke, not a badge.
polys=[[(36.6756,32.1014),(21.6211,19.6272),(32.9464,5.95932),(36.3138,8.7496),(27.943,18.852),(39.63,28.5359)],[(11.3264,1.40809),(26.3809,13.8823),(15.0556,27.5502),(11.6881,24.7599),(20.059,14.6576),(8.37196,4.97363)]]
for k,poly in enumerate(polys):
    coords=[((x-24)*.013,-.315,1.58+(17-y)*.013) for x,y in poly]
    me=bpy.data.meshes.new('X mesh');me.from_pydata(coords,[],[tuple(range(len(coords)))]);me.update()
    o=bpy.data.objects.new('Bow X • '+str(k),me);character.objects.link(o);me.materials.append(mint)
    sol=o.modifiers.new('Soft solid emblem','SOLIDIFY');sol.thickness=.025
    bevel=o.modifiers.new('Soft edges','BEVEL');bevel.width=.005;bevel.segments=2
    curve=tube('X contour • '+str(k),coords+[coords[0]],.013,darktrim)
    for p in curve.data.splines[0].bezier_points:p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'

# Presentation is intentionally separate from the browser-game export.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.37,depth=.17,location=(0,0,-.13))
o=put(bpy.context.object,'Clay display plinth',edge,stage);be=o.modifiers.new('Rounded rim','BEVEL');be.width=.06;be.segments=3
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.32,depth=.045,location=(0,0,-.023))
put(bpy.context.object,'Ochre top',ground,stage)
for i,(x,y,s) in enumerate([(-1,.35,.10),(.75,.70,.12),(-.65,.8,.075)]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=s,location=(x,y,s*.5))
    o=put(bpy.context.object,'Stone '+str(i),stone,stage);o.scale.z=.7
for j,(x,y) in enumerate([(-.92,.68),(.93,.53)]):
    for i in range(3):
        bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.042,radius2=0,depth=.20+i*.035,location=(x+(i-1)*.06,y,.09+i*.018))
        put(bpy.context.object,'Grass '+str(j)+' '+str(i),grass,stage)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.23));put(bpy.context.object,'Studio floor',material('Backdrop',(.145,.092,.061)),stage)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.36,.30,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
def area(name,loc,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);stage.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.8))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key • warm',(-3,-4,6),650,(1,.79,.58),4)
area('Fill • neutral mint',(3,-2,4),430,(.71,.91,1),3)
area('Rim • warm',(1,3,5),850,(1,.58,.29),3)
camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);stage.objects.link(cam)
cam.location=(4.4,-8,4.2);target=Vector((0,0,1.88));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=5.15
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'

# Make an editable mesh-only game asset. Keep materials, names and separate parts.
bpy.ops.object.select_all(action='DESELECT')
for o in character.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(character.objects))
bpy.ops.object.convert(target='MESH')
for o in character.objects:
    bpy.context.view_layer.objects.active=o
    for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    # Add depth without widening the front silhouette. Move attached facial
    # details with the same transform so they stay seated on the head.
    o.location.y *= 1.25
    for vertex in o.data.vertices:
        vertex.co.y *= 1.25
root=bpy.data.objects.new('Mousey',None);character.objects.link(root)
for o in list(character.objects):
    if o!=root:o.parent=root
# A deform rig with rigid head/accessories and a softly weighted robe.
armdata=bpy.data.armatures.new('Mousey skeleton')
rig=bpy.data.objects.new('Mousey • Rig',armdata);character.objects.link(rig)
rig.parent=root;rig.show_in_front=True;armdata.display_type='OCTAHEDRAL'
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bone_specs=[
    ('root',(0,0,0),(0,0,.25),None),
    ('body',(0,0,.40),(0,0,1.15),'root'),
    ('chest',(0,0,1.15),(0,0,1.80),'body'),
    ('head',(0,0,1.80),(0,0,2.70),'chest'),
    ('foot.L',(-.20,0,.25),(-.20,-.32,.20),'root'),
    ('foot.R',(.20,0,.25),(.20,-.32,.20),'root'),
    ('tail',(.25,.2375,.44),(.90,.125,.20),'body'),
]
for name,head,tip,parent in bone_specs:
    bone=armdata.edit_bones.new(name);bone.head=head;bone.tail=tip
    if parent:bone.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in list(character.objects):
    if o.type!='MESH':continue
    if o.name.startswith('Robe'):
        low=o.vertex_groups.new(name='body');high=o.vertex_groups.new(name='chest')
        for v in o.data.vertices:
            t=max(0,min(1,(v.co.z-.65)/.95))
            low.add([v.index],1-t,'REPLACE');high.add([v.index],t,'REPLACE')
    else:
        name='head'
        if o.name.startswith('Foot.'):name='foot.'+o.name[-1]
        elif o.name=='Tail':name='tail'
        elif o.name.startswith(('Bow X','X contour')):name='chest'
        group=o.vertex_groups.new(name=name);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
    modifier=o.modifiers.new('Mousey deformation','ARMATURE');modifier.object=rig
    o.parent=rig
rig['Rig notes']='Rotate body/chest/head; translate feet; rotate tail. Rest pose exported. No facial rig or animation clips yet.'
bpy.ops.object.select_all(action='DESELECT')
for o in character.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'mousey.glb'),export_format='GLB',use_selection=True,export_animations=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in character.objects if o.type=='MESH')
with open(os.path.join(OUT,'asset-info.json'),'w') as f:json.dump({'triangles':triangles,'mesh_objects':sum(o.type=='MESH' for o in character.objects),'rigged':True,'bones':len(armdata.bones),'animated':False,'forward':'-Y','up':'+Z','export':'character and skin rig only; no display plinth/lights'},f,indent=2)
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
scene.render.filepath=os.path.join(OUT,'mousey-three-quarter.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'mousey.blend'))
bpy.ops.render.render(write_still=True)
cam.location=(0,-8,2.8);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(OUT,'mousey-front.png');bpy.ops.render.render(write_still=True)
cam.location=(8,-1.8,3.1);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(OUT,'mousey-profile.png');bpy.ops.render.render(write_still=True)
rig.pose.bones['head'].rotation_mode='XYZ'
rig.pose.bones['head'].rotation_euler.y=math.radians(12)
cam.location=(4.4,-8,4.2);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(OUT,'mousey-rig-test.png');bpy.ops.render.render(write_still=True)
print('MOUSEY_DONE',triangles)
