import {type RunState,type ScenarioPack,type Bar,type Order,type Rule,type ErrorCode} from '@3ker/contracts';
import {amountFen,isOpen,min,marketDate,ms} from '../../foundation/index.js';
import {commission,stamp} from '../fees/index.js';
import {ruleAt,statusAt} from '../securities/index.js';
export interface FillProposal {order:Order;quantity:bigint;priceUnits:bigint;amountFen:bigint;commissionFen:bigint;stampFen:bigint;rule:Rule;}
export function propose(s:RunState,p:ScenarioPack,b:Bar,o:Order,capacity:bigint):FillProposal|ErrorCode {
 if(!isOpen(o)||o.securityId!==b.securityId||ms(b.barStart)<o.acceptedAt||marketDate(ms(b.barStart))!==o.validDate)return 'NOT_ELIGIBLE';
 if(statusAt(p,b.securityId,ms(b.barStart))==='SUSPENDED')return 'SUSPENDED';
 if(BigInt(b.volume)===0n)return 'ZERO_VOLUME';if(capacity===0n)return 'CAPACITY';
 const r=ruleAt(p,b.securityId,ms(b.barStart)),price=BigInt(b.closeUnits);
 if(o.protectionPriceUnits&&(o.side==='BUY'?price>o.protectionPriceUnits:price<o.protectionPriceUnits))return 'PRICE_PROTECTION';
 const flat=b.openUnits===b.highUnits&&b.highUnits===b.lowUnits&&b.lowUnits===b.closeUnits;
 if(flat&&((o.side==='BUY'&&b.closeUnits===b.upperUnits)||(o.side==='SELL'&&b.closeUnits===b.lowerUnits)))return 'PRICE_LIMIT';
 let quantity=min(o.remaining,capacity);if(!(o.side==='SELL'&&quantity===o.remaining&&r.oddLotSellPolicy==='all-remainder'))quantity=quantity/BigInt(r.quantityStep)*BigInt(r.quantityStep);if(!quantity)return 'CAPACITY';
 const amount=amountFen(price,quantity),comm=commission(o.turnoverFen+amount,r)-o.commissionFen,tax=o.side==='SELL'?stamp(o.turnoverFen+amount,r)-o.stampFen:0n;
 if(o.side==='SELL'&&s.accounts[o.accountId]!.availableCashFen+amount<comm+tax)return 'INSUFFICIENT_CASH';
 return {order:o,quantity,priceUnits:price,amountFen:amount,commissionFen:comm,stampFen:tax,rule:r};
}
