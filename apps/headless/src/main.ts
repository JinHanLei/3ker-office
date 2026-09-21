import {createInterface} from 'node:readline/promises';
import {randomUUID} from 'node:crypto';
import {openKernel} from './bootstrap/index.js';
import {dispatch} from './commands/index.js';
import {Playback} from './playback/index.js';
import {stableStringify,decimalUnits} from '@3ker/game-core';
const args=process.argv.slice(2).filter(x=>x!=='--');
const help=`3ker-office 无界面内核（虚拟交易）\n用法：pnpm cli -- --run <ID> [--db <file>] [--scenario <dir>] [--json] <命令>\ncreate [本金元] | status | account | search [词] | watchlist [add/remove ID]\nbuy <证券ID> <股数> <保护价元> | sell <证券ID> <股数> [保护价元]\ncancel <订单ID> | orders | positions | ledger | transfer <账户> <金额元>\nstep | advance <带时区ISO> | save | resume | export <目录> | interactive\n交互中可 play <倍速> / pause / quit；命令可带 --command-id <ID> 重试。\n默认场景 synthetic/kernel-smoke，明确为合成数据与测试规则。`;
if(args.includes('--help')||!args.length){console.log(help);}
else {
 const take=(key:string,defaultValue?:string)=>{const at=args.indexOf(key);return at<0?defaultValue:args.splice(at,2)[1];};const json=args.includes('--json');if(json)args.splice(args.indexOf('--json'),1);
 const runId=take('--run'),db=take('--db','.runtime/manual/run.sqlite')!,scenario=take('--scenario','scenarios/synthetic/kernel-smoke')!,actorId=take('--actor','player')!,accountId=take('--account','player')!;
 if(!runId)throw Error('必须显式指定 --run，避免操作错误存档');
 const k=await openKernel({db,runId,scenario,actorId,create:args[0]==='create'});const playback=new Playback(k,e=>{console.error(e);process.exitCode=1;});
 const print=(result:unknown)=>console.log(json?stableStringify(result):`结果：${stableStringify(result)}`);
 const context={runId,actorId,accountId,playback};
 try{
  if(args[0]==='create')print(await k.execute({runId,actorId,accountId,commandId:'initial-capital',type:'CreateAccount',initialCashFen:decimalUnits(args[1]??'100000',2).toString()}));
  else if(args[0]==='interactive'){
   console.log(help);const rl=createInterface({input:process.stdin,output:process.stdout});
   try{for await(const line of rl){const tokens=line.trim().split(/\s+/);if(tokens[0]==='quit')break;if(!line.trim())continue;try{print(await dispatch(k,tokens,context));}catch(e){console.error(e instanceof Error?e.message:e);}}}finally{rl.close();}
  }else {if(args[0]==='play')throw Error('play 需要 interactive 会话；脚本请使用 advance/step');const result=await dispatch(k,args,context);print(result);if(result&&typeof result==='object'&&'ok' in result&&result.ok===false)process.exitCode=2;}
 }finally{playback.pause();await k.close();}
}
