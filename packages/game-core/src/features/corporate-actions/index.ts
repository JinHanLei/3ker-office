import {KernelError,type RunState,type ScenarioPack,type CorporateAction} from '@3ker/contracts';
import {ms,roundRatio,isOpen} from '../../foundation/index.js';
import {book,emit} from '../ledger/index.js';
import {cancelOrder} from '../orders/index.js';
function once(s:RunState,key:string,apply:()=>void):void{if(s.processed.includes(key))return;apply();s.processed.push(key);}
export function registerActions(s:RunState,p:ScenarioPack):void {
 for(const action of p.actions)if(ms(action.recordAt)===s.gameTime&&['DIVIDEND','SHARES'].includes(action.type))once(s,`record:${action.actionId}`,()=>{
  for(const a of Object.values(s.accounts)){
   const quantity=a.lots.filter(l=>l.securityId===action.securityId&&!l.archived).reduce((n,l)=>n+l.quantity,0n);if(!quantity)continue;
   let shareQuantity=0n,cashFen=0n;
   if(action.type==='DIVIDEND')cashFen=roundRatio(quantity*BigInt(action.cashNumerator!),BigInt(action.cashDenominator!));
   else {const n=quantity*BigInt(action.shareNumerator!),d=BigInt(action.shareDenominator!);if(n%d!==0n&&action.fractionPolicy!=='floor')throw new KernelError('FRACTIONAL_SHARES_UNSUPPORTED');shareQuantity=n/d;}
   a.entitlements.push({actionId:action.actionId,securityId:action.securityId,quantity,cashFen,shareQuantity,phase:'REGISTERED'});emit(s,'EntitlementRegistered',a.accountId,action.actionId);
  }
 });
}
function effective(s:RunState,action:CorporateAction):void {
 if(['RIGHTS','ACQUISITION','EXCHANGE'].includes(action.type))throw new KernelError('UNSUPPORTED_CORPORATE_ACTION',action.actionId);
 if(action.type==='EXIT'&&action.exitPolicy!=='game-writeoff-v1')throw new KernelError('EXIT_POLICY_MISSING');
 for(const o of s.orders)if(o.securityId===action.securityId&&isOpen(o))cancelOrder(s,o.accountId,o.orderId);
 for(const a of Object.values(s.accounts)){
  const e=a.entitlements.find(e=>e.actionId===action.actionId);
  if(action.type==='DIVIDEND'&&e){e.phase='RECEIVABLE';a.dividendIncomeFen+=e.cashFen;emit(s,'DividendEntitled',a.accountId,action.actionId);}
  if(action.type==='SHARES'&&e){
   const old=a.lots.filter(l=>l.securityId===action.securityId&&!l.archived&&l.quantity>0n);const total=old.reduce((n,l)=>n+l.quantity,0n)+e.shareQuantity;let cost=0n;
   for(const l of old){const part=l.costFen*e.shareQuantity/total;l.costFen-=part;cost+=part;}
   a.lots.push({lotId:`shares-${action.actionId}-${a.accountId}`,securityId:action.securityId,quantity:e.shareQuantity,frozenQuantity:0n,costFen:cost,acquiredAt:s.gameTime,sellableAt:ms(action.releaseAt!),pending:true,archived:false});e.phase='RECEIVABLE';emit(s,'SharesPending',a.accountId,action.actionId);
  }
  if(action.type==='EXIT'){
   const lots=a.lots.filter(l=>l.securityId===action.securityId&&!l.archived);const cost=lots.reduce((n,l)=>n+l.costFen,0n),quantity=lots.reduce((n,l)=>n+l.quantity,0n);
   book(s,a,'SecurityExited',action.actionId,()=>{for(const l of lots)l.archived=true;a.realizedPnlFen-=cost;a.watchlist=a.watchlist.filter(id=>id!==action.securityId);},-quantity,-cost);
  }
 }
}
export function applyActions(s:RunState,p:ScenarioPack):void {
 for(const action of [...p.actions].sort((a,b)=>a.actionId.localeCompare(b.actionId,'en'))){
  if(ms(action.effectiveAt)===s.gameTime)once(s,`effective:${action.actionId}`,()=>effective(s,action));
  if(action.payAt&&ms(action.payAt)===s.gameTime)once(s,`pay:${action.actionId}`,()=>{for(const a of Object.values(s.accounts)){const e=a.entitlements.find(e=>e.actionId===action.actionId);if(e?.phase==='RECEIVABLE')book(s,a,'DividendPaid',action.actionId,()=>{a.availableCashFen+=e.cashFen;e.phase='PAID';});}});
  if(action.releaseAt&&ms(action.releaseAt)===s.gameTime)once(s,`release:${action.actionId}`,()=>{for(const a of Object.values(s.accounts)){const e=a.entitlements.find(e=>e.actionId===action.actionId);if(e?.phase==='RECEIVABLE'){const lot=a.lots.find(l=>l.lotId===`shares-${action.actionId}-${a.accountId}`)!;lot.pending=false;e.phase='RELEASED';emit(s,'SharesReleased',a.accountId,action.actionId);}}});
 }
}
