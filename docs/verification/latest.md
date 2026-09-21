# 本轮运行证据

本机 Windows，2026-09-21；Node 24.14.0、pnpm 10.9.0。官方 Node 放在忽略目录 `.runtime/tools`，本轮临时 PATH 选用；系统原 Node 22.11.0 未修改。原目录只有任务文件，无 Git 元数据，远端无引用。

## 实际结果

| 命令 | 退出码 | 证据 |
|---|---:|---|
| pnpm install --frozen-lockfile | 0 | 四包 workspace 和唯一锁文件 |
| node scripts/verify/sqlite-smoke.mjs | 0 | 打开、事务、大数文本、关闭和重开 |
| pnpm typecheck / pnpm build | 0 / 0 | 编译输出被实际 CLI 加载 |
| pnpm lint | 0 | 41个生产TS文件、依赖方向、核心I/O和功能环检查 |
| pnpm test:recovery | 0 | 8项，含新进程和3种故障 |
| pnpm verify | 0 | 最终16文件、51测试全部通过，无skip；两个离线演示通过 |
| pnpm demo:headless / demo:recovery | 0 / 0 | 下方输出 |
| pnpm cli --help | 0 | 编译CLI帮助，另有多进程命令测试 |
| BaoStock 0.8.9 probe | 2 | 原始登录错误保留 |
| BaoStock 0.9.4 fetch（替代五股） | 0 | 33请求，28个复用文件，再次整批命中缓存 |
| 初始五股 normalize | 1 | 茅台0.0001元精度冲突被隔离 |
| 替代五股 normalize / validate / publish / verify:data | 全部0 | 5股16日3840根，真实行情、测试规则 |
| demo:real-data | 0 | 同API买入并SQLite关闭重开 |
| free-stockdb probe | 2 | 无实际同步源，无长历史库 |

## 验收分组

| 组 | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED |
|---|---:|---:|---:|---:|
| 内核 A–F，60项 | 60 | 0 | 0 | 0 |
| 数据 G，10项 | 9 | 0 | 1 | 0 |

G06取得并映射了真实分红候选，未完成公告/实施审计，不能算PASS。CNEquity/AKShare备用适配器未实现，不伪装网络失败；首选BaoStock已经成功。一个测试可用独立断言覆盖多个编号，不把51测试伪称70测试。

机器报告 `.runtime/verify-tests.json`、`.runtime/acceptance-report.json`；逐项映射 `tests/acceptance/cases.json`。重复verify生成新的演示目录。

## 两个离线演示实际输出

```text
无界面演示：PASS（合成行情 / 游戏测试规则）
账户数：3；成交数：4
当日卖出：INSUFFICIENT_SELLABLE_QUANTITY；撤单：成功
玩家最终现金：100138.90 元（交易净收益 88.90 + 登记股息 50.00）
测试账户股息：500.00 元
输出目录：.runtime/headless-216c5e78-300f-4c15-bcb8-bf5c1df2631c
```

```text
baseline pid=12540 SHA-256=345585c9c4cd7d48bdbde9fef350aa9a60cb3e8245851b778370ee7844e2da64
first pid=9896 SHA-256=d9b5ebf070a1110b2000b26b27a336e3c5a30ef05555d7eaa7dbac7bacc1212e
resume pid=12044 SHA-256=345585c9c4cd7d48bdbde9fef350aa9a60cb3e8245851b778370ee7844e2da64
恢复演示：PASS；真实进程退出并重开；旧指令重试无重复
输出目录：.runtime/recovery-1144be14-86bb-4d36-9e1c-ed5f80851ab2
```

导出含 summary/orders/trades/account-snapshots/events/ledger/verification。e2e逐凭证检查余额连续并与账户快照对账。

## 独立基准

纯买卖最终现金 **10008890分**、净收益8890分、股份0。200股分两次成交，佣金合计500分（第一次500、第二次0）。1000股每股0.50元股息：1000000分市值 → 950000分市值+50000分应收 → 950000分市值+50000分现金，未重复计价。送转1000→2000股，总成本守恒，上市可卖不重复增发。

真实演示输出 `.runtime/real-8fdac9d9-33ca-436b-9c05-2b56c521671b`。原始manifest SHA-256：dbb24bc55622885990fe2f6362359dbebe4b702baa64e025fecfd4775a0ac61d；发布包hash：05d23e4f12f295c416587257ad4ca8f28eaa0a8af4ec536159a9410678ff4a91。未宣称全功能真实历史验证。

GitHub Actions已配置Windows/Linux，未观察远端结果，不记为CI通过。最终推送和提交以任务最终回复为准。
