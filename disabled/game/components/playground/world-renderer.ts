import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { gamePixelRatio } from '@/lib/game-render-quality';

// Blur can be softer without downsampling geometry, text or final contours.
class SoftBloomPass extends UnrealBloomPass {
  override setSize(width:number,height:number){const scale=Math.min(1,1280/Math.max(width,height));super.setSize(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));}
}

/** Keep the scene and postprocessing at the same display-aware resolution. */
export function renderPipeline(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera){
  renderer.info.autoReset=false;
  let composer:EffectComposer|null=null,fxaa:ShaderPass|null=null,w=1,h=1,high=true;
  function dispose(){if(composer){composer.passes.forEach(pass=>pass.dispose());composer.dispose();composer=null;}fxaa=null;}
  function resize(width:number,height:number){w=Math.max(1,width);h=Math.max(1,height);const ratio=gamePixelRatio(w,h,window.devicePixelRatio,high);renderer.setPixelRatio(ratio);renderer.setSize(w,h);if(composer){composer.setPixelRatio(ratio);composer.setSize(w,h);}fxaa?.uniforms.resolution.value.set(1/Math.floor(w*ratio),1/Math.floor(h*ratio));}
  return {
    render(){renderer.info.reset();if(composer)composer.render();else renderer.render(scene,camera);},resize,dispose,
    quality(enabled:boolean){high=enabled;if(!high){dispose();resize(w,h);return;}if(!composer){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new SoftBloomPass(new THREE.Vector2(1,1),.55,.5,1.2));composer.addPass(new OutputPass());fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);}resize(w,h);},
  };
}
