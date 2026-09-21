# 真实数据

真实包只发布到 `.runtime`，不提交许可未确认的原始数据。
执行 `pnpm data:probe -- --source baostock --start 2020-01-02 --end 2020-01-23`。
成功取数仍需规范化、覆盖验证和显式规则真实性标记。没有真实包时 real-data 命令必须失败。
