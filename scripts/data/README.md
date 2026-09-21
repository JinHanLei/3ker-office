# 数据命令

python -m venv .venv-data；虚拟环境 Python 执行 -m pip install -r scripts/data/requirements.txt。pnpm data:probe 默认 BaoStock；--config 支持 start/end/codes。pnpm data:normalize -- --input 原始目录 --output 暂存目录；data:validate 校验；data:publish -- --input 暂存目录 --output .runtime/scenarios/版本。verify:data 与 demo:real-data 拒绝合成包。probe/fetch 联网；verify 完全离线。缓存仅复用完整成功批次，失败不覆盖旧批次。
