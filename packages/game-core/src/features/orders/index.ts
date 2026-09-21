import {KernelError,type RunState,type ScenarioPack,type ParsedCommand,type Order,type Rule} from '@3ker/contracts';
import {amountFen,isOpen,ms} from '../../foundation/index.js';
import {effectiveDay} from '../calendar/index.js';
import {ruleAt,securityAt,statusAt} from '../securities/index.js';
import {reserveCash,releaseCash} from '../wallet/index.js';
import {reserveShares,releaseShares,sellable} from '../positions/index.js';
import {commission} from '../fees/index.js';
import {book,emit} from '../ledger/index.js';
export function remainingReserve(o:Order,r:Rule):bigint{if(!o.remaining)return 0n;const cost=amountFen(o.protectionPriceUnits!,o.remaining);return cost+commission(o.turnoverFen+cost,r)-o.commissionFen;}
export function submitOrder(s:RunState,p:ScenarioPack,c:Extract<ParsedCommand,{type:'SubmitOrder'}>):string {
 const a=s.accounts[c.accountId]!,sec=securityAt(p,c.securityId,s.gameTime),r=ruleAt(p,c.securityId,s.gameTime);
 if(sec.lastTradableAt&&s.gameTime>=ms(sec.lastTradableAt))throw new KernelError('MARKET_CLOSED');
 if(statusAt(p,c.securityId,s.gameTime)==='SUSPENDED')throw new KernelError('SUSPENDED');
 if(statusAt(p,c.securityId,s.gameTime)==='MISSING')throw new KernelError('DATA_PENDING');
 if(!a.permissions.includes(r.requiredPermission))throw new KernelError('PERMISSION_REQUIRED');
 const quantity=BigInt(c.quantity),price=c.protectionPriceUnits?BigInt(c.protectionPriceUnits):undefined;
 if(c.side==='BUY'&&!price)throw new KernelError('INVALID_PRICE');if(price&&price%BigInt(r.priceTickUnits)!==0n)throw new KernelError('INVALID_PRICE');
 if(c.side==='BUY'&&(quantity<BigInt(r.minimumBuyQuantity)||quantity%BigInt(r.quantityStep)!==0n))throw new KernelError('INVALID_QUANTITY');
 if(c.side==='SELL'&&quantity%BigInt(r.quantityStep)!==0n&&(r.oddLotSellPolicy!=='all-remainder'||quantity!==sellable(a,c.securityId,s.gameTime)))throw new KernelError('INVALID_QUANTITY');
 const orderId=`order-${s.nextOrderSeq}`,o:Order={orderId,accountId:a.accountId,securityId:c.securityId,side:c.side,quantity,remaining:quantity,...(price?{protectionPriceUnits:price}:{}),acceptedAt:s.gameTime,acceptedSeq:s.nextOrderSeq,validDate:effectiveDay(p,s.gameTime),status:'OPEN',reservedFen:0n,turnoverFen:0n,commissionFen:0n,stampFen:0n,allocations:[]};
 book(s,a,'OrderAccepted',orderId,()=>{if(o.side==='BUY'){o.reservedFen=remainingReserve(o,r);reserveCash(a,o.reservedFen);}else o.allocations=reserveShares(a,o.securityId,quantity,s.gameTime);s.orders.push(o);s.nextOrderSeq++;});return orderId;
}
export function cancelOrder(s:RunState,accountId:string,orderId:string,status:'CANCELLED'|'EXPIRED'='CANCELLED'):void {const o=s.orders.find(o=>o.orderId===orderId);if(!o||o.accountId!==accountId)throw new KernelError('NOT_OWNER');if(!isOpen(o))throw new KernelError('ORDER_NOT_OPEN');const a=s.accounts[accountId]!;book(s,a,status==='EXPIRED'?'OrderExpired':'OrderCancelled',orderId,()=>{releaseCash(a,o.reservedFen);o.reservedFen=0n;releaseShares(a,o);o.status=status;});}
export function expireDay(s:RunState,date:string):void{for(const o of s.orders)if(isOpen(o)&&o.validDate===date)cancelOrder(s,o.accountId,o.orderId,'EXPIRED');}
export function closeSecurity(s:RunState,id:string):void{for(const o of s.orders)if(o.securityId===id&&isOpen(o))cancelOrder(s,o.accountId,o.orderId);for(const a of Object.values(s.accounts))a.watchlist=a.watchlist.filter(x=>x!==id);emit(s,'LastTradingEnded',undefined,id);}
