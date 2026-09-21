# 字段映射

BaoStock frequency=5、adjustflag=3。time 按 YYYYMMDDHHMMSSmmm 终点标签解析；上海时区，减5分钟得到起点，availableAt=end。open/high/low/close 用 Decimal×10000；volume 单位股；amount 元×100 按分舍入。日线独立校验 high/low/close/volume；口径冲突阻塞。测试为 SDK 形状的合成字符串，真实行未取得。
生命周期用 ipoDate/outDate 候选，最后交易日仍需额外证据。当前简称不用于历史名称。
