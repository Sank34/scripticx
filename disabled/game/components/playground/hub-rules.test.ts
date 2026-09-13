import {expect,it} from 'vitest';
import {HUB_STATIONS,stationAt,hubGround} from './hub-rules';
it('requires physical proximity to a station',()=>{expect(stationAt(0,3)).toBeNull();for(const s of HUB_STATIONS){expect(stationAt(s.x,s.z+1.6)).toBe(s.id);expect(stationAt(s.x,s.z+5)).toBeNull();}});
it('keeps vehicle and player within the expanded commons',()=>{expect(hubGround(0,0)).toBe(true);expect(hubGround(40,40)).toBe(true);expect(hubGround(43,0)).toBe(false);expect(hubGround(NaN,0)).toBe(false);});
