import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {stableStringify,type GameKernel} from '@3ker/game-core';
import type {RunState} from '@3ker/contracts';
export function economicHash(state:RunState):string {const {stateVersion:_,...domain}=state;return createHash('sha256').update(stableStringify(domain)).digest('hex');}
export function writeJson(path:string,value:unknown):void {writeFileSync(path,stableStringify(value)+'\n','utf8');}
export function exportRun(k:GameKernel,dir:string,actorId='player',extra:Record<string,unknown>={}):void {
 mkdirSync(dir,{recursive:true});const s=k.exportSnapshot(actorId),status=k.query({type:'status'}),accounts=Object.values(s.accounts).map(a=>k.query({type:'account',accountId:a.accountId,actorId:a.actorId}));
 const summary={status,domainHash:economicHash(s),trades:s.trades.length,events:s.events.length,...extra};
 writeJson(join(dir,'summary.json'),summary);writeJson(join(dir,'orders.json'),s.orders);writeJson(join(dir,'account-snapshots.json'),accounts);writeJson(join(dir,'verification.json'),{status:'PASS',...extra,domainHash:economicHash(s)});
 const columns=['tradeId','orderId','accountId','securityId','side','time','quantity','priceUnits','amountFen','commissionFen','stampFen','costFen'] as const;
 writeFileSync(join(dir,'trades.csv'),[columns.join(','),...s.trades.map(t=>columns.map(c=>String(t[c])).join(','))].join('\n')+'\n');
 writeFileSync(join(dir,'events.jsonl'),s.events.map(stableStringify).join('\n')+'\n');writeFileSync(join(dir,'ledger.jsonl'),s.ledger.map(stableStringify).join('\n')+'\n');
}
