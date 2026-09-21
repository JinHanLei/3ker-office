import {it,expect} from 'vitest';
import {loadScenario,validatedData} from './scenario-files/index.js';
it('B09 validates synthetic files and rejects conflicting bars, ticks and rules',()=>{
 const {pack}=loadScenario('scenarios/synthetic/kernel-smoke');expect(pack.manifest.synthetic).toBe(true);
 const p=structuredClone(pack);p.bars.push({...p.bars[0]!});expect(()=>validatedData(p)).toThrow('Duplicate');
 const q=structuredClone(pack);q.bars[0]!.closeUnits='100001';expect(()=>validatedData(q)).toThrow('unit');
 const r=structuredClone(pack);r.rules.push({...r.rules[0]!});expect(()=>validatedData(r)).toThrow('Overlapping');
});
