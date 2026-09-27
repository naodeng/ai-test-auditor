<div align="right"><strong>English</strong> · <a href="./README_ZH.md">简体中文</a></div>

# AI Test Auditor

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

> Do not trust AI-generated tests. Verify their static evidence.

AI Test Auditor is a local-first, source-only audit for deterministic signs of ineffective JavaScript and TypeScript tests. It reads test source; it does not import or execute it.

## Why AI Test Auditor?

Tests can look complete while failing to verify observable behavior. This tool surfaces narrow, source-backed signals of false confidence before a team relies on a test.

## Core capabilities and limits

It extracts direct Jest, Vitest, Playwright, and Node `node:test` callbacks. Node tests can use recognized native `node:assert` calls as assertions. It reports source-located `FAKE` or `WEAK` findings with remediation and supports changed-file selection, optional mutation evidence, advisory policy, baseline comparison, advisory decision projection, and an explicit opt-in policy gate.

It does not run tests, inspect runtime behavior, invoke an LLM, calculate coverage, or infer production-code-to-test relevance. An unflagged test is `UNASSESSED`, never `STRONG`. FTR and Trust Score are prioritization aids, not release decisions.

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run build
node dist/cli.js review ./tests --format json
```

The installed package exposes the same command as `ata review [path]`. A source checkout uses `node dist/cli.js review [path]`.

Expected result: JSON lists extracted tests and any deterministic findings; exit `1` means at least one `FAKE`, while `0` does not prove tests are strong.

## Common workflows

```bash
# Select supported test files changed since a local ref.
node dist/cli.js review . --changed-since HEAD~1 --format json

# Add versioned evidence or advisory context without changing static meaning.
node dist/cli.js review ./tests --mutation-report ./mutation-report.json
node dist/cli.js review ./tests --policy ./audit-policy.json
node dist/cli.js review ./tests --baseline ./finding-baseline.json

# Project a strict advisory decision or evaluate an explicit gate.
node dist/cli.js decision ./decision-envelope.json
node dist/cli.js gate ./gate-policy.json ./audit-envelope.json

# Generate a local, filterable report (English is the default).
node dist/cli.js review ./tests --format html --output audit.html
node dist/cli.js review ./tests --format html --locale zh-CN --output audit-zh.html

# Run the versioned, source-only v1.2 benchmark corpus.
npm run benchmark
```

`--output` works with text, json, and html. HTML writes to `audit.html` by default, or `audit-zh.html` with `--locale zh-CN`; text and JSON keep writing to stdout. `--locale zh-CN` localizes text and HTML; omitting it uses `en`. JSON keeps its stable schema and English messages.
When HTML writes a report, stdout stays clean; add `--print-output-path` to print its absolute path to stderr for shell workflows.

The v1.2 benchmark manifest covers 10 Unit rules, 10 API rules, and 10 E2E rules. `ata benchmark [manifest]` reads fixture source through the static audit pipeline, compares exact rule/classification identities, and reports fixture conformance; it never imports or executes fixture code. Malformed benchmark input exits `2`, while a valid manifest with mismatches exits `1`.

Review configuration accepts legacy JSON without a version and normalizes it to version `1`; unknown fields, empty include/exclude patterns, and unsupported semantic providers are invalid input. `--locale en` and `--locale zh-CN` select text/HTML language without changing the JSON schema.

`--policy` is advisory: it reports disabled/active selection counts only and does not change findings, classifications, summary values, FTR, Trust Score, or exit semantics. Invalid policy input exits `2`; it is not a default CI gate or a release decision. `ata decision` is also advisory: a valid decision exits `0`, while invalid input exits `2`.

The explicit opt-in policy gate accepts only `mode: "gate"` with `blockOn: ["FAKE"]`: run it with `ata gate`. `WEAK does not block`; a pass is not evidence that tests are strong. The GitHub Actions reference workflow uses `base-ref`, `--changed-since`, and `contents: read`; it does not create PR comments.

## Results and exit codes

`FAKE` is deterministic syntactic evidence, `WEAK` is non-blocking context, and `UNASSESSED` means no static conclusion. FTR and Trust Score prioritize review work; they do not measure runtime quality.

| Code | Meaning                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------- |
| `0`  | No deterministic `FAKE` was emitted; this does not prove tests are strong.                     |
| `1`  | At least one deterministic `FAKE` was emitted.                                                 |
| `2`  | Invalid command, path, invalid policy input, input, or selected source, including `PARSER001`. |

## Project boundaries

The auditor never imports, executes, or evaluates reviewed source. It does not prove test strength, runtime quality, coverage, mutation score, or release readiness.

## Documentation

Read the [rule catalog](./docs/rules.md) before treating output as a release decision.

- [Requirements](./docs/requirements.md) · [中文](./docs/zh/requirements.md)
- [Architecture](./docs/architecture.md) · [中文](./docs/zh/architecture.md)
- [Roadmap](./docs/roadmap.md) · [中文](./docs/zh/roadmap.md)
- [Project Context](./docs/context.md) · [中文](./docs/zh/context.md)
- [Development](./docs/development.md) · [中文](./docs/zh/development.md)
- [Chinese implementation notes](./docs/history/implementation-notes.md)
- [Contributing](./CONTRIBUTING.md) · [中文](./CONTRIBUTING_ZH.md)

## Next

v1.2.1 is the current stable release. It includes the advisory-workflow CI fix while retaining the v1.2 static-audit enhancements; v1.5+ directions are not delivered and are described only in the [Roadmap](./docs/roadmap.md).

## Contributing

See the [contribution guide](./CONTRIBUTING.md). Before opening a change, run:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [AGENTS.md](./AGENTS.md) for repository rules and [Development](./docs/development.md) for the full workflow.

## License

This project uses the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is not permitted; read the [official terms](https://polyformproject.org/licenses/noncommercial/1.0.0).
