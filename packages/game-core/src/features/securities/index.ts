import {KernelError,type ScenarioPack,type Rule} from '@3ker/contracts';
import {ms} from '../../foundation/index.js';
export function securityAt(p:ScenarioPack,id:string,t:number){const s=p.securities.find(s=>s.securityId===id);if(!s||t<ms(s.listedAt)||(s.delistedAt&&t>=ms(s.delistedAt)))throw new KernelError('SECURITY_NOT_LISTED');return s;}
export function searchable(p:ScenarioPack,t:number,text=''){return p.securities.filter(s=>ms(s.listedAt)<=t&&(!s.lastTradableAt||t<=ms(s.lastTradableAt))&&(!s.delistedAt||t<ms(s.delistedAt))).map(s=>{
 const n=p.names.find(n=>n.securityId===s.securityId&&ms(n.from)<=t&&t<ms(n.to)&&ms(n.knownAt)<=t);
 return {securityId:s.securityId,code:n?.code??s.securityId,name:n?.name??'历史名称缺失',listedAt:s.listedAt,...(s.exitKnownAt&&ms(s.exitKnownAt)<=t?{lastTradableAt:s.lastTradableAt,delistedAt:s.delistedAt}:{} )};
}).filter(s=>`${s.securityId} ${s.code} ${s.name}`.includes(text));}
export function ruleAt(p:ScenarioPack,id:string,t:number):Rule {const s=securityAt(p,id,t);const r=p.rules.find(r=>r.board===s.board&&ms(r.from)<=t&&t<ms(r.to));if(!r)throw new KernelError('RULE_COVERAGE_MISSING');if(t<ms(r.boardAvailableAt))throw new KernelError('MARKET_CLOSED');return r;}
export function statusAt(p:ScenarioPack,id:string,t:number){return p.tradingStatus.find(s=>s.securityId===id&&ms(s.from)<=t&&t<ms(s.to))?.status;}
