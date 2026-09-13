import {describe,it,expect} from 'vitest';
import {createHubGrass,grassCoverage} from './hub-grass';
import {HUB_STATIONS} from './hub-rules';
import {BufferAttribute} from 'three';

describe('Commons GPU grass',()=>{
  it('keeps paths, spawn, garage and station decks clear',()=>{
    for(const [x,z] of [[0,12],[12,-2],[0,3],[4,3],...HUB_STATIONS.map(s=>[s.x,s.z+1.5])])expect(grassCoverage(x,z)).toBe(0);
    expect(grassCoverage(9,9)).toBe(1);
    expect(grassCoverage(44,9)).toBe(0);
    expect(grassCoverage(NaN,0)).toBe(0);
  });
  it('budgets dense static triangle geometry by quality',()=>{
    const high=createHubGrass(false,false),low=createHubGrass(true,false);
    const a=high.mesh.geometry.getAttribute('position'),b=low.mesh.geometry.getAttribute('position');
    expect(a.count/3).toBeGreaterThan(40000);
    expect(a.count/3).toBeLessThanOrEqual(260*260);
    expect(b.count).toBeLessThan(a.count/2);
    const version=(a as BufferAttribute).version;
    for(let i=0;i<60;i++)high.update(i/60,8+i/60,9,true);
    expect((a as BufferAttribute).version).toBe(version);
    expect(high.mesh.castShadow).toBe(false);
    for(const g of [high,low]){g.mesh.geometry.dispose();g.mesh.material.dispose();}
  });
  it('generates repeatable roots and anchored blade shapes',()=>{
    const a=createHubGrass(true,true),b=createHubGrass(true,true);
    expect(a.mesh.geometry.getAttribute('position').array).toEqual(b.mesh.geometry.getAttribute('position').array);
    const shape=a.mesh.geometry.getAttribute('grassShape');
    for(let i=0;i<shape.count;i+=3){expect(shape.getY(i)).toBeGreaterThan(0);expect(shape.getY(i+1)).toBe(0);expect(shape.getY(i+2)).toBe(0);}
    for(const g of [a,b]){g.mesh.geometry.dispose();g.mesh.material.dispose();}
  });
});
