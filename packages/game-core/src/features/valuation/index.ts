import type {Account,RunState} from '@3ker/contracts';
import {amountFen} from '../../foundation/index.js';
export function valuation(s:RunState,a:Account){
 let securitiesValueFen=0n,pendingSharesValueFen=0n,costFen=0n;const marks:Record<string,{priceUnits:bigint|null;stale:boolean}>={};let unknown=false;
 for(const l of a.lots){if(l.archived||!l.quantity)continue;costFen+=l.costFen;const m=s.marks[l.securityId];marks[l.securityId]={priceUnits:m?.priceUnits??null,stale:!m||m.time<s.gameTime};if(!m){unknown=true;continue;}const value=amountFen(m.priceUnits,l.quantity);if(l.pending)pendingSharesValueFen+=value;else securitiesValueFen+=value;}
 const receivableFen=a.entitlements.filter(e=>e.phase==='RECEIVABLE').reduce((n,e)=>n+e.cashFen,0n);
 return {availableCashFen:a.availableCashFen,frozenCashFen:a.frozenCashFen,securitiesValueFen:unknown?null:securitiesValueFen,pendingSharesValueFen:unknown?null:pendingSharesValueFen,receivableFen,totalEquityFen:unknown?null:a.availableCashFen+a.frozenCashFen+securitiesValueFen+pendingSharesValueFen+receivableFen,realizedPnlFen:a.realizedPnlFen,unrealizedPnlFen:unknown?null:securitiesValueFen+pendingSharesValueFen-costFen,dividendIncomeFen:a.dividendIncomeFen,externalFlowFen:a.externalFlowFen,priceStatus:unknown?'UNKNOWN_PRICE':'KNOWN',marks};
}
