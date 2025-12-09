/**
 * Shortcut Commands
 *
 * Quick commands for common operations: status, todo, current, members, invite.
 * These are root-level shortcuts for faster workflows.
 */

import inquirer from 'inquirer';
import api from '../lib/api.js';
import output from '../lib/output.js';
import git from '../lib/git.js';
import config from '../lib/config.js';

/**
 * Register shortcut commands
 * @param {Command} program - Commander program
 */
export function registerShortcutCommands(program) {
  // Status - quick overview of my tasks, blockers, due soon
  program
    .command('status')
    .alias('st')
    .description('Quick overview: my tasks, blockers, and upcoming due dates')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      await statusCommand(options);
    });

  // Todo - quick task creation
  program
    .command('todo <title>')
    .description('Quickly create a task')
    .option('-p, --project <id>', 'Project ID')
    .option('--priority <priority>', 'Priority (low, medium, high, urgent, critical)', 'medium')
    .action(async (title, options) => {
      await quickTodo(title, options);
    });

  // Current - show task from current git branch
  program
    .command('current')
    .alias('cur')
    .description('Show task linked to current git branch')
    .action(async () => {
      await showCurrentTask();
    });

  // Members - list team members
  program
    .command('members')
    .description('List team members')
    .action(async () => {
      await listMembers();
    });

  // Invite - invite a new member
  program
    .command('invite <email>')
    .description('Invite a new team member')
    .option('-r, --role <role>', 'Role (owner, admin, member, viewer, guest)', 'member')
    .action(async (email, options) => {
      await inviteMember(email, options);
    });
}

/**
 * Status command - quick overview
 */
