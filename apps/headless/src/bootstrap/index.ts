import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { GameKernel } from "@3ker/game-core";
import { loadScenario, SqliteRunStore } from "@3ker/kernel-adapters";
export async function openKernel(options: {
  db: string;
  runId: string;
  scenario: string;
  create?: boolean;
  actorId?: string;
}): Promise<GameKernel> {
  mkdirSync(dirname(options.db), { recursive: true });
  const data = loadScenario(options.scenario),
    store = new SqliteRunStore(options.db);
  try {
    return options.create
      ? await GameKernel.create(
          { runId: options.runId, ownerActorId: options.actorId ?? "player" },
          data,
          store,
        )
      : await GameKernel.resume(options.runId, data, store);
  } catch (e) {
    await store.close();
    throw e;
  }
}
