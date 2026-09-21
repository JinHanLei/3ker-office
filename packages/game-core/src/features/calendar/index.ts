import type {ScenarioPack} from '@3ker/contracts';
import {KernelError} from '@3ker/contracts';
import {ms,marketDate} from '../../foundation/index.js';
export function effectiveDay(p:ScenarioPack,t:number):string {const d=p.calendar.find(d=>t<ms(d.sessions.at(-1)!.close));if(!d)throw new KernelError('SCENARIO_COMPLETE');return d.date;}
export function sellableTime(p:ScenarioPack,t:number,delay:number):number {const idx=p.calendar.findIndex(d=>d.date===marketDate(t));const next=p.calendar[idx+delay];return next?ms(next.sessions[0]!.open):Number.MAX_SAFE_INTEGER;}
export function inSession(p:ScenarioPack,t:number):boolean{return p.calendar.some(d=>d.sessions.some(s=>ms(s.open)<=t&&t<ms(s.close)));}
export function expectedBoundaries(p:ScenarioPack):number[]{return p.calendar.flatMap(d=>d.sessions.flatMap(s=>{const a:number[]=[];for(let t=ms(s.open)+300000;t<=ms(s.close);t+=300000)a.push(t);return a;}));}
