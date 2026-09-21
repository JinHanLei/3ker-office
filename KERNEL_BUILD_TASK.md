# 3ker-office｜从零构建游戏内核与免费数据接入 v1.1

> **目标仓库：`https://github.com/JinHanLei/3ker-office`**  
> **任务：从零实现无界面、可测试、可保存恢复的股票重生游戏内核，并实际尝试获取免费历史小样本。**
> **v1.1：把具体数据来源、采集示例、字段映射、历史股票池和取数验收合并进正文。单独使用本文件即可，不依赖v1.0或其他旧文档。**  
> 本文件包含本轮全部产品背景、实现范围、目录、默认规则、测试和交付要求。无需旧聊天、旧代码、旧图片、旧计划或其他附件。文中要求创建的文件，都是本轮要生成的产物，不是已有前提。

---

## 0. 你要完成的工作

你是本项目的内核工程师。请直接在指定仓库中实现代码，不要只返回建议、架构图、伪代码或一个空目录树。

最终必须能在终端中完成：

```text
创建游戏存档
→ 读取一个明确标记来源的行情场景
→ 展示当时存在的股票
→ 加入自选
→ 提交买单
→ 时间自动推进到允许成交的时刻
→ 成交、记账、查询持仓
→ 测试可卖限制和撤单
→ 跨交易日卖出
→ 处理分红等事件
→ 保存退出
→ 在新进程中恢复并继续
```

本轮不做前端、美术、完整股吧或语言模型。不要求先收集二十年的全市场数据，但必须按第11节实现免费取数脚本并实际尝试下载真实小样本；不能只留CSV入口让用户自己寻找数据。先交付正确内核与可追溯数据链。

**执行方式**：简短列出实施顺序后开始工作，按 K00–K10 分步实现并验证。每步更新进度，不需要每完成一个小步骤都等待用户批准。遇到真正的权限问题、无法解决的依赖阻塞或会改变已定玩法的歧义时，给出具体阻塞，不自行编造结果。

## 1. 仓库与 Git，从空白开始

### 1.1 唯一目标

```text
GitHub repository : JinHanLei/3ker-office
Clone URL         : https://github.com/JinHanLei/3ker-office.git
Preferred branch  : main
Implementation    : feat/kernel-foundation
```

不要另建一个名为 `3ker-rebirth` 的远端仓库，不要在仓库内嵌套另一个 Git 项目，不从 Git 历史恢复用户已经删除的内容。

开始前先检查实际环境：

```sh
git rev-parse --show-toplevel
git remote -v
git status --short
git branch --show-current
git rev-parse --verify HEAD
```

空仓库最后一个命令可能失败，这是需要处理的初始化状态，不是要求用户提供旧提交。

- 已在目标仓库的本地克隆中：直接使用，不再重复 clone。
- 还没有克隆：只在合适的空父目录执行 `git clone`，然后进入 `3ker-office`。
- 同名目录已存在：先查看，不删除、不覆盖、不清理未知内容。
- 远端或本地在本轮开始时已经有文件：保护文件；只对真实冲突进行协调。不要因为本任务称“从零”就清空它们。
- 不因其他历史文档不存在而停下；本文件就是完整输入。

### 1.2 空仓库提交策略

如果没有任何提交，先在 `main` 上创建只含项目简介、安全忽略规则和简短项目指令的本地初始化提交，再创建 `feat/kernel-foundation` 开发分支。这样后续存在一个清晰基线。

如果环境已经提供工作分支，则沿用该分支并记录，不擅自切掉平台管理的工作区。

Git 身份沿用用户配置；没有姓名或邮箱时不编造、不修改全局配置。身份缺失只阻塞提交，不妨碍在授权工作目录中实现和测试。必须如实报告未提交状态。

每个 K 阶段形成一个语义完整的本地提交。默认不自动 push、不合并远端 `main`、不公开发布包；用户明确授权后再执行远端写操作。

禁止 `reset --hard`、`clean -fd`、强推或删除未知文件来获得所谓干净环境。不要提交凭据、真实用户存档、大型历史数据和私有测试材料。

---

## 2. 游戏背景：让内核知道将来服务什么

### 2.1 核心玩法

这是一款“带着今天的记忆回到过去”的投资人生游戏。玩家在真实历史中的某一天开始，以虚拟资金交易当时存在的 A 股，经营一家逐格扩建的公司，主动招募研究员，观察一个每周目不同的模拟股吧社会。

**历史行情固定，玩家和 NPC 的人生可以不同。** 玩家允许利用自己记得的历史，但程序控制的 NPC 和未来的研究助手不能读取未到来的行情与资讯。

### 2.2 已确定的产品边界

| 主题 | 必须保留的规则 |
|---|---|
| 市场 | 使用真实历史分钟数据作为正式回放目标，不让玩家或 NPC 改写历史行情 |
| 当前开发数据 | 可以用明确标记的合成场景测试内核；不能声称它是真实历史 |
| 起始年 | 不预设 1999 或 2000 已有可靠免费数据，日期由未来实际数据覆盖决定 |
| 时间 | 市场按日历自动开收盘；玩家可暂停、加速或跳事件，不需要点击“开盘” |
| 证券池 | 在历史时点上市且仍在场内的证券，包括后来退市的证券；不能倒用今天的名单 |
| 退市 | 不继续模拟三板；保留历史账本，剩余权益按明确的游戏简化政策处理 |
| 交易 | T+1、停复牌、基本涨跌幅与费用规则；不做逐笔盘口和真实排队重建 |
| 财富 | 生活与投资资金无损互通，只有统一人民币虚拟资金体系；冻结资金仍不可消费 |
| 研究员 | 玩家主动建设、招募，设施和员工启用对应能力；不是开局自动全员研究 |
| 股吧 | 未来直接展示 NPC 模拟账户的持仓、收益、调仓；不靠解析帖子“猜对几次”计分 |
| 主角 | 负债者、上班族、小老板，每个存档一个开局；本轮仅保留配置入口，不做职业系统 |
| 长期经营 | 装修、宠物、收藏拍卖、德扑、煎饼保底等将来接入同一结算系统 |
| 终局 | 未来从历史追到最新可用现实数据，进入 LIVE；始终是虚拟账户，不接真实交易 |

以上是后续扩展背景。**本轮没有实现完整经营、社会或 LIVE 的授权。**

### 2.3 本轮应实现 / 不实现

**必须实现**：工程启动、免费数据探针与小样本采集、精确数值、时间与交易日历、版本化场景、PIT 证券查询、自选、多账户、钱包、订单、离散撮合、费用、持仓批次、基础公司行为、估值、存档、幂等、重放、CLI、自动化验收。

**暂不实现**：React、PixiJS、Electron、HTTP 服务、登录支付、管理后台、部署云服务、实际券商交易、爬全网、完整 NPC 社会、研究员模型、宠物动画、德扑、古董、煎饼、固定办公室布局。

多账户是复用内核的测试能力，不是本轮顺手写一个完整 NPC 策略平台。

---

## 3. 技术选择与复杂度上限

本轮采用：

- TypeScript，开启严格类型检查。
- Node.js 的受支持 LTS 版本；优先使用 24.x，在 K00 记录实际版本和依赖兼容性。
- pnpm workspace，整个仓库只保留一个 pnpm 锁文件，内部依赖使用 `workspace:*`。
- Vitest 测试；使用一个明确的运行时输入校验方案，默认 Zod。
- SQLite 持久化，默认在 adapter 内使用 `better-sqlite3`；先运行一次打开、事务、关闭和重开测试。
- 开发入口可使用 `tsx`，正式 `build` 要产出可由 Node 运行的 JavaScript，不只让开发解释器工作。
- GitHub Actions 提供 Windows 和 Linux 的离线验证配置；没实际跑过远端 CI 就不能写成 CI 已通过。
- Python只用于`scripts/data`离线采集；独立`.venv-data`与锁定的requirements，不作为游戏运行时。

所有工具在 K00 选择互相兼容的明确版本，写入配置和锁文件，不使用随执行漂移的 `latest` 作为验收依据。SQLite 驱动的安装脚本只批准需要的依赖，不全局关闭供应链或沙箱限制。

若默认驱动确实不兼容，先记录已尝试方法，再以单一适配器替换；不能把 SQLite 持久化悄悄降级为内存 Map 后宣布完成。

**不要引入**：微服务、Kafka、Redis、Kubernetes、通用插件市场、多个 ORM、完整事件平台、自动交易 SDK、模型运行时、第二套包管理器。

本轮目标是一个单进程模块化内核，不是分布式金融基础设施。

---

## 4. 目录结构：功能细分，部署不拆碎

顶层只有四个 workspace 包：`apps/headless`、`packages/contracts`、`packages/game-core`、`packages/kernel-adapters`。业务功能使用独立目录，不要求每个功能有自己的 npm 包。

