# 实施经验

## 迁移清单

| 旧资料                                   | 新的规范位置                                                     |
| ---------------------------------------- | ---------------------------------------------------------------- |
| 已完成的 v0.1–v1.0 specs 与 plans        | 本 `docs/history/` 文档集与当前项目文档                          |
| `docs/process/implementation-record*.md` | `docs/history/implementation-notes.md`                           |
| 待实施的 optional AI assist 设计         | `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md` |

## 可复用实践

### 材料决策

实现先区分当前事实、假设和未来工作。行为变化先有独立设计和批准；Roadmap 是未来版本计划的唯一详细来源。公开项目文档保持中英文同步，过程资料和历史参考以中文维护。

### 验证命令

行为变更遵循已观察到的 RED/GREEN；交付前运行 `npm test`、`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、`node dist/cli.js review benchmarks --format json` 与 `git diff --check`。基准审计预期返回 `1`，因为它包含确定性 `FAKE` fixture。

### 工程与审查

参考工作流使用最小权限，审计和 gate 的 `0`、`1`、`2` 必须被明确处理。提交前精确暂存并检查缓存差异；审查发现要先复现或用回归测试确认，再做最小修复。

### 已知限制

静态审计不证明运行时质量、覆盖率、变异得分或发布就绪性。未来 runtime、mutation 与模型能力必须是显式、独立、可验证的适配层，且不能改写 v1.0 静态结论。

## 2026-09-09 文档收敛

本次将已完成版本的过程资料抽象为中文历史参考，双语项目文档保留当前使用契约，Context 记录稳定基线。已验证：文档契约测试、完整 `npm test`（175 项）、lint、typecheck、format check、build 和 `git diff --check` 通过；基准审计按预期以退出码 `1` 返回确定性 `FAKE` 发现项。

## 2026-09-09 npm 分发边界

`v1.0.1` 将 npm 发布物限制为编译后的 `dist/`、双语 README 与许可证；源码、测试、历史过程资料和 CI 配置保留在 GitHub 仓库，不进入运行时 CLI 包。`prepack` 在打包和发布前执行 TypeScript 构建，避免分发过期产物。

## 2026-09-09 npm 运行时依赖修复

发布后的 CLI 在全局安装环境中会加载 TypeScript Compiler API；因此 `typescript` 必须位于 `dependencies`，不能仅位于 `devDependencies`。`v1.0.2` 以补丁版本修正该 manifest 契约，并增加回归测试以防止再次遗漏。

## 2026-09-09 发布产物回归测试

npm CLI 的符号链接回归测试需要先生成 `dist/`；测试通过 Node 的模块解析定位 TypeScript 编译器，兼容干净 CI checkout 与共享依赖的本地 worktree。`v1.0.3` 只修复该验证前置条件，审计行为与 npm 运行时产物保持不变。

## 2026-09-09 HTML 报告口径与中文提示

HTML 汇总将 `summary.total` 明确标注为“静态审计项”，并单独展示由 AST 提取的测试回调数；两者在存在解析诊断时可以不同，均不等同于测试运行器的注册实例数。中文报告同时显示分类和严重度的中文含义与稳定枚举值。`E2E001`–`E2E004` 的规则 ID 提供悬浮说明，但不改变规则判定、静态汇总、FTR、Trust Score 或退出码。

## 2026-09-09 Allure 风格静态审计工作台

HTML 报告按文件聚合发现项并显示数量，修复建议改为原生折叠详情；筛选后空文件组自动隐藏，并新增按分类导航与中文无障碍标签。该改动只优化离线展示，不执行测试、不引入 Allure 或网络依赖、不暴露测试源码，也不改变发现项、FTR、Trust Score 或退出码。

## 2026-09-10 输出路径提示

`review --output <path>` 默认保持标准输出干净；新增可选 `--print-output-path`，在报告原子写入成功后向标准错误输出绝对路径。该提示不改变报告内容、退出码或 JSON schema，便于调用方生成本地文件链接。

HTML 未指定 `--output` 时会写入当前目录的默认文件：英文为 `audit.html`，中文为 `audit-zh.html`。text 与 JSON 继续写入标准输出，避免破坏管道与结构化消费者。

## 2026-09-10 v1.1.0 发布版本

`v1.1.0` 汇集静态 HTML 审计报告的口径澄清、中文分类/严重度提示、规则 ID 悬浮说明、Allure 信息架构风格的离线工作台，以及 HTML 默认输出路径与可选绝对路径提示。它仍是源码静态审计：不会执行被审计测试，也不将未评估项解释为测试质量结论。

## 2026-09-10 报告可读性修复

规则 ID 的解释不能只依赖浏览器原生 `title`，因为部分报告查看器不会显示该提示。HTML 报告改为提供可见的悬浮和键盘焦点 tooltip；“按规则浏览”同时直接显示规则短解释。文件分组以文件名作为标题，完整路径降为可换行的次级信息，以保留溯源能力并减少长绝对路径对阅读层级的干扰。

中文 HTML 报告对 `E2E001`–`E2E004` 同时本地化问题说明和修复建议；JSON 与文本报告仍保留规则引擎的稳定原始消息，因此不会改变机器消费者或静态发现语义。

## 2026-09-10 v1.1.1 发布版本

`v1.1.1` 修复离线 HTML 报告在部分查看器中无法展示原生规则说明的问题，补足 E2E 规则导航、正文提示以及中文问题说明与修复建议，并优化文件路径的阅读层级。静态发现、原始分类、FTR 和 Trust Score 的计算语义保持不变。

## 2026-09-10 按框架静态口径

HTML 报告新增 Vitest、Playwright 与 Jest 的框架分组，分别展示 AST 提取的静态测试回调数及关联发现项数。报告明确运行器注册实例未执行、未统计：该分组不能替代 Playwright/Vitest 的 `--list` 或实际执行结果。发现项仍按源文件关联，无法可靠归属到已提取回调的异常诊断不被虚构分配到某个框架；静态发现、FTR、Trust Score 和退出码保持不变。

## 2026-09-10 后续路线图与 Project 治理

`v1.1.1` 已发布不代表旧版 v1.1 计划完成。因版本号已使用，未完成的稳定性、公开契约、配置与报告目标统一转入 `v1.2`，并与规则增强、证据质量和 benchmark 工作一起排期。当前规则基线为 Unit 6 条、API 2 条、E2E 4 条和 Parser 1 条；v1.2 可以增强这些审计，但每条新增规则均须保留确定性/静态边界并具有正反例、benchmark 与双语文档。

GitHub Project 是路线图的执行视图：卡片记录版本、边界、验收证据、风险和状态；它不替代路线图，也不得把设计卡或未验证工作表述为已交付。获得 `project` scope 后，已在 `naodeng` 下创建 [AI Test Auditor Roadmap](https://github.com/users/naodeng/projects/3)：包含 v1.2 的 7 张执行卡，以及 v1.5、v2.0–v2.7、v3.0、v3.x 的 9 张 Epic 卡。所有卡片均已写入路线图版本、工作类型、证据状态、风险与路线图状态。

## 2026-09-20 v1.2 规则扩充与验证

材料决策：v1.2 保持确定性、纯源码边界，将 Unit、API、E2E 各扩充到 10 条稳定规则；新增规则只接受有边界的 AST 证据，依赖上下文的提示保持 `WEAK`，未命中的测试保持 `UNASSESSED`。增加 version `1` benchmark manifest，用精确的 finding/classification 身份和明确的 `nonTriggers` 固定三类 fixture 契约；不执行 fixture 源码，也不引入运行时、网络、mutation 或模型证据。

已观察的验证链：规则目录先以 RED 暴露缺失的 ID 与版本行为，再以 GREEN 通过；Unit、API、E2E 新规则分别完成正反例 RED/GREEN；benchmark manifest、配置兼容性、locale、reporter 无障碍状态和双语文档契约均完成聚焦 RED/GREEN。`npm run benchmark` 已实际构建并通过 3 个 v1.2 fixture（Unit/API/E2E 各 1 个），每个 fixture 均比对精确 finding/classification 身份。

最终 fresh 门禁：`npm test` 通过 23 个测试文件、239 个测试；`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、`npm run benchmark` 和 `git diff --check` 均通过。`node dist/cli.js review benchmarks --format json` 按既有约定以退出码 `1` 返回确定性 FAKE/WEAK 发现项，并非命令错误。

