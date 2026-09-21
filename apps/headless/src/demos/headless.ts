import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {openKernel} from '../bootstrap/index.js';
import {exportRun} from '../output/index.js';
import {formatFen} from '@3ker/game-core';
import type {GameCommand,Receipt} from '@3ker/contracts';
const root=join('.runtime','headless-'+randomUUID()),runId='headless';
const k=await openKernel({db:join(root,'run.sqlite'),runId,scenario:'scenarios/synthetic/kernel-smoke',create:true});
const receipts:Receipt[]=[];
async function exec(command:GameCommand,expected?:string){const r=await k.execute(command);receipts.push(r);if(expected?r.code!==expected:!r.ok)throw Error(JSON.stringify(r));return r;}
const base={runId,actorId:'player',accountId:'player'};
try{
 for(const accountId of ['player','test-a','test-b'])await exec({...base,accountId,commandId:'create-'+accountId,type:'CreateAccount',initialCashFen:'10000000'});
 const initialSearch=k.query({type:'search'});await exec({...base,commandId:'watch',type:'AddWatchlist',securityId:'TEST_A'});
 await exec({...base,commandId:'buy',type:'SubmitOrder',securityId:'TEST_A',side:'BUY',quantity:'100',protectionPriceUnits:'120000'});await k.advanceTo('2020-01-02T09:35:00+08:00');
 await exec({...base,commandId:'same-day-sell',type:'SubmitOrder',securityId:'TEST_A',side:'SELL',quantity:'100',protectionPriceUnits:'100000'},'INSUFFICIENT_SELLABLE_QUANTITY');
 const cancelled=await exec({...base,commandId:'pending',type:'SubmitOrder',securityId:'TEST_A',side:'BUY',quantity:'100',protectionPriceUnits:'90000'});await exec({...base,commandId:'cancel',type:'CancelOrder',orderId:cancelled.orderId!});
 // Scripted test account, explicitly not an autonomous NPC strategy.
 await exec({...base,accountId:'test-a',commandId:'test-buy',type:'SubmitOrder',securityId:'TEST_A',side:'BUY',quantity:'1000',protectionPriceUnits:'100000'});
 await k.advanceTo('2020-01-06T09:30:00+08:00');
 await exec({...base,commandId:'cross-day-sell',type:'SubmitOrder',securityId:'TEST_A',side:'SELL',quantity:'100',protectionPriceUnits:'100000'});await k.advanceTo('2020-01-07T15:00:00+08:00');
 const s=k.exportSnapshot('player'),a=s.accounts.player!;if(a.availableCashFen!==10013890n||a.frozenCashFen!==0n)throw Error('Unexpected demo cash');
 exportRun(k,root,'player',{marketDataKind:'synthetic',rulesetKind:'game-test',initialSearch,finalSearch:k.query({type:'search'}),receipts,expectedCashFen:'10013890',actualCashFen:a.availableCashFen.toString()});await k.checkpoint();
 console.log(`无界面演示：PASS（合成行情 / 游戏测试规则）\n账户数：${Object.keys(s.accounts).length}；成交数：${s.trades.length}\n当日卖出：INSUFFICIENT_SELLABLE_QUANTITY；撤单：成功\n玩家最终现金：${formatFen(a.availableCashFen)} 元（交易净收益 88.90 + 登记股息 50.00）\n测试账户股息：${formatFen(s.accounts['test-a']!.dividendIncomeFen)} 元\n输出目录：${root}`);
}finally{await k.close();}
