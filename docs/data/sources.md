# 来源、版本与用途

BaoStock：初始 0.8.9 登录持续超时/10002007；核对 PyPI 当前发布后升级至 **0.9.4**，实测成功。distribution=0.9.4，SDK 自报 00.9.40；Python 3.8.5，全部采集依赖锁定 requirements。官方 https://www.baostock.com/helpDocsHome 、https://pypi.org/project/baostock/ 。 SDK 使用 www.baostock.com:10030。免费接口已实测；用途授权和公开再分发均 UNCONFIRMED，原文留在忽略目录。

free-stockdb：官方 main commit **74a26af765acef4f1c6b703d12eb25493fa05c0d**，Release **测试版本0.3.5**；Windows 发行包元数据大小 4,328,388 字节，未下载执行。sync_url.txt 实际只有注释/示例，无活动镜像，SHA-256 583e41832a32b93b4a1531ca9261c1a1004748e7efce841b4dc63b48914cf0a8。README 提示分钟数据约20GB；未静默同步全库。2000/2005/2010/2015/2020/2024 长历史查询均 BLOCKED（无源/无本地库）。https://github.com/hello245m/free-stockdb 。代码许可不等于数据再分发许可。

CNEquity：只读取官方数据源限制文档，未安装，NOT_IMPLEMENTED。快照推断退市不可直接触发核销。https://github.com/rootSunc/CNEquity/blob/main/docs/datasets/sources.md 。

AKShare：备用适配器 NOT_IMPLEMENTED；BaoStock 小样本成功后未引入另一套采集系统。https://akshare.akfamily.xyz/data/stock/stock.html 。没有用近期分钟冒充2020。
