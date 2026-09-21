import { runPython } from "./run-python.js";
const args = process.argv.slice(2).filter((x) => x !== "--");
const idx = args.indexOf("--source");
const source = idx < 0 ? "baostock" : args.splice(idx, 2)[1];
if (source === "free-stockdb") await import("./sources/free-stockdb/probe.js");
else if (source === "baostock")
  runPython("scripts/data/sources/baostock/collect.py", args);
else
  throw Error(
    `NOT_IMPLEMENTED source adapter: ${source}; see docs/data/sources.md`,
  );
