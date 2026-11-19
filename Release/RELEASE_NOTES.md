# CoEdit v1.0.0

项目口号：本地协作，随时同步。

CoEdit 是可嵌入的本地优先协作编辑引擎。它可以给笔记、文档、代码编辑器等应用加入多人协作能力：断网后继续编辑，联网后按操作增量合并，所有副本最终一致。

## 本次交付内容

- TypeScript SDK：Document 操作日志、富文本格式标记、历史快照与恢复、增量变更重放
- 同步层：SyncManager、离线队列、幂等接收、重连确认、在线状态与待同步计数
- 持久化：MemoryStorage 与本地恢复
- React 绑定：Hook、光标层、在线用户列表、历史面板
- Rust 骨架：CRDT 核心、WASM 绑定、可选同步服务器
- 可视化演示页：examples/collab-demo
- 品牌资源：10 版透明背景 Logo，当前使用 v10

## 验证

- npm test --workspaces：2 个测试文件，15 项测试通过
- npx tsc -p tsconfig.json --noEmit：通过
- 浏览器实测：连接、离线编辑、远端合并、去重、历史回溯与重置均可运行

## 已知边界

- Rust 工具链未在当前构建环境提供，Rust 测试未在本环境执行
- 演示页使用模拟 WebSocket 状态，真实服务端同步与端到端加密仍属于后续里程碑

Apache 2.0 © 2026 科技酱