```text
3ker-office/
├── KERNEL_BUILD_TASK.md              本文件，原样保留为任务输入
├── AGENTS.md                         你创建的简短项目指令和文档索引
├── README.md                         从安装到演示的实际运行说明
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── .gitattributes
├── .editorconfig
├── .env.example                     仅无敏感值的配置样例
├── .github/workflows/verify.yml
│
├── apps/headless/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts                  CLI入口
│       ├── bootstrap/               组装数据、内核、存档
│       ├── commands/                CLI子命令到内核API的映射
│       ├── playback/                墙上时间到模拟推进的驱动
│       ├── demos/                   确定性演示脚本
│       └── output/                  中文终端、JSON、CSV输出
│
├── packages/contracts/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── primitives/              时间、ID、金额/价格的传输格式
│       ├── commands/                判别联合与输入校验
│       ├── events/                  已发生事实的结构
│       ├── views/                   前端和NPC未来可读的快照
│       ├── scenarios/               数据包schema
│       └── saves/                   持久化版本/快照格式
│
├── packages/game-core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── foundation/
│       │   ├── money/               定点金额与舍入
│       │   ├── price/               行情价格精度
│       │   ├── quantity/            股数、比例与整手操作
│       │   ├── time/                显式时间转换和比较
│       │   ├── ids/                 确定性序号
│       │   ├── random/              独立随机流
│       │   ├── serialization/       稳定序列化、BigInt编码
│       │   └── result/              错误码与Result
│       ├── ports/
│       │   ├── historical-data/     受时间约束的数据读取接口
│       │   ├── run-store/           原子提交与加载接口
│       │   └── diagnostics/         非业务日志接口
│       ├── features/
│       │   ├── runs/                建档、运行状态、数据版本绑定
│       │   ├── calendar/            交易日与会话
│       │   ├── clock/               游戏游标
│       │   ├── scheduler/           有序事件调度
│       │   ├── securities/          历史身份、名称和上市生命周期
│       │   ├── market-data/         已公开行情、缺失与水位
│       │   ├── market-rules/        生效区间、交易单位和权限
│       │   ├── watchlists/          增删自选
│       │   ├── accounts/            玩家/NPC账户身份
│       │   ├── wallet/              可用现金、冻结和转移
│       │   ├── ledger/              经济变更凭证和对账
│       │   ├── positions/           持仓批次、成本、冻结可卖量
│       │   ├── orders/              订单验证和生命周期
│       │   ├── execution/           撮合规则与成交提案
│       │   ├── fees/                佣金和费用计算
│       │   ├── settlement/          统一经济变更协调
│       │   ├── corporate-actions/
│       │   │   ├── dividends/       登记、除息权益、派息
│       │   │   ├── share-changes/   送转权益与上市可卖
│       │   │   └── exits/           最后交易、退市简化处理
│       │   └── valuation/           市值、应收、权益、盈亏
│       └── application/
│           ├── kernel/              唯一公共调用入口
│           ├── command-bus/         验证、幂等和提交顺序
│           ├── event-processing/    相同时点的处理阶段
│           ├── queries/             有权限/时间边界的只读查询
│           ├── checkpoints/         快照
│           └── replay/              恢复及重放
│
├── packages/kernel-adapters/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── data/
│       │   ├── scenario-files/      本地JSON/CSV读取
│       │   ├── normalization/       单位和时间标准化
│       │   └── validation/          校验与覆盖报告
│       ├── persistence/
│       │   ├── memory/              快速单元测试适配器
│       │   └── sqlite/              实际保存、迁移、事务
│       └── diagnostics/             文件与终端日志
│
├── scenarios/
│   ├── synthetic/kernel-smoke/      小场景；明确非真实行情
│   ├── synthetic/corporate-actions/
│   ├── synthetic/edge-cases/
│   └── real/README.md               真实样本导入说明，不放假历史
├── rules/
│   ├── synthetic-basic-v1.json      测试专用，不冒充真实历年法规
│   └── README.md
├── tests/
│   ├── integration/
│   ├── properties/
│   ├── recovery/
│   ├── e2e/
│   └── acceptance/
│       ├── cases.json               验收编号与实际测试映射
│       └── expected/                独立手算基准
├── scripts/
│   ├── verify/                     跨平台验证编排
│   ├── architecture/               依赖方向和越界检查
│   ├── data/                       免费来源探针/采集/规范化/质量检查，子目录见11.8
│   └── reports/                    生成验收报告
├── docs/
│   ├── product/overview.md          从本文摘取，不引用旧蓝图
│   ├── architecture/               边界、状态、流程
│   ├── rules/                      撮合、账本、时间、公司行为
│   ├── decisions/                  本轮新ADR
│   ├── data/                       单位、来源、覆盖
│   ├── tasks/                      K00–K10逐项进度
│   ├── handoffs/                   当前进度与下一步
│   └── verification/               小型结果摘要
└── .runtime/                       DB、日志、演示输出；Git忽略
```

### 4.1 一个功能目录的内部约定

按实际复杂度使用这些文件；不要为凑齐模板创建空实现：

```text
orders/
├── index.ts               仅暴露本模块稳定入口
├── types.ts               内部类型
├── state.ts               可序列化状态
├── policy.ts              验证和规则
├── handlers.ts            操作到变更提案
├── selectors.ts           只读查询
├── README.md              职责、允许依赖、关键不变量
└── __tests__/
    ├── submit.test.ts
    ├── cancel.test.ts
    └── lifecycle.test.ts
```

简单功能可以只有 `index.ts`、一个实现和测试。不要把几十行代码拆成二十个文件，也不要把复杂功能全放进 `index.ts`。

### 4.2 强制依赖方向

```text
headless → kernel-adapters + game-core + contracts
kernel-adapters → game-core/ports + contracts
game-core → contracts
contracts → 输入校验库（如需要），不依赖另外三个包
```

`game-core` 不导入 `fs`、数据库驱动、HTTP、Electron、React、PixiJS；不自行读取环境变量；不使用 `Date.now()`、`Math.random()`、真实计时器决定业务结果。显式输入时间、带种子的随机流和注入的只读端口可以使用。

功能模块不越过公共入口深层 import，不反向依赖 `application`。跨功能操作由 application/settlement 组织，不通过相互调用形成环。

`ledger`、`wallet`、`positions` 职责分开，但不各自建一个权威数据源。数据库只保存一次原子提交后的整体状态与凭证。

---

## 5. 先写清楚的共享契约

### 5.1 身份与版本

至少具有：

```text
runId / accountId / actorId
securityId / orderId / tradeId / actionId
commandId / eventSeq / stateVersion
scenarioId / scenarioVersion / scenarioHash
ruleVersion / saveSchemaVersion / engineVersion
```

同一存档一个串行写入队列。可读快照是只读副本，不能把内部可变 Map 直接交给调用者。

### 5.2 时间

传输使用带显式时区的 ISO 字符串；内核使用经校验的整数 UTC 毫秒和事件序号。市场会话使用 `Asia/Shanghai` 解释。禁止依赖运行电脑的本地时区。

每根 5 分钟 bar 必须有：

```text
barStart
barEnd
availableAt
```

默认是起点包含、终点不包含的采样区间，数据适配器必须说明上游的时间标签和边界处理。bar 的完整 OHLCV 在 `availableAt` 才能进入可见视图；首版统一 `availableAt = barEnd`。

有延迟的数据必须先按新的规则归一化并明确测试，不在本轮悄悄容纳不同边界语义。

### 5.3 精确金额和股数

明确默认：

- 账户现金：整数分，内核使用 `bigint`。
- 证券价格：每元 10,000 个整数价格单位，内核使用 `bigint`；最小变动单位由规则定义。
- 股数：整数 `bigint`；不支持通过小数股规避整手规则。
- 分红每股金额：允许细于分的明确尺度或整数比，先计算总额再按规则舍入。
- 比率：整数分子/分母或固定精度整数，不用浮点百分比结算费用。
- 传输、JSON 和 SQLite：整数值编码为十进制字符串，明确字段名和单位。

例如每股 10 元可表示为 `priceUnits = "100000"`；100,000 元现金可表示为 `cashFen = "10000000"`。这些字段不能混用。

禁止直接 `parseFloat` 后用普通浮点连续累加资金。统计图表可转换为浮点显示，但显示结果不能反向记账。估值舍入、成交金额舍入、费用舍入分别集中定义。

### 5.4 指令与事件

指令表示请求，例如：

```text
SubmitOrder / CancelOrder / AddWatchlist / RemoveWatchlist
TransferCash / CreateAccount
```

事件表示已发生事实，例如：

```text
OrderAccepted / OrderRejected / OrderPartiallyFilled / OrderFilled
OrderCancelled / OrderExpired
DividendEntitled / DividendPaid
SharesPending / SharesReleased
SecurityExited / CashTransferred
```

所有有副作用的指令含 `runId + commandId`，去重键按存档唯一。

- 同 ID、同语义 payload 重试：返回原始 receipt，不重复执行。
- 同 ID、不同 payload：返回 `IDEMPOTENCY_CONFLICT`。
- 幂等 receipt、拒绝结果、经济变更与相关状态在一次提交中落盘。
- 未完成持久化不能先回报成功；持久化失败后的重试不能产生“半笔交易”。

游戏时间由内核在接收指令时赋值。调用方不能倒填一个过去时间，用已知未来结果追溯下单。测试脚本可按计划推进时间再提交指令，不直接改写接受时间。

---

## 6. 时间调度与行情可见性

### 6.1 逻辑时钟，不是现实睡眠

内核暴露确定性的 `advanceTo(targetTime)` / `stepNextEvent()`。执行时不等待真实 5 分钟。

`apps/headless/playback` 才负责用真实计时器映射 1×、4×、16× 等速度。测试对逻辑时钟直接推进；对播放驱动使用假计时器。

`advanceTo` 在两个事件之间可以移动游标，但必须先顺序处理所有 `<= targetTime` 的必要事件。跳一天不允许遗漏分红、T+1 释放、订单到期或公司退出。

暂停只停止外层自动推进。暂停期间可以读数据和提交指令，但不能使用旧价立即成交；成交仍等后续合法撮合边界。

### 6.2 同一时刻的稳定处理顺序

先写入 `docs/rules/event-ordering.md`，实现以下默认顺序：

1. 会话边界前置事项、当日可卖资格释放、该时刻生效的公司行为。
2. 发布该时刻刚完成且已可用的 bar，更新市场观察视图。
3. 只对在该 bar 开始前或开始边界已接受的旧订单尝试撮合。
4. 原子提交订单、资金、股份、费用；更新估值。
5. 若为收盘：处理有效日到期、登记日权益快照；最后可交易日清理待交易状态。
6. 提交本时间批次并发布已提交事件；之后才能接收基于新视图产生的新指令。

同一个时间点不能因为先打开账户A、后打开账户B而改撮合顺序。并列顺序以已持久化的命令序号、订单序号等稳定键定义。

