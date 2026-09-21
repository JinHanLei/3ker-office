import { it, expect } from "vitest";
import { setup, buy, sell, cancel } from "../acceptance/helpers.js";
import { randomNext, isOpen } from "../../packages/game-core/src/index.js";
import { assertInvariants } from "../../packages/game-core/src/features/settlement/index.js";
it("generated command sequences maintain solvency no oversell monotonic events and deterministic replay", async () => {
  for (const seed of [3, 17, 99]) {
    const a = await setup((p) => (p.actions = [])),
      b = await setup((p) => (p.actions = []));
    const streams: Record<string, number> = {};
    let seq = 0;
    for (let i = 0; i < 50; i++) {
      const choice = Math.floor(randomNext(seed, streams, "test") * 4);
      if (choice === 0) {
        await a.stepNextEvent();
        await b.stepNextEvent();
      } else if (choice === 1) {
        const c = buy(
          "b" + i,
          randomNext(seed, streams, "size") > 0.5 ? "100" : "200",
        );
        expect(await a.execute(c)).toEqual(await b.execute(c));
      } else if (choice === 2) {
        const c = sell("s" + i);
        expect(await a.execute(c)).toEqual(await b.execute(c));
      } else {
        const open = a.exportSnapshot("p").orders.find(isOpen);
        if (open) {
          const c = cancel("c" + i, open.orderId);
          expect(await a.execute(c)).toEqual(await b.execute(c));
        }
      }
      const s = a.exportSnapshot("p");
      assertInvariants(s);
      expect(s.eventSeq).toBeGreaterThanOrEqual(seq);
      seq = s.eventSeq;
      expect(s).toEqual(b.exportSnapshot("p"));
      expect(s.accounts.a!.availableCashFen).toBeGreaterThanOrEqual(0n);
      expect(
        s.accounts.a!.lots.every((l) => l.quantity >= l.frozenQuantity),
      ).toBe(true);
    }
    await a.close();
    await b.close();
  }
});
