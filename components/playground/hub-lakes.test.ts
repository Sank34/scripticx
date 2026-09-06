import {it,expect} from 'vitest';
import {createLakeSurface,WATER_Y,SHORE_Y} from './hub-lakes';
import {LAKES,attractionClearance,hubDistrict} from './hub-rules';
it('uses a hollow shore instead of a coplanar cap underneath the water',()=>{
 for(const lake of LAKES){const s=createLakeSurface(lake);
  expect(s.shore.geometry.parameters.innerRadius).toBe(lake.r);
  expect(s.water.geometry.parameters.radius).toBe(lake.r);
  expect(SHORE_Y).toBeGreaterThan(WATER_Y);
  expect(WATER_Y).toBeGreaterThan(-.04);
  expect(attractionClearance(lake.x,lake.z)).toBeLessThan(0);
  expect(hubDistrict(lake.x,lake.z)).toBe('lake');
  s.update(2);for(const o of [s.water,s.shore]){o.geometry.dispose();o.material.dispose();}
 }
 expect(LAKES).toHaveLength(3);
});