### 6.3 数据缺失与末尾

区分：

```text
正常非交易时段
已知停牌
已知零成交bar
真正缺失的bar
场景数据结束
```

不得把缺失数据补成一条可成交的平价 bar。对本轮固定证券池，缺失关键行情就停在最后一致状态并返回 `DATA_PENDING` 或明确覆盖错误。

到场景末尾进入 `SCENARIO_COMPLETE`。不能因为系统日期更晚就生成行情或自动当成 LIVE。

本轮的“下一事件”只看系统已经安排的事件时间；不先扫描未来全段涨幅，再停在对玩家最有利的时刻。

---

## 7. 历史股票池和市场规则

### 7.1 证券身份

证券使用稳定 `securityId`，代码和名称使用有效区间表示。上市公司、证券、代码不是可以随意互换的身份。名称历史变化不创建一份新持仓。

必须分开：

- `listedAt`：何时开始上市。
- `lastTradableAt`：最后允许场内交易的时刻。
- `delistedAt`：上市资格结束的时刻。
- `knownAt`：相关历史事实何时能向玩家公开。

内部模拟器可以保存将来会退市的日期，但过去的查询不能返回这类尚未公开事实。

### 7.2 三类查询

- Listed：当前仍在上市生命周期内。
- Searchable：当前正常证券搜索范围；停牌仍可见，尚未上市和退出后的证券不在普通池。
- Tradable：再检查会话、最后可交易时刻、停牌、权限、数据是否齐备。

返回不能交易的明确原因。涨停不代表所有方向一律不可下单，方向限制放在订单/成交政策中。

退市后仅玩家自己的历史交易和归档可查询，不继续新增三板市场。

### 7.3 历史规则表

规则按市场、板块、证券状态和生效区间选择，至少表达：

```text
priceTick / quantityStep / minimumBuyQuantity
oddLotSellPolicy / sellableDelayTradingDays
upperLimit / lowerLimit 或可验证的计算输入
feePolicy / boardPermission / tradingSessions
```

**不要把“10% / 20% / 100股”等当前常见数值写成所有年份、所有板块通用常量。** 本轮先用明确的合成规则验证引擎；正式历史规则需要来源和覆盖日期。

板块权限测试同时验证“市场尚不存在”和“市场存在但账户未获得权限”。本轮用合成资产/经验门槛证明能力，不宣称已经完整复刻所有真实开户规定。

没有明确规则的正式历史样本标为规则覆盖不足，不能静默套测试规则。

---

## 8. 钱包、持仓、订单与成交

### 8.1 一个钱包，不是两个不可兑换币种

每个账户至少有：

```text
availableCash / frozenCash
positions / openOrders
receivables / pendingShareEntitlements
```

`TransferCash` 是已存在虚拟账户之间的原子资金转移，不是凭空增加现金。转移没有游戏惩罚费，但不能转走已冻结资金。

初始化本金通过一次性的初始资金事件注入，标记为外部现金流，不计入证券盈利。未来工资、煎饼收入、装修支出也通过不同经济原因类型接入；本轮不暴露给普通玩家任意加钱的接口。

### 8.2 持仓批次

按 lot 保存取得时刻、成本、数量、可卖生效交易日和卖出冻结量。T+1 使用交易日历，不是自然日加 24 小时。

本轮卖出批次采用 FIFO，明写为成本归集和资格处理默认政策。部分卖出成本用整数规则分配，最后一份吸收残差，保证成本总额守恒。

允许卖出以前已可卖的持仓，不等于当天买入的新股份也可卖。两个并存卖单不能重复冻结同一份可卖数量。

### 8.3 首版订单类型

仅实现带保护价格的离散市价意图单：

```text
side = BUY | SELL
quantity = 整数股数
BUY 必须有 maxExecutionPrice
SELL 可有 minExecutionPrice
有效期 = DAY
```

保护价格是资金预留/执行上限，不是假设在 bar 内触到该价格就成交的限价挂单。其他订单类型明确返回不支持，不写假实现。

- 买入按数量、保护价和最坏费用冻结现金。
- 卖出按可卖批次冻结股份。
- 没有足够现金或可卖股份：拒绝，无部分副作用。
- 盘后下单：有效交易日是下一开放会话日；盘中下单：当前交易日。
- 有效交易日收盘最后一次合法撮合后，剩余订单到期并释放冻结。
- 缺数据时暂停，不能通过跳过数据将订单随意到期。

### 8.4 撮合默认政策 `next-complete-bar-close-v1`

这是**本轮明确采用、未来可替换的游戏规则**，不是现实市价单精确重放。

```text
订单在 10:00 的事件批次完成后被接受
→ 不能用刚看完的 09:55–10:00 bar 成交
→ 10:00–10:05 bar 完成并可用后
→ 才按该 bar 的真实 Close 尝试成交
```

资格条件：`barStart >= order.acceptedAt`，并且 bar 属于该订单有效交易日。10:02 提交的指令不能使用 10:00–10:05 这根已开始的 bar；下一根完整候选是 10:05–10:10。

撮合前价格、成交量、资格和保护价格全部已满足，才生成 FillProposal。未来H/L/C不提前进入任何用户/NPC读视图。

成交价默认就是候选 bar 的 Close，不添加臆造分时的最优价。本轮不加入额外滑点模型；用容量约束和保护价提供基本限制。未来滑点如加入，必须有版本化政策和独立测试。

### 8.5 简化涨跌停与容量

明确以下为游戏保守规则：

- 已知停牌、非会话、bar.volume 为零：不成交。
- 若整根 bar 满足 `O = H = L = C = upperLimit`：该 bar 不撮合买入。
- 若整根 bar 满足 `O = H = L = C = lowerLimit`：该 bar 不撮合卖出。
- 其余状态按本轮离散价格与保护价处理；不声称从 OHLCV 得知真实封单与队列。
- 每根 bar 只允许配置比例的量用于本游戏模拟账户成交，测试默认可设 5%。
- 容量按可用交易单位取整，不允许不同账户各自重复使用完整容量。
- 同一存档的所有玩家/NPC订单共享该 bar 容量，按接受序号排队；不同存档不竞争。
- 超出容量部分留下等待，直到有效日结束。成交不了必须有原因，不偷偷给满仓。

这不改变公共历史成交量，也不把私人模拟成交叠加回原历史。

### 8.6 费用不能在部分成交时重复收最低佣金

测试政策中同一个订单的佣金根据累计成交额计算：

```text
F(0) = 0
F(x > 0) = max(最低佣金, 按累计成交额计算的佣金)
本次佣金 = F(本次后累计成交额) - F(本次前累计成交额)
```

卖出印花税等也定义清楚按何种基数和何时舍入，避免按每次微小成交重复舍入产生偏差。真实样本的实际费率另载入经核验的规则文件。

撤单无成交时不收费。部分成交后撤单，只保留已发生的费用。

极小卖出额可能不足覆盖费用：提案阶段同时验证可用现金能否补足费用差额；不能因为“卖出总会增加现金”的假设造成负现金。无法补足则拒绝本次成交并给出明确原因，持仓不变。

每次成交后重新计算剩余最大资金需求，释放已经不再需要的买入冻结，剩余冻结必须覆盖后续保护价和累计费用差额。

### 8.7 原子结算

只有 application/settlement 能协调一笔完整经济变更。模块可以计算提案和纯状态变换，但不分别持久化、不分别对外确认。

一笔买卖提交至少包括：

```text
现金可用额/冻结额变化
持仓与成本变化
订单数量和状态变化
成交与费用记录
经济凭证
指令receipt与事件序号
新的stateVersion
```

先在隔离草稿上校验所有不变量，再原子提交。失败不能出现“现金扣了但股份没到”。提交成功后才通知输出层；输出层出错不能改变已经提交的事实。

`LedgerEntry` 至少含原因、关联订单/成交/action、账户、前后变更、时间、序号。它是可对账凭证，不要求首版实现企业总账和所有会计报表。

---

## 9. 公司行为、退市和估值

### 9.1 现金分红

必须区分：公告可知时刻、登记日收盘、除息生效、现金到账。

1. 登记日收盘撮合结束后，根据实际股份记录 entitlement，先不把股息作为新增可用现金。
2. 除息生效时将已确认股息列入应收权益，避免原始价格除息造成虚假的全部损失。
3. 到派息时间，应收减少、现金增加；同一 `actionId + accountId` 只发一次。
4. 登记日后卖出不丢失已锁定的权益；登记日前卖出不再获得对应权益。
5. 使用原始不复权行情，不人为重复扣减股价。

本轮合成规则按毛股息测试，不宣称已实现历年红利税制。正式数据的税制需求记录为规则覆盖项。

### 9.2 送股和转增

登记时锁定应得数量，除权生效时计入待上市股份权益，到指定可卖日释放。原已持股份和新股权益只计算一次。

无新增现金对价时总取得成本不凭空增加，按确定规则重分单位成本。测试覆盖总权益和成本守恒。

本轮主测试使用可整除数量。涉及零碎股时，必须使用场景显式提供的尾数处理政策；真实样本缺少该政策就报告不支持，不随意丢弃股份或生成现金。

### 9.3 配股、换股、现金收购

本轮不完整实现这些流程，但必须识别类型。

不能把未知公司行为当空事件吞掉；遇到会影响持仓价值的未支持动作，返回 `UNSUPPORTED_CORPORATE_ACTION`，在生效前的安全边界停止相关场景的推进并报告缺口。

尤其不能把现金收购或换股退出直接送入普通归零退市分支。

### 9.4 退市简化政策

区分最后可交易时刻与正式退出时刻。最后交易结束后撤销剩余相关订单，释放冻结；退出普通行情/自选交易池，但保留历史交易与归档。

