/**
 * Git Integration Commands
 *
 * Commands for git workflows: branch creation, commits with task refs.
 */

import inquirer from 'inquirer';
import api from '../lib/api.js';
import git from '../lib/git.js';
import output from '../lib/output.js';

/**
 * Register git commands
 * @param {Command} program - Commander program
 */
export function registerGitCommands(program) {
  const gitCmd = program.command('git').description('Git integration commands');

  // Status - show git status with task context
  gitCmd
    .command('status')
    .alias('st')
    .description('Show git status with task context')
    .action(async () => {
      await gitStatus();
    });

  // Branch - create a branch for a task
  gitCmd
    .command('branch <taskId>')
    .alias('br')
    .description('Create a branch for a task')
    .option('-p, --prefix <prefix>', 'Branch prefix (feature, fix, etc.)', 'feature')
    .action(async (taskId, options) => {
      await createBranch(taskId, options);
    });

  // Commit - create a commit with task reference
  gitCmd
    .command('commit')
    .alias('ci')
    .description('Create a commit with task reference')
    .option('-m, --message <message>', 'Commit message')
    .option('-t, --task <taskId>', 'Task ID to reference')
    .action(async (options) => {
      await commitWithTask(options);
    });

  // Link - link current branch to a task
  gitCmd
    .command('link <taskId>')
    .description('Link current branch to a task')
    .action(async (taskId) => {
      await linkBranch(taskId);
    });

  // Info - show repository info
  gitCmd
    .command('info')
    .description('Show repository information')
    .action(async () => {
      await repoInfo();
    });

  // Changes - show changes summary
  gitCmd
    .command('changes')
    .description('Show uncommitted changes summary')
    .action(async () => {
      await showChanges();
    });
}

/**
 * Show git status with task context
 */
async function gitStatus() {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  const branch = git.getCurrentBranch();
  const taskId = git.extractTaskIdFromBranch(branch);
  const changes = git.getChanges();
  const commit = git.getCurrentCommit();

  console.log('\n' + output.colors.bold('Git Status\n'));

  // Branch info
  console.log(`Branch: ${output.colors.highlight(branch)}`);
  console.log(`Commit: ${output.colors.muted(commit || 'No commits')}`);

  // Task context
  if (taskId) {
    console.log(`Task:   ${output.colors.primary(taskId)}`);

    // Try to fetch task details
    output.startSpinner('Fetching task...');
    try {
      const task = await api.tasks.get(taskId);
      output.stopSpinner(true);

      console.log('');
      console.log(output.colors.bold('Linked Task:'));
      console.log(`  ${task.title}`);
      console.log(`  Status: ${output.statusBadge(task.status)}`);
      console.log(`  Priority: ${output.priorityBadge(task.priority)}`);
    } catch {
      output.stopSpinner(false);
      output.muted(`  (Could not fetch task ${taskId})`);
    }
  } else {
    console.log(output.colors.muted('Task:   No task linked'));
  }

  console.log('');

  // Changes
  console.log(output.colors.bold('Changes:'));
  if (changes.total === 0) {
    console.log(output.colors.success('  Working directory clean'));
  } else {
    if (changes.staged > 0) {
      console.log(output.colors.success(`  Staged:    ${changes.staged} file(s)`));
    }
    if (changes.unstaged > 0) {
      console.log(output.colors.warning(`  Unstaged:  ${changes.unstaged} file(s)`));
    }
    if (changes.untracked > 0) {
      console.log(output.colors.muted(`  Untracked: ${changes.untracked} file(s)`));
    }
  }

  console.log('');
}

/**
 * Create a branch for a task
 */
