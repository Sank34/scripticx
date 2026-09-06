import {expect,it} from 'vitest';
import {isGameRoute} from './game-routes';
it('isolates fullscreen games without changing the platform overview',()=>{
 for(const path of ['/play/world','/play/island'])expect(isGameRoute(path)).toBe(true);
 for(const path of ['/play','/dashboard','/editor','/play/worldwide',null])expect(isGameRoute(path)).toBe(false);
});
