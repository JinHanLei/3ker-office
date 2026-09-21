import {KernelError,type RunState} from '@3ker/contracts';
import type {RunStore} from '@3ker/game-core/ports';
export class MemoryRunStore implements RunStore {
 private runs=new Map<string,RunState>();
 async load(runId:string):Promise<RunState|null>{return structuredClone(this.runs.get(runId)??null);}
 async commit(state:RunState,expected:number):Promise<void>{if((this.runs.get(state.runId)?.stateVersion??-1)!==expected)throw new KernelError('STATE_VERSION_CONFLICT');this.runs.set(state.runId,structuredClone(state));}
 async close():Promise<void>{}
}
