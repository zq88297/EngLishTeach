# 踩坑记录

## P2026-07-24-1: Impeccable 更新未生效
- **现象**：`npx.cmd impeccable update` 下载 npm 包后，全局技能仍为 v3.9.1。
- **处理**：继续使用当前已读取版本，不阻塞工程；不假定 npm 包会覆盖 Codex 技能目录。

## P2026-07-24-2: Phaser 页面静态可见但 canvas 未挂载
- 现象：调查 UI 能显示，计时和按钮不响应，Phaser 容器没有 canvas。
- 根因：Phaser 3.90 无 webpack 默认导出；同时 Next 16 拒绝来自未允许的 `127.0.0.1` 开发资源，导致 hydration 失败。
- 修复：改用 `import * as Phaser`，增加 `data-load-state`，并配置 `allowedDevOrigins`。
- 验证：桌面和移动均断言 ready canvas、有效截图像素和真实交互。
- 预防：E2E 必须断言 hydration 后状态，不能只检查服务端静态 HTML。

## P2026-07-24-3: Playwright 本地健康探针被代理转发
- 现象：Next 0.5 秒启动成功，但 Playwright webServer 持续收到 502 并在 60 秒后超时。
- 根因：环境有 HTTP(S)_PROXY 但没有 NO_PROXY，本地探针被发送给代理。
- 修复：Playwright 配置保留既有 NO_PROXY，并加入 `localhost,127.0.0.1`；测试服务器固定 IPv4。
- 验证：完整 E2E 10 项通过、2 项按项目条件跳过。
- 预防：跨环境本地服务测试必须显式处理代理绕过和 IPv4/IPv6 解析差异。