async function statusCommand(options) {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  output.startSpinner('Loading status...');

  try {
    // Fetch data in parallel
    const [myTasks, blockedTasks, dashboard] = await Promise.all([
      api.tasks.mine({ limit: 10 }),
      api.tasks.blocked(),
      api.context.dashboard(),
    ]);

    output.stopSpinner(true);

    if (options.json) {
      output.json({ myTasks, blockedTasks, dashboard });
      return;
    }

    console.log('\n' + output.colors.bold('=== Yet Status ===\n'));

    // Git context (if in repo)
    if (git.isGitRepo()) {
      const branch = git.getCurrentBranch();
      const taskId = git.getTaskIdFromBranch();
      console.log(`Branch: ${output.colors.highlight(branch)}`);
      if (taskId) {
        console.log(`Task:   ${output.colors.primary(taskId)}`);
      }
      console.log('');
    }

    // My tasks in progress
    const inProgress = myTasks.filter(t => t.status === 'in_progress');
    if (inProgress.length > 0) {
      console.log(output.colors.bold(`In Progress (${inProgress.length}):`));
      inProgress.forEach(task => {
        console.log(`  ${output.colors.blue('●')} ${output.truncate(task.title, 50)}`);
        if (task.progress) {
          console.log(`    ${output.colors.muted(`Progress: ${task.progress}%`)}`);
        }
      });
      console.log('');
    }

    // Blocked tasks
    if (blockedTasks && blockedTasks.length > 0) {
      console.log(output.colors.bold(output.colors.error(`Blocked (${blockedTasks.length}):`)));
      blockedTasks.slice(0, 5).forEach(task => {
        console.log(`  ${output.icons.blocked} ${output.truncate(task.title, 50)}`);
        if (task.blockReason) {
          console.log(`    ${output.colors.muted(task.blockReason)}`);
        }
      });
      console.log('');
    }

    // Upcoming due dates
    if (dashboard.upcomingDue && dashboard.upcomingDue.length > 0) {
      console.log(output.colors.bold('Due Soon:'));
      dashboard.upcomingDue.slice(0, 5).forEach(task => {
        const dueDate = task.dueDate ? output.formatDate(task.dueDate) : 'No date';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
        const dateStr = isOverdue
          ? output.colors.error(dueDate + ' (overdue)')
          : output.colors.warning(dueDate);
        console.log(`  ${output.icons.clock} ${dateStr} - ${output.truncate(task.title, 40)}`);
      });
      console.log('');
    }

    // Quick stats
    console.log(output.colors.bold('Summary:'));
    console.log(`  My Tasks: ${myTasks.length}`);
    console.log(`  Blocked:  ${blockedTasks?.length || 0}`);
    console.log(`  Open:     ${dashboard.openTasks || 0}`);
    console.log('');

    // Quick tips
    output.muted('Quick actions:');
    output.muted('  yet tasks --mine     List all my tasks');
    output.muted('  yet todo "Title"     Create a quick task');
    output.muted('  yet done <id>        Complete a task');

  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Quick todo - create a task quickly
 */
async function quickTodo(title, options) {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  let { project, priority } = options;

  // If no project specified, try default or prompt
  if (!project) {
    project = config.get('defaultProject');

    if (!project) {
      // Fetch projects and prompt
      output.startSpinner('Fetching projects...');
      const projects = await api.projects.list();
      output.stopSpinner(true);

      if (!projects || projects.length === 0) {
        output.error('No projects found. Create a project first.');
        process.exit(1);
      }

      if (projects.length === 1) {
        project = projects[0].id;
        output.info(`Using project: ${projects[0].name}`);
      } else {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'project',
            message: 'Select project:',
            choices: projects.map(p => ({
              name: `${p.name} (${p.slug || p.id.substring(0, 8)})`,
              value: p.id,
            })),
          },
          {
            type: 'confirm',
            name: 'setDefault',
            message: 'Set as default project?',
            default: true,
          },
        ]);

        project = answer.project;

        if (answer.setDefault) {
          config.set('defaultProject', project);
          output.muted('Default project saved');
        }
      }
    }
  }

  output.startSpinner('Creating task...');

  try {
    const task = await api.tasks.create(project, {
      title,
      priority: priority || 'medium',
      status: 'todo',
    });

    output.stopSpinner(true, 'Task created');

    console.log('');
    console.log(`${output.icons.success} ${output.colors.success('Created:')} ${task.title}`);
    console.log(`   ID: ${output.colors.muted(task.id)}`);
    console.log(`   Priority: ${output.priorityBadge(task.priority)}`);
    console.log('');

    output.muted(`Start working: yet start ${task.id}`);

  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show current task from git branch
 */
async function showCurrentTask() {
  if (!git.isGitRepo()) {
    output.error('Not in a git repository');
    process.exit(1);
  }

  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  const branch = git.getCurrentBranch();
  const taskId = git.getTaskIdFromBranch();

  console.log('');
  console.log(`Branch: ${output.colors.highlight(branch)}`);

  if (!taskId) {
    output.warning('No task ID detected from branch name.');
    output.muted('\nTo link a task, name your branch like:');
    output.muted('  feature/task-<taskId>-description');
    output.muted('  fix/YET-123-bug-description');
    output.muted('\nOr create a branch: yet git branch <taskId>');
    return;
  }

  output.startSpinner('Fetching task...');

  try {
    const task = await api.tasks.get(taskId);
    output.stopSpinner(true);

    console.log('');
    console.log(output.taskCard(task));

    // Show suggestions based on status
    console.log('');
    if (task.status === 'todo') {
      output.muted(`Start working: yet start ${task.id}`);
    } else if (task.status === 'in_progress') {
      output.muted(`Complete task: yet done ${task.id}`);
      output.muted(`Log progress:  yet tasks progress ${task.id} 50`);
    } else if (task.status === 'blocked') {
      output.muted(`Unblock task: yet tasks update ${task.id} --status in_progress`);
    }

  } catch (err) {
    output.stopSpinner(false);

    if (err.statusCode === 404) {
      output.warning(`Task ${taskId} not found`);
      output.muted('The task may have been deleted or you may not have access.');
    } else {
      output.error(err.message);
    }
    process.exit(1);
  }
}

/**
 * List team members
 */
async function listMembers() {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  output.startSpinner('Fetching members...');

  try {
    const members = await api.members.list();
    output.stopSpinner(true);

    if (!members || members.length === 0) {
      output.info('No members found');
      return;
    }

    console.log('\n' + output.colors.bold('Team Members\n'));

    const tableData = output.table(members, [
      { key: 'name', header: 'Name', format: v => v || '-' },
      { key: 'email', header: 'Email', format: v => v || '-' },
      { key: 'role', header: 'Role', format: v => output.colors.highlight(v) },
      { key: 'status', header: 'Status', format: v => v === 'active' ? output.colors.success('active') : output.colors.muted(v || '-') },
    ]);

    console.log(tableData);
    output.muted(`\n${members.length} member(s)`);

  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Invite a team member
 */
async function inviteMember(email, options) {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    output.error('Invalid email address');
    process.exit(1);
  }

  // Validate role
  const validRoles = ['owner', 'admin', 'member', 'viewer', 'guest'];
  if (!validRoles.includes(options.role)) {
    output.error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  // Confirm for sensitive roles
  if (options.role === 'owner' || options.role === 'admin') {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Are you sure you want to invite ${email} as ${options.role}?`,
        default: false,
      },
    ]);

    if (!confirm.proceed) {
      output.info('Cancelled');
      return;
    }
  }

  output.startSpinner(`Inviting ${email}...`);

  try {
    await api.members.invite(email, options.role);
    output.stopSpinner(true, 'Invite sent');

    output.success(`Invited ${email} as ${options.role}`);
    output.muted('They will receive an email with instructions to join.');

  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

export default { registerShortcutCommands };
