<div align="right"><strong>English</strong> · <a href="./README_ZH.md">简体中文</a></div>

# AI Test Auditor

> Don't trust AI-generated tests. Verify them.

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

**AI Test Auditor** is a local-first CLI for finding deterministic signs of ineffective JavaScript and TypeScript tests. It audits test _source_; it does not run the tests it reads.

The governing question is simple: **if production behavior is wrong, can this test actually fail?**

## What it does

- Scans `.test.ts`, `.spec.ts`, `.test.tsx`, `.spec.tsx`, `.test.js`, `.spec.js`, and `.e2e.ts` files.
- Extracts direct Jest, Vitest, and Playwright `test` / `it` callbacks with the TypeScript AST.
- Reports high-confidence deterministic `FAKE` and `WEAK` findings with source locations and remediations.
- Produces human-readable or JSON output through `ata review`.
- Ships a standalone, bilingual `test-quality-audit` Skill and evidence-bounded prompts.
- Loads optional, versioned mutation evidence through `--mutation-report` without running a mutation tool.

## What v0.1 does not do

It does **not** execute tests, inspect runtime behavior, invoke an LLM, run mutation testing, calculate coverage, validate imports/fixtures, or mark an unflagged test `STRONG`. An unflagged test is `UNASSESSED`.

## v0.4 mutation evidence

Pass a report created by your own mutation workflow:

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

The recorded command and threshold source are required provenance, not instructions: AI Test Auditor never executes the command. A score below `minimumScore` is valid advisory evidence; it never changes static classifications, FTR, Trust Score, or the process exit code.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run build
node dist/cli.js review ./tests
```

Review one file, force a test category, or request machine-readable output:

```bash
node dist/cli.js review tests/checkout.e2e.ts --type e2e
node dist/cli.js review benchmarks --format json
```

The installed package exposes the same command as `ata review [path]`; a source checkout can use `node dist/cli.js review [path]`. Both default to the current directory and never import or execute target source.

### Exit codes

| Code | Meaning                                                                               |
| ---- | ------------------------------------------------------------------------------------- |
| `0`  | No deterministic `FAKE` finding was emitted. This is not proof that tests are strong. |
| `1`  | At least one deterministic `FAKE` finding was emitted.                                |
| `2`  | The command or input path is invalid.                                                 |

## Example

```ts
test('total', () => {
  expect(true).toBe(true);
});
```

```text
... [CRITICAL] [FAKE] UT002
  UT002 compares the same literal value on both sides of an assertion.
```

## Deterministic rules

| ID     | Classification | Trigger                                                                |
| ------ | -------------- | ---------------------------------------------------------------------- |
| UT001  | FAKE           | Unit test has no `expect` call.                                        |
| UT002  | FAKE           | Same primitive literal is asserted against itself.                     |
| UT003  | FAKE           | An expression is asserted against the identical expression.            |
| UT008  | FAKE           | A caught error is only swallowed or logged.                            |
| UT011  | FAKE           | Both sides call the same callee with structurally identical arguments. |
| API001 | WEAK           | An API test asserts only `response.status` / `statusCode`.             |
| E2E001 | FAKE           | A Playwright test has no `expect` assertion.                           |
| E2E002 | WEAK           | A Playwright test asserts only the URL.                                |
| E2E004 | WEAK           | A Playwright test uses numeric `page.waitForTimeout`.                  |

Rules deliberately trade breadth for explainable, source-backed evidence. Read the [full rule catalog](./docs/rules.md) before treating an output as a release decision.

## Trust score and Fake Test Ratio

- **Fake Test Ratio (FTR)** = `fake / assessed * 100`, where `assessed` is tests classified as `FAKE`, `WEAK`, or `INVALID`. `UNASSESSED` tests are excluded.
- **Trust Score** = `max(0, 100 - critical findings × 25 - warning findings × 10)`.

They are prioritization aids, not measurements of runtime quality, mutation score, or production readiness.

## Repository map

```text
src/                 CLI, AST extraction, deterministic rules, reporters
tests/               Unit and CLI contract tests
benchmarks/          Small source-only fixtures for manual CLI checks
test-quality-audit/  Bilingual installable Skill, prompts, examples, eval cases
docs/                Requirements, architecture, rules, roadmap, development, process record
.github/workflows/   CI quality checks
```

## Documentation

- [Product requirements](./docs/requirements.md) · [中文](./docs/zh/requirements.md)
- [Architecture](./docs/architecture.md) · [中文](./docs/zh/architecture.md)
- [Rule catalog](./docs/rules.md) · [中文](./docs/zh/rules.md)
- [Roadmap](./docs/roadmap.md) · [中文](./docs/zh/roadmap.md)
- [Development guide](./docs/development.md) · [中文](./docs/zh/development.md)
- [Implementation record](./docs/process/implementation-record.md) · [中文](./docs/process/implementation-record_zh.md)
- [Contributing](./CONTRIBUTING.md) · [中文](./CONTRIBUTING_ZH.md)

## Development

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [AGENTS.md](./AGENTS.md) for repository conventions and [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution expectations.

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).
Commercial use is not a permitted purpose under this license. Read the
[official terms](https://polyformproject.org/licenses/noncommercial/1.0.0)
before using, copying, or distributing the software.
