# Tasks

- [x] Task 1: 扩展文本格式选项与 UI
  - [x] SubTask 1.1: 文本格式选项增加 CSV/PDF
  - [x] SubTask 1.2: 格式与文件名扩展名映射一致
- [x] Task 2: 扩展文本生成与后端 PDF 生成能力
  - [x] SubTask 2.1: generateText 支持 CSV/PDF 数据生成或转发
  - [x] SubTask 2.2: IPC 契约新增 generatePdf，主进程生成 PDF
  - [x] SubTask 2.3: 非桌面端 PDF 生成返回不可用错误
- [x] Task 3: 校验与回归
  - [x] SubTask 3.1: 关键流程类型检查
  - [x] SubTask 3.2: 验证 TXT/CSV/JSON/PDF 保存输出

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
