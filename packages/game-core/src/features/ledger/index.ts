import type {Account,RunState} from '@3ker/contracts';
export function emit(s:RunState,type:string,accountId?:string,reference?:string):number {const eventSeq=++s.eventSeq;s.events.push({eventSeq,time:s.gameTime,type,...(accountId?{accountId}:{}),...(reference?{reference}:{})});return eventSeq;}
export function book(s:RunState,a:Account,reason:string,reference:string,change:()=>void,quantityDelta=0n,costDeltaFen=0n,externalDeltaFen=0n):void {
 const availableBeforeFen=a.availableCashFen,frozenBeforeFen=a.frozenCashFen;change();
 const eventSeq=emit(s,reason,a.accountId,reference);
 s.ledger.push({eventSeq,time:s.gameTime,accountId:a.accountId,reason,reference,availableBeforeFen,availableAfterFen:a.availableCashFen,frozenBeforeFen,frozenAfterFen:a.frozenCashFen,quantityDelta,costDeltaFen,externalDeltaFen});
}
