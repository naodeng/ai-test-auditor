# AI Test Auditor v0.4 Mutation Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load a versioned offline mutation-evidence artifact and render it independently from static audit results.

**Architecture:** `src/core/mutation.ts` validates and loads an engine-neutral artifact. The CLI attaches it only when `--mutation-report` is explicit; `AuditResult` and reporters expose it as advisory evidence without changing static summary or exit semantics.

**Tech Stack:** TypeScript, Node.js file I/O, Commander, Vitest.

---

### Task 1: Mutation evidence contract

**Files:**

- Create: `src/core/mutation.ts`
- Create: `tests/core/mutation.test.ts`

- [ ] **Step 1: Write the failing parser tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseMutationReport } from '../../src/core/mutation';

describe('mutation evidence contract', () => {
  it('accepts reproducible evidence and derives threshold status', () => {
    expect(
      parseMutationReport({
        version: '1',
        engine: 'stryker',
        command: 'npx stryker run',
        threshold: {
          minimumScore: 80,
          source: 'stryker.conf.json: thresholds.high',
        },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
      }),
    ).toMatchObject({ meetsThreshold: true, result: { score: 80 } });
  });

  it.each([
    [
      {
        version: '1',
        engine: 'stryker',
        command: 'run',
        threshold: { minimumScore: 80, source: '' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
      },
    ],
    [
      {
        version: '1',
        engine: 'stryker',
        command: 'run',
        threshold: { minimumScore: 80, source: 'config' },
        result: { totalMutants: 10, killed: 8, survived: 1, score: 80 },
      },
    ],
    [
      {
        version: '1',
        engine: 'stryker',
        command: 'run',
        threshold: { minimumScore: 80, source: 'config' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 70 },
      },
    ],
  ])('rejects incomplete or inconsistent evidence', (report) => {
    expect(() => parseMutationReport(report)).toThrow('Mutation report');
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/core/mutation.test.ts`

Expected: FAIL because `src/core/mutation.ts` does not exist.

- [ ] **Step 3: Implement the smallest strict parser and loader**

```ts
export interface MutationReport {
  readonly version: '1';
  readonly engine: string;
  readonly command: string;
  readonly threshold: {
    readonly minimumScore: number;
    readonly source: string;
  };
  readonly result: {
    readonly totalMutants: number;
    readonly killed: number;
    readonly survived: number;
    readonly score: number;
  };
  readonly meetsThreshold: boolean;
}

export function parseMutationReport(value: unknown): MutationReport {
  if (!value || typeof value !== 'object')
    throw new Error('Mutation report must be an object.');
  const candidate = value as Record<string, unknown>;
  const threshold = candidate.threshold as Record<string, unknown>;
  const result = candidate.result as Record<string, unknown>;
  if (
    candidate.version !== '1' ||
    !nonEmpty(candidate.engine) ||
    !nonEmpty(candidate.command) ||
    !threshold ||
    !result
  )
    throw new Error(
      'Mutation report must contain version "1", engine, command, threshold, and result.',
    );
  if (
    !percentage(threshold.minimumScore) ||
    !nonEmpty(threshold.source) ||
    !positiveInteger(result.totalMutants) ||
    !nonNegativeInteger(result.killed) ||
    !nonNegativeInteger(result.survived) ||
    !percentage(result.score)
  )
    throw new Error('Mutation report has invalid evidence fields.');
  if (
    result.killed + result.survived !== result.totalMutants ||
    roundScore(result.killed, result.totalMutants) !== result.score
  )
    throw new Error('Mutation report has inconsistent result counts or score.');
  return {
    version: '1',
    engine: candidate.engine,
    command: candidate.command,
    threshold: {
      minimumScore: threshold.minimumScore,
      source: threshold.source,
    },
    result: {
      totalMutants: result.totalMutants,
      killed: result.killed,
      survived: result.survived,
      score: result.score,
    },
    meetsThreshold: result.score >= threshold.minimumScore,
  } as MutationReport;
}

export async function loadMutationReport(
  path: string,
): Promise<MutationReport> {
  try {
    return parseMutationReport(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Mutation report'))
      throw error;
    throw new Error(`Mutation report cannot be read: ${path}`);
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
function percentage(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
function roundScore(killed: number, total: number): number {
  return Math.round((killed / total) * 10_000) / 100;
}
```

`score` must equal `(killed / totalMutants) * 100` after rounding to two decimal places. The threshold status is derived with `score >= minimumScore`; it is not an error when false.

- [ ] **Step 4: Confirm GREEN**

Run: `npx vitest run tests/core/mutation.test.ts`

Expected: 2 tests pass.

### Task 2: CLI and reporter seam

**Files:**

- Modify: `src/core/types.ts`
- Modify: `src/cli.ts`
- Modify: `src/reporters.ts`
- Modify: `tests/cli.test.ts`
- Modify: `tests/reporters.test.ts`

- [ ] **Step 1: Write failing public-boundary tests**

Add a CLI test that writes a valid report, invokes:

```ts
['review', root, '--mutation-report', report, '--format', 'json'];
```

and asserts code `0`, unchanged `summary`, and:

```ts
mutation: { engine: 'stryker', meetsThreshold: true, result: { score: 80 } }
```

Add a second CLI test with `{}` in the report and assert exit code `2` with `Mutation report` in stderr. Add a text-reporter test asserting `Mutation evidence (advisory only)` and `Threshold: met`.

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/cli.test.ts tests/reporters.test.ts`

Expected: FAIL because `--mutation-report` and `result.mutation` do not exist.

- [ ] **Step 3: Implement the narrow CLI attachment and presentation**

Add `mutation?: import('./mutation.js').MutationReport` to `AuditResult`. Add Commander option `--mutation-report <path>`, call `loadMutationReport`, and spread it into rendered output. Keep `resultCode = result.summary.fake > 0 ? 1 : 0` unchanged. Render an advisory-only mutation section containing engine, command, score/counts, threshold source, and met/below status.

- [ ] **Step 4: Confirm GREEN**

Run: `npx vitest run tests/cli.test.ts tests/reporters.test.ts`

Expected: all CLI and reporter tests pass, including invalid artifact exit code `2`.

### Task 3: Public documentation and evidence record

**Files:**

- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/zh/roadmap.md`
- Modify: `docs/architecture.md`
- Modify: `docs/zh/architecture.md`
- Modify: `docs/process/implementation-record.md`
- Modify: `docs/process/implementation-record_zh.md`

- [ ] **Step 1: Document the exact command and schema**

Add the version `1` example from the approved design to both READMEs and roadmap files, followed by this boundary statement in English and equivalent Chinese prose: "The recorded command is provenance, not an instruction: AI Test Auditor never executes it. A below-threshold result is valid advisory evidence and never changes the process exit code."

- [ ] **Step 2: Update architecture and process evidence**

Extend both Mermaid flows with `Mutation report --> Mutation adapter --> Audit result`. Add dated process entries that list the observed RED command `npx vitest run tests/core/mutation.test.ts`, each focused GREEN command, and the final validation commands. State explicitly that no mutation engine was run by AI Test Auditor.

- [ ] **Step 3: Check bilingual parity and formatting**

Run: `git diff --check && rg -n 'mutation-report|变异报告|mutation evidence|变异证据' README.md README.zh-CN.md docs`

Expected: no whitespace errors and both language trees document the public seam.

### Task 4: Full verification

**Files:**

- Verify only.

- [ ] **Step 1: Run all project gates**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

Expected: all checks exit successfully except the benchmark command may return `1` only when it reports deterministic `FAKE` findings; verify its JSON payload and report that expected semantic separately.

- [ ] **Step 2: Inspect scope**

Run: `git status --short && git diff --stat`

Expected: only v0.4 source, tests, bilingual documentation, and process/design/plan records are changed.
