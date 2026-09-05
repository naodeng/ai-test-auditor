import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadMutationReport,
  parseMutationReport,
} from '../../src/core/mutation';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

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
    ).toMatchObject({
      meetsThreshold: true,
      result: { score: 80 },
    });
  });

  it.each([
    {
      version: '2',
      engine: 'stryker',
      command: 'run',
      threshold: { minimumScore: 80, source: 'config' },
      result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
    },
    {
      version: '1',
      engine: 'stryker',
      command: 'run',
      threshold: { minimumScore: 80, source: '' },
      result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
    },
    {
      version: '1',
      engine: 'stryker',
      command: 'run',
      threshold: { minimumScore: 80, source: 'config' },
      result: { totalMutants: 10, killed: 8, survived: 1, score: 80 },
    },
    {
      version: '1',
      engine: 'stryker',
      command: 'run',
      threshold: { minimumScore: 80, source: 'config' },
      result: { totalMutants: 10, killed: 8, survived: 2, score: 70 },
    },
  ])('rejects incomplete or inconsistent evidence', (report) => {
    expect(() => parseMutationReport(report)).toThrow('Mutation report');
  });

  it('accepts scores rounded to two decimal places', () => {
    expect(
      parseMutationReport({
        version: '1',
        engine: 'generic',
        command: 'mutation-tool --report report.json',
        threshold: { minimumScore: 66.67, source: 'quality-policy.json' },
        result: { totalMutants: 3, killed: 2, survived: 1, score: 66.67 },
      }),
    ).toMatchObject({ meetsThreshold: true, result: { score: 66.67 } });
  });

  it('normalizes malformed and unreadable report files to contract errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-mutation-'));
    temporaryRoots.push(root);
    const malformed = join(root, 'malformed.json');
    await writeFile(malformed, '{');

    await expect(loadMutationReport(malformed)).rejects.toThrow(
      `Mutation report cannot be read: ${malformed}`,
    );
    await expect(
      loadMutationReport(join(root, 'missing.json')),
    ).rejects.toThrow('Mutation report cannot be read:');
  });
});
