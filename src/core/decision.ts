import { readFile } from 'node:fs/promises';
import type {
  AdvisoryDecision,
  AuditSummary,
  Classification,
  Confidence,
  DecisionBaselineContext,
  DecisionEnvelope,
  DecisionPolicyContext,
  DecisionReasonCode,
  Finding,
  Framework,
  NativeAssertionBinding,
  Severity,
  TestCase,
  TestType,
} from './types.js';

export type {
  AdvisoryDecision,
  DecisionEnvelope,
  DecisionReasonCode,
} from './types.js';

export class DecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionError';
  }
}

const classifications: readonly Classification[] = [
  'INVALID',
  'FAKE',
  'WEAK',
  'STRONG',
  'UNASSESSED',
];
const severities: readonly Severity[] = ['CRITICAL', 'WARNING', 'INFO'];
const confidences: readonly Confidence[] = ['HIGH', 'MEDIUM', 'LOW'];
const frameworks: readonly Framework[] = [
  'jest',
  'vitest',
  'playwright',
  'node-test',
  'unknown',
];
const testTypes: readonly TestType[] = ['unit', 'api', 'e2e', 'unknown'];

export function parseDecisionEnvelope(value: unknown): DecisionEnvelope {
  const envelope = object(value, 'Decision envelope');
  exactKeys(envelope, ['version', 'audit'], 'Decision envelope');
  if (envelope.version !== '1') {
    throw new DecisionError('Decision envelope must have version "1".');
  }

  const audit = object(envelope.audit, 'Decision audit');
  exactKeys(
    audit,
    ['tests', 'findings', 'summary', 'policy', 'baseline'],
    'Decision audit',
    ['policy', 'baseline'],
  );
  if (!Array.isArray(audit.tests) || !Array.isArray(audit.findings)) {
    throw new DecisionError(
      'Decision audit must contain tests and findings arrays.',
    );
  }

  const tests = audit.tests.map(parseTestCase);
  const findings = audit.findings.map(parseFinding);
  const summary = parseSummary(audit.summary);
  const policy =
    audit.policy === undefined ? undefined : parsePolicy(audit.policy);
  const baseline =
    audit.baseline === undefined ? undefined : parseBaseline(audit.baseline);
  validateStaticSnapshot(tests, findings, summary);

  return {
    version: '1',
    audit: { tests, findings, summary, policy, baseline },
  };
}

export async function loadDecisionEnvelope(
  path: string,
): Promise<DecisionEnvelope> {
  try {
    return parseDecisionEnvelope(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof DecisionError) throw error;
    throw new DecisionError(`Decision envelope cannot be read: ${path}`);
  }
}

export function createAdvisoryDecision(
  envelope: DecisionEnvelope,
): AdvisoryDecision {
  const { summary, policy, baseline } = envelope.audit;
  const reasonCodes: DecisionReasonCode[] = [];
  if (summary.invalid > 0) reasonCodes.push('STATIC_INVALID_INPUT');
  if (summary.fake > 0) reasonCodes.push('STATIC_FAKE_FINDINGS');
  if (summary.weak > 0) reasonCodes.push('STATIC_WEAK_FINDINGS');
  if (reasonCodes.length === 0) reasonCodes.push('NO_STATIC_FAKE_FINDINGS');

  return {
    version: '1',
    mode: 'advisory',
    recommendation:
      summary.invalid > 0
        ? 'invalid-static-input'
        : summary.fake > 0 || summary.weak > 0
          ? 'attention'
          : 'no-static-fake-findings',
    reasonCodes,
    staticSummary: {
      fake: summary.fake,
      weak: summary.weak,
      invalid: summary.invalid,
    },
    context: {
      ...(policy ? { policyId: policy.id } : {}),
      ...(baseline ? { baselineId: baseline.id } : {}),
    },
  };
}

