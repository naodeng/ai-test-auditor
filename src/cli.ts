#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { Command, CommanderError, Option } from 'commander';
import { auditPath, InputPathError, type ReviewType } from './core/audit.js';
import { renderJson, renderText } from './reporters.js';
import { loadSemanticReport } from './core/semantic.js';
import { MutationReportError, loadMutationReport } from './core/mutation.js';

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

type OutputFormat = 'text' | 'json';

export async function runCli(
  args: readonly string[],
  io: CliIo = defaultIo,
): Promise<number> {
  const program = createProgram(io);
  let resultCode = 0;

  program
    .command('review')
    .description(
      'Audit JavaScript and TypeScript test source without executing it',
    )
    .argument('[path]', 'test file or directory to review', '.')
    .addOption(
      new Option('--type <type>', 'test type')
        .choices(['unit', 'api', 'e2e', 'auto'])
        .default('auto'),
    )
    .option('--config <path>', 'JSON configuration file with an exclude array')
    .option(
      '--semantic-report <path>',
      'versioned offline semantic-report JSON',
    )
    .option(
      '--mutation-report <path>',
      'versioned offline mutation-evidence JSON',
    )
    .addOption(
      new Option('--format <format>', 'output format')
        .choices(['text', 'json'])
        .default('text'),
    )
    .addHelpText(
      'after',
      '\nExit codes:\n  0  No FAKE findings\n  1  One or more FAKE findings\n  2  Invalid command or input\n',
    )
    .action(
      async (
        inputPath: string,
        options: {
          readonly type: ReviewType;
          readonly format: OutputFormat;
          readonly config?: string;
          readonly semanticReport?: string;
          readonly mutationReport?: string;
        },
      ) => {
        const result = await auditPath(inputPath, {
          type: options.type,
          configPath: options.config,
        });
        const semantic = options.semanticReport
          ? await loadSemanticReport(options.semanticReport)
          : undefined;
        const mutation = options.mutationReport
          ? await loadMutationReport(options.mutationReport)
          : undefined;
        const rendered = { ...result, semantic, mutation };
        io.stdout(
          options.format === 'json'
            ? renderJson(rendered)
            : renderText(rendered),
        );
        resultCode = result.summary.fake > 0 ? 1 : 0;
      },
    );

  try {
    await program.parseAsync(['node', 'ata', ...args]);
    return resultCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? 0 : 2;
    }
    if (error instanceof InputPathError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof MutationReportError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

function createProgram(io: CliIo): Command {
  return new Command()
    .name('ata')
    .description(
      'Deterministic static analysis for JavaScript and TypeScript tests',
    )
    .version('0.1.0')
    .exitOverride()
    .configureOutput({
      writeOut: io.stdout,
      writeErr: io.stderr,
    });
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  void runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