本轮合成场景使用明确标记的 `game-writeoff-v1`：无另外对价的普通终止场内场景，把残余股份转入归档、流动估值记为零，并记录游戏核销损失。**这不是在声称现实退市股票必然法律价值为零。**

正式场景必须明确退出政策；缺少退出类型就拒绝把它默认当普通核销。退市前已经确认的现金应收不能被无声删除；可以按已确认到期事件结清，不开新三板或清算模拟市场。

### 9.5 估值与收益

展示：可用现金、冻结现金、证券市值、应收股息、待上市股份权益、账户总权益、已实现和未实现证券损益。

停牌但有上次可靠价格时可用最后标记价估值，并注明 `stale`；估值不意味着可成交。缺少合理价格且没有估值政策时标记未知，不能用 0 或未来价格掩盖。

资金转入、初始本金不是交易盈利；转出不是证券亏损。本轮至少提供现金流分类和不混入资金转移的损益统计。完整股吧年化排名与风险指标在后续实现，不写一个错误的 `(余额/本金)-1` 充数。

---

## 10. 存档、恢复、确定性

### 10.1 统一持久化端口

同一个 `RunStore` 接口实现 Memory 与 SQLite 两个适配器，运行同一组契约测试。正式演示必须使用 SQLite，不只在内存适配器通过。

SQLite 首版可采用“版本化整体快照 + 增量事件/命令回执”。当前场景很小，不必把每个领域对象都拆一张 SQL 表。

建议表：

```text
schema_migrations
runs
snapshots
command_receipts
events
ledger_entries
```

跨表写入须处于一个事务。使用预期 `stateVersion` 校验，过期写入返回冲突；不允许两个进程同时装载同一旧状态并互相覆盖。

### 10.2 保存内容

```text
runId、场景/规则/保存格式版本与校验和
gameTime、调度游标、stateVersion、下一事件序号
所有账户、钱包、订单、持仓批次、费用累计
自选、公司行为权益、已处理动作ID
事件队列、随机流状态、幂等回执
```

行情库是只读版本化数据，不把全市场分钟行情复制到每个存档。加载时必须验证相同的数据和规则版本。版本缺失或不匹配则给明确错误，不静默改用最新版。

### 10.3 提交失败

事务提交失败时不能提前发布内存里的新状态。可以只在持久化成功后交换草稿，或从已提交状态恢复；处理方式写清并测试。

模拟：提交前中断、事务中失败、提交成功但响应丢失。重开数据库后必须分别恢复到一致状态，并允许安全重试。

### 10.4 重放

同一初始状态、数据/规则版本、相同时间和顺序的指令、相同种子，逐事件、批量快进和中途恢复应产生一致的**领域状态**。

不要求日志文件创建时间、墙上执行耗时和自动保存次数逐字一致。并发控制用的存储修订号可以随实际提交次数变化，因此比较领域状态时排除它和快照写入时间；但不能排除 `gameTime`、逻辑 `eventSeq`、指令顺序、现金、订单、权益或随机状态。逻辑事件ID不要用数据库行号或物理存储修订号派生。

一个批量 `advanceTo` 和多个小步推进如果产生相同逻辑事实，逻辑事件序号必须一致。不要为渲染刷新、每次函数调用或每次checkpoint制造一条影响经济重放的业务事件。

随机流按用途独立，预留 `social`、`recruitment`、`pet`、`items` 等命名空间。先写子流派生与保存测试，不实现这些业务。调用一次宠物子流不得改变社会子流下一次结果。

全量数据导入和成本结算不要依赖 LLM 输出。未来生成文本保存为事实，不能每次加载重新生成而改变旧消息。

---

## 11. 免费数据获取、场景构建与验收

### 11.1 本轮必须主动取数，不只是预留 CSV 导入

**免费是数据预算约束。不要自行购买权限、充值积分、注册付费试用或改用收费数据源。**

本轮有两条独立验收线：

1. **离线内核线**：合成场景、手算基准、单元测试、恢复测试，不依赖网络。
2. **真实数据线**：实际查询下列免费来源，保留原始响应，规范化为本项目的 `ScenarioPack`，由同一个内核执行真实小样本演示。

必须交付可运行的取数、探测、规范化和校验脚本。不能以“已支持 CSV 导入，请用户自己找数据”结束。网络/权限/上游确实阻塞时，允许离线线继续，但真实数据线保持 `BLOCKED`，记录错误与重试命令；不能把两条线一起标成完成。

**本节证据等级**：以下来源入口及部分能力在 2026-09-21 核对了项目原始文档。尚未从当前环境成功下载真实行情，不能把本节写成“已实测获取”。实施者必须在实际开发机器重做小样本验证。

首个默认探测窗口可用 `2020-01-02` 至 `2020-01-23`，证券先用 `sh.600000`、`sz.000001`、`sh.600519`、`sz.000002`、`sz.000651` 做接口测试。这是**测试选择，不是已核验的数据承诺、推荐股票或最终游戏起始日**。先用交易日历和生命周期筛选，不能靠这里列了代码就跳过验证。

第一份真实交易演示目标：至少 5 只已核验证券、10 个连续有效交易日的 5 分钟数据及配套日线/状态。若只能获得更小范围，报告实际范围，别伪装成达标。后来退市股、改名、新上市和公司行为另外建立边界样本，不要求全部挤在这个窗口。

### 11.2 数据来源与使用顺序

| 来源 | 本轮用途 | 官方入口 | 必须知道的限制 |
|---|---|---|---|
| **BaoStock** | 首先尝试用 Python 获取小样本 5 分钟线；查询配套日线、交易日历、历史名单和证券资料 | <https://www.baostock.com/helpDocsHome>；<https://www.baostock.com/mainContent?file=stockKData.md>；<https://pypi.org/project/baostock/> | 官方有免费数据说明；精确分钟起点、退市标的覆盖、各字段语义都要实测。日线很早不代表分钟同样早；本轮不把 1 分钟能力算在它头上。官网为动态页面，解析不到时检查安装包和函数签名，不把“页面打不开”当作数据不存在。[D1][D2] |
| **free-stockdb** | 与小样本工作并行，优先调查早期历史分钟库及本地批量读取 | <https://github.com/hello245m/free-stockdb> | 项目是本地同步/查询引擎，支持分钟数据和不复权读取；clone 源码不等于历史库已下载。历史长度由实际同步源与本地数据决定，不能直接保证 2000 至今全市场完整。[D3] |
| **CNEquity** | 历史证券生命周期、公司行为、状态与多源补全；必要时导出已取得的分钟线 | <https://github.com/rootSunc/CNEquity>；<https://github.com/rootSunc/CNEquity/blob/main/docs/datasets/sources.md> | 它是采集/整理数据的基础设施，不是装上就附赠完整历史库。分钟数据默认关闭；退市公司行为仍可能缺失；有些退市日期来自快照推断，须标为候选而不是直接触发游戏核销。[D4][D5] |
| **AKShare** | 日线交叉检查、沪深退市名单、历史分红细项；近期分钟样本备用 | <https://akshare.akfamily.xyz/data/stock/stock.html> | 文档说明东财分钟接口仅返回近期数据，1 分钟仅近 5 个交易日。不能把 start_date 传 2000 就声称能拉到 2000。不同接口单位不同，且其数据仍来自上游网站。[D6] |
| **交易所 / 巨潮资讯原文** | 核对最后交易日、终止上市、分红实施和名称变更等关键事件 | <https://www.sse.com.cn/>；<https://www.szse.cn/>；<https://www.cninfo.com.cn/> | 本轮只按已知证券和事件定向核对，不建设全网爬虫，不假定公开网页就是稳定批量 API；不绕过访问控制。 |

**执行策略**：先用 BaoStock 争取快速得到真实样本，同时检查 free-stockdb 的长历史条件；CNEquity 和 AKShare 按缺口补。已有一个来源通过样本验收后，先打通数据到内核，不强制再部署另外三个完整系统。

共同底线：代码开源、接口免费、允许把上游数据用于当前用途/再分发是三回事。保存条款证据并分别记录，状态不明就写 `UNCONFIRMED`，不得推导出“可随意打包进公开游戏”。free-stockdb 自身也明确区分代码许可与数据权利。[D3]

### 11.3 BaoStock：先实现这一组数据探针

安装在项目独立的 Python 虚拟环境中。游戏内核仍为 TypeScript，Python 只负责离线采集，不增加一个常驻 Python 游戏服务。

```text
python -m venv .venv-data
# Windows：.venv-data\Scripts\python.exe
# Linux/macOS：.venv-data/bin/python
```

首次选定兼容版本后，将 `baostock` 和必要依赖写入 `scripts/data/requirements.txt`，锁定实测版本。可先用 `python -m pip install baostock` 探针验证，再固定版本；不在每次测试时升级依赖。[D2]

要检查并封装下列函数；以当前已安装 SDK 的签名、返回 `fields` 和错误码为准，不能用预设列名硬套未知版本：

| 数据 | SDK 调用入口 | 本项目用法 |
|---|---|---|
| 不复权 5 分钟 | `query_history_k_data_plus(..., frequency="5", adjustflag="3")` | 字段先取 `date,time,code,open,high,low,close,volume,amount,adjustflag`；先单证券、短窗口 |
| 不复权日线 | 同一函数，`frequency="d", adjustflag="3"` | 查询 `preclose,tradestatus,isST` 等可用字段，用于分钟汇总/状态对照，不在分钟请求里塞全部日线字段 |
| 交易日历 | `query_trade_dates(start_date=..., end_date=...)` | 获取指定窗口自然日与交易日标识；不把周一至周五当成交易日历 |
| 历史时点名单 | `query_all_stock(day="YYYY-MM-DD")` | 必须给历史日期；先筛证券类型与目标交易所，名单可能含指数等非目标证券 |
| 证券生命周期 | `query_stock_basic(code=...)` | 核对 `ipoDate/outDate/type/status`；当前状态仅作管理信息，不作为过去准入条件 |
| 分红/送转候选 | `query_dividend_data(code=..., year=..., yearType="operate")` | 按实施年度抓取并核对公告；必要时扩展前后年度或报告年度，不能漏掉跨年派息 |
| 复权因子对照 | `query_adjust_factor(code=..., start_date=..., end_date=...)` | 仅辅助审计异常除权，不能代替现金股息、登记日和到账日 |