function parseTestCase(value: unknown): TestCase {
  const testCase = object(value, 'Decision test case');
  exactKeys(
    testCase,
    [
      'filePath',
      'name',
      'framework',
      'type',
      'line',
      'source',
      'body',
      'nativeAssertionBindings',
    ],
    'Decision test case',
    ['nativeAssertionBindings'],
  );
  if (
    !nonEmpty(testCase.filePath) ||
    !nonEmpty(testCase.name) ||
    !frameworks.includes(testCase.framework as Framework) ||
    !testTypes.includes(testCase.type as TestType) ||
    !positiveInteger(testCase.line) ||
    typeof testCase.source !== 'string' ||
    typeof testCase.body !== 'string'
  ) {
    throw new DecisionError('Decision test case is invalid.');
  }
  const nativeAssertionBindings =
    testCase.nativeAssertionBindings === undefined
      ? undefined
      : parseNativeAssertionBindings(testCase.nativeAssertionBindings);
  return {
    filePath: testCase.filePath,
    name: testCase.name,
    framework: testCase.framework as Framework,
    type: testCase.type as TestType,
    line: testCase.line,
    source: testCase.source,
    body: testCase.body,
    ...(nativeAssertionBindings ? { nativeAssertionBindings } : {}),
  };
}

function parseNativeAssertionBindings(
  value: unknown,
): readonly NativeAssertionBinding[] {
  if (!Array.isArray(value)) {
    throw new DecisionError(
      'Decision test case native assertion bindings must be an array.',
    );
  }

  return value.map((candidate, index) => {
    const binding = object(
      candidate,
      `Decision native assertion binding ${index}`,
    );
    if (binding.kind === 'namespace') {
      exactKeys(
        binding,
        ['localName', 'kind'],
        `Decision native assertion binding ${index}`,
      );
      if (!nonEmpty(binding.localName)) {
        throw new DecisionError(
          `Decision native assertion binding ${index} is invalid.`,
        );
      }
      return {
        localName: binding.localName,
        kind: 'namespace',
      };
    }

    if (binding.kind === 'method') {
      exactKeys(
        binding,
        ['localName', 'kind', 'methodName'],
        `Decision native assertion binding ${index}`,
      );
      if (!nonEmpty(binding.localName) || !nonEmpty(binding.methodName)) {
        throw new DecisionError(
          `Decision native assertion binding ${index} is invalid.`,
        );
      }
      return {
        localName: binding.localName,
        kind: 'method',
        methodName: binding.methodName,
      };
    }

    throw new DecisionError(
      `Decision native assertion binding ${index} is invalid.`,
    );
  });
}

function parseFinding(value: unknown): Finding {
  const finding = object(value, 'Decision finding');
  exactKeys(
    finding,
    [
      'ruleId',
      'severity',
      'classification',
      'confidence',
      'filePath',
      'line',
      'message',
      'remediation',
    ],
    'Decision finding',
  );
  if (
    !nonEmpty(finding.ruleId) ||
    !severities.includes(finding.severity as Severity) ||
    !classifications.includes(finding.classification as Classification) ||
    !confidences.includes(finding.confidence as Confidence) ||
    !nonEmpty(finding.filePath) ||
    !positiveInteger(finding.line) ||
    typeof finding.message !== 'string' ||
    typeof finding.remediation !== 'string'
  ) {
    throw new DecisionError('Decision finding is invalid.');
  }
  return {
    ruleId: finding.ruleId,
    severity: finding.severity as Severity,
    classification: finding.classification as Classification,
    confidence: finding.confidence as Confidence,
    filePath: finding.filePath,
    line: finding.line,
    message: finding.message,
    remediation: finding.remediation,
  };
}

function parseSummary(value: unknown): AuditSummary {
  const summary = object(value, 'Decision audit summary');
  exactKeys(
    summary,
    [
      'total',
      'assessed',
      'fake',
      'weak',
      'invalid',
      'unassessed',
      'fakeTestRatio',
      'trustScore',
    ],
    'Decision audit summary',
  );
  if (
    !nonNegativeInteger(summary.total) ||
    !nonNegativeInteger(summary.assessed) ||
    !nonNegativeInteger(summary.fake) ||
    !nonNegativeInteger(summary.weak) ||
    !nonNegativeInteger(summary.invalid) ||
    !nonNegativeInteger(summary.unassessed) ||
    !finiteNumber(summary.fakeTestRatio) ||
    !finiteNumber(summary.trustScore)
  ) {
    throw new DecisionError('Decision audit summary is invalid.');
  }
  return {
    total: summary.total,
    assessed: summary.assessed,
    fake: summary.fake,
    weak: summary.weak,
    invalid: summary.invalid,
    unassessed: summary.unassessed,
    fakeTestRatio: summary.fakeTestRatio,
    trustScore: summary.trustScore,
  };
}

