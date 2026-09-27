import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractTests,
  extractTestsWithDiagnostics,
} from '../../src/core/extractor';
import { evaluateRules } from '../../src/core/rule-engine';

const fixtureDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture(name: string, source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ata-extractor-'));
  const filePath = join(directory, name);
  fixtureDirectories.push(directory);
  await writeFile(filePath, source);
  return filePath;
}

describe('extractTests', () => {
  it('extracts direct Vitest-style test and it callbacks with their source locations and bodies', async () => {
    const filePath = await createFixture(
      'calculator.test.ts',
      "import { describe, expect, it, test } from 'vitest';\n\ndescribe('calculator', () => {\n  test('adds numbers', () => {\n    expect(1 + 2).toBe(3);\n  });\n\n  it('supports async callbacks', async () => {\n    await Promise.resolve();\n  });\n});\n\ntest.each([1])('parameterized %i', () => {});\n",
    );

    const tests = extractTests(filePath);

    expect(tests).toMatchObject([
      {
        name: 'calculator > adds numbers',
        framework: 'vitest',
        type: 'unknown',
        filePath: resolve(filePath),
        line: 4,
        source: '() => {\n    expect(1 + 2).toBe(3);\n  }',
        body: '{\n    expect(1 + 2).toBe(3);\n  }',
      },
      {
        name: 'calculator > supports async callbacks',
        framework: 'vitest',
        type: 'unknown',
        filePath: resolve(filePath),
        line: 8,
        source: 'async () => {\n    await Promise.resolve();\n  }',
        body: '{\n    await Promise.resolve();\n  }',
      },
      {
        name: 'parameterized %i',
        framework: 'vitest',
        type: 'unknown',
        line: 13,
      },
    ]);
    expect(tests).toHaveLength(3);
  });

  it('identifies Playwright test callbacks as e2e without executing the source', async () => {
    const filePath = await createFixture(
      'checkout.e2e.ts',
      "import { expect, test } from '@playwright/test';\n\ntest('completes checkout', async ({ page }) => {\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n});\n",
    );

    const tests = extractTests(filePath);

    expect(tests).toMatchObject([
      {
        name: 'completes checkout',
        framework: 'playwright',
        type: 'e2e',
        filePath: resolve(filePath),
        line: 3,
        source:
          "async ({ page }) => {\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n}",
        body: "{\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n}",
      },
    ]);
  });

  it('identifies Node test callbacks as Node native tests', async () => {
    const filePath = await createFixture(
      'native.test.js',
      "import test from 'node:test';\nimport assert from 'node:assert/strict';\n\ntest('adds numbers', () => {\n  assert.strictEqual(1 + 2, 3);\n});\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      {
        name: 'adds numbers',
        framework: 'node-test',
        type: 'unknown',
      },
    ]);
  });

  it('preserves direct Node assertion bindings for rule recognition', async () => {
    const filePath = await createFixture(
      'named-native.test.js',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('adds numbers', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);

    expect(testCase).toMatchObject({
      nativeAssertionBindings: [
        { localName: 'equal', kind: 'method', methodName: 'strictEqual' },
      ],
    });
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toEqual([
      'UT002',
    ]);
  });

  it('uses the callback start line as the location baseline', async () => {
    const filePath = await createFixture(
      'multiline.test.ts',
      "import { test } from 'vitest';\n\ntest(\n  'multiline callback',\n  () => {\n    expect(true).toBe(true);\n  },\n);\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      {
        name: 'multiline callback',
        line: 5,
      },
    ]);
  });

  it('extracts parameterized tests and nested suite context', async () => {
    const filePath = await createFixture(
      'matrix.test.ts',
      "import { describe, test } from 'vitest';\n\ndescribe('calculator', () => {\n  test.each([[1, 2]])('adds %i and %i', (left, right) => {\n    expect(left + right).toBe(3);\n  });\n});\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      { name: 'calculator > adds %i and %i', framework: 'vitest', line: 4 },
    ]);
  });

  it('returns parser diagnostics without executing invalid source', async () => {
    const filePath = await createFixture(
      'broken.test.ts',
      "import { test } from 'vitest'; test('broken', () => {",
    );

    expect(extractTestsWithDiagnostics(filePath).diagnostics).toHaveLength(1);
  });
});
