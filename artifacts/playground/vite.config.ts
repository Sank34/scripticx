import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve(process.cwd())}},server:{host:'127.0.0.1',port:3012,strictPort:true}});
