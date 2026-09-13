import { describe,it,expect } from 'vitest';
import { normalizeSettings,defaultSettings } from './playground-settings';
describe('game settings',()=>{
  it('validates persisted audio controls',()=>{expect(normalizeSettings({sound:false,volume:9})).toMatchObject({sound:false,volume:1});expect(normalizeSettings({volume:-3}).volume).toBe(0);expect(normalizeSettings({volume:NaN}).volume).toBe(.35);});
  it('uses safe defaults for invalid storage',()=>{expect(normalizeSettings(null)).toEqual(defaultSettings);expect(normalizeSettings({zoom:NaN})).toEqual(defaultSettings);});
  it('bounds camera distance and validates flags',()=>{expect(normalizeSettings({zoom:9,quality:'low',reducedMotion:true,touchControls:false})).toEqual({sound:true,volume:.35,zoom:1.4,quality:'low',reducedMotion:true,touchControls:false});expect(normalizeSettings({zoom:-1,quality:'ultra',reducedMotion:'yes'}).zoom).toBe(.8);});
});
