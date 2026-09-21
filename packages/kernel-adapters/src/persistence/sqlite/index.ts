import Database from 'better-sqlite3';
import {createHash} from 'node:crypto';
import {KernelError,encodeState,decodeState,type RunState} from '@3ker/contracts';
import type {RunStore} from '@3ker/game-core/ports';
export type FaultPhase='beforeTransaction'|'afterRows'|'afterCommit';
export class SqliteRunStore implements RunStore {
 private readonly db:Database.Database;
 constructor(path:string,private readonly fault?:(phase:FaultPhase)=>void){
  this.db=new Database(path);this.db.pragma('journal_mode = WAL');this.db.pragma('busy_timeout = 5000');this.db.pragma('foreign_keys = ON');
  const version=this.db.pragma('user_version',{simple:true}) as number;if(version>1){this.db.close();throw new KernelError('SAVE_VERSION_UNSUPPORTED');}
  this.db.transaction(()=>{
   this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS runs(run_id TEXT PRIMARY KEY,state_version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS snapshots(run_id TEXT PRIMARY KEY REFERENCES runs(run_id),state_version INTEGER NOT NULL,payload TEXT NOT NULL,sha256 TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS command_receipts(run_id TEXT NOT NULL,command_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(run_id,command_id));
    CREATE TABLE IF NOT EXISTS events(run_id TEXT NOT NULL,event_seq INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(run_id,event_seq));
    CREATE TABLE IF NOT EXISTS ledger_entries(run_id TEXT NOT NULL,event_seq INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(run_id,event_seq));
    INSERT OR IGNORE INTO schema_migrations VALUES(1);PRAGMA user_version=1;`);
  })();
 }
 async load(runId:string):Promise<RunState|null>{
  const row=this.db.prepare('SELECT payload,sha256 FROM snapshots WHERE run_id=?').get(runId) as {payload:string;sha256:string}|undefined;if(!row)return null;
  if(createHash('sha256').update(row.payload).digest('hex')!==row.sha256)throw new Error('Corrupt snapshot checksum');
  const s=decodeState<RunState>(row.payload);if(s.runId!==runId||!Number.isSafeInteger(s.stateVersion)||!Array.isArray(s.events)||!s.accounts||!s.receipts)throw new Error('Invalid saved state');return s;
 }
 async commit(s:RunState,expected:number):Promise<void>{
  this.fault?.('beforeTransaction');
  this.db.transaction(()=>{
   const old=this.db.prepare('SELECT state_version FROM runs WHERE run_id=?').get(s.runId) as {state_version:number}|undefined;
   if((old?.state_version??-1)!==expected)throw new KernelError('STATE_VERSION_CONFLICT');
   if(s.stateVersion!==expected+1)throw new Error('Invalid next storage revision');
   this.db.prepare('INSERT INTO runs VALUES(?,?) ON CONFLICT(run_id) DO UPDATE SET state_version=excluded.state_version').run(s.runId,s.stateVersion);
   const payload=encodeState(s),hash=createHash('sha256').update(payload).digest('hex');this.db.prepare('INSERT INTO snapshots VALUES(?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET state_version=excluded.state_version,payload=excluded.payload,sha256=excluded.sha256').run(s.runId,s.stateVersion,payload,hash);
   const insertEvent=this.db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?)'),insertLedger=this.db.prepare('INSERT OR IGNORE INTO ledger_entries VALUES(?,?,?)'),insertReceipt=this.db.prepare('INSERT OR IGNORE INTO command_receipts VALUES(?,?,?)');
   for(const event of s.events)insertEvent.run(s.runId,event.eventSeq,encodeState(event));
   for(const entry of s.ledger)insertLedger.run(s.runId,entry.eventSeq,encodeState(entry));
   for(const [id,receipt] of Object.entries(s.receipts))insertReceipt.run(s.runId,id,encodeState(receipt));
   this.fault?.('afterRows');
  }).immediate();
  this.fault?.('afterCommit');
 }
 async close():Promise<void>{this.db.close();}
}