说明：BaoStock 的免费与历史 K 线接口依据为发布者页面/官方知识库；生命周期和公司行为补取还应参考 CNEquity 的已公开源适配思路并在当前 SDK 实测。[D1][D2][D5] 不把函数存在等同于每只证券的所有历史均完整。

下面是**连接与原始文件导出骨架**，不是已经运行成功的下载结果。将它扩展成参数化脚本，加超时、重试、日志和运行清单。小样本串行查询，不要让多个线程争用同一个 SDK 登录连接。

```python
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import baostock as bs


def export_result(result: Any, path: Path, *, require_rows: bool) -> int:
    if result.error_code != "0":
        raise RuntimeError(f"query failed: {result.error_code}: {result.error_msg}")
    fields = list(result.fields)
    if not fields:
        raise RuntimeError("query returned no field schema")
    rows: list[list[str]] = []
    while result.next():
        if result.error_code != "0":
            raise RuntimeError(f"page failed: {result.error_code}: {result.error_msg}")
        row = result.get_row_data()
        if len(row) != len(fields):
            raise RuntimeError("row width differs from field schema")
        rows.append(row)  # 保留原始字符串；规范化阶段再用 Decimal 解析
    if result.error_code != "0":
        raise RuntimeError(f"query ended with error: {result.error_msg}")
    if require_rows and not rows:
        raise RuntimeError("query succeeded but no rows were returned")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".part")
    with temporary.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(fields)
        writer.writerows(rows)
    temporary.replace(path)
    return len(rows)


def main() -> None:
    # 独立运行目录，不能覆盖上一次取证文件。
    target = Path(".runtime/data/baostock/probe-2020-01")
    target.mkdir(parents=True, exist_ok=False)
    login = bs.login()
    if login.error_code != "0":
        raise RuntimeError(f"login failed: {login.error_code}: {login.error_msg}")
    try:
        export_result(
            bs.query_history_k_data_plus(
                "sh.600000",
                "date,time,code,open,high,low,close,volume,amount,adjustflag",
                start_date="2020-01-02", end_date="2020-01-23",
                frequency="5", adjustflag="3",
            ), target / "sh600000-5m-raw.csv", require_rows=True,
        )
        export_result(
            bs.query_history_k_data_plus(
                "sh.600000",
                "date,code,open,high,low,close,preclose,volume,amount,"
                "adjustflag,tradestatus,isST",
                start_date="2020-01-02", end_date="2020-01-23",
                frequency="d", adjustflag="3",
            ), target / "sh600000-daily-raw.csv", require_rows=True,
        )
        export_result(
            bs.query_trade_dates(start_date="2020-01-01", end_date="2020-01-31"),
            target / "calendar-raw.csv", require_rows=True,
        )
        export_result(
            bs.query_all_stock(day="2020-01-02"),
            target / "universe-20200102-raw.csv", require_rows=True,
        )
        export_result(
            bs.query_stock_basic(code="sh.600000"),
            target / "security-basic-raw.csv", require_rows=True,
        )
        export_result(
            bs.query_dividend_data(code="sh.600000", year="2020", yearType="operate"),
            target / "dividend-2020-raw.csv", require_rows=False,
        )
    finally:
        bs.logout()


if __name__ == "__main__":
    main()
```

取数脚本正式版要把字符串示例参数改为 CLI 输入。分红查询为空只说明该次响应无记录，不证明全年从未分红；网络成功/空数据/字段不兼容/查无覆盖分别记录。首个探针失败后先查返回错误，不自动改成前复权或日线顶替分钟。

### 11.4 free-stockdb 与 CNEquity：明确怎么接，不能只列名字

**free-stockdb**

1. 查看官方仓库 README、Releases、`sync_url.txt`、当前 Python SDK/HTTP 示例。入口均从仓库找到，不采用搜索到的不明可执行文件或镜像。[D3]
2. 在独立目录保存固定版本源码/发行包并记录版本、来源和校验和。检查同步目标与下载体积；如果工具只能全量下载，先报告大小与所需空间，不静默下载几十 GB。
3. 完成数据同步后才启动只绑定本机的查询服务；不暴露公网。需要管理员权限、未授权下载或可疑二进制时先停下处理。
4. 按该版本真实接口查询 `frequency="5m"` 或等价频率和**不复权**价格。README 使用 `get_data` / 本地 HTTP 的形式，但字段名、`fq` 值以 SDK 文件为准；不能猜一个 `fq=0` 就宣称原始价。[D3]
5. 分别探测 2000、2005、2010、2015、2020、2024 年的短窗口，只对当时已上市的少量股票查 5 分钟样本。返回行数、最早/最晚时间、样本缺失和单位都要落盘。
6. 将结果导出为本项目格式。**不要让 GameCore 依赖它的私有数据库结构，也不要顺便引入它的回测/交易规则。**

**CNEquity**

1. 在隔离 Python 环境查看当前安装方式和命令帮助；可参考官方快速入口：

   ```text
   pip install cnequity
   cne doctor
   cne init --profile demo
   ```

   安装后固定版本。`demo` 是小范围近期数据导入，不是二十年分钟库；`sample` 是合成演示，不能用它通过真实数据验收。[D4]
2. 先读取其数据集和源限制文档，再配置只需要的 `instruments`、`trading_calendar`、`trading_status`、`corporate_actions`。分钟类需按当前版本显式启用，不能默认认为 `init` 已拉分钟。[D4][D5]
3. 只导出本任务需要的分区。保留原 `source` 和质量标记，不把推断日期、缺字段转换成确定事实。
4. 特别注意已退市公司历史除权缺口，以及快照消失推断的退市日期。游戏的最后可交易日、终止上市日必须另核；不依赖这类推断直接把玩家持仓清零。[D5]
5. 只把它当离线数据准备工具；无需把整个 CNEquity 的调度和 MCP 服务搬进游戏内核。

### 11.5 AKShare：补退市和分红，不承诺远古分钟

按官方文档提供下列可选采集入口，记录实际版本/字段/错误，先小批量调用：[D6]

```python
import akshare as ak

# 退市名单候选；上证表的字段名/日期含义尤其需要对照原页确认。
sh_delisted = ak.stock_info_sh_delist(symbol="全部")
sz_delisted = ak.stock_info_sz_delist(symbol="终止上市公司")

# 分红与送转细项；每10股与每股口径必须对照当前返回说明。
dividends = ak.stock_history_dividend_detail(symbol="600000", indicator="分红")

# 日线独立对照，不复权。
daily = ak.stock_zh_a_hist(
    symbol="600000", period="daily", start_date="20200102",
    end_date="20200123", adjust="",
)

# 近期5分钟备用探针，返回范围由上游当前保留窗口决定。
recent_5m = ak.stock_zh_a_hist_min_em(symbol="600000", period="5", adjust="")
```

上面的无日期近期请求也要在正式脚本里记录请求和实际覆盖，不把最新数据放入 2020 场景。分钟字段的成交量若单位为“手”，明确换算到本项目“股”；日线和其他源分别校准，不给整个 AKShare 写一个通用盲乘 100。

`stock_info_sh_delist` 文档展示的列包含“暂停上市日期”，不能只因为接口名字有 delist 就把它当最后交易日。`stock_info_sz_delist` 的终止上市日期也不能兼任最后可交易时间。以事件证据修订映射。[D6]

### 11.6 历史股票池：从哪里找到后来消失的公司

不以今日行情列表作为唯一入口。构建候选集合时使用：

```text
指定历史日的 BaoStock 名单
    ∪ 沪深交易所退市名单候选
    ∪ CNEquity 已回填的证券记录
    ∪ 实际历史数据包已有证券目录
        ↓
永久ID、代码映射、上市/最后交易/退市、历史名称证据
        ↓
某历史日期的 Listed / Searchable / Tradable
```

至少抽查两只后来退市的证券：从来源先确认身份与生命周期，再请求其仍在交易期间的分钟线/日线，不在提示词里猜退市日期。若两只的分钟都取不到，明确报告 `delistedMinuteCoverage` 未通过，不删掉它们来伪装无幸存者偏差。

短窗口可以逐交易日取得历史名单并做差异；长历史先按月/年与上市、退市事件建立索引，再对变动边界加密核验。不要一次暴力请求几十年所有日名单。

当前证券基本表的 `code_name` 可能是当前简称。历史名没有日期证据时，显示代码并标记名称缺失，不能套用未来简称。未知的最后交易日也不能直接用“数据里最后一条 bar”替代，因为那可能只是源断档。

### 11.7 公司行为：原始比例和关键日期都要取到

优先尝试 BaoStock 分红记录；缺口用 AKShare 的分红详情、CNEquity 已取得记录和具体实施公告补证。

规范化时区分：

| 字段/事实 | 处理要求 |
|---|---|
| 每股现金金额 | SDK 返回每股字段时不再除10；“10派5”类原始说明才按其分母转换 |
| 送股与转增 | 分别保留原比例及规范化后的每股比例，不能与现金相加当作现金值 |
| 登记日 | 决定持股权益快照 |
| 除权除息日 | 处理价格/权益价值衔接，不再人为重复调整原始 K 线 |
| 派息日 | 现金真正进入可用余额 |
| 红股上市日 | 新增股份进入可卖资格的日期，不能无依据等同于除权日 |
| 实施状态 | 只使用已经实施的记录；预案、取消、重复公告不能变成多笔分红 |
| 历史公开时间 | 优先原始公告；只有日期时保存 `timePrecision=date`，使用明确的保守可见性政策，不伪造精确时刻 |

