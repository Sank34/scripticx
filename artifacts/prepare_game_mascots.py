import bpy, math, json
from pathlib import Path
BASE=Path(__file__).parent
CONTROLS=['blink','sad','lookLeft','lookRight']
for mascot,filename in [('mousey','mousey/3d/fuller/mousey.blend'),('robot','robot/3d/robot.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(BASE/filename))
    out=BASE/'game'/mascot;out.mkdir(parents=True,exist_ok=True)
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
    face=[]
    for o in meshes:
        name=o.name
        iseye=name.startswith(('Eye-mint','Pupil','Catchlight')) if mascot=='mousey' else name.startswith(('Happy eye','Eye round end'))
        if not iseye and name!='Smile':continue
        face.append(o)
        o.shape_key_add(name='Basis')
        center=(max(v.co.z for v in o.data.vertices)+min(v.co.z for v in o.data.vertices))/2
        for control in CONTROLS:
            key=o.shape_key_add(name=control)
            for v in key.data:
                if control=='blink' and iseye:
                    # Compress every layer around the same world-space eye line.
                    z=2.34 if mascot=='mousey' else 2.64
                    v.co.z=(v.co.z+o.location.z-z)*.055+z-o.location.z
                    if mascot=='mousey':
                        v.co.y=(v.co.y+o.location.y+.55)*.20-.55-o.location.y
                elif control=='sad':
                    if mascot=='robot':v.co.z=2*2.67-v.co.z-2*o.location.z
                    elif name=='Smile':v.co.z=2*center-v.co.z
                    elif iseye:v.co.z=center+(v.co.z-center)*.75
                elif control.startswith('look'):
                    if mascot=='robot' or name.startswith(('Pupil','Catchlight')):
                        v.co.x+=(-.045 if control=='lookLeft' else .045)
    # Custom properties are the artist-facing controls. glTF receives native
    # morph targets; the browser adapter drives these directly, not the drivers.
    for control in CONTROLS:
        rig[control]=0.0;rig.id_properties_ui(control).update(min=0,max=1)
        for o in face:
            key=o.data.shape_keys.key_blocks[control]
            driver=key.driver_add('value').driver;driver.type='AVERAGE'
            var=driver.variables.new();var.name='value';var.type='SINGLE_PROP'
            var.targets[0].id=rig;var.targets[0].data_path='["'+control+'"]'
    rig.animation_data_clear()
    for p in rig.pose.bones:p.rotation_mode='XYZ'
    # Named looping actions; locomotion is in-place, translation belongs to game.
    for clip in ['Idle','Walk']:
        for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0)
        rig.animation_data_create();action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for frame in range(1,62,5):
            phase=2*math.pi*(frame-1)/60
            for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0)
            rig.pose.bones['body'].location.y=.018*(1-math.cos(phase*(2 if clip=='Walk' else 1)))
            rig.pose.bones['head'].rotation_euler.y=.025*math.sin(phase)
            if clip=='Walk':
                for label,sign in [('L',1),('R',-1)]:
                    if mascot=='robot':
                        rig.pose.bones['thigh.'+label].rotation_euler.x=.28*sign*math.sin(phase)
                        rig.pose.bones['shin.'+label].rotation_euler.x=max(0,-sign*math.sin(phase))*.25
                        rig.pose.bones['upper_arm.'+label].rotation_euler.x=-.22*sign*math.sin(phase)
                    else:
                        rig.pose.bones['foot.'+label].location.y=.10*sign*math.sin(phase)
                        rig.pose.bones['foot.'+label].location.z=max(0,sign*math.sin(phase))*.035
                if mascot=='mousey':rig.pose.bones['tail'].rotation_euler.y=.10*math.sin(phase)
            for p in rig.pose.bones:
                p.keyframe_insert('location',frame=frame,group=p.name);p.keyframe_insert('rotation_euler',frame=frame,group=p.name)
        track=rig.animation_data.nla_tracks.new();track.name=clip
        strip=track.strips.new(clip,1,action);strip.action_slot=rig.animation_data.action_slot
        rig.animation_data.action=None;track.mute=True
    bpy.context.scene.render.fps=30;bpy.context.scene.frame_end=61
    for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0)
    bpy.context.scene.frame_set(1)
    rig['Game notes']='FK rig. Facial custom properties 0–1. Happy is default; sad=1 gives sad. Idle/Walk loops are in-place. No IK, finger or lip-sync rig.'
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes+[rig]:o.select_set(True)
    # Include existing transform parent (Mousey), without exporting the studio.
    if rig.parent:rig.parent.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(mascot+'.blend')))
    # No Blender-only drivers in runtime. Keep them in the .blend above.
    for o in face:
        for key in o.data.shape_keys.key_blocks:
            if key.name!='Basis':key.driver_remove('value');key.value=0
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.ops.export_scene.gltf(filepath=str(out/(mascot+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_morph=True,export_extras=True)
    for track in rig.animation_data.nla_tracks:track.mute=True
    # Render closed eyes for visual QA, without overwriting neutral saved files.
    for o in face:o.data.shape_keys.key_blocks['blink'].value=1
    bpy.context.scene.cycles.samples=24
    bpy.context.scene.render.resolution_percentage=65
    bpy.context.scene.render.filepath=str(out/'blink-test.png');bpy.ops.render.render(write_still=True)
    (out/'manifest.json').write_text(json.dumps({'name':mascot,'clips':['Idle','Walk'],'morphs':CONTROLS,'defaultExpression':'happy','forward':'+Z (glTF)','up':'+Y','units':'meters','meshCount':len(meshes),'bones':len(rig.data.bones),'collision':'Use a separate capsule; do not use render meshes as physics colliders.','limitations':['No IK','No facial lip sync','Prototype walk cycle; tune foot contact to movement speed']},indent=2))
    print('GAME_READY',mascot)
