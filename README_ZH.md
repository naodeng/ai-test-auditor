<div align="right"><a href="./README.md">English</a> · <strong>简体中文</strong></div>

# AI Test Auditor

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。商业用途不属于该许可证
允许的用途；使用、复制或分发前请阅读[官方完整条款](https://polyformproject.org/licenses/noncommercial/1.0.0)。

> 不要信任 AI 生成的测试。验证它们。

**AI Test Auditor** 是一个本地优先的 CLI，用于发现 JavaScript / TypeScript 测试中可由静态规则确定识别的无效测试信号。它审计测试**源码**，不会运行被审计的测试。

核心问题是：**如果生产行为出错，这条测试真的会失败吗？**

## 能做什么

- 扫描 `.test.ts`、`.spec.ts`、`.test.tsx`、`.spec.tsx`、`.test.js`、`.spec.js` 和 `.e2e.ts`。
- 用 TypeScript AST 提取直接定义的 Jest、Vitest、Playwright `test` / `it` 回调。
- 输出带源码位置和修复建议的高置信度、确定性 `FAKE` 与 `WEAK` 发现项。
- 通过 `ata review` 提供文本或 JSON 输出。
- 内置独立的中英文 `test-quality-audit` Skill 与有证据边界的 Prompt。
- 通过 `--mutation-report` 读取可选、版本化的变异证据，但不运行 mutation 工具。

## v0.1 不做什么

它**不会**执行测试、检查运行时行为、调用 LLM、运行 Mutation Testing、计算覆盖率、校验 import / fixture，也不会将未命中的测试标为 `STRONG`。未命中的测试统一是 `UNASSESSED`。

## v0.4 变异证据

传入由你自己的 mutation 工作流产出的报告：

```bash
node dist/cli.js review ./tests --mutation-report ./mutation-report.json --format json
```

```json
{
  "version": "1",
  "engine": "stryker",
  "command": "npx stryker run",
  "threshold": {
    "minimumScore": 80,
    "source": "stryker.conf.json: thresholds.high"
  },
  "result": {
    "totalMutants": 10,
    "killed": 8,
    "survived": 2,
    "score": 80
  }
}
```

记录的命令与阈值来源是必需的溯源信息，不是待执行的指令：AI Test Auditor 绝不会执行该命令。低于 `minimumScore` 的结果仍是有效的建议性证据；它绝不改变静态分类、FTR、Trust Score 或进程退出码。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run build
node dist/cli.js review ./tests
```

```bash
node dist/cli.js review tests/checkout.e2e.ts --type e2e
node dist/cli.js review benchmarks --format json
```

安装后的包可通过 `ata review [path]` 运行；源码 checkout 使用 `node dist/cli.js review [path]`。两者默认审计当前目录，且绝不会 import 或执行目标源码。

### 退出码

| 代码 | 含义                                                 |
| ---- | ---------------------------------------------------- |
| `0`  | 未输出确定性的 `FAKE` 发现项；这不表示测试已经很强。 |
| `1`  | 至少输出一条确定性的 `FAKE` 发现项。                 |
| `2`  | 命令或输入路径无效。                                 |

## 规则与边界

v0.1 包含 UT001、UT002、UT003、UT008、UT011、API001、E2E001、E2E002、E2E004。规则优先保证可解释、可追溯的源码证据，而非追求规则数量。完整说明见[规则目录](./docs/zh/rules.md)。

FTR 和 Trust Score 只是透明的排序启发式指标，不是运行时质量、变异分数或发布结论。

## 文档

- [需求文档](./docs/zh/requirements.md)
- [架构设计](./docs/zh/architecture.md)
- [规则目录](./docs/zh/rules.md)
- [迭代计划](./docs/zh/roadmap.md)
- [开发指南](./docs/zh/development.md)
- [实施过程记录](./docs/process/implementation-record_zh.md)
- [贡献指南](./CONTRIBUTING_ZH.md)

## 开发验证

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

项目约定见 [AGENTS.md](./AGENTS.md)。
