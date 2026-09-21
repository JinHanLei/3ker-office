import {KernelError,type Account} from '@3ker/contracts';
export function reserveCash(a:Account,amount:bigint):void{if(amount<0n||a.availableCashFen<amount)throw new KernelError('INSUFFICIENT_CASH');a.availableCashFen-=amount;a.frozenCashFen+=amount;}
export function releaseCash(a:Account,amount:bigint):void{if(amount<0n||a.frozenCashFen<amount)throw new Error('Invalid release');a.frozenCashFen-=amount;a.availableCashFen+=amount;}
export function transfer(a:Account,b:Account,amount:bigint):void {if(amount<=0n||a.availableCashFen<amount)throw new KernelError('INSUFFICIENT_CASH');a.availableCashFen-=amount;b.availableCashFen+=amount;a.externalFlowFen-=amount;b.externalFlowFen+=amount;}
