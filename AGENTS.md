# AGENTS.md

## Project purpose

`ai-test-auditor` is a deterministic static analyzer for test source. v1.0 is the current stable baseline for source-backed signs of ineffective JavaScript and TypeScript tests. Do not describe it as a test runner, an LLM reviewer, a mutation-testing tool, or evidence that an unflagged test is strong.

## Scope and boundaries

- Supported source conventions: Jest, Vitest, Playwright, and Node `node:test` `test` / `it` callbacks in JS/TS/TSX files. Node tests may use recognized `node:assert` calls as native assertions.
- Do not import, execute, or evaluate reviewed test source.
- Findings require a stable rule ID, classification, severity, confidence, source location, bounded message, remediation, and regression test.
- `FAKE` is reserved for deterministic syntactic evidence. Context-dependent hints must be `WEAK` or omitted.
- An unflagged test is `UNASSESSED`, never `STRONG`.
- Keep English public documentation primary and synchronize Chinese counterparts when public behavior changes.

## Working conventions

1. Read the related rule, its test, and [docs/rules.md](./docs/rules.md) before changing analysis behavior.
2. Apply TDD to every feature, bug fix, refactor, and behavior change: add a focused failing test, confirm the expected RED failure, implement the smallest change, confirm GREEN, then refactor only while green. Production code without an observed failing test is not acceptable.
3. Preserve unrelated working-tree changes. Do not reset, clean, or overwrite them.
4. Add Chinese process evidence to `docs/history/implementation-notes.md` for material decisions, validation commands, scope changes, and known limits.
5. Keep `test-quality-audit/` bilingual: English `SKILL.md`, Chinese `SKILL_ZH.md`, matching prompts, and maintained examples/evals.

## Commands

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

Run the relevant tests after every code change and the full command set before reporting completion. Never claim a check passed without fresh command output.

## Documentation rules

- State facts, assumptions, and future work separately.
- Do not invent quality percentages, execution results, coverage, mutation scores, integrations, or compatibility guarantees.
- Link only to paths that exist in this repository.
- Mermaid is preferred for editable architecture diagrams.

## Future iteration rules

Before v2.0+ work, read [docs/roadmap.md](./docs/roadmap.md), [docs/context.md](./docs/context.md), the affected rule, and its test. Roadmap is the only detailed future plan; README and Context may only summarize or link it. Obtain approval for an independent design before implementing any future adapter.

Future runtime, mutation, or model adapters must be explicit and verifiable. They must not silently execute reviewed source, read credentials, or call networks, and must not alter static findings/classifications, `FAKE`/`WEAK`/`UNASSESSED`, FTR, Trust Score, existing exit semantics, or FAKE-only opt-in gate inputs. Keep public project documents and Skill assets bilingual; maintain process/history material in Chinese.

## Delivery

Do not commit, push, tag, or create a pull request unless the user explicitly asks. Keep CI limited to the documented local validation commands.
