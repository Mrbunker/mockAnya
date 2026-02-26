# Tasks

- [x] Task 1: 盘点工程结构与关键链路
  - [x] SubTask 1.1: 梳理目录职责、模块边界与主要数据流
  - [x] SubTask 1.2: 识别高耦合区域与循环依赖风险（如有）
  - [x] SubTask 1.3: 汇总当前构建/配置/脚本与工程约束

- [x] Task 2: 评估状态管理与副作用组织方式
  - [x] SubTask 2.1: 盘点 jotai atoms 的分布、职责与依赖关系
  - [x] SubTask 2.2: 梳理请求/缓存/持久化/订阅等副作用入口与约束
  - [x] SubTask 2.3: 提出可执行的分层与抽象建议

- [x] Task 3: 评估组件与页面分层策略
  - [x] SubTask 3.1: 识别“通用组件/业务组件/页面容器”混用情况
  - [x] SubTask 3.2: 识别重复 UI/逻辑并给出抽离方案（多处使用优先抽离）
  - [x] SubTask 3.3: 对齐 semidesign 默认主题风格约束的工程落点

- [x] Task 4: 评估错误处理、日志与可测试性
  - [x] SubTask 4.1: 梳理错误边界、异常上报（如有）与用户反馈策略
  - [x] SubTask 4.2: 盘点测试现状与可测性阻塞点（耦合/全局单例/副作用）
  - [x] SubTask 4.3: 给出可落地的验证策略（单测/集成/手动回归清单）

- [x] Task 5: 产出重构审计报告与实施清单
  - [x] SubTask 5.1: 输出问题清单（按优先级：P0/P1/P2）与风险评估
  - [x] SubTask 5.2: 输出重构路线图（分阶段、小步迁移、可回滚）
  - [x] SubTask 5.3: 输出可执行的实施任务（可在后续 specs 中拆分实现）

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 1, Task 2, Task 3, Task 4
