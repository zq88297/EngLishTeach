# 架构摘要

- 应用：Next.js App Router + React，负责路由、可访问界面和覆盖层。
- 游戏：Phaser 3，代码归属 src/game/，只管理实时世界与输入。
- 内容：src/content/ 中的版本化 TypeScript 数据，全部通过 Zod 校验。
- 业务：src/domain/ 保存剧情、学习证据、答案匹配和复习规则，由 Vitest 覆盖。
- 数据：src/lib/ 和 Supabase 边界负责认证、同步与本地持久化，不混入 React 视图。
- 验证：Vitest、ESLint、TypeScript、Next.js build 和 Playwright。

## 关键命令

- npm run dev
- npm run test:run
- npm run typecheck
- npm run lint
- npm run build
- npm run test:e2e