原始上游字段例如 `dividRegistDate`、`dividOperateDate`、`dividPayDate`、`dividStockMarketDate`、`dividCashPsBeforeTax`、`dividStocksPs`、`dividReserveToStockPs` 先通过当前 SDK 和真实行确认；字段不存在则映射失败或缺失，不填想当然的值。

复权因子跳变只能提示有待调查的权益变化，不能独立确定玩家应得多少现金。未知的分红到账日/红股可卖日保留缺口；真实场景遇到必需但未核验的事件时按覆盖错误处理。不要静默跳过再声称收益正确。

### 11.8 数据采集目录与依赖隔离

在第4节的细分目录上实现以下子目录；这是本轮新建内容，不是用户要找回的旧文件：

```text
scripts/data/
├── requirements.txt                 实测锁定的Python采集依赖
├── README.md                        安装、网络要求、命令与状态说明
├── run-python.ts                    跨平台启动虚拟环境Python，数组传参
├── probe-sources.ts                 取数探针编排与报告
├── sources/
│   ├── baostock/                    必须实现的首选小样本采集
│   ├── akshare/                     退市/分红/日线/近期分钟补充
│   ├── free-stockdb/                版本与同步条件探测、数据导出
│   ├── cnequity/                    读取其已验证数据分区
│   └── local-files/                 用户已有授权文件的备用入口
├── normalization/
│   ├── timestamps/                 标签、时区、barStart/barEnd
│   ├── prices/                     不复权、Decimal转整数
│   ├── quantities/                 股/手、额的口径
│   ├── securities/                 生命周期与代码映射
│   └── corporate-actions/          比例、日期、实施与去重
├── validation/                      覆盖、单位、跨源冲突、时序
├── build-scenario.ts                校验后发布不可变场景版本
└── __tests__/                       SDK响应桩与规范化测试

docs/data/
├── sources.md                       来源、版本、用途、许可状态
├── source-probes.md                 每次探针实际命令和结果
├── coverage.md                      按源/证券/年份/频率的覆盖
├── field-mappings.md                原始字段到本项目字段
├── corporate-actions-audit.md
└── blockers.md

.runtime/data/<source>/<batch-id>/
├── raw/                            原始响应，只读留证
├── normalized/                     规范化候选
├── request-manifest.json
├── coverage-report.json
├── rejected-records.jsonl
└── logs/
```

只有 BaoStock 首选采集和本项目规范化链必须完整实现；另外来源按实际缺口接，不用为凑目录写空 `success`。未接上的来源标记 `NOT_IMPLEMENTED` 或具体 `BLOCKED`。游戏加载已发布的本地场景，不在每个撮合 tick 请求外部 API。

Python 虚拟环境只服务采集，Node 游戏启动/离线测试不能依赖它。`.venv-data/`、第三方下载二进制、原始大文件、日志与未确认许可的数据全部 Git 忽略。不自动 push 取数内容到公开仓库。

### 11.9 从原始响应到可用场景的最低验证

1. **来源身份**：记录官方入口、实际上游、SDK/commit、请求参数、取得时间和原始文件 SHA-256。
2. **窗口真实性**：同时记录请求起止与实际返回起止；空响应不能算支持，默认近期数据不能伪装成早期窗口。
3. **频率**：确认是5分钟，而不是把240分钟、日线或时间字符串误判成5分钟。
4. **时间标签**：确认上游时间是 bar 起点还是终点；按上午/下午会话独立计算，不能把午休拼进一根bar。统一 `availableAt=barEnd` 的完整行情可见性。
5. **单位与精度**：原始字符串/Decimal转换到整数价格、股数和明确金额单位；不经过会损精度的无说明浮点链路。
6. **行情完整度**：5分钟汇总与独立日线对照。开收盘集合竞价口径不同要标明，不用最后一分钟“调差”凑总量。
7. **证券状态**：区分停牌、未上市、已退出、零成交和真实缺失；不要只看缺行就标停牌。
8. **公司行为**：核对实施状态、每股比例、登记/除息/到账/可卖日期和同一事件不同来源去重。
9. **历史名称与权限**：未来名称和未来上市/退市信息仅供管理，不能泄漏到玩家可见视图。
10. **用途和版本**：真实市场数据不自动代表历史制度规则全部真实。`marketDataKind`、`rulesetKind`、`coverageStatus`、使用条件分别记录。

如果用真实分钟线配合测试税费/撮合规则做演示，清楚标记 `marketDataKind=real, rulesetKind=game-test`。不能把它命名为“完全复刻当年券商交易”。

正常完整日可能有48根5分钟bar，但不要对所有证券/特殊交易日一刀切补齐48行；检查会话、停牌和集合竞价来源口径后再判断。

所有来源探针默认低并发、有限重试（例如最多3次，指数退避）和缓存命中。遇到403/验证码/条款限制不绕过；使用进程级超时防止 SDK 长时间阻塞。失败留原始错误和请求，不持续重试到被封。

### 11.10 合成夹具仍保留，但与真实线独立

必须建立三个 `synthetic: true` 场景：`kernel-smoke`、`corporate-actions`、`edge-cases`，公司代码用 `TEST_*`。这些用于本文件手算、异常和新进程恢复验收，不需要联网。

合成数据和独立期望结果分开维护，不能用内核输出给自己生成黄金答案。

真实场景沿用以下文件协议：

```text
manifest.json
calendar.json
securities.json
names.json
bars-5m.json 或 csv
trading-status.json
corporate-actions.json
rules.json 或有校验和的规则引用
provenance.json
coverage-report.json
```

manifest保留原字段，另记录 `marketDataKind`、`rulesetKind`、实际首尾时间、证券清单、缺口、源版本与发布状态。`synthetic` 与 `marketDataKind` 不得矛盾；新建项目时明确schema并测试。

长历史探针报告至少包含：

```text
source | sdk/version | security | requested_from/to | returned_from/to
frequency | row_count | gap_count | raw_or_adjusted | result_status
```

一只股票在2000年取到几行，只能说明该样本存在，不能声称“2000至今全A股含退市完整覆盖”。新闻/公告正文采集此轮仅保留后续入口，不扩张成全网爬虫，也不让这部分阻塞首份纯市场内核。

### 11.11 这轮必须实际运行的取数流程

在 K03 中完成数据接口与首次探针，后续 K09 用同一场景格式接真实演示：

```text
1. 查看官方文档、安装固定SDK、记录来源和用途边界
2. 先单股短窗口查询BaoStock 5分钟、不复权日线、日历
3. 检查历史名单和生命周期，再扩到5只/10个交易日
4. 同时检查free-stockdb长历史数据取得方式，做小窗口探针
5. 需要时用CNEquity/AKShare补退市、状态和公司行为
6. 原始数据归档 → 规范化 → 质量检查 → 场景发布
7. 无界面内核加载真实场景 → 下单/推进/保存/恢复
8. 报告实际覆盖、各处缺口，不以合成测试通过替代真实验证
```

本轮不下载全市场二十年分钟；也不能完全跳过免费真实样本获取。真实源全部失败时，明确结束数据子任务并交 `REAL_DATA_PENDING` 及证据，继续离线内核；不要无限查源拖垮全部开发。

---

## 12. 公共 API、CLI 与演示

### 12.1 一个未来前端可用的 API

命名可在实现时细化，但语义必须集中：

```ts
interface GameKernel {
  execute(command: GameCommand): Promise<CommandReceipt>;
  advanceTo(targetTime: GameTime): Promise<AdvanceResult>;
  stepNextEvent(): Promise<AdvanceResult>;
  query(query: GameQuery): Readonly<QueryResult>;
  checkpoint(): Promise<CheckpointReceipt>;
  close(): Promise<void>;
}
```

建档与加载由明确的工厂方法完成。CLI 不直接访问 wallet 的内部字段，不把未来数据源句柄暴露给普通调用方。

业务失败返回带稳定错误码的结果；程序缺陷、持久化失败与业务拒绝分开。至少定义这些错误或等价类型：

```text
INSUFFICIENT_CASH / INSUFFICIENT_SELLABLE_QUANTITY
INVALID_ORDER / INVALID_PRICE / INVALID_QUANTITY
SECURITY_NOT_LISTED / MARKET_CLOSED / SUSPENDED
PERMISSION_REQUIRED / PRICE_PROTECTION
IDEMPOTENCY_CONFLICT / STATE_VERSION_CONFLICT
MISSING_DATA / RULE_COVERAGE_MISSING
UNSUPPORTED_CORPORATE_ACTION / SCENARIO_COMPLETE
SAVE_VERSION_UNSUPPORTED / SCENARIO_VERSION_MISMATCH
```

拒单不必抛进程异常；数据损坏不应被当成普通拒单继续运行。

### 12.2 必须提供的根脚本

```text
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test:recovery
pnpm test:acceptance
pnpm build
pnpm verify
pnpm demo:headless
pnpm demo:recovery
pnpm cli --help
pnpm data:probe -- --source baostock --start 2020-01-02 --end 2020-01-23
pnpm data:fetch -- --source baostock --config <sample-config.json>
pnpm data:normalize -- --input <raw-batch-dir> --output <staging-dir>
pnpm data:validate -- <scenario-path>
pnpm data:publish -- --input <staging-dir> --output <scenario-dir>
pnpm verify:data -- --scenario <verified-real-scenario-dir>
pnpm demo:real-data -- --scenario <verified-real-scenario-dir>
```

使用跨平台 Node/TypeScript 编排，避免只能在 Bash 工作的 `rm -rf`、`cp`、环境变量前缀写法。验证失败必须退出非零；不设置“没有测试也通过”，不对失败命令加 `|| true`。

`verify` 顺序运行必要检查、测试和构建，再在临时独立目录运行两个演示。演示每次使用新的 runId/数据库，不重复给旧存档发初始资金。

