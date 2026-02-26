# 工程重构实施 Spec

## Why

基于已完成的工程审计报告，需要开始落地重构切片，优先解决高风险耦合与重复逻辑，降低维护成本并保证默认主题风格一致性。

## What Changes

- 建立 IPC 契约与客户端封装，收敛通道字符串与返回模型。
- 抽离生成器通用流程与文件名构建逻辑，减少四个 Generator 的重复代码。
- 补齐 Semi Design 默认主题基线样式并限制全局 reset 影响面，避免样式覆盖。
- 收敛存储与状态访问入口，统一 localStorage key 与 jotai atom 边界。
- 增加基础错误兜底（ErrorBoundary/统一错误结果）与最小测试集。

## Impact

- Affected specs: IPC 契约、状态管理、组件分层、样式与主题、错误处理、测试策略。
- Affected code: `electron/*`、`src/services/*`、`src/features/*`、`src/components/*`、`src/index.css`、`src/main.tsx`。

## ADDED Requirements

### Requirement: IPC 契约与调用封装

系统 SHALL 提供集中管理的 IPC 通道常量与统一调用封装，渲染侧不直接使用字符串通道调用。

#### Scenario: IPC 调用成功

- **WHEN** 渲染侧发起 IPC 调用
- **THEN** 通过统一客户端封装调用，并返回统一 Result 结构

### Requirement: 生成器流程复用

系统 SHALL 通过复用逻辑统一四类生成器的生成、保存、历史与错误处理流程。

#### Scenario: 生成流程复用成功

- **WHEN** 任一 Generator 触发生成
- **THEN** 使用复用流程完成保存与历史写入，且 UI 行为一致

### Requirement: 默认主题样式一致性

系统 SHALL 保持 semidesign 默认主题风格，不引入额外渐变或阴影。

#### Scenario: 默认主题一致

- **WHEN** 应用渲染界面
- **THEN** Semi 组件样式与 Tailwind token 能正常生效，且不被全局 reset 破坏

## MODIFIED Requirements

### Requirement: 状态与持久化边界

项目 SHOULD 以 jotai 作为状态入口，storage 访问通过集中模块封装，避免分散 localStorage 读写。

## REMOVED Requirements

### Requirement: 无

**Reason**: 本次为重构实施，不直接移除业务能力。
**Migration**: 无。
