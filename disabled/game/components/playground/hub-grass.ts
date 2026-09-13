import * as T from 'three';
import {HUB_STATIONS,HUB_EXTENT,attractionClearance} from './hub-rules';

/** WebGL adaptation of Bruno Simon's folio-2025 Grass.js (MIT).
 * Camera-facing triangle blades, root-anchored wind and height variation.
 * ScripticX additions: path masks, persistent interaction trail, quality budgets.
 * Attribution and full license: public/game/licenses/bruno-simon-grass.txt.
 */
export function grassCoverage(x:number,z:number):number {
  if (!Number.isFinite(x+z)) return 0;
  const edge=HUB_EXTENT-1-Math.max(Math.abs(x),Math.abs(z));
  // Keep paving, the spawn, station decks and the garage accessible.
  const paths=Math.min(Math.abs(x)-.85,Math.abs(z+2)-.85);
  const spawn=Math.hypot(x,z-3)-2;
  const garage=Math.hypot((x-4)/1.2,z-4)-2.3;
  const stations=Math.min(...HUB_STATIONS.map(s=>Math.hypot(x-s.x,z-(s.z+1.5))-2.65));
  return T.MathUtils.smoothstep(Math.min(edge,paths,spawn,garage,stations,attractionClearance(x,z)),0,.7);
}

export function createHubGrass(low:boolean,reduced:boolean,tile={x:0,z:0,size:44}) {
  const extent=tile.size,grid=Math.round((low?150:260)*extent/44),step=extent/grid;
  const positions:number[]=[],shapes:number[]=[],colors:number[]=[],normals:number[]=[];
  const root=new T.Color('#48572c'),tip=new T.Color('#b5b75b'),gold=new T.Color('#c2a95f');
  let seed=92731;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<grid;i++)for(let j=0;j<grid;j++) {
    const x=tile.x-extent/2+(i+.15+random()*.7)*step,z=tile.z-extent/2+(j+.15+random()*.7)*step;
    const coverage=grassCoverage(x,z);
    if(coverage<.04)continue;
    const patch=.75+.25*Math.sin(x*.55+Math.sin(z*.42));
    const height=(.38+random()*.4)*patch*coverage;
    const width=(low?.13:.085)*( .7+random()*.6)*Math.sqrt(coverage);
    const top=tip.clone().lerp(gold,(Math.sin(x*.19+z*.27)+1)*.3).multiplyScalar(.88+random()*.2);
    // Tip, left root, right root, as in the original. Geometry stays static.
    for(const [side,y] of [[0,1],[-1,0],[1,0]]) {
      positions.push(x,0,z);shapes.push(side*width,y*height);
      normals.push(0,1,0);const c=y?top:root;colors.push(c.r,c.g,c.b);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('grassShape',new T.Float32BufferAttribute(shapes,2));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  // Shader displaces vertices outside the root-only bounds.
  geometry.boundingBox=new T.Box3(new T.Vector3(tile.x-extent/2-1,0,tile.z-extent/2-1),new T.Vector3(tile.x+extent/2+1,1,tile.z+extent/2+1));
  geometry.boundingSphere=new T.Sphere(new T.Vector3(tile.x,.5,tile.z),(extent/2+1)*Math.SQRT2);
  const time={value:0},motion={value:reduced?0:1},actor={value:new T.Vector3(0,3,1)};
  // xyz = root x/z and radius, w = timestamp. A small fixed trail, no blade loop.
  const trail={value:Array.from({length:8},()=>new T.Vector4(0,0,0,-100))};
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{grassTime:time,grassMotion:motion,grassActor:actor,grassTrail:trail});
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec2 grassShape;
      uniform float grassTime;
      uniform float grassMotion;
      uniform vec3 grassActor;
      uniform vec4 grassTrail[8];
    `).replace('#include <begin_vertex>',`
      vec3 transformed = position;
      vec2 facing = cameraPosition.xz - position.xz;
      facing /= max(length(facing), 0.001);
      transformed.xz += vec2(facing.y, -facing.x) * grassShape.x;
      transformed.y += grassShape.y;
      if (grassShape.y > 0.0) {
        float wave = sin(position.x * 0.55 + position.z * 0.38 - grassTime * 1.45);
        float flutter = sin(position.z * 1.8 - position.x * 0.9 + grassTime * 2.1);
        vec2 wind = vec2(0.17 + wave * 0.19, wave * 0.09 + flutter * 0.045);
        vec2 delta = position.xz - grassActor.xy;
        float distanceToActor = length(delta);
        float push = 1.0 - smoothstep(0.0, grassActor.z, distanceToActor);
        vec2 away = delta / max(distanceToActor, 0.05);
        for (int i = 0; i < 8; i++) {
          vec2 d = position.xz - grassTrail[i].xy;
          float age = max(0.0, grassTime - grassTrail[i].w);
          float influence = (1.0 - smoothstep(0.0, max(0.01, grassTrail[i].z), length(d)))
            * (1.0 - smoothstep(0.0, 0.9, age));
          if (influence > push) { push = influence; away = d / max(length(d), 0.05); }
        }
        transformed.xz += (wind * grassMotion + away * push * 0.95) * grassShape.y;
        transformed.y -= push * grassShape.y * 0.58;
      }
    `);
  };
  material.customProgramCacheKey=()=> 'commons-bruno-grass-v1';
  const mesh=new T.Mesh(geometry,material);mesh.name='Wind meadow / Bruno grass WebGL';
  mesh.receiveShadow=true;mesh.castShadow=false;
  let cursor=0,lastStamp=-1;
  return {mesh,update(elapsed:number,x:number,z:number,driving:boolean) {
    time.value=elapsed;actor.value.set(x,z,driving?1.65:.85);
    if(elapsed-lastStamp>=.1) {
      trail.value[cursor].set(x,z,actor.value.z,elapsed);
      cursor=(cursor+1)%trail.value.length;lastStamp=elapsed;
    }
  }};
}
