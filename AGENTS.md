# Project instructions

- Read docs/handoffs/CURRENT.md, then the active docs/tasks/Kxx.md and relevant rules.
- KERNEL_BUILD_TASK.md is the immutable task input. No legacy assets or plans.
- TypeScript strict; core has no I/O, wall clock, environment or unseeded randomness.
- Exact integer settlement, deterministic ordering, atomic persistence and PIT queries.
- Never represent synthetic data or test rules as verified history.
- Run pnpm verify before delivery. Network data verification is separate.
- Never commit runtime databases, credentials, raw third-party data or virtual environments.
