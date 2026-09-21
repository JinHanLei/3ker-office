import {spawnSync} from 'node:child_process';
const commands=[['node_modules/typescript/bin/tsc','-b'],['scripts/architecture/check.mjs'],['node_modules/vitest/vitest.mjs','run'],['apps/headless/dist/demos/headless.js'],['apps/headless/dist/demos/recovery.js']];
for(const args of commands){const p=spawnSync(process.execPath,args,{stdio:'inherit'});if(p.status!==0)process.exit(p.status??1);}
