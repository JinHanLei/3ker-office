import { it, expect, vi } from "vitest";
import { Playback } from "./index.js";
import { GameKernel } from "../../../../packages/game-core/src/index.js";
import {
  loadScenario,
  MemoryRunStore,
} from "../../../../packages/kernel-adapters/src/index.js";
it("play and pause map wall seconds to explicit logical time", async () => {
  vi.useFakeTimers();
  const k = await GameKernel.create(
    { runId: "r", ownerActorId: "p" },
    loadScenario("scenarios/synthetic/kernel-smoke"),
    new MemoryRunStore(),
  );
  const start = k.exportSnapshot("p").gameTime;
  const p = new Playback(k);
  try {
    p.play(4);
    await vi.advanceTimersByTimeAsync(2000);
    expect(k.exportSnapshot("p").gameTime).toBe(start + 8000);
    p.pause();
    await vi.advanceTimersByTimeAsync(3000);
    expect(k.exportSnapshot("p").gameTime).toBe(start + 8000);
  } finally {
    p.pause();
    vi.useRealTimers();
  }
});
