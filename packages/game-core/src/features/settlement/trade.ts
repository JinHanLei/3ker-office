import type {RunState,ScenarioPack} from '@3ker/contracts';
import type {FillProposal} from '../execution/index.js';
import {sellableTime} from '../calendar/index.js';
import {consumeShares} from '../positions/index.js';
import {releaseCash} from '../wallet/index.js';
import {remainingReserve} from '../orders/index.js';
import {book} from '../ledger/index.js';
export function settleFill(s:RunState,p:ScenarioPack,f:FillProposal):void {
 const o=f.order,a=s.accounts[o.accountId]!,tradeId=`trade-${s.trades.length+1}`;let costFen=0n;
 const oldCost=a.lots.reduce((n,l)=>n+l.costFen,0n);
 book(s,a,o.remaining===f.quantity?'OrderFilled':'OrderPartiallyFilled',tradeId,()=>{
  o.remaining-=f.quantity;o.turnoverFen+=f.amountFen;o.commissionFen+=f.commissionFen;o.stampFen+=f.stampFen;
  if(o.side==='BUY'){
   const debit=f.amountFen+f.commissionFen;a.frozenCashFen-=debit;o.reservedFen-=debit;
   const required=remainingReserve(o,f.rule);releaseCash(a,o.reservedFen-required);o.reservedFen=required;
   costFen=debit;a.lots.push({lotId:`lot-${tradeId}`,securityId:o.securityId,quantity:f.quantity,frozenQuantity:0n,costFen,acquiredAt:s.gameTime,sellableAt:sellableTime(p,s.gameTime,f.rule.sellableDelayTradingDays),pending:false,archived:false});
  }else {costFen=consumeShares(a,o,f.quantity);a.availableCashFen+=f.amountFen-f.commissionFen-f.stampFen;a.realizedPnlFen+=f.amountFen-f.commissionFen-f.stampFen-costFen;}
  o.status=o.remaining?'PARTIAL':'FILLED';delete o.lastReason;
  s.trades.push({tradeId,orderId:o.orderId,accountId:o.accountId,securityId:o.securityId,side:o.side,time:s.gameTime,quantity:f.quantity,priceUnits:f.priceUnits,amountFen:f.amountFen,commissionFen:f.commissionFen,stampFen:f.stampFen,costFen});
 },o.side==='BUY'?f.quantity:-f.quantity);
 s.ledger.at(-1)!.costDeltaFen=a.lots.reduce((n,l)=>n+l.costFen,0n)-oldCost;
}