这些是本项目要实现的根脚本，不是上游SDK自带命令。`data:probe/fetch`会联网；`verify`保持纯离线。`verify:data`要求已有真实数据并检查真实来源，无法完成就非零退出，不自动调用合成样本。`data:publish`仅发布到本地忽略目录，绝不表示上传GitHub或向玩家公开分发。

### 12.3 CLI 操作

至少支持：create、status、search、watchlist add/remove、buy、sell、cancel、orders、positions、step、advance、play、pause、save、resume、export。

设计一种统一命令风格即可。一个操作必须显式指定或从当前会话安全读取 runId，不操作错误存档。输出默认中文；`--json` 提供机器可读结果。

CLI 支持交互运行，也支持脚本驱动，不把 PowerShell 当必需 runtime。

### 12.4 两个离线演示与独立真实数据演示

**演示A `demo:headless`**

创建玩家与两个测试账户，跑一次买入、不可卖拒绝、撤单、跨交易日卖出、分红、自选和历史证券查询。测试账户使用预设指令，不冒充智能散户。

**演示B `demo:recovery`**

运行到存在冻结现金、部分成交和待处理权益的时点 → 保存 → 真正关闭进程 → 新进程恢复 → 重试一条旧指令 → 继续推进。与不中断的同输入基准对比。

输出至独立的 `.runtime/<execution-id>/`：

```text
summary.json
orders.json
trades.csv
account-snapshots.json
events.jsonl
ledger.jsonl
verification.json
```

**演示C `demo:real-data`**

实际通过第11节取数/规范化/校验后，用真实分钟场景调用同一公开API完成交易与存档。不得使用真实公司名包裹合成价格，也不得在没有完整规则/公司行为覆盖时宣称全功能历史验证。与两个离线演示分开运行，结果报告独立列示。

所有摘要必须注明行情与规则各自的真实性。真实样本没准备好不影响合成演示，但真实线保持BLOCKED，不能把缺口从报告里删掉。

---

## 13. 独立计算基准，不许让程序自证

以下都是本游戏的**合成验收规则**，不是历年真实税费声明。

### 13.1 买卖基准

测试参数：佣金按成交额的 0.03%，每订单最低 5 元；卖出印花税 0.1%；其他费用为零；该场景成交量充足。

```text
初始现金                 100,000.00
买入100股 × 10.00          1,000.00
买入佣金                      5.00
买后现金                  98,995.00

后续可卖交易日
卖出100股 × 11.00          1,100.00
卖出佣金                      5.00
卖出印花税                    1.10

最终现金                 100,088.90
最终股票数量                     0
已实现净收益                  88.90
```

原始数据、保护价和bar容量必须真的让这个路径成立，不能为了套答案在演示中直接设置余额。

### 13.2 部分成交最低佣金

同一买单 200 股，先成交 100 股 × 10 元，再成交 100 股 × 10 元。

总成交额 2,000 元，总佣金应为 5 元，不是 10 元。先成交一部分后撤销也必须对得上冻结余额和已发生费用。

### 13.3 分红的权益桥接

忽略价格自然波动和税，登记日持有 1,000 股、每股派 0.50 元。除息前价格 10 元，除息生效后标记价 9.50 元。

```text
除息前：股票市值 10,000
除息后到账前：股票市值 9,500 + 应收股息500
到账后：股票市值9,500 + 现金500
```

不是除息前就多记500，也不是到账再多记第二个500。

### 13.4 送转权益

持有1,000股，测试设定每10股转增10股，无额外现金。

```text
原总成本10,000
除权后总权益对应2,000股，总成本仍10,000
新股未到可卖日：只能卖旧有可卖份额
可卖日以后：释放新股，不再次增加总股份权益
```

### 13.5 资金调拨

A转给B 1,000元，没有手续费，A+B总现金不变。重复同 commandId 不再转一次；资金转入不增加证券收益。

---

## 14. 验收清单

每个编号在 `tests/acceptance/cases.json` 中指向实际测试或实际运行证据，状态只允许 `PASS / FAIL / BLOCKED / NOT_IMPLEMENTED`。不能用标题或空 `it()` 计作已覆盖。

### A. 工程与依赖

| ID | 验收 |
|---|---|
| A01 | 空仓库安装、typecheck、build可运行，依赖锁定 |
| A02 | 核心没有Node I/O、UI或SQLite依赖，无禁止的反向import |
| A03 | CLI可以加载编译后的核心，不只依赖源码路径别名 |
| A04 | Windows兼容脚本检查；实际跑过的平台单独报告 |
| A05 | .runtime、凭据、数据库、私有数据不被意外提交 |

### B. 时间与数据

| ID | 验收 |
|---|---|
| B01 | 未到availableAt，完整bar的H/L/C/量不可见 |
| B02 | 暂停和同一边界新下单不能按已看过的bar追溯成交 |
| B03 | 10:02订单不能使用已经开始的10:00–10:05 bar |
| B04 | 午休、周末、假期没有交易，T+1跨过非交易日 |
| B05 | 上市前无正常搜索结果，上市后进入；后来退市的证券在当时可见 |
| B06 | 改名/改代码只影响历史展示，不复制账户持仓 |
| B07 | lastTradableAt与delistedAt不同仍能正确判定 |
| B08 | 未来退市日期和未来名称不从普通查询泄漏 |
| B09 | 冲突重复bar、错误单位、规则区间冲突被拒绝 |
| B10 | 停牌、真实缺失和零成交可区分；缺失不生成平价行情 |
| B11 | 场景结束正常停止，不生成未来bar |
| B12 | 同输入逐tick与批量advance经济状态一致 |

### C. 钱包与成交

| ID | 验收 |
|---|---|
| C01 | 13.1手算基准精确相等 |
| C02 | 余额不足拒绝，全部状态无部分副作用 |
| C03 | 买单冻结、价格改善后的释放与撤单完全对账 |
| C04 | 两个卖单不能冻结同一批股份两次 |
| C05 | 旧可卖股份可卖，当天新增受T+1限制 |
| C06 | 保护价不满足不成交，不偷偷修改保护价 |
| C07 | 整bar一字上限不买、整bar一字下限不卖；不全方向封禁 |
| C08 | 所有模拟账户共享容量，部分成交顺序确定 |
| C09 | 13.2部分成交不重复收最低佣金 |
| C10 | DAY订单到期释放剩余资金/股份，已发生费用不退回 |
| C11 | 13.5转账无损、不可转冻结资金、外部现金流不伪装为收益 |
| C12 | 同ID同payload只执行一次；不同payload发生冲突 |
| C13 | 大金额计算和序列化不丢精度，无BigInt JSON错误 |
| C14 | 最小交易单位、零碎股卖出政策按配置判断 |
| C15 | 带已完成交易的两个账户不能相互篡改状态 |

### D. 公司行为与权益

| ID | 验收 |
|---|---|
| D01 | 登记前卖出不再享有该份分红，登记后卖出不丢权益 |
| D02 | 13.3应收与到账桥接不创造或丢失500元 |
| D03 | 分红事件重复处理不重复给钱 |
| D04 | 13.4送转总成本守恒，新股可卖时间正确 |
| D05 | 送转重复释放不复制股份 |
| D06 | 未支持配股/收购/换股被明确阻塞，不当普通核销 |
| D07 | 普通测试退出清理订单、释放冻结、归档持仓、记录核销 |
| D08 | 退市后的正常搜索退出，个人历史记录保留 |
| D09 | 历史原始价与现金分红不会重复计算收益 |
| D10 | 未知价格、零碎股政策缺失有明确错误，不静默舍弃 |

### E. 存档与失败恢复

| ID | 验收 |
|---|---|
| E01 | Memory与SQLite共用的RunStore契约测试通过 |
| E02 | 真实新进程恢复的现金/订单/批次/事件游标相等 |
| E03 | 保存恢复后重试旧命令不重复成交/转账 |
| E04 | 部分成交费用累计和冻结状态恢复后仍正确 |
| E05 | 应收股息/待上市股份恢复后只结算一次 |
| E06 | 事务中失败恢复到上次一致状态，无半笔交易 |
| E07 | 提交成功但响应丢失，重试返回已提交receipt |
| E08 | 两个写入者使用过期stateVersion时拒绝覆盖 |
| E09 | 错误scenarioHash/ruleVersion/saveSchemaVersion拒绝静默加载 |
| E10 | 子随机流隔离、恢复和重复演示的领域状态hash一致 |

### F. 整体交付

| ID | 验收 |
|---|---|
| F01 | demo:headless真实执行公开API，不直接改状态 |
| F02 | demo:recovery确实关闭并重开进程 |
| F03 | 导出的成交/凭证/快照可相互对账 |
| F04 | verify任何子步骤失败都会非零退出 |
| F05 | 报告明确合成场景通过与真实数据待验证的区别 |
| F06 | 没有用跳过测试、空mock或伪日志冒充完成 |
| F07 | README用全新环境说明如何复现，不依赖本机绝对路径 |
| F08 | 后续接口说明足以接简单前端，不需要调用底层数据库 |

### G. 免费数据接入（新增10项，与内核60项分开汇报）

| ID | 验收 |
|---|---|
| G01 | 首选来源安装、探针和原始响应有真实运行证据；不是仅有函数声明 |
| G02 | 实际取得声明窗口的5分钟不复权数据；请求很早但只返回近期时不误判覆盖 |
| G03 | 抓取历史名单并核验生命周期，不能仅从今天存续证券抽样冒充历史池 |
| G04 | 至少两只后来退市证券在其交易期间做实际数据探针，分别记录覆盖与缺失 |
| G05 | 每个来源的频率、起止标签、时区、股/手、额和精度有映射及测试 |
| G06 | 至少一项真实公司行为原始记录/证据完成映射；缺日期则明确阻塞，不造派息日 |
| G07 | 分钟/日线聚合对照、缺失/停牌区分、冲突隔离和来源哈希可复现 |
| G08 | 相同请求复用缓存；失败有限重试；空响应不当成功；不覆盖原始批次 |
| G09 | demo:real-data加载真实包且走同一内核，真实与测试规则状态分别标识 |
| G10 | 免费/使用/再分发状态、SDK版本、历史覆盖和公开仓库忽略规则有记录 |

