# EnglishTech

- 使用 Next.js、React、Phaser 和 Supabase 构建中文优先的雅思悬疑冒险 PWA。
- 游戏模拟放在 `src/game/`，类型化剧情内容放在 `src/content/`，服务端和用户数据逻辑不得混入 React 视图组件。
- 始终区分剧情失败和学习掌握度；重试不得删除掌握数据。
- 所有内容使用 Zod 校验，共享业务规则使用 Vitest 覆盖。
- 项目中的 README、产品、设计、架构、接口和内容说明文档统一使用简体中文。
- 源代码默认使用 ASCII，只有用户可见中文文案确有需要时使用 Unicode。