已知限制：本迭代证据仍是静态源码和 fixture 一致性证据，不代表真实运行时质量、覆盖率、mutation、precision、recall、业务验收、部署或发布完成。

## 2026-09-20 v1.2 review follow-up

审查发现并修复四项边界问题：空 benchmark manifest 不再以 `0/0 passed` 假通过；配置中的显式 `null` 不再被当作缺省 version/include/exclude；package manifest 读取或解析失败会转换为受控的输入错误和退出码 `2`；中英文 Context 标题与 v1.1.1 基线保持一致。

本次修复先为四类行为补充回归测试并观察到聚焦 RED（4 个新增失败断言），再做最小实现；聚焦 GREEN 为 3 个测试文件、55 个测试通过。修复后的 fresh 门禁为 23 个测试文件、239 个测试通过，lint、类型检查、格式检查、构建、benchmark 和 diff check 均通过；benchmark 为 3/3 fixture，通过 `review benchmarks` 返回的退出码 `1` 仍仅表示样例包含确定性 FAKE/WEAK 发现项。

## 2026-09-20 v1.2.0 发布版本

v1.2.0 正式完成并发布 v1.2 静态审计增强：Unit、API、E2E 各维护 10 条规则；增加 version `1` 的纯源码 benchmark corpus；加固配置、CLI 输入、报告本地化与文档契约；继续保持不执行被审计源码、不访问网络、不引入运行时、mutation 或模型证据的边界。

发布提交前再次通过 23 个测试文件、239 个测试，lint、typecheck、format、build、benchmark（3/3）和 `git diff --check`；`package.json` 与 `package-lock.json` 同步为 `1.2.0`。

