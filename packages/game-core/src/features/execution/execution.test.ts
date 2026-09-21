import {it,expect} from 'vitest';
import {GameKernel} from '../../application/kernel/index.js';
import {MemoryRunStore,loadScenario} from '../../../../kernel-adapters/src/index.js';
import {propose} from './index.js';
import {settleFill} from '../settlement/trade.js';
import {assertInvariants} from '../settlement/index.js';
import {ms} from '../../foundation/index.js';
it('K05 controlled matching C01 C09 cumulative minimum and hand cash baseline',async()=>{
 const data=loadScenario('scenarios/synthetic/kernel-smoke');const k=await GameKernel.create({runId:'r',ownerActorId:'p'},data,new MemoryRunStore());
 await k.execute({type:'CreateAccount',runId:'r',actorId:'p',commandId:'a',accountId:'a',initialCashFen:'10000000'});
 await k.execute({type:'SubmitOrder',runId:'r',actorId:'p',commandId:'buy',accountId:'a',securityId:'TEST_A',side:'BUY',quantity:'200',protectionPriceUnits:'120000'});
 const s=k.exportSnapshot('p'),o=s.orders[0]!;for(const b of data.pack.bars.filter(b=>b.securityId==='TEST_A').slice(0,2)){s.gameTime=ms(b.availableAt);const f=propose(s,data.pack,b,o,100n);if(typeof f==='string')throw Error(f);settleFill(s,data.pack,f);assertInvariants(s);}
 expect(o.commissionFen).toBe(500n);expect(s.accounts.a!.availableCashFen).toBe(9799500n);expect(s.accounts.a!.frozenCashFen).toBe(0n);expect(s.trades.map(t=>t.commissionFen)).toEqual([500n,0n]);
});
