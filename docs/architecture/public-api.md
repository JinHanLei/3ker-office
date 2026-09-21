# 下一层调用方式

`GameKernel.create({runId, ownerActorId, seed}, historicalData, runStore)` 建档；`resume(runId, historicalData, runStore)` 恢复并验证绑定版本。只有启动层接触场景目录和数据库路径。

- `execute(command)`：Zod 验证、账户授权、幂等、单队列提交；返回 `ok/code/orderId/eventSeq`。同 ID 不同 payload 冲突。
- `advanceTo(带时区 ISO 或整数 UTC 毫秒)`、`stepNextEvent()`：确定性推进，数据不足返回 DATA_PENDING。
- `query({type:'status'|'search'|'bars'|...})`：只读副本。账户查询必须提供 actorId/accountId。
- `checkpoint()`：等待已排队事务完成。每个写入已同步提交，无隐式未存盘经济变更。
- `close()`：等待队列，关闭存储。
- `exportSnapshot(ownerActorId)`：管理员存档/验收接口，包含全部模拟账户；不要暴露给未来普通 NPC 代理。

身份是由可信上层传入的主体标识；本轮是本机内核，没有网络鉴权/登录系统。一个存档拥有者可创建账户及一次性初始本金；普通账户不能调用管理员建户。
简单调试界面只需这些 API，不读 SQLite 表，不拿场景原始未来数据句柄。播放定时器位于 headless/playback，pause 不改变撮合政策。