## 2026-09-20 advisory workflow 退出语义修复

GitHub Actions run `35501372111` 的 checkout、依赖安装和 build 均通过，失败点是 advisory workflow 在成功生成审计与 decision summary 后继续执行 `exit "$audit_exit"`；改动测试先观察到该旧契约的 RED，再将 `.github/workflows/audit-reference.yml` 改为发现项仍写入 Summary 但以 `0` 完成。无效输入 `2` 仍失败，显式 `audit-gate-reference.yml` 的 gate 退出语义保持不变。

本次修复后的聚焦 workflow 测试为 5/5，完整测试为 23 个文件、239 个测试通过；lint、typecheck、format、build、benchmark（3/3）和 `git diff --check` 均通过。

## 2026-09-20 v1.2.1 发布版本

v1.2.1 是 v1.2.0 的补丁发布，包含 advisory GitHub Actions workflow 退出语义修复：发现项仍写入 Job Summary，不再让 advisory workflow 因静态 FAKE/WEAK 结果失败；无效输入 `2` 与显式 gate 语义保持不变。

发布提交前通过 23 个测试文件、239 个测试，lint、typecheck、format、build、benchmark（3/3）和 `git diff --check`；`package.json` 与 `package-lock.json` 同步为 `1.2.1`。

## 2026-09-27 Node 原生断言识别

背景决策：Node `node:test` 回调纳入框架识别，框架值为 `node-test`；直接 `assert(...)`、`assert.method(...)` 以及从 `node:assert` 静态声明的绑定作为可识别的原生断言。比较型原生断言复用 `UT002`、`UT003`、`UT011` 的既有静态规则；Node 测试仍保持 `type: "unknown"`，因为 `node:test` 本身不能证明测试属于 unit、API 或集成类型。封装和间接 helper 不作推断，保持 `UNASSESSED`；审计器不 import、执行或解析运行时依赖。

验证证据：先为 Node 框架提取和 `assert.strictEqual` 断言补充回归测试并观察到聚焦 RED（2 条失败）；最小实现后聚焦 GREEN 为 4 个测试文件、86 个测试通过。复核参数顺序时又补充“独立 actual/expected 不应误报”的回归测试并观察到 1 条 RED，修正后聚焦 GREEN 为 4 个测试文件、87 个测试通过。随后增加同名业务函数反例，观察到 1 条 RED 后收紧为直接 `assert` 调用，聚焦 GREEN 为 1 个测试文件、48 个测试通过。最终 `npm test` 通过 23 个测试文件、244 个测试，`npm run lint`、`npm run typecheck`、`npm run build`、`npm run benchmark`（3/3）和 `git diff --check` 通过；本次变更文件的 Prettier 检查通过。完整 `npm run format:check` 仍仅被既有未跟踪的 `.impeccable/hook.cache.json` 阻断，本次变更文件没有格式问题。

实际审计验证：构建后的 `node dist/cli.js review /Users/nao.deng/awsomeCode/dsh-qa/test --format json` 识别 264 个测试回调，其中 219 个为 `node-test`，没有产生 `UT001`；修正原生断言参数顺序后静态汇总为 1 个 `FAKE`、40 个 `WEAK`、223 个 `UNASSESSED`。这只证明当前源码模式被正确提取和评估，不代表 dsh-qa 的运行时质量、覆盖率、mutation 或业务验收。

## 2026-09-27 报告发现项卡片样式修正

Impeccable detector 指出离线 HTML 报告的 finding 卡片使用 4px 左侧彩色边框，形成典型 side-tab 视觉。该反馈判定为真实设计问题，已改为 1px 中性全边框，`FAKE` 仅使用较暗的边框色；没有新增 ignore 或压制规则。报告数据、分类、发现项、FTR、Trust Score 和交互行为保持不变。

验证：`tests/reporters.test.ts` 的 22 个测试、lint、typecheck、`git diff --check`、本次变更文件的 Prettier 检查均通过；手动 detector 对 `src/reporters.ts` 返回空结果。

## 2026-09-27 Node 原生断言绑定误报修复

审查发现：`node:assert` 的具名 import 或别名虽然是有效断言，却因回调源码不包含文件级 import 而被 `UT001` 判为 `FAKE`。修复将静态 `node:assert` 绑定作为可选 `TestCase` 元数据传入规则；它只记录 ESM 的 default、namespace 和具名绑定，不做模块解析或执行。封装和间接 helper 仍不被推断，旧的直接 `assert(...)` 与 `assert.method(...)` 识别保持不变。

验证链：先增加真实 extractor → rule-engine 回归并观察到 RED，随后最小实现后聚焦测试 GREEN；`npm test` 通过 23 个测试文件、245 个测试，lint、typecheck、build、benchmark（3/3）、`git diff --check` 和本次变更文件的 Prettier 检查均通过。完整 `npm run format:check` 仍只被既有未跟踪的 `.impeccable/hook.cache.json` 阻断。构建后的 dsh-qa 审计没有产生 `UT001`；这些结果只证明源码模式识别，不代表运行时质量或业务验收。
