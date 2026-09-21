# 3ker-office

无界面、可重放的股票重生游戏内核。仅虚拟资金，无前端、真实券商、办公室、股吧模型或小游戏。

## 环境与验证

使用 Node **24.14.0** 和 pnpm **10.9.0**。其他依赖版本固定于 package.json 和唯一 pnpm-lock.yaml。首次安装 pnpm 可用 `npm install --global pnpm@10.9.0`。

```text
git clone https://github.com/JinHanLei/3ker-office.git
cd 3ker-office
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm verify
pnpm demo:headless
pnpm demo:recovery
pnpm cli --help
```

`verify` 全程离线：构建、架构检查、全部测试、两个真实 CLI 演示、验收映射报告。任何子步骤失败返回非零。安装依赖和 data:probe/fetch 才需要网络。SQLite 使用 better-sqlite3 12.4.1，安装脚本只批准它和 esbuild。

分组命令：`pnpm test:unit`、`pnpm test:integration`、`pnpm test:recovery`、`pnpm test:acceptance`。恢复/e2e 测试运行编译后的 JavaScript，因此单独执行它们前先 `pnpm build`。

## 手动操作

以下每条命令是独立进程，显式选择同一 runId 和 SQLite 文件。第一次 create 只执行一次；重开用 resume。

```text
pnpm cli -- --run my-run --db .runtime/manual.sqlite create 100000
pnpm cli -- --run my-run --db .runtime/manual.sqlite search
pnpm cli -- --run my-run --db .runtime/manual.sqlite watchlist add TEST_A
pnpm cli -- --run my-run --db .runtime/manual.sqlite buy TEST_A 100 12 --command-id first-buy
pnpm cli -- --run my-run --db .runtime/manual.sqlite advance 2020-01-02T09:35:00+08:00
pnpm cli -- --run my-run --db .runtime/manual.sqlite account
pnpm cli -- --run my-run --db .runtime/manual.sqlite save
pnpm cli -- --run my-run --db .runtime/manual.sqlite resume
pnpm cli -- --run my-run --db .runtime/manual.sqlite interactive
```

交互输入支持 `play 16`、`pause`、`step`、`advance <ISO>`、`orders`、`positions`、`cancel <orderId>`、`sell TEST_A 100 10`、`export .runtime/export`、`quit`。全局 `--json` 返回机器结果；买卖 CLI 价格单位元，核心 DTO 价格为万分之一元，现金为整数分。所有订单都等下一根完整 bar，查询/暂停不会按已看过的价格即时成交。

默认使用 **synthetic/kernel-smoke**。代码 TEST_*、价格、生命周期和税费均为合成测试，绝不代表真实历史行情。独立买卖基准最终 100,088.90 元；交易演示另含 50 元股息，玩家最终 100,138.90 元；分笔最低佣金总计 5 元。

每次演示写入新的 `.runtime/<execution-id>`。文件包括 summary.json、orders.json、trades.csv、account-snapshots.json、events.jsonl、ledger.jsonl、verification.json。恢复演示先运行不中断基准，再由两个独立进程完成保存退出和恢复；比较除存储修订号外全部领域状态 SHA-256。

## 真实数据是独立验收线

```text
python -m venv .venv-data
```

Windows：`.venv-data\Scripts\python.exe -m pip install -r scripts/data/requirements.txt`。
Linux/macOS：`.venv-data/bin/python -m pip install -r scripts/data/requirements.txt`。
本轮采集环境为 Python 3.8.5；锁文件含与其兼容的 NumPy/Pandas，使用其他 Python 版本需另外验证采集依赖。游戏和离线 verify 不依赖 Python。

```text
pnpm data:probe -- --source baostock --start 2020-01-02 --end 2020-01-23
pnpm data:probe -- --source free-stockdb
pnpm data:fetch -- --source baostock --config scripts/data/sample-config.json
pnpm data:normalize -- --input .runtime/data/baostock/BATCH --output .runtime/staging/VERSION
pnpm data:validate -- .runtime/staging/VERSION
pnpm data:publish -- --input .runtime/staging/VERSION --output .runtime/scenarios/VERSION
pnpm verify:data -- --scenario .runtime/scenarios/VERSION
pnpm demo:real-data -- --scenario .runtime/scenarios/VERSION
```

仓库已提供 `scripts/data/sample-config.json`，包含实际通过的五股。默认 probe 仍保留原始五股（含已发现精度冲突的 sh.600519），不会隐藏失败样本。

BaoStock **0.9.4** 已实际取得2020-01-02至23的5股、16交易日、3840根不复权5分钟数据，并完成真实交易和SQLite重开。当前本机包为 `.runtime/scenarios/baostock-five-v2`；另有两只后来退市股的分钟/日线探针。sh.600519精度冲突已隔离；真实公司行为公告审计G06仍BLOCKED，历史制度规则未完整验证，真实包明确标记 `rulesetKind=game-test`。free-stockdb无活动同步源，未取得长历史库。缺少真实包时命令非零退出，绝不回退合成包。来源使用与再分发权限为 UNCONFIRMED；数据原文及真实包均不提交Git。

## 实现与交接

四个 workspace 包：contracts（运行时 schema）、game-core（纯逻辑）、kernel-adapters（场景/SQLite）、headless（CLI）。采用整数现金、FIFO 批次、累计费用、共享 bar 容量、交易日 T+1、权益桥接、串行幂等写入和 SQLite CAS 事务。完整股票池以本地场景覆盖为边界。

见 [当前交接](docs/handoffs/CURRENT.md)、[验收结果](docs/verification/latest.md)、[公共 API](docs/architecture/public-api.md)、[数据阻塞](docs/data/blockers.md)。Windows 已本地运行；GitHub Actions 配置了 Windows/Linux，未据此宣称远端 CI 已通过。任务原文保留于 KERNEL_BUILD_TASK.md。
