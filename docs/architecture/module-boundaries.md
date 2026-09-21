# 模块边界

headless → adapters/core/contracts；adapters → core ports/contracts；core → contracts。
状态仅由 kernel 串行写入，功能模块执行纯变换。所有写入先修改隔离草稿，再提交 RunStore，成功后替换内存状态。
普通查询返回副本，过滤未来名称、退市信息和未完成 bar。管理快照用于 checkpoint/export，不是玩家/NPC 查询。