async function createBranch(taskId, options) {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  // Check for uncommitted changes
  if (!git.isWorkingDirClean()) {
    output.warning('You have uncommitted changes. Commit or stash them first.');

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Create branch anyway?',
        default: false,
      },
    ]);

    if (!confirm.proceed) {
      return;
    }
  }

  // Fetch task to get title
  output.startSpinner('Fetching task...');

  try {
    const task = await api.tasks.get(taskId);
    output.stopSpinner(true);

    const branchName = git.createTaskBranch(taskId, task.title, options.prefix);

    if (branchName) {
      output.success(`Created branch: ${branchName}`);

      // Optionally start the task
      const startTask = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'start',
          message: 'Start working on this task?',
          default: true,
        },
      ]);

      if (startTask.start) {
        output.startSpinner('Starting task...');
        try {
          await api.tasks.start(taskId);
          output.stopSpinner(true, 'Task started');
        } catch (err) {
          output.stopSpinner(false);
          output.warning(`Could not start task: ${err.message}`);
        }
      }
    } else {
      output.error('Failed to create branch');
      process.exit(1);
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Create a commit with task reference
 */
async function commitWithTask(options) {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  const changes = git.getChanges();
  if (changes.staged === 0) {
    output.error('No staged changes to commit. Use `git add` first.');
    process.exit(1);
  }

  let { message, task } = options;

  // Try to detect task from branch if not provided
  if (!task) {
    task = git.getTaskIdFromBranch();
    if (task) {
      output.info(`Detected task from branch: ${task}`);
    }
  }

  // Prompt for message if not provided
  if (!message) {
    const questions = [
      {
        type: 'input',
        name: 'message',
        message: 'Commit message:',
        validate: (input) => (input ? true : 'Message is required'),
      },
    ];

    // Ask for task if not detected
    if (!task) {
      questions.push({
        type: 'input',
        name: 'task',
        message: 'Task ID (optional):',
      });
    }

    const answers = await inquirer.prompt(questions);
    message = answers.message;
    task = task || answers.task;
  }

  // Create commit
  const success = git.commitWithTask(message, task);

  if (success) {
    output.success('Commit created');

    if (task) {
      // Log progress on task
      const logProgress = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'log',
          message: 'Update task progress?',
          default: false,
        },
      ]);

      if (logProgress.log) {
        const progress = await inquirer.prompt([
          {
            type: 'number',
            name: 'percent',
            message: 'Progress (0-100):',
            default: 50,
            validate: (input) => (input >= 0 && input <= 100 ? true : 'Must be 0-100'),
          },
        ]);

        output.startSpinner('Updating progress...');
        try {
          await api.tasks.progress(task, progress.percent, message);
          output.stopSpinner(true, `Progress: ${progress.percent}%`);
        } catch (err) {
          output.stopSpinner(false);
          output.warning(`Could not update progress: ${err.message}`);
        }
      }
    }
  } else {
    output.error('Failed to create commit');
    process.exit(1);
  }
}

/**
 * Link current branch to a task
 */
async function linkBranch(taskId) {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  const branch = git.getCurrentBranch();

  output.startSpinner('Fetching task...');

  try {
    const task = await api.tasks.get(taskId);
    output.stopSpinner(true);

    output.info(`Linking branch "${branch}" to task:`);
    console.log(`  ${task.title}`);
    console.log(`  Status: ${output.statusBadge(task.status)}`);

    // In a real implementation, this would store the link in API or local config
    // For now, we suggest renaming the branch
    const detected = git.extractTaskIdFromBranch(branch);

    if (detected === taskId) {
      output.success('Branch already linked to this task!');
    } else {
      output.muted(`\nTip: Rename branch to include task ID for auto-detection:`);
      output.muted(`  git branch -m ${branch} feature/task-${taskId}-${branch}`);
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show repository information
 */
async function repoInfo() {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  console.log('\n' + output.colors.bold('Repository Info\n'));

  const root = git.getRepoRoot();
  const branch = git.getCurrentBranch();
  const commit = git.getCurrentCommit();
  const remoteUrl = git.getRemoteUrl();
  const repoInfo = git.parseRemoteUrl(remoteUrl);

  console.log(`Root:     ${root}`);
  console.log(`Branch:   ${branch}`);
  console.log(`Commit:   ${commit || 'No commits'}`);
  console.log(`Remote:   ${remoteUrl || 'No remote'}`);

  if (repoInfo) {
    console.log(`Provider: GitHub/GitLab/Bitbucket`);
    console.log(`Owner:    ${repoInfo.owner}`);
    console.log(`Repo:     ${repoInfo.repo}`);
  }

  // Task detection
  const taskId = git.getTaskIdFromBranch();
  if (taskId) {
    console.log(`\nLinked Task: ${output.colors.primary(taskId)}`);
  }

  console.log('');
}

/**
 * Show uncommitted changes summary
 */
async function showChanges() {
  if (!git.isGitRepo()) {
    output.error('Not a git repository');
    process.exit(1);
  }

  const changes = git.getChanges();

  console.log('\n' + output.colors.bold('Uncommitted Changes\n'));

  if (changes.total === 0) {
    output.success('Working directory clean');
    return;
  }

  console.log(`Staged:    ${changes.staged > 0 ? output.colors.success(changes.staged) : 0} file(s)`);
  console.log(`Unstaged:  ${changes.unstaged > 0 ? output.colors.warning(changes.unstaged) : 0} file(s)`);
  console.log(`Untracked: ${changes.untracked > 0 ? output.colors.muted(changes.untracked) : 0} file(s)`);
  console.log(`Total:     ${changes.total} file(s)\n`);

  // Suggestions
  if (changes.untracked > 0) {
    output.muted('Tip: Use `git add <file>` to stage untracked files');
  }

  if (changes.unstaged > 0) {
    output.muted('Tip: Use `git add .` to stage all changes');
  }

  if (changes.staged > 0) {
    output.muted('Tip: Use `yet git commit -m "message"` to commit with task reference');
  }
}

export default { registerGitCommands };