function parsePolicy(value: unknown): DecisionPolicyContext {
  const policy = object(value, 'Decision policy context');
  exactKeys(policy, ['version', 'id', 'mode'], 'Decision policy context');
  if (
    policy.version !== '1' ||
    !nonEmpty(policy.id) ||
    policy.mode !== 'advisory'
  ) {
    throw new DecisionError('Decision policy context is invalid.');
  }
  return { version: '1', id: policy.id, mode: 'advisory' };
}

function parseBaseline(value: unknown): DecisionBaselineContext {
  const baseline = object(value, 'Decision baseline context');
  exactKeys(baseline, ['version', 'id'], 'Decision baseline context');
  if (baseline.version !== '1' || !nonEmpty(baseline.id)) {
    throw new DecisionError('Decision baseline context is invalid.');
  }
  return { version: '1', id: baseline.id };
}

function validateStaticSnapshot(
  tests: readonly TestCase[],
  findings: readonly Finding[],
  summary: AuditSummary,
): void {
  const parserFindings = findings.filter(
    (finding) => finding.ruleId === 'PARSER001',
  );
  if (
    parserFindings.some(
      (finding) =>
        finding.classification !== 'INVALID' ||
        finding.severity !== 'WARNING' ||
        finding.confidence !== 'HIGH',
    ) ||
    findings.some(
      (finding) =>
        finding.classification === 'INVALID' && finding.ruleId !== 'PARSER001',
    )
  ) {
    throw new DecisionError('Decision parser findings are invalid.');
  }

  const classifiedTests = tests.map((testCase) =>
    classifyTest(
      findings.filter(
        (finding) =>
          finding.ruleId !== 'PARSER001' &&
          findingBelongsToTest(finding, testCase),
      ),
    ),
  );
  const nonParserFindings = findings.filter(
    (finding) => finding.ruleId !== 'PARSER001',
  );
  if (
    nonParserFindings.some(
      (finding) =>
        !tests.some((testCase) => findingBelongsToTest(finding, testCase)),
    )
  ) {
    throw new DecisionError(
      'Decision finding is not associated with a test case.',
    );
  }

  const fake = count(classifiedTests, 'FAKE');
  const weak = count(classifiedTests, 'WEAK');
  const invalid = parserFindings.length;
  const assessed = fake + weak + invalid;
  const total = tests.length + parserFindings.length;
  const expected: AuditSummary = {
    total,
    assessed,
    fake,
    weak,
    invalid,
    unassessed: total - assessed,
    fakeTestRatio:
      assessed === 0 ? 0 : Number(((fake / assessed) * 100).toFixed(2)),
    trustScore: Math.max(
      0,
      100 -
        findings.filter((finding) => finding.severity === 'CRITICAL').length *
          25 -
        findings.filter((finding) => finding.severity === 'WARNING').length *
          10,
    ),
  };
  if (JSON.stringify(summary) !== JSON.stringify(expected)) {
    throw new DecisionError(
      'Decision audit summary does not match static findings.',
    );
  }
}

function findingBelongsToTest(finding: Finding, testCase: TestCase): boolean {
  const finalLine = testCase.line + testCase.source.split('\n').length - 1;
  return (
    finding.filePath === testCase.filePath &&
    finding.line >= testCase.line &&
    finding.line <= finalLine
  );
}

function classifyTest(findings: readonly Finding[]): Classification {
  if (findings.some((finding) => finding.classification === 'INVALID')) {
    return 'INVALID';
  }
  if (findings.some((finding) => finding.classification === 'FAKE')) {
    return 'FAKE';
  }
  if (findings.some((finding) => finding.classification === 'WEAK')) {
    return 'WEAK';
  }
  return 'UNASSESSED';
}

function count(
  values: readonly Classification[],
  classification: Classification,
): number {
  return values.filter((value) => value === classification).length;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DecisionError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  optional: readonly string[] = [],
): void {
  if (
    Object.keys(value).some((key) => !allowed.includes(key)) ||
    allowed.some((key) => !optional.includes(key) && !(key in value))
  ) {
    throw new DecisionError(`${label} has unsupported or missing fields.`);
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
