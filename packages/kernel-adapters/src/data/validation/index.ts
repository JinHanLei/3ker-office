import type {ScenarioPack} from '@3ker/contracts';
export function validateScenario(p:ScenarioPack):void {
 const ts=Date.parse,keys=new Set<string>(),ids=new Set(p.securities.map(s=>s.securityId));
 if(ids.size!==p.securities.length)throw Error('Duplicate security');
 if(ts(p.manifest.start)>=ts(p.manifest.end))throw Error('Invalid coverage window');
 for(const b of p.bars){
  const key=`${b.securityId}:${ts(b.barStart)}`;if(keys.has(key))throw Error('Duplicate/conflicting bar');keys.add(key);
  if(!ids.has(b.securityId)||ts(b.barEnd)-ts(b.barStart)!==300000||ts(b.availableAt)!==ts(b.barEnd))throw Error('Invalid bar interval');
  if(!p.calendar.some(d=>d.sessions.some(s=>ts(s.open)<=ts(b.barStart)&&ts(b.barEnd)<=ts(s.close))))throw Error('Bar outside session');
  const [o,h,l,c]=[b.openUnits,b.highUnits,b.lowUnits,b.closeUnits].map(BigInt) as [bigint,bigint,bigint,bigint];
  if(l>o||l>c||h<o||h<c||l>h)throw Error('Invalid OHLC');
  const sec=p.securities.find(s=>s.securityId===b.securityId)!;
  const rule=p.rules.find(r=>r.board===sec.board&&ts(r.from)<=ts(b.barStart)&&ts(b.barStart)<ts(r.to));
  if(!rule)throw Error('Rule coverage missing');if([o,h,l,c].some(x=>x%BigInt(rule.priceTickUnits)!==0n))throw Error('Invalid price unit/tick');
 }
 for(let i=0;i<p.rules.length;i++){const r=p.rules[i]!;if(ts(r.from)>=ts(r.to)||BigInt(r.capacityNumerator)>BigInt(r.capacityDenominator))throw Error('Invalid rule');for(const q of p.rules.slice(i+1))if(r.board===q.board&&ts(r.from)<ts(q.to)&&ts(q.from)<ts(r.to))throw Error('Overlapping rules');}
 const actions=new Set<string>();for(const a of p.actions){if(actions.has(a.actionId))throw Error('Duplicate action');actions.add(a.actionId);if(!ids.has(a.securityId)||ts(a.recordAt)>ts(a.effectiveAt))throw Error('Invalid action');if(a.type==='DIVIDEND'&&(!a.payAt||!a.cashNumerator||!a.cashDenominator||ts(a.payAt)<ts(a.effectiveAt)))throw Error('Incomplete dividend');if(a.type==='SHARES'&&(!a.releaseAt||!a.shareNumerator||!a.shareDenominator||ts(a.releaseAt)<ts(a.effectiveAt)))throw Error('Incomplete share action');}
 for(const s of p.securities)if(s.lastTradableAt&&s.delistedAt&&ts(s.lastTradableAt)>=ts(s.delistedAt))throw Error('Invalid lifecycle');
 const ordered=p.calendar.flatMap(d=>d.sessions);for(let i=0;i<ordered.length;i++){const s=ordered[i]!;if(ts(s.open)>=ts(s.close)||(i>0&&ts(ordered[i-1]!.close)>=ts(s.open)))throw Error('Invalid calendar');}
}
