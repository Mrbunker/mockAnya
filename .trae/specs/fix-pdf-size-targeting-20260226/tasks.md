# Tasks
- [x] Task 1: 更新 generatePdf IPC 契约与调用参数
  - [x] SubTask 1.1: payload 增加 targetBytes 并更新类型映射
  - [x] SubTask 1.2: 渲染侧 pdf 分支传入 targetBytes 并移除迭代试探
- [x] Task 2: 主进程实现确定性 PDF 组装与目标大小填充
  - [x] SubTask 2.1: 组装最小可用 PDF（含可复制文本）
  - [x] SubTask 2.2: 增加 padding stream/object 以精确调节总字节数
  - [x] SubTask 2.3: 处理目标小于最小大小的降级策略
- [x] Task 3: 回归验证与工具检查
  - [x] SubTask 3.1: emo tsc --noEmit
  - [x] SubTask 3.2: eslint 变更文件
  - [x] SubTask 3.3: 手工验证 20KB/100KB 目标大小偏差与可打开性

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
