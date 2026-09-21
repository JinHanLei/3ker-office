import {randomUUID} from 'node:crypto';import {join} from 'node:path';
import {loadScenario} from '@3ker/kernel-adapters';import {openKernel} from '../bootstrap/index.js';import {exportRun} from '../output/index.js';
const args=process.argv.slice(2).filter(a=>a!=='--'),scenario=args[args.indexOf('--scenario')+1];
if(!scenario)throw Error('REAL_DATA_PENDING: --scenario verified real package required');const data=loadScenario(scenario);
if(data.pack.manifest.synthetic||data.pack.manifest.marketDataKind!=='real'||data.pack.manifest.coverageStatus!=='COMPLETE'||!Object.keys(data.pack.provenance.rawHashes).length)throw Error('REAL_DATA_PENDING: genuine complete data required');
const root=join('.runtime','real-'+randomUUID()),runId='real',security=data.pack.securities[0]!,rule=data.pack.rules.find(r=>r.board===security.board)!;
let k=await openKernel({db:join(root,'run.sqlite'),runId,scenario,create:true});
try{await k.execute({type:'CreateAccount',runId,actorId:'player',accountId:'player',commandId:'create',initialCashFen:'100000000',permissions:[rule.requiredPermission]});
 while(!(k.query({type:'bars',securityId:security.securityId}) as unknown[]).length){const r=await k.stepNextEvent();if(!r.ok||r.code==='SCENARIO_COMPLETE')throw Error('No usable real bar');}
 const visible=k.query({type:'bars',securityId:security.securityId}) as {closeUnits:string}[];const protection=(BigInt(visible.at(-1)!.closeUnits)*2n/BigInt(rule.priceTickUnits)*BigInt(rule.priceTickUnits)).toString();
 const r=await k.execute({type:'SubmitOrder',runId,actorId:'player',accountId:'player',commandId:'buy',securityId:security.securityId,side:'BUY',quantity:rule.minimumBuyQuantity,protectionPriceUnits:protection});if(!r.ok)throw Error(JSON.stringify(r));
 while(!k.exportSnapshot('player').trades.length){const r=await k.stepNextEvent();if(!r.ok||r.code==='SCENARIO_COMPLETE')throw Error('No real fill in declared coverage');}
 await k.close();k=await openKernel({db:join(root,'run.sqlite'),runId,scenario});exportRun(k,root,'player',{marketDataKind:'real',rulesetKind:data.pack.manifest.rulesetKind,scope:'small sample only; historical rules not certified'});console.log(`真实样本交易与恢复 PASS：${root}`);
}finally{await k.close();}
