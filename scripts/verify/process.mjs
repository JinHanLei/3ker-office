import { spawnSync } from "node:child_process";
export function runCommands(commands, options = { stdio: "inherit" }) {
  for (const args of commands) {
    const p = spawnSync(process.execPath, args, options);
    if (p.error || p.status !== 0) return p.status ?? 1;
  }
  return 0;
}
