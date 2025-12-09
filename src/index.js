/**
 * Yet CLI - Main Entry Point
 *
 * AI-native project management from your terminal.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import commands
import { registerAuthCommands } from './commands/auth.js';
import { registerTaskCommands } from './commands/tasks.js';
import { registerProjectCommands } from './commands/projects.js';
import { registerKnowledgeCommands } from './commands/knowledge.js';
import { registerContextCommands } from './commands/context.js';
import { registerConfigCommands } from './commands/config.js';
import { registerGitCommands } from './commands/git.js';
import { registerShortcutCommands } from './commands/shortcuts.js';
import { registerInitCommands } from './commands/init.js';

// Import utils
import output from './lib/output.js';
import { ApiError } from './lib/api.js';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

/**
 * Create and configure the CLI program
 */
function createProgram() {
  const program = new Command();

  program
    .name('yet')
    .description('Yet.Project CLI - AI-native project management')
    .version(pkg.version, '-v, --version', 'Output the current version')
    .option('--json', 'Output in JSON format')
    .option('--no-color', 'Disable colored output')
    .option('--quiet', 'Minimal output');

  // Register all command groups
  registerAuthCommands(program);
  registerConfigCommands(program);
  registerTaskCommands(program);
  registerProjectCommands(program);
  registerKnowledgeCommands(program);
  registerContextCommands(program);
  registerGitCommands(program);
  registerShortcutCommands(program);
  registerInitCommands(program);

  // Global error handler
  program.exitOverride();

  return program;
}

/**
 * Run the CLI
 * @param {string[]} argv - Command line arguments
 */
export async function run(argv) {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (err) {
    // Handle Commander.js exit (help, version)
    if (err.code === 'commander.help' || err.code === 'commander.version') {
      process.exit(0);
    }

    // Handle our API errors
    if (err instanceof ApiError) {
      output.error(err.message);
      if (err.details) {
        output.muted(JSON.stringify(err.details, null, 2));
      }
      process.exit(1);
    }

    // Handle other errors
    if (err.code === 'commander.unknownCommand') {
      output.error(`Unknown command. Run 'yet --help' for available commands.`);
      process.exit(1);
    }

    // Unexpected error
    output.error(err.message || 'An unexpected error occurred');
    if (process.env.DEBUG) {
      console.error(err);
    }
    process.exit(1);
  }
}

export { createProgram };
