import {KernelError,type Account,type Order} from '@3ker/contracts';
import {min} from '../../foundation/index.js';
export function sellable(a:Account,id:string,time:number):bigint{return a.lots.filter(l=>l.securityId===id&&!l.archived&&!l.pending&&l.sellableAt<=time).reduce((n,l)=>n+l.quantity-l.frozenQuantity,0n);}
export function reserveShares(a:Account,id:string,quantity:bigint,time:number):Order['allocations']{
 if(sellable(a,id,time)<quantity)throw new KernelError('INSUFFICIENT_SELLABLE_QUANTITY');
 const allocations:Order['allocations']=[];let remaining=quantity;
 for(const lot of a.lots){if(lot.securityId!==id||lot.archived||lot.pending||lot.sellableAt>time)continue;const take=min(remaining,lot.quantity-lot.frozenQuantity);if(take){lot.frozenQuantity+=take;allocations.push({lotId:lot.lotId,quantity:take});remaining-=take;}if(!remaining)break;}return allocations;
}
export function releaseShares(a:Account,o:Order):void{for(const alloc of o.allocations){const l=a.lots.find(l=>l.lotId===alloc.lotId)!;l.frozenQuantity-=alloc.quantity;}o.allocations=[];}
export function consumeShares(a:Account,o:Order,quantity:bigint):bigint {let remaining=quantity,cost=0n;for(const alloc of o.allocations){const l=a.lots.find(l=>l.lotId===alloc.lotId)!;const take=min(remaining,alloc.quantity);const allocated=take===l.quantity?l.costFen:l.costFen*take/l.quantity;l.quantity-=take;l.frozenQuantity-=take;l.costFen-=allocated;alloc.quantity-=take;cost+=allocated;remaining-=take;if(!remaining)break;}if(remaining)throw new Error('Allocation underflow');o.allocations=o.allocations.filter(a=>a.quantity>0n);return cost;}
