import {KernelError,type RunState,type ScenarioPack} from '@3ker/contracts';
import {ms,isOpen} from '../../foundation/index.js';
import {ruleAt,statusAt} from '../../features/securities/index.js';
import {propose} from '../../features/execution/index.js';
import {settleFill} from '../../features/settlement/trade.js';
import {expireDay,closeSecurity} from '../../features/orders/index.js';
import {emit} from '../../features/ledger/index.js';
import {applyActions,registerActions} from '../../features/corporate-actions/index.js';
export function processBatch(s:RunState,p:ScenarioPack,time:number):void {
 // Coverage is checked before any changes, including same-time company actions.
 const barBoundary=p.calendar.some(d=>d.sessions.some(x=>ms(x.open)<time&&time<=ms(x.close)&&(time-ms(x.open))%300000===0));
 if(barBoundary)for(const sec of p.securities){const begin=time-300000;if(ms(sec.listedAt)>begin||(sec.lastTradableAt&&begin>=ms(sec.lastTradableAt))||(sec.delistedAt&&begin>=ms(sec.delistedAt)))continue;const status=statusAt(p,sec.securityId,begin);if(status==='SUSPENDED')continue;if(status==='MISSING'||!p.bars.some(b=>b.securityId===sec.securityId&&ms(b.barEnd)===time))throw new KernelError('DATA_PENDING',`Missing ${sec.securityId} at ${time}`);}
 s.gameTime=time;
 applyActions(s,p);
 for(const b of p.bars.filter(b=>ms(b.availableAt)===time).sort((a,b)=>a.securityId.localeCompare(b.securityId,'en'))){
  if(statusAt(p,b.securityId,ms(b.barStart))==='SUSPENDED')continue;
  s.marks[b.securityId]={priceUnits:BigInt(b.closeUnits),time};emit(s,'BarPublished',undefined,b.securityId);
  const r=ruleAt(p,b.securityId,ms(b.barStart));const unit=BigInt(r.quantityStep);let capacity=BigInt(b.volume)*BigInt(r.capacityNumerator)/BigInt(r.capacityDenominator)/unit*unit;
  for(const o of s.orders.filter(o=>isOpen(o)&&o.securityId===b.securityId).sort((a,b)=>a.acceptedSeq-b.acceptedSeq)){
   const f=propose(s,p,b,o,capacity);if(typeof f==='string'){o.lastReason=f;continue;}settleFill(s,p,f);capacity-=f.quantity;
  }
 }
 for(const d of p.calendar)if(ms(d.sessions.at(-1)!.close)===time)expireDay(s,d.date);
 registerActions(s,p);
 for(const sec of p.securities)if(sec.lastTradableAt&&ms(sec.lastTradableAt)===time)closeSecurity(s,sec.securityId);
 if(time===ms(p.manifest.end)){s.status='SCENARIO_COMPLETE';emit(s,'ScenarioCompleted');}
}
