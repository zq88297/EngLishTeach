# 技术决策

## D2026-07-24-1: Web 游戏架构
- 选择 Next.js App Router + React DOM 覆盖层 + Phaser 3 Canvas。
- Phaser 管理实时世界，React 管理可访问输入、账号和数据界面。

## D2026-07-24-2: 数据与记忆
- 选择 Supabase Auth/PostgreSQL/Storage、Zod 内容校验和 ts-fsrs 调度。
- 结构化案件内容版本化保存，用户状态持久化到数据库。

## D2026-07-24-3: 视觉基准
- 采用 Impeccable seed-164 的 harbor blue 作为共享品牌锚点。
- 两宗案件使用独立叙事色，但共享组件、排版和可访问性规则。
