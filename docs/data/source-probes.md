# 探针证据

执行 pnpm data:probe -- --source baostock --start 2020-01-02 --end 2020-01-23。原始 manifest、每次错误与请求位于 .runtime/data/baostock/。错误 10002007，socket timeout；每请求最多2次，子进程30秒上限。空响应记 EMPTY，绝不 PASS。
