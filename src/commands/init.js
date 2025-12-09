/**
 * Init Command
 *
 * Initialize Yet.Project in a git repository.
 * Installs git hooks for automatic task updates.
 *
 * AI-agnostic: Works with any AI tool or human developers.
 */

import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'fs';
import { join } from 'path';
import output from '../lib/output.js';
import config from '../lib/config.js';
import git from '../lib/git.js';

/**
 * Git hook templates
 */
const HOOKS = {
  'post-commit': `#!/bin/sh
# Yet.Project: Update task progress after commit
# Installed by: yet init

# Check if yet CLI is available
if ! command -v yet &> /dev/null; then
  exit 0
fi

# Get commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Update task (will auto-detect from branch name)
yet progress 100 "$COMMIT_MSG" 2>/dev/null || true
`,

  'post-checkout': `#!/bin/sh
# Yet.Project: Show current task when switching branches
# Installed by: yet init

# Check if yet CLI is available
if ! command -v yet &> /dev/null; then
  exit 0
fi

# Only run on branch checkout (not file checkout)
if [ "$3" = "1" ]; then
  yet current 2>/dev/null || true
fi
`,

  'pre-push': `#!/bin/sh
# Yet.Project: Mark task complete before push
# Installed by: yet init

# Check if yet CLI is available
if ! command -v yet &> /dev/null; then
  exit 0
fi

# Get branch being pushed
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Only for feature/fix branches
case "$BRANCH" in
  feature/*|fix/*|bugfix/*|task/*)
    yet done "Pushed to remote" 2>/dev/null || true
    ;;
esac
`,

  'prepare-commit-msg': `#!/bin/sh
# Yet.Project: Add task ID to commit message
# Installed by: yet init

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only modify if not a merge, amend, or squash
if [ -n "$COMMIT_SOURCE" ]; then
  exit 0
fi

# Check if yet CLI is available
if ! command -v yet &> /dev/null; then
  exit 0
fi

# Get task ID from branch
TASK_ID=$(yet current --id-only 2>/dev/null || true)

if [ -n "$TASK_ID" ]; then
  # Check if task ID already in message
  if ! grep -q "\\[$TASK_ID\\]" "$COMMIT_MSG_FILE"; then
    # Prepend task ID to commit message
    TEMP=$(cat "$COMMIT_MSG_FILE")
    echo "[$TASK_ID] $TEMP" > "$COMMIT_MSG_FILE"
  fi
fi
`,
};

/**
 * Register init command
 */
export function registerInitCommands(program) {
  program
    .command('init')
    .description('Initialize Yet.Project in current git repository')
    .option('--no-hooks', 'Skip git hooks installation')
    .option('-f, --force', 'Overwrite existing hooks')
    .action(async (options) => {
      await initProject(options);
    });

  program
    .command('uninstall')
    .description('Remove Yet.Project git hooks from repository')
    .action(async () => {
      await uninstallHooks();
    });
}

/**
 * Initialize Yet.Project in repository
 */
async function initProject(options) {
  // Check if in a git repo
  if (!git.isGitRepo()) {
    output.error('Not in a git repository. Run `git init` first.');
    process.exit(1);
  }

  // Check if logged in
  if (!config.isConfigured()) {
    output.warning('Not logged in. Run `yet login` to enable full functionality.');
  }

  const gitDir = git.getGitDir();
  const hooksDir = join(gitDir, 'hooks');

  console.log('');
  output.info('Initializing Yet.Project...');
  console.log('');

  // Create hooks directory if needed
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  if (options.hooks !== false) {
    // Install git hooks
    let installedCount = 0;
    let skippedCount = 0;

    for (const [hookName, hookContent] of Object.entries(HOOKS)) {
      const hookPath = join(hooksDir, hookName);

      // Check if hook exists and has content
      if (existsSync(hookPath) && !options.force) {
        const existing = readFileSync(hookPath, 'utf-8');

        // Check if it's our hook
        if (existing.includes('Yet.Project')) {
          output.muted(`  ${output.icons.success} ${hookName} (already installed)`);
          installedCount++;
          continue;
        }

        // Different hook exists
        output.warning(`  ${output.icons.warning} ${hookName} (existing hook, use --force to overwrite)`);
        skippedCount++;
        continue;
      }

      // Install hook
      writeFileSync(hookPath, hookContent);
      chmodSync(hookPath, '755');
      output.success(`  ${output.icons.success} ${hookName}`);
      installedCount++;
    }

    console.log('');

    if (installedCount > 0) {
      output.success(`Installed ${installedCount} git hook(s)`);
    }

    if (skippedCount > 0) {
      output.warning(`Skipped ${skippedCount} existing hook(s)`);
    }
  }

  // Create .yet config file (optional)
  const yetConfigPath = join(process.cwd(), '.yet.json');
  if (!existsSync(yetConfigPath)) {
    const tenant = config.get('tenant');
    const defaultProject = config.get('defaultProject');

    if (tenant) {
      writeFileSync(yetConfigPath, JSON.stringify({
        tenant,
        defaultProject: defaultProject || null,
      }, null, 2));

      output.success(`Created .yet.json config`);
      output.muted('  Add this to .gitignore if you want per-user config');
    }
  }

  console.log('');
  output.success('Yet.Project initialized!');
  console.log('');

  // Show next steps
  console.log(output.colors.bold('Next steps:'));
  console.log('');
  console.log('  1. Create a task:');
  console.log('     yet todo "Implement feature X"');
  console.log('');
  console.log('  2. Start working (creates branch):');
  console.log('     yet start <taskId> --branch');
  console.log('');
  console.log('  3. Commit as usual - task updates automatically');
  console.log('     git commit -m "Add feature"');
  console.log('');
  console.log('  4. Push to complete task');
  console.log('     git push');
  console.log('');

  if (!config.isConfigured()) {
    output.muted('Run `yet login` to connect to your Yet.Project account.');
  }
}

/**
 * Uninstall Yet.Project hooks
 */
async function uninstallHooks() {
  if (!git.isGitRepo()) {
    output.error('Not in a git repository.');
    process.exit(1);
  }

  const gitDir = git.getGitDir();
  const hooksDir = join(gitDir, 'hooks');

  let removedCount = 0;

  for (const hookName of Object.keys(HOOKS)) {
    const hookPath = join(hooksDir, hookName);

    if (existsSync(hookPath)) {
      const content = readFileSync(hookPath, 'utf-8');

      if (content.includes('Yet.Project')) {
        // Remove our hook
        const { unlinkSync } = await import('fs');
        unlinkSync(hookPath);
        output.success(`Removed ${hookName}`);
        removedCount++;
      }
    }
  }

  // Remove .yet.json if exists
  const yetConfigPath = join(process.cwd(), '.yet.json');
  if (existsSync(yetConfigPath)) {
    const { unlinkSync } = await import('fs');
    unlinkSync(yetConfigPath);
    output.success('Removed .yet.json');
  }

  if (removedCount > 0) {
    output.success(`\nRemoved ${removedCount} Yet.Project hook(s)`);
  } else {
    output.info('No Yet.Project hooks found');
  }
}

export default { registerInitCommands };
