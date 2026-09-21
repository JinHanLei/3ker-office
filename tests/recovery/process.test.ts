import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
it('E02 E03 E04 E05 E10 F02 actual subprocess restart equals baseline including pending state',()=>{const p=spawnSync(process.execPath,['apps/headless/dist/demos/recovery.js'],{encoding:'utf8',timeout:60000});expect(p.status,p.stdout+p.stderr).toBe(0);const rows=p.stdout.split('\n').filter(x=>x.startsWith('{')).map(x=>JSON.parse(x));expect(rows).toHaveLength(3);expect(new Set(rows.map(x=>x.pid)).size).toBe(3);expect(rows[0].hash).toBe(rows[2].hash);});
