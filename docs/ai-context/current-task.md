> Last updated: 2026-07-25

## 已完成

- [x] 产品需求与实施计划确认
- [x] Phaser 固定为 3.90.0，Next/Serwist 固定使用 webpack 构建
- [x] 学习事件、剧情失败、检查点重试和掌握度分离规则
- [x] 两宗案件共 14 章、42 个词汇义项及 Zod 跨引用校验
- [x] React 调查总部、Phaser 场景、触控移动、限时英文输入和可访问导航
- [x] Dexie 离线队列、Supabase Auth 边界、迁移与 RLS
- [x] PWA manifest、Service Worker 和 192/512 图标
- [x] Vitest、类型、Lint、构建、桌面/移动 Playwright、canvas 像素和 axe 验证
- [x] 对抗性审查与三个月运行检查，修复同步并发、RLS 幂等重放和网络降级

## 进行中

- [x] 开发服务器已在 `http://localhost:3100` 启动并返回 HTTP 200
- [ ] 提交当前代码与可跨环境会话上下文，并推送到远端当前分支
- [ ] 等待用户进行产品验收

## 待完成

- [ ] 制作 14 章听力音频；当前使用完整字幕降级。
- [ ] 把事件证据接入完整 FSRS 调度和自适应陷阱选择。
- [ ] 实现总部成长、账号偏好持久化和云端剧情进度同步。
- [ ] 在实际 Supabase 项目配置环境变量并执行迁移验收。

## 关键上下文

- 当前为 portable 跨环境上下文；本轮正在提交代码和上下文，推送完成前状态为“待同步”。
- 核心版本：Next 16.2.11、React 19.2.8、TypeScript 6.0.3、Phaser 3.90.0、Zod 4.4.3。
- 剧情失败和学习掌握度永久分离；超时、失焦、系统中断不降低掌握度。
- 沙箱 `bwrap` 存在 `RTM_NEWADDR` 故障，内置 apply_patch 不可用；系统 patch 会生成 `.orig/.rej`，必须清理。
- `npm install` 曾报告 1 moderate、3 high；未运行会上传依赖元数据的 `npm audit --omit=dev`。

## 下次继续

- 第一步：打开本地交付 URL，验收案件切换、英文输入、移动端布局和音频字幕降级。
- 当前状态：可运行 MVP 已通过自动验证，正在提交并推送；产品验收仍待完成。

## 关键文件清单

- `src/components/InvestigationApp.tsx` - 调查主界面与学习交互
- `src/game/InvestigationScene.ts` - Phaser 调查场景
- `src/domain/learning.ts` - 学习证据和掌握规则
- `src/domain/story.ts` - 剧情失败与检查点规则
- `src/content/cases.ts` - 两宗案件内容
- `src/data/localDatabase.ts` - 离线存储和同步队列
- `src/lib/supabase/sync.ts` - 并发合并的云同步边界
- `supabase/migrations/202607240001_initial.sql` - 服务端数据结构与 RLS
- `e2e/investigation.spec.ts` - 桌面/移动浏览器验收
