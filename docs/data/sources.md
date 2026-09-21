# 来源

BaoStock 0.8.9：已安装、真实登录探针失败（10002007 / timeout），使用与再分发 UNCONFIRMED。Python 3.8.5 只用于采集，requirements 已固定。官方 https://www.baostock.com/helpDocsHome 与 https://pypi.org/project/baostock/ 。
free-stockdb：已读取官方 main README、sync_url.txt；同步配置只有注释示例，无可用镜像。README 标注含分钟约 20GB；未下载全量、未运行服务，2000/2005/2010/2015/2020/2024 窗口均 BLOCKED（无已同步数据）。官方 https://github.com/hello245m/free-stockdb 。
CNEquity：官方 sources.md 指出快照推断退市等限制。未安装，NOT_IMPLEMENTED；不能拿 sample 当真实历史。https://github.com/rootSunc/CNEquity/blob/main/docs/datasets/sources.md 。
AKShare：备用适配器 NOT_IMPLEMENTED。没有用近期分钟顶替 2020。https://akshare.akfamily.xyz/data/stock/stock.html 。
