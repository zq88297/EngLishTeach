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

## P2026-07-25-4: 开发服务器未跨会话持续运行
- 现象：浏览器访问 `http://localhost:3100` 报 `ERR_CONNECTION_REFUSED`。
- 根因：工具控制的开发进程生命周期不适合作为交付服务，且最初只绑定 `0.0.0.0`，IPv6 `localhost` 会立即拒绝连接；不是页面代码或构建错误。
- 修复：使用用户级 transient systemd 服务托管 Next，绑定双栈地址 `::`，并配置异常自动重启。
- 验证：服务状态为 active；IPv4 与 IPv6 HTTP 探针均返回 200；Playwright 首屏测试通过；Chromium 直接访问 localhost 得到 200，标题正确且 Canvas ready。
- 预防：交付本地 URL 前同时检查 systemd 状态、IPv4/IPv6 HTTP 响应和真实 Chromium；transient 服务在系统重启后需要重新启动，长期部署应使用永久 unit 或生产部署。

## P2026-07-25-5: Canvas 存在但超宽场景近乎纯黑
- 现象：React 界面和 Canvas 均已加载，但 `1874x958` 桌面中调查世界大部分为深色空白。
- 根因：Phaser 使用 RESIZE 画布，`drawRoom()` 却把房间固定绘制为 `960x540`；原 E2E 只断言颜色数大于 8，少量对象即可误通过。
- 修复：房间、窗格、调查路径、证物台、出口和目标位置改用实际画布尺寸，并提高地面与墙体对比度及大屏角色缩放。
- 验证：超宽 Chromium 有效场景覆盖率 96.1%、90 种颜色、无页面错误；完整 E2E 11 项通过、3 项按项目条件跳过。
- 预防：Canvas 视觉验收同时检查无遮挡区域覆盖率和指定超宽视口，不能只检查节点存在、ready 状态或颜色种类。
