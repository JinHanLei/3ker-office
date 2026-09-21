import type {RunState} from '@3ker/contracts';
import {isOpen} from '../../foundation/index.js';
export function assertInvariants(s:RunState):void {
 for(const a of Object.values(s.accounts)){
  if(a.availableCashFen<0n||a.frozenCashFen<0n)throw Error('Negative wallet');
  if(a.frozenCashFen!==s.orders.filter(o=>o.accountId===a.accountId&&isOpen(o)).reduce((n,o)=>n+o.reservedFen,0n))throw Error('Cash reservations mismatch');
  for(const l of a.lots){if(l.quantity<0n||l.costFen<0n||l.frozenQuantity<0n||l.frozenQuantity>l.quantity)throw Error('Lot invariant');const frozen=s.orders.filter(o=>o.accountId===a.accountId&&isOpen(o)).flatMap(o=>o.allocations).filter(x=>x.lotId===l.lotId).reduce((n,x)=>n+x.quantity,0n);if(frozen!==l.frozenQuantity)throw Error('Share reservations mismatch');}
 }
 for(let i=0;i<s.events.length;i++)if(s.events[i]!.eventSeq!==i+1)throw Error('Event sequence gap');
}
