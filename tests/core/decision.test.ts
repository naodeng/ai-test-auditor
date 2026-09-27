import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createAdvisoryDecision,
  DecisionError,
  loadDecisionEnvelope,
  parseDecisionEnvelope,
} from '../../src/core/decision';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

const fakeEnvelope = {
  version: '1',
  audit: {
    tests: [
      {
        filePath: 'tests/example.test.ts',
        name: 'literal assertion',
        framework: 'vitest',
        type: 'unit',
        line: 4,
        source: '() => { expect(true).toBe(true); }',
        body: '{ expect(true).toBe(true); }',
      },
    ],
    findings: [
      {
        ruleId: 'UT002',
        severity: 'CRITICAL',
        classification: 'FAKE',
        confidence: 'HIGH',
        filePath: 'tests/example.test.ts',
        line: 4,
        message: 'The same literal appears on both sides.',
        remediation: 'Use an independent expected value.',
      },
    ],
    summary: {
      total: 1,
      assessed: 1,
      fake: 1,
      weak: 0,
      invalid: 0,
      unassessed: 0,
      fakeTestRatio: 100,
      trustScore: 75,
    },
  },
};

describe('CI-neutral advisory decision', () => {
  it('projects a valid static FAKE snapshot without source details', () => {
    const decision = createAdvisoryDecision(
      parseDecisionEnvelope(fakeEnvelope),
    );

    expect(decision).toEqual({
      version: '1',
      mode: 'advisory',
      recommendation: 'attention',
      reasonCodes: ['STATIC_FAKE_FINDINGS'],
      staticSummary: { fake: 1, weak: 0, invalid: 0 },
      context: {},
    });
  });

  it('accepts Node test framework snapshots', () => {
    const envelope = {
      ...fakeEnvelope,
      audit: {
        ...fakeEnvelope.audit,
        tests: [
          {
            ...fakeEnvelope.audit.tests[0],
            framework: 'node-test',
            type: 'unknown',
            nativeAssertionBindings: [
              { localName: 'equal', kind: 'method', methodName: 'strictEqual' },
            ],
          },
        ],
      },
    };

    expect(parseDecisionEnvelope(envelope).audit.tests[0]).toMatchObject({
      framework: 'node-test',
      type: 'unknown',
      nativeAssertionBindings: [
        { localName: 'equal', kind: 'method', methodName: 'strictEqual' },
      ],
    });
  });

  it.each([
    { ...fakeEnvelope, version: '2' },
    { ...fakeEnvelope, extra: true },
    { ...fakeEnvelope, audit: { ...fakeEnvelope.audit, semantic: {} } },
    { ...fakeEnvelope, audit: { ...fakeEnvelope.audit, mutation: {} } },
    {
      ...fakeEnvelope,
      audit: {
        ...fakeEnvelope.audit,
        summary: { ...fakeEnvelope.audit.summary, fake: 0 },
      },
    },
    {
      ...fakeEnvelope,
      audit: {
        ...fakeEnvelope.audit,
        findings: [
          { ...fakeEnvelope.audit.findings[0], classification: 'NOPE' },
        ],
      },
    },
  ])('rejects an unsupported or forged decision envelope', (envelope) => {
    expect(() => parseDecisionEnvelope(envelope)).toThrow(DecisionError);
  });

  it('orders invalid, fake, and weak reasons while preserving context-only IDs', () => {
    const envelope = {
      ...fakeEnvelope,
      audit: {
        ...fakeEnvelope.audit,
        findings: [
          ...fakeEnvelope.audit.findings,
          {
            ruleId: 'UT004',
            severity: 'WARNING',
            classification: 'WEAK',
            confidence: 'MEDIUM',
            filePath: 'tests/weak.test.ts',
            line: 5,
            message: 'Weak assertion.',
            remediation: 'Assert an observable value.',
          },
          {
            ruleId: 'PARSER001',
            severity: 'WARNING',
            classification: 'INVALID',
            confidence: 'HIGH',
            filePath: 'tests/broken.test.ts',
            line: 1,
            message: 'Source syntax is invalid.',
            remediation: 'Fix the syntax.',
          },
        ],
        tests: [
          ...fakeEnvelope.audit.tests,
          {
            ...fakeEnvelope.audit.tests[0],
            filePath: 'tests/weak.test.ts',
            line: 5,
            name: 'weak assertion',
          },
        ],
        summary: {
          total: 3,
          assessed: 3,
          fake: 1,
          weak: 1,
          invalid: 1,
          unassessed: 0,
          fakeTestRatio: 33.33,
          trustScore: 55,
        },
        policy: { version: '1', id: 'local-policy', mode: 'advisory' },
        baseline: { version: '1', id: 'main' },
      },
    };

    expect(createAdvisoryDecision(parseDecisionEnvelope(envelope))).toEqual({
      version: '1',
      mode: 'advisory',
      recommendation: 'invalid-static-input',
      reasonCodes: [
        'STATIC_INVALID_INPUT',
        'STATIC_FAKE_FINDINGS',
        'STATIC_WEAK_FINDINGS',
      ],
      staticSummary: { fake: 1, weak: 1, invalid: 1 },
      context: { policyId: 'local-policy', baselineId: 'main' },
    });
  });

  it('associates an assertion-line finding with its containing test callback', () => {
    const envelope = {
      ...fakeEnvelope,
      audit: {
        ...fakeEnvelope.audit,
        tests: [
          {
            ...fakeEnvelope.audit.tests[0],
            line: 4,
            source: '() => {\n  expect(true).toBe(true);\n}',
            body: '{\n  expect(true).toBe(true);\n}',
          },
        ],
        findings: [{ ...fakeEnvelope.audit.findings[0], line: 5 }],
      },
    };

    expect(
      createAdvisoryDecision(parseDecisionEnvelope(envelope)),
    ).toMatchObject({
      recommendation: 'attention',
      staticSummary: { fake: 1, weak: 0, invalid: 0 },
    });
  });

  it('reports unflagged snapshots as unassessed rather than strong', () => {
    const envelope = {
      version: '1',
      audit: {
        tests: fakeEnvelope.audit.tests,
        findings: [],
        summary: {
          total: 1,
          assessed: 0,
          fake: 0,
          weak: 0,
          invalid: 0,
          unassessed: 1,
          fakeTestRatio: 0,
          trustScore: 100,
        },
      },
    };

    expect(
      createAdvisoryDecision(parseDecisionEnvelope(envelope)),
    ).toMatchObject({
      recommendation: 'no-static-fake-findings',
      reasonCodes: ['NO_STATIC_FAKE_FINDINGS'],
    });
  });

  it('normalizes malformed and unreadable files to DecisionError', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-decision-'));
    temporaryRoots.push(root);
    const malformed = join(root, 'malformed.json');
    await writeFile(malformed, '{');

    await expect(loadDecisionEnvelope(malformed)).rejects.toThrow(
      DecisionError,
    );
    await expect(
      loadDecisionEnvelope(join(root, 'missing.json')),
    ).rejects.toThrow(DecisionError);
  });
});
