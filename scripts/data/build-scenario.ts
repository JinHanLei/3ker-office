import {mkdirSync,cpSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {loadScenario} from '../../packages/kernel-adapters/src/data/scenario-files/index.js';
import {runPython} from './run-python.js';
const [mode,...raw]=process.argv.slice(2);const args=raw.filter(a=>a!=='--');const flag=(s:string)=>args[args.indexOf(s)+1];
if(mode==='normalize')runPython('scripts/data/normalization/normalize.py',args);
else {
 const input=flag('--input')??flag('--scenario')??args[0];if(!input)throw Error('REAL_DATA_PENDING: scenario path required');
 const {pack,hash}=loadScenario(input);
 if(mode==='verify'&&(pack.manifest.marketDataKind!=='real'||pack.manifest.synthetic||pack.manifest.coverageStatus!=='COMPLETE'||Object.keys(pack.provenance.rawHashes).length===0))throw Error('REAL_DATA_PENDING: verified real provenance required');
 if(mode==='publish'){const output=flag('--output');if(!output)throw Error('output required');const rel=relative(resolve('.runtime'),resolve(output));if(rel.startsWith('..')||resolve(output)===resolve('.runtime'))throw Error('Publish only to a child of ignored .runtime');if(existsSync(output))throw Error('Immutable output exists');mkdirSync(output,{recursive:true});cpSync(input,output,{recursive:true});}
 console.log(JSON.stringify({status:'PASS',hash,marketDataKind:pack.manifest.marketDataKind,rulesetKind:pack.manifest.rulesetKind,bars:pack.bars.length}));
}
