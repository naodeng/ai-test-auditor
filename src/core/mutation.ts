import { readFile } from 'node:fs/promises';

export interface MutationThreshold {
  readonly minimumScore: number;
  readonly source: string;
}

export interface MutationResult {
  readonly totalMutants: number;
  readonly killed: number;
  readonly survived: number;
  readonly score: number;
}

export interface MutationReport {
  readonly version: '1';
  readonly engine: string;
  readonly command: string;
  readonly threshold: MutationThreshold;
  readonly result: MutationResult;
  readonly meetsThreshold: boolean;
}

export class MutationReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MutationReportError';
  }
}

export function parseMutationReport(value: unknown): MutationReport {
  if (!value || typeof value !== 'object') {
    throw new MutationReportError('Mutation report must be an object.');
  }

  const candidate = value as Record<string, unknown>;
  const threshold = candidate.threshold;
  const result = candidate.result;
  if (
    candidate.version !== '1' ||
    !isNonEmptyString(candidate.engine) ||
    !isNonEmptyString(candidate.command) ||
    !threshold ||
    typeof threshold !== 'object' ||
    !result ||
    typeof result !== 'object'
  ) {
    throw new MutationReportError(
      'Mutation report must contain version "1", engine, command, threshold, and result.',
    );
  }

  const thresholdCandidate = threshold as Record<string, unknown>;
  const resultCandidate = result as Record<string, unknown>;
  if (
    !isPercentage(thresholdCandidate.minimumScore) ||
    !isNonEmptyString(thresholdCandidate.source) ||
    !isPositiveInteger(resultCandidate.totalMutants) ||
    !isNonNegativeInteger(resultCandidate.killed) ||
    !isNonNegativeInteger(resultCandidate.survived) ||
    !isPercentage(resultCandidate.score)
  ) {
    throw new MutationReportError(
      'Mutation report has invalid evidence fields.',
    );
  }

  if (
    resultCandidate.killed + resultCandidate.survived !==
      resultCandidate.totalMutants ||
    calculateScore(resultCandidate.killed, resultCandidate.totalMutants) !==
      resultCandidate.score
  ) {
    throw new MutationReportError(
      'Mutation report has inconsistent result counts or score.',
    );
  }

  return {
    version: '1',
    engine: candidate.engine,
    command: candidate.command,
    threshold: {
      minimumScore: thresholdCandidate.minimumScore,
      source: thresholdCandidate.source,
    },
    result: {
      totalMutants: resultCandidate.totalMutants,
      killed: resultCandidate.killed,
      survived: resultCandidate.survived,
      score: resultCandidate.score,
    },
    meetsThreshold: resultCandidate.score >= thresholdCandidate.minimumScore,
  };
}

export async function loadMutationReport(
  path: string,
): Promise<MutationReport> {
  try {
    return parseMutationReport(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof MutationReportError) throw error;
    throw new MutationReportError(`Mutation report cannot be read: ${path}`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isPercentage(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function calculateScore(killed: number, totalMutants: number): number {
  return (
    Math.round(((killed / totalMutants) * 100 + Number.EPSILON) * 100) / 100
  );
}
