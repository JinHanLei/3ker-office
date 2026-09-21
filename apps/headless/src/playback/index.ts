import type {GameKernel} from '@3ker/game-core';
export class Playback {
 private timer:ReturnType<typeof setInterval>|undefined;
 private busy=false;
 constructor(private readonly kernel:GameKernel,private readonly onError:(error:unknown)=>void=()=>{}){}
 play(speed=1):void{if(!Number.isFinite(speed)||speed<=0)throw Error('Invalid speed');this.pause();this.timer=setInterval(()=>{if(this.busy)return;this.busy=true;const {gameTime}=this.kernel.query({type:'status'}) as {gameTime:number};this.kernel.advanceTo(gameTime+1000*speed).then(r=>{if(!r.ok||r.code==='SCENARIO_COMPLETE')this.pause();}).catch(e=>{this.pause();this.onError(e);}).finally(()=>{this.busy=false;});},1000);}
 pause():void{if(this.timer)clearInterval(this.timer);this.timer=undefined;}
}
