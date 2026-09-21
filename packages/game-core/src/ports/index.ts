import type { RunState, ScenarioPack } from "@3ker/contracts";
export interface RunStore {
  load(runId: string): Promise<RunState | null>;
  commit(state: RunState, expectedVersion: number): Promise<void>;
  close(): Promise<void>;
}
export interface HistoricalData {
  readonly pack: ScenarioPack;
  readonly hash: string;
}
export interface Diagnostics {
  write(message: string): void;
}