共70项验收：原内核60项＋真实数据接入10项。数据线有网络等真实阻塞时分组报告，不能把BLOCKED改为PASS，也不能把内核通过叫作全部70项通过。属性测试另外覆盖随机合法指令序列下资金非负、股份不超卖、序号单调和重放一致。

---

## 15. K00–K10实施顺序

先顺序打通最小纵向流程。不要在没有共享契约前同时创建多个代理各写一个钱包。可以并行读文档或做独立算例，核心写入、合同、迁移保持单一负责人。

| 任务 | 内容 | 交付门槛 |
|---|---|---|
| K00 | 仓库确认、版本选择、workspace、Git安全、验证入口 | 空工程可构建；最小SQLite读写已验证 |
| K01 | 本文提取overview/architecture；公共DTO、错误码、单位、默认政策 | 指令和快照schema可测试，不是只有接口草稿 |
| K02 | money/price/quantity/time/ids/random/serialization | 边界值、大金额、舍入、随机与编解码测试 |
| K03 | 合成场景、日历、PIT证券、可见性；免费来源探针、采集、规范化与质量检查 | 合成数据校验通过；真实样本有文件和覆盖报告，或具体联网阻塞证据 |
| K04 | account/wallet/ledger/position基础、统一结算、转移 | 余额/冻结/成本的原子变更测试 |
| K05 | 订单、费用、撮合提案、部分成交、DAY和T+1 | 手算交易和最低佣金基准通过 |
| K06 | clock/scheduler完整接线、自动会话、批处理顺序 | 不同推进方式同结果，缺数据安全停止 |
| K07 | 股息/送转/退出、应收和估值 | 公司行为独立基准与幂等通过 |
| K08 | SQLite持久化、版本、回执、新进程恢复、故障注入 | 含未完成订单和权益的恢复测试通过 |
| K09 | CLI操作、两个离线演示、真实数据演示、导出及取数根命令 | 核心演示可复现；真实线独立验收，不停留在CSV入口 |
| K10 | 全验收、架构依赖检查、属性测试、CI配置、交接 | 实际命令和结果齐全，列出所有未覆盖项 |

K03可分`.offline`和`.data`两份记录：联网取数可与内核独立实现交错进行，接口归一化须遵守K01。不能因为离线部分完成就把真实取数标DONE。

K00的最小SQLite试验不代表K08已做完。K03/04等阶段可以通过小型受控推进方法单测，不要复制一套临时撮合器；K06把同一套规则接成完整调度。

每个任务单使用：目标、依赖、允许修改目录、预期结果、实际命令、结果、未完成项。进度采用 `TODO / IN_PROGRESS / DONE / BLOCKED`，完成必须链接测试证据。

阶段交付后可以继续下一项；达到K10或出现真实阻塞再结束本轮。不要中途只写“接下来还可以实现交易”，因为交易就是本轮任务。

---

## 16. 文档与工程纪律

### 16.1 新建文档，而不是要求用户找旧文档

至少生成：

```text
AGENTS.md
README.md
docs/product/overview.md
docs/architecture/module-boundaries.md
docs/rules/execution-policy.md
docs/rules/event-ordering.md
docs/rules/accounting.md
docs/rules/corporate-actions.md
docs/data/scenario-format.md
docs/data/coverage.md
docs/data/sources.md
docs/data/source-probes.md
docs/data/field-mappings.md
docs/data/corporate-actions-audit.md
docs/data/blockers.md
docs/decisions/0001-kernel-defaults.md
docs/tasks/K00.md ... K10.md
docs/handoffs/CURRENT.md
docs/verification/latest.md
```

AGENTS只写简短稳定约束、当前任务入口和验证命令，不把本文整份复制进去。长规则保留对应docs，Codex继续任务时先读CURRENT，再读正在做的任务和必要规则。[R1]

### 16.2 不变项与可调整项

不可自行改变：从空仓库起步、本轮无界面、数据真假区分、统一资金、PIT、确定性、基本T+1、指令幂等、单存档单权威写入、正式回放不用合成分时。

可在ADR记录后调整：内部函数命名、简单文件合并、具体兼容依赖版本、SQLite快照表的非业务布局。不能通过“工程优化”把撮合政策或用户的钱改掉。

### 16.3 安全与公开仓库

目标仓库为公开仓库。提交前检查第三方资料、环境变量、日志和路径中是否含凭据或用户数据。数据原文与许可不明的样本不要提交。

合成场景和自己写的代码可以保留在任务分支；不要自行给整个产品选择MIT等发行许可证。包使用 `private: true`，开源许可证由用户决定。

本轮只产生虚拟游戏交易。不安装真实证券下单连接，不读取本机券商账户，不执行现实资金操作。

### 16.4 防止虚假完成

禁止：

- 空测试、全部skip、测试只断言`true`。
- 测试期望从被测函数即时计算出来。
- 修改正确算例去迁就错误结果。
- 捕获所有异常后返回成功。
- 在demo里直接赋值现金模拟成交。
- 用内存适配器结果代替SQLite恢复验收。
- 给尚未取得的真实历史打上已验证标识。
- 只提交目录、文档和TODO而声称内核完成。

测试覆盖率可以报告，但不以一个覆盖率数字代替内核60项与数据10项验收。实际无法通过时说明原因和下一步，不无限循环、不破坏已通过的代码。

---

## 17. 本轮最终回复格式

完成后按这个顺序回复用户：

1. **仓库状态**：实际目录、origin、分支、最后本地提交；是否有未提交内容；明确没有自动推送的状态。
2. **已实现功能**：对应K任务和可验证行为，避免泛泛“搭建了完善架构”。
3. **运行方式**：从安装、verify到两个demo的精确命令。
4. **运行证据**：各命令真实退出码，分别列内核60项和数据10项PASS/FAIL/BLOCKED统计，生成文件的实际路径。
5. **独立算例**：100,088.90元、部分成交佣金5元、股息权益桥接的实测结果。
6. **数据与限制**：具体使用的来源和SDK版本、请求/返回日期、证券数/bar数、后来退市样本结果、数据与规则真实性、用途/分发状态、缺失和阻塞；不能只写“真实数据暂缺”。
7. **下一阶段建议**：只建议接简单交易调试界面，不自行实现正式前端。

本文件是实现提示词，不是已经完成的游戏。只有运行代码、测试和新进程恢复后的证据才构成验收。

---

## 18. 外部工程参考（可查API，不是旧项目依赖）

以下链接仅帮助核对工具的实际API和行为。不要求用户额外准备任何文档，也不以阅读这些资料替代实现：

- [R1] OpenAI，AGENTS.md：<https://developers.openai.com/codex/guides/agents-md/>
- [R2] pnpm，Workspace：<https://pnpm.io/workspaces>。workspace根目录与内部依赖协议。
- [R3] SQLite，Transactions：<https://sqlite.org/lang_transaction.html>。原子提交仍需由本项目正确划分事务。
- [R4] Vitest，Timers：<https://vitest.dev/guide/mocking/timers>。外层播放驱动测试；内核用显式逻辑时间。
- [R5] Git，clone与switch：<https://git-scm.com/docs/git-clone>、<https://git-scm.com/docs/git-switch>。
- [R6] Node.js，Releases：<https://nodejs.org/en/about/previous-releases>。实施时记录实际受支持环境。
- [R7] better-sqlite3：<https://github.com/WiseLibs/better-sqlite3>。仅用于持久化适配器，版本与Windows兼容性须实测。

---

### 免费数据来源依据（本轮核对入口，不代表已下载通过）

- [D1] BaoStock 官方知识库：<https://www.baostock.com/helpDocsHome>；K线接口页：<https://www.baostock.com/mainContent?file=stockKData.md>。动态网页正文在当前抓取环境不总能展开，安装SDK后核验签名与返回字段。
- [D2] BaoStock 发布者 PyPI 页面：<https://pypi.org/project/baostock/>。免费数据说明、Python安装与历史K线调用示例；不据此保证特定年份分钟完整度。
- [D3] free-stockdb 官方仓库：<https://github.com/hello245m/free-stockdb>；Releases：<https://github.com/hello245m/free-stockdb/releases>。关注同步数据源、分钟频率、不复权选项、校验和、许可证与数据免责声明。
- [D4] CNEquity 官方仓库：<https://github.com/rootSunc/CNEquity>。数据集范围、demo/sample区别、分钟默认关闭。
- [D5] CNEquity 原始源限制说明：<https://github.com/rootSunc/CNEquity/blob/main/docs/datasets/sources.md>。核对快照推断、退市公司行为缺口、历史回填源。
- [D6] AKShare 官方股票数据文档：<https://akshare.akfamily.xyz/data/stock/stock.html>。检索函数名：`stock_zh_a_hist_min_em`、`stock_info_sh_delist`、`stock_info_sz_delist`、`stock_history_dividend_detail`、`stock_zh_a_hist`。

本次新增来源说明来自上述外部文档；第11节采样规模、流程、状态命名和验收要求是本项目实施设计。未声称本轮已在用户机器取数，也未声称已有完整可发行的2000年历史库。

---

## 19. 开始执行

现在从 **K00** 开始。先确认实际仓库和Git状态，创建最小可运行工程，然后实施后续任务。

**不要让我找旧蓝图、旧计划或旧素材。不要再进行旧项目审计。不要另建远端仓库。不要先写前端。**

把这个空仓库做成一个能在终端里执行买卖、记账、保存和恢复的游戏内核，并按第11节主动验证免费真实数据链。不要再把数据获取全部交回给用户。
