# 字段映射与验证

BaoStock 0.9.4，frequency=5、adjustflag=3。不复权5分钟 time 是 YYYYMMDDHHMMSSmmm 终点：实际09:35首根、15:00末根；以+08:00解析，barStart=end-5分钟，availableAt=end。上午下午会话分别验证，不能跨午休。

open/high/low/close：原始字符串→Decimal×10000，拒绝无法表示精度；volume 原单位股，无盲乘100；amount 原元→分、总额 half-up 舍入。日线单独请求并按每股每日验证 volume 汇总、high、low、close；没有调整最后一根补差。成交额与开盘集合竞价的全口径审计未宣称通过。

真实5股3840根通过结构/时序/价格步长/日线对照。sh.600519多行0.0001元差已隔离，没有修成符合预期的价格。缺失停在DATA_PENDING；有明确tradestatus=0才归停牌，零成交与缺行不同。

历史名单指定2020-01-02；basic.type=1、ipoDate、outDate用于样本生命周期审核。outDate不兼任lastTradableAt，当前code_name不作历史名。真实退出场景仍需完整公告证据与显式政策。

分红现金为每股元，Decimal×100得到分的精确有理数；例如0.6元→60/1分。dividPlanDate/RegistDate/OperateDate/PayDate分别保留日期精度；不伪造公告时刻。送股和转增原比例分别保存，空字段不当0。重复同证券/登记/除息/派息日期标DUPLICATE_CANDIDATE。
