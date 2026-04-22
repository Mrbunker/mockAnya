# 项目开发规范 (AI 辅助开发指南)

## 📦 技术栈
- **包管理器**: pnpm
- **前端框架**: React 18 + TypeScript
- **状态管理**: jotai
- **UI 组件库**: Semi Design
- **CSS 框架**: Tailwind CSS
- **构建工具**: Vite
- **桌面端框架**: Electron

## 🏗️ 架构规范

### 组件与逻辑复用
- 当某个逻辑或 UI 结构在项目中出现多次（2次及以上）时，**必须**将其抽离为独立的组件、自定义 Hook 或公共常量。
- 遵循 DRY（Don't Repeat Yourself）原则。

### 状态管理策略
- 局部状态：使用 React 自身的 `useState` / `useReducer`
- 全局状态：严格使用 `jotai` 进行状态管理，避免使用其他状态管理库或通过层层 Props 传递
- 复杂逻辑：结合 `ahooks` 中的 hooks 处理常见业务逻辑

## 🎨 UI & 样式规范

### Semi Design 主题设定
- **严格遵循 Semi Design 默认设计风格**
- 视觉风格：清晰、扁平
- **禁止使用渐变色**（No Gradients）
- **禁止使用阴影**（No Shadows）
- 组件样式定制时，优先使用 Semi Design 的 Design Token

### Tailwind CSS 使用
- 使用 Tailwind CSS 处理组件外部布局和特定状态样式
- 借助 `clsx` 和 `tailwind-merge` 处理动态类名的合并与冲突

## 🤖 AI 交互建议
- 生成代码时，请始终考虑是否符合上述技术栈和设计规范
- 遇到新需求时，请先分析是否可以通过复用现有组件/逻辑来实现
- 在进行样式调整时，请时刻牢记“无渐变、无阴影”的硬性规定