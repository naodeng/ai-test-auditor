import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(source: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ata-cli-'));
  temporaryRoots.push(root);
  await writeFile(join(root, 'example.test.ts'), source);
  return root;
}

async function config(root: string, source: string): Promise<string> {
  const path = join(root, 'ata.config.json');
  await writeFile(path, source);
  return path;
}

async function invoke(args: string[]): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  let stdout = '';
  let stderr = '';
  const code = await runCli(args, {
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

describe('ata review', () => {
  it('returns 1 and JSON when a deterministic FAKE finding exists', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );

    const invocation = await invoke(['review', root, '--format', 'json']);

    expect(invocation.code).toBe(1);
    expect(invocation.stderr).toBe('');
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { total: 1, fake: 1, fakeTestRatio: 100, trustScore: 75 },
      findings: [{ ruleId: 'UT002', classification: 'FAKE' }],
    });
  });

  it('returns 0 without claiming that an unflagged test is strong', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(result).toBe('ready'); });",
    );

    const invocation = await invoke(['review', root]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('UNASSESSED');
    expect(invocation.stdout).toContain('not evidence that they are STRONG');
  });

  it('applies an explicit API type without executing the fixture', async () => {
    const marker = join(tmpdir(), `ata-executed-${Date.now()}`);
    const root = await fixture(
      `import { writeFileSync } from 'node:fs'; import { expect, test } from 'vitest'; writeFileSync(${JSON.stringify(marker)}, 'executed'); test('status only', () => { expect(response.status).toBe(200); });`,
    );

    const invocation = await invoke(['review', root, '--type', 'api']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('API001');
    await expect(
      import('node:fs/promises').then(({ access }) => access(marker)),
    ).rejects.toThrow();
  });

  it.each([
    [['review', '--type', 'integration'], 'type'],
    [['review', '--format', 'xml'], 'format'],
  ])('returns 2 for an invalid %s option', async (args, expected) => {
    const invocation = await invoke(args);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr.toLowerCase()).toContain(expected);
  });

  it('returns 2 for a missing input path', async () => {
    const invocation = await invoke([
      'review',
      join(tmpdir(), `ata-missing-${Date.now()}`),
    ]);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toContain('Input path');
  });

  it('documents all exit codes in review help', async () => {
    const invocation = await invoke(['review', '--help']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('0  No FAKE findings');
    expect(invocation.stdout).toContain('1  One or more FAKE findings');
    expect(invocation.stdout).toContain('2  Invalid command or input');
  });

  it('uses config excludes to restrict audited files', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('included', () => { expect(value).toBe('ok'); });",
    );
    await writeFile(
      join(root, 'ignored.test.ts'),
      "import { expect, test } from 'vitest'; test('ignored', () => { expect(true).toBe(true); });",
    );
    const configPath = await config(root, '{"exclude":["ignored.test.ts"]}');

    const invocation = await invoke(['review', root, '--config', configPath]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).not.toContain('ignored');
  });

  it('uses config includes as an explicit source allow-list', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('included', () => { expect(value).toBe('ok'); });",
    );
    await writeFile(
      join(root, 'second.test.ts'),
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const configPath = await config(root, '{"include":["example.test.ts"]}');

    const invocation = await invoke(['review', root, '--config', configPath]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).not.toContain('fake');
  });

  it('validates optional OpenAI provider configuration without reading a key', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );
    const configPath = await config(
      root,
      '{"semanticProvider":{"kind":"openai","apiKeyEnv":"OPENAI_API_KEY","model":"gpt-5"}}',
    );
    expect((await invoke(['review', root, '--config', configPath])).code).toBe(
      0,
    );
  });

  it('attaches a semantic report without changing static exit semantics', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'semantic.json');
    await writeFile(
      report,
      '{"version":"1","provider":"offline","inferences":[{"filePath":"example.test.ts","line":1,"confidence":"LOW","summary":"Missing domain context."}]}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--semantic-report',
      report,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(0);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { unassessed: 1 },
      semantic: {
        provider: 'offline',
        inferences: [{ summary: 'Missing domain context.' }],
      },
    });
  });

  it('attaches mutation evidence without changing static exit semantics', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'mutation.json');
    await writeFile(
      report,
      '{"version":"1","engine":"stryker","command":"npx stryker run","threshold":{"minimumScore":90,"source":"stryker.conf.json: thresholds.high"},"result":{"totalMutants":10,"killed":8,"survived":2,"score":80}}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(0);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { unassessed: 1, fake: 0 },
      mutation: {
        engine: 'stryker',
        meetsThreshold: false,
        result: { score: 80 },
      },
    });
  });

  it('returns 2 for an invalid mutation report', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'mutation.json');
    await writeFile(report, '{}');

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
    ]);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toContain('Mutation report');
  });

  it.each(['{', ''])(
    'returns 2 for an unreadable mutation report (%j)',
    async (source) => {
      const root = await fixture(
        "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
      );
      const report = join(root, 'mutation.json');
      if (source) await writeFile(report, source);

      const invocation = await invoke([
        'review',
        root,
        '--mutation-report',
        report,
      ]);

      expect(invocation.code).toBe(2);
      expect(invocation.stderr).toContain('Mutation report cannot be read');
    },
  );

  it('never executes the command recorded in mutation evidence', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const marker = join(root, 'mutation-command-executed');
    const report = join(root, 'mutation.json');
    await writeFile(
      report,
      JSON.stringify({
        version: '1',
        engine: 'generic',
        command: `node -e "require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')"`,
        threshold: { minimumScore: 80, source: 'policy.json' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
      }),
    );

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
    ]);

    expect(invocation.code).toBe(1);
    await expect(
      import('node:fs/promises').then(({ access }) => access(marker)),
    ).rejects.toThrow();
  });
});
