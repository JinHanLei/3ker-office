import {commandSchema,ENGINE_VERSION,SAVE_SCHEMA_VERSION,KernelError,type RunState,type GameCommand,type ParsedCommand,type Receipt,type GameQuery} from '@3ker/contracts';
import type {HistoricalData,RunStore} from '../../ports/index.js';
import {clone,ms,stableStringify} from '../../foundation/index.js';
import {book,emit} from '../../features/ledger/index.js';
import {transfer} from '../../features/wallet/index.js';
import {securityAt,searchable} from '../../features/securities/index.js';
import {assertInvariants} from '../../features/settlement/index.js';
import {submitOrder,cancelOrder} from '../../features/orders/index.js';
import {schedule} from '../../features/scheduler/index.js';
import {processBatch} from '../event-processing/index.js';
export class GameKernel {
 private tail:Promise<unknown>=Promise.resolve();
 private constructor(private state:RunState,private readonly data:HistoricalData,private readonly store:RunStore){}
 static async create(options:{runId:string;ownerActorId:string;seed?:number},data:HistoricalData,store:RunStore):Promise<GameKernel>{
  const m=data.pack.manifest;const s:RunState={...options,seed:options.seed??42,scenarioId:m.scenarioId,scenarioVersion:m.scenarioVersion,scenarioHash:data.hash,ruleVersion:m.ruleVersion,saveSchemaVersion:SAVE_SCHEMA_VERSION,engineVersion:ENGINE_VERSION,gameTime:ms(m.start),stateVersion:0,eventSeq:0,nextOrderSeq:1,status:'RUNNING',randomStreams:{},accounts:{},orders:[],trades:[],events:[],ledger:[],receipts:{},processed:[],marks:{}};
  await store.commit(s,-1);return new GameKernel(s,clone(data),store);
 }
 static async resume(runId:string,data:HistoricalData,store:RunStore):Promise<GameKernel>{const s=await store.load(runId);if(!s)throw new KernelError('SAVE_VERSION_UNSUPPORTED','Run not found');if(s.saveSchemaVersion!==SAVE_SCHEMA_VERSION||s.engineVersion!==ENGINE_VERSION)throw new KernelError('SAVE_VERSION_UNSUPPORTED');if(s.scenarioHash!==data.hash||s.scenarioVersion!==data.pack.manifest.scenarioVersion||s.ruleVersion!==data.pack.manifest.ruleVersion)throw new KernelError('SCENARIO_VERSION_MISMATCH');assertInvariants(s);return new GameKernel(s,clone(data),store);}
 private serial<T>(fn:()=>Promise<T>):Promise<T>{const p=this.tail.then(fn);this.tail=p.catch(()=>undefined);return p;}
 private async commit(draft:RunState):Promise<void>{const expected=this.state.stateVersion;assertInvariants(draft);draft.stateVersion=expected+1;try{await this.store.commit(draft,expected);this.state=draft;}catch(error){const persisted=await this.store.load(this.state.runId);if(persisted)this.state=persisted;throw error;}}
 execute(input:GameCommand):Promise<Receipt>{return this.serial(async()=>{
  const parsed=commandSchema.safeParse(input);if(!parsed.success)return {commandId:typeof input?.commandId==='string'?input.commandId:'invalid',ok:false,code:'INVALID_COMMAND',eventSeq:this.state.eventSeq};
  const cmd=parsed.data;if(cmd.runId!==this.state.runId)return {commandId:cmd.commandId,ok:false,code:'INVALID_COMMAND',eventSeq:this.state.eventSeq};
  const payload=stableStringify(cmd),old=this.state.receipts[cmd.commandId];if(old)return old.payload===payload?clone(old.receipt):{commandId:cmd.commandId,ok:false,code:'IDEMPOTENCY_CONFLICT',eventSeq:this.state.eventSeq};
  let draft=clone(this.state),receipt:Receipt;
  try{const orderId=this.handle(draft,cmd);receipt={commandId:cmd.commandId,ok:true,eventSeq:draft.eventSeq,...(orderId?{orderId}:{})};}
  catch(error){if(!(error instanceof KernelError))throw error;draft=clone(this.state);emit(draft,'CommandRejected',cmd.accountId,cmd.commandId);receipt={commandId:cmd.commandId,ok:false,code:error.code,eventSeq:draft.eventSeq};}
  draft.receipts[cmd.commandId]={payload,receipt};await this.commit(draft);return clone(receipt);
 });}
 private handle(s:RunState,c:ParsedCommand):string|undefined {
  if(c.type==='CreateAccount'){
   if(c.actorId!==s.ownerActorId)throw new KernelError('NOT_OWNER');if(s.accounts[c.accountId])throw new KernelError('ACCOUNT_EXISTS');
   const a=s.accounts[c.accountId]={accountId:c.accountId,actorId:c.actorId,profile:c.profile,permissions:c.permissions,availableCashFen:0n,frozenCashFen:0n,externalFlowFen:0n,realizedPnlFen:0n,dividendIncomeFen:0n,lots:[],entitlements:[],watchlist:[]};
   const initial=BigInt(c.initialCashFen);book(s,a,'InitialCapital',c.commandId,()=>{a.availableCashFen=initial;a.externalFlowFen=initial;},0n,0n,initial);return;
  }
  const a=s.accounts[c.accountId];if(!a)throw new KernelError('ACCOUNT_NOT_FOUND');if(a.actorId!==c.actorId)throw new KernelError('NOT_OWNER');
  switch(c.type){
   case 'SubmitOrder':return submitOrder(s,this.data.pack,c);
   case 'CancelOrder':cancelOrder(s,a.accountId,c.orderId);return;
   case 'TransferCash':{const b=s.accounts[c.toAccountId];if(!b)throw new KernelError('ACCOUNT_NOT_FOUND');if(a===b)throw new KernelError('INVALID_COMMAND');const amount=BigInt(c.amountFen);if(a.availableCashFen<amount)throw new KernelError('INSUFFICIENT_CASH');const beforeB={availableCashFen:b.availableCashFen,frozenCashFen:b.frozenCashFen};book(s,a,'CashTransferredOut',c.commandId,()=>transfer(a,b,amount),0n,0n,-amount);const afterB=b.availableCashFen;b.availableCashFen=beforeB.availableCashFen;book(s,b,'CashTransferredIn',c.commandId,()=>{b.availableCashFen=afterB;},0n,0n,amount);return;}
   case 'AddWatchlist':securityAt(this.data.pack,c.securityId,s.gameTime);if(!a.watchlist.includes(c.securityId))a.watchlist.push(c.securityId);emit(s,'WatchlistAdded',a.accountId,c.securityId);return;
   case 'RemoveWatchlist':a.watchlist=a.watchlist.filter(id=>id!==c.securityId);emit(s,'WatchlistRemoved',a.accountId,c.securityId);return;
   default:throw new KernelError('INVALID_ORDER');
  }
 }
 query(q:GameQuery):unknown {const s=this.state;if(q.type==='status')return {runId:s.runId,gameTime:s.gameTime,status:s.status,eventSeq:s.eventSeq,marketDataKind:this.data.pack.manifest.marketDataKind,rulesetKind:this.data.pack.manifest.rulesetKind};if(q.type==='search')return clone(searchable(this.data.pack,s.gameTime,q.text));if(q.type==='bars')return clone(this.data.pack.bars.filter(b=>b.securityId===q.securityId&&ms(b.availableAt)<=s.gameTime));const a=s.accounts[q.accountId];if(!a)throw new KernelError('ACCOUNT_NOT_FOUND');if(a.actorId!==q.actorId)throw new KernelError('NOT_OWNER');return clone(q.type==='account'?a:q.type==='positions'?a.lots:q.type==='watchlist'?a.watchlist:q.type==='ledger'?s.ledger.filter(l=>l.accountId===a.accountId):s.orders.filter(o=>o.accountId===a.accountId));}
 exportSnapshot(actorId:string):RunState {if(actorId!==this.state.ownerActorId)throw new KernelError('NOT_OWNER');return clone(this.state);}
 advanceTo(target:number|string):Promise<{ok:boolean;gameTime:number;code?:string}>{return this.serial(()=>this.advance(typeof target==='string'?ms(target):target));}
 stepNextEvent():Promise<{ok:boolean;gameTime:number;code?:string}>{return this.serial(()=>this.advance(schedule(this.data.pack).find(t=>t>this.state.gameTime)??ms(this.data.pack.manifest.end)));}
 private async advance(target:number):Promise<{ok:boolean;gameTime:number;code?:string}>{
  if(!Number.isSafeInteger(target)||target<this.state.gameTime)throw new KernelError('INVALID_COMMAND','Cannot rewind');
  const end=ms(this.data.pack.manifest.end),until=Math.min(target,end);
  for(const time of schedule(this.data.pack).filter(t=>this.state.gameTime<t&&t<=until)){
   const draft=clone(this.state);try{processBatch(draft,this.data.pack,time);}catch(error){if(error instanceof KernelError)return {ok:false,code:error.code,gameTime:this.state.gameTime};throw error;}await this.commit(draft);
  }
  if(this.state.gameTime<until){const draft=clone(this.state);draft.gameTime=until;await this.commit(draft);}
  return {ok:true,gameTime:this.state.gameTime,...(this.state.status==='SCENARIO_COMPLETE'?{code:'SCENARIO_COMPLETE'}:{})};
 }
 checkpoint():Promise<{stateVersion:number}>{return this.serial(async()=>({stateVersion:this.state.stateVersion}));}
 async close():Promise<void>{await this.tail;await this.store.close();}
}
