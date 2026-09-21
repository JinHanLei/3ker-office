# 实际探针与命令

1. `pnpm data:probe -- --source baostock --start 2020-01-02 --end 2020-01-23`，0.8.9：退出2，batch `20260921T144751714271Z`，登录10002007/timeout。
2. 更新至0.9.4，短窗口 fetch：batch `20260921T151657137946Z`，取得单股96根、日线、历史名单及两退市股各96根；旧批次汇总将 EMPTY factor 记为 BLOCKED，逐响应状态并未丢失。
3. 0.9.4完整默认五股：`20260921T152007647314Z`，各768根；补齐每只分红/因子与退市日线后 batch `20260921T152317668250Z`，33请求，退出0。原始茅台价格精度冲突在规范化中非零拒绝。
4. `pnpm data:fetch -- --source baostock --config scripts/data/sample-config.json` 使用替代五股。实测等价配置产生 batch **20260921T152539078026Z**，33请求，退出0；28/33请求直接复用已取得文件，其余有限重试。再次相同请求命中整个批次缓存、退出0；EMPTY 因子仍逐项标 EMPTY，不宣称空响应为覆盖成功。
5. 原始→规范化→validate→publish→verify:data→demo:real-data 全部退出0；真实演示 `.runtime/real-8fdac9d9-33ca-436b-9c05-2b56c521671b`。短包真实演示 `.runtime/real-39707086-d3ba-45bc-9e87-63386afbc676`。
6. `pnpm data:probe -- --source free-stockdb`：退出2；`.runtime/data/free-stockdb/9f082252-a3ee-4f6e-ba26-aa92cc41a499` 保留sync、release、commit响应和SHA，README本机请求失败但通过官方网页查阅。无活动同步源，未假装完成长历史查询。

BaoStock最终原始manifest SHA-256：dbb24bc55622885990fe2f6362359dbebe4b702baa64e025fecfd4775a0ac61d。所有原文在 `.runtime/data`，不入公开Git。

SDK签名已实际inspect：history(code,fields,start_date,end_date,frequency,adjustflag)，trade_dates(start_date,end_date)，all_stock(day)，stock_basic(code,code_name)，dividend(code,year,yearType)，adjust_factor(code,start_date,end_date)。查询错误/分页错误非零，进程30秒上限、最多2次，连续源失败后阻断依赖请求。
