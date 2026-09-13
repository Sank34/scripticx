import * as T from 'three';

export const WATER_Y=.035;
export const SHORE_Y=.055;
/** Annular shore: no terrain cap underneath the water, hence no coplanar faces. */
export function createLakeSurface(lake:{x:number;z:number;r:number}){
 const shore=new T.Mesh(new T.RingGeometry(lake.r,lake.r+2,64),new T.MeshStandardMaterial({color:'#c9af80',roughness:1}));
 shore.rotation.x=-Math.PI/2;shore.position.set(lake.x,SHORE_Y,lake.z);shore.receiveShadow=true;
 const time={value:0};
 const material=new T.MeshStandardMaterial({color:'#40858c',roughness:.42,metalness:.12});
 material.onBeforeCompile=shader=>{
  shader.uniforms.lakeTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 lakeUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nlakeUv = uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 lakeUv; uniform float lakeTime;').replace('#include <color_fragment>',`#include <color_fragment>
   float radius = length(lakeUv - 0.5) * 2.0;
   float shallow = smoothstep(0.65, 1.0, radius);
   float wave = sin(lakeUv.x * 38.0 + lakeTime * 0.55) * sin(lakeUv.y * 31.0 - lakeTime * 0.4);
   diffuseColor.rgb *= mix(0.68, 1.35, shallow) + wave * 0.035;
  `);
 };
 material.customProgramCacheKey=()=> 'commons-lake-v1';
 const water=new T.Mesh(new T.CircleGeometry(lake.r,64),material);water.rotation.x=-Math.PI/2;water.position.set(lake.x,WATER_Y,lake.z);water.receiveShadow=true;
 return {shore,water,update:(t:number)=>{time.value=t;}};
}
