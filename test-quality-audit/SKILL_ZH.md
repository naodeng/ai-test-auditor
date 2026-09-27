---
name: test-quality-audit-zh
description: 当需要审查 JavaScript 或 TypeScript Unit、API、Playwright 或 Node `node:test` 测试源码中的虚假信心模式、无效断言或静态测试质量风险时使用。
---

# 测试质量审计

基于可追溯证据审查给定测试源码中的质量风险。核心问题是：**如果生产行为出错，这条测试真的会失败吗？**

## 范围

- 只对 [规则边界](./references/rule-boundary.md) 中已记录的源码模式使用确定性规则 ID。
- 只能把提供的源码与 CLI JSON/文本输出当作证据；不得声称测试已执行、import 已解析、行为被观察、覆盖率被统计或 mutation 被杀死。
- 将可选的 advisory 策略视为纯源码审计的输入：它可展示禁用/活跃选择计数，但不能移除静态发现项、改变分类或退出码、创建 CI 门禁或作发布决定。不得执行测试、模型或 mutation 命令。
- 将可选的 version `1` 基线只视为建议性的身份证据：历史发现项不代表已接受或已豁免，且不改变发现项、分类、分数、策略计数或退出码。
- 将 `ata decision` 输出仅视为版本化建议性摘要：它不是 CI 门禁、通过/失败结果、豁免或发布决定。
- 将 GitHub Actions 参考工作流仅视为纯源码建议性展示：其必填手动 `base-ref` 或 PR base SHA 选择变更测试，且不得创建 PR 评论或执行证据。
- 未命中的测试为 `UNASSESSED`，不是 `STRONG`。
- 将 `ata gate` 视为显式仅 FAKE 门禁：只有 `blockOn: ["FAKE"]` 有效；WEAK 永不阻断，且门禁不执行源码。
- 英文输出读取 [SKILL.md](./SKILL.md) 与 `prompts/test-quality-audit.md`。

## 流程

1. 确认框架、测试类型、给定源码和 CLI 报告；材料缺失时明确列为缺口。
2. 仅应用源码中可见的规则触发条件；规则 ID、行号、观察证据、分类、置信度和修复建议必须放在一起。
3. 对未被确定性规则覆盖的上下文问题，标为审查问题，不得标为 `FAKE`。
4. 使用 [中文 Prompt](./prompts/test-quality-audit-zh.md) 输出独立报告；格式参考 [示例](./examples)，校准时读取 [评估用例](./evals/cases.md)。

## 输出契约

依次输出：范围与证据、确定性发现项、审查问题、未审计边界、按优先级排序的下一步。明确区分静态证据与推断。

## 不要做

- 编造产品需求、期望值、测试执行结果、质量分数或生产缺陷。
- 没有已记录的确定性触发条件时将 `WEAK` 升级为 `FAKE`。
- 声称修改建议能证明测试会发现所有回归。

## v1.2 静态目录与 benchmark

当前 v1.2 目录包含 10 条 Unit、10 条 API、10 条 E2E 规则以及 `PARSER001`。使用 `ata benchmark` 或 `npm run benchmark` 检查版本化源码 fixture 与精确的 rule/classification 身份。benchmark 输出只表示 fixture 一致性，不是运行时质量、覆盖率、mutation、precision、recall 或发布证据。

`--locale en` 与 `--locale zh-CN` 本地化人类可读的 text 和 HTML。直接 Node `node:test` 回调会被识别为 `node-test`；可识别的 Node `assert` 调用会计为原生断言，但审计器仍不会执行它们。审计配置兼容没有 version 的旧文件并规范化为 version `1`，但会拒绝未知字段、空模式和不支持的 provider。JSON 继续是稳定的机器接口 schema。
