export type Classification =
  'INVALID' | 'FAKE' | 'WEAK' | 'STRONG' | 'UNASSESSED';

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export type TestType = 'unit' | 'api' | 'e2e' | 'unknown';

export type Framework = 'jest' | 'vitest' | 'playwright' | 'unknown';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TestCase {
  readonly filePath: string;
  readonly name: string;
  readonly framework: Framework;
  readonly type: TestType;
  readonly line: number;
  readonly source: string;
  readonly body: string;
}

export interface ParserDiagnostic {
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
}

export interface ExtractionResult {
  readonly tests: readonly TestCase[];
  readonly diagnostics: readonly ParserDiagnostic[];
}

export interface Finding {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly classification: Classification;
  readonly confidence: Confidence;
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
  readonly remediation: string;
}

export interface AuditSummary {
  readonly total: number;
  readonly assessed: number;
  readonly fake: number;
  readonly weak: number;
  readonly invalid: number;
  readonly unassessed: number;
  readonly fakeTestRatio: number;
  readonly trustScore: number;
}

export interface AuditResult {
  readonly tests: readonly TestCase[];
  readonly findings: readonly Finding[];
  readonly diagnostics?: readonly ParserDiagnostic[];
  readonly semantic?: import('./semantic.js').SemanticReport;
  readonly mutation?: import('./mutation.js').MutationReport;
  readonly summary: AuditSummary;
}
