# 踩坑记录

## P2026-07-24-1: Impeccable 更新未生效
- **现象**：`npx.cmd impeccable update` 下载 npm 包后，全局技能仍为 v3.9.1。
- **处理**：继续使用当前已读取版本，不阻塞工程；不假定 npm 包会覆盖 Codex 技能目录。
