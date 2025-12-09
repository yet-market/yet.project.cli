/**
 * Task Commands
 *
 * Commands for managing tasks: list, create, update, complete, etc.
 */

import inquirer from 'inquirer';
import api from '../lib/api.js';
import output from '../lib/output.js';
import git from '../lib/git.js';

/**
 * Register task commands
 * @param {Command} program - Commander program
 */
export function registerTaskCommands(program) {
  const tasks = program.command('tasks').description('Manage tasks');

  // List tasks
  tasks
    .command('list')
    .alias('ls')
    .description('List tasks')
    .option('-p, --project <id>', 'Filter by project')
    .option('-s, --status <status>', 'Filter by status (todo, in_progress, in_review, blocked, done)')
    .option('-a, --assignee <email>', 'Filter by assignee')
    .option('--priority <priority>', 'Filter by priority (low, medium, high, urgent, critical)')
    .option('-m, --mine', 'Show only my tasks')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (options) => {
      await listTasks(options);
    });

  // Get task details
  tasks
    .command('show <taskId>')
    .alias('get')
    .description('Show task details')
    .action(async (taskId) => {
      await showTask(taskId);
    });

  // Create task
  tasks
    .command('create')
    .alias('new')
    .description('Create a new task')
    .option('-p, --project <id>', 'Project ID (required)')
    .option('-t, --title <title>', 'Task title')
    .option('-d, --description <desc>', 'Task description')
    .option('--priority <priority>', 'Priority (low, medium, high, urgent, critical)')
    .option('--assignee <uid>', 'Assign to user')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (options) => {
      await createTask(options);
    });

  // Update task
  tasks
    .command('update <taskId>')
    .alias('edit')
    .description('Update a task')
    .option('-t, --title <title>', 'New title')
    .option('-d, --description <desc>', 'New description')
    .option('-s, --status <status>', 'New status')
    .option('--priority <priority>', 'New priority')
    .option('--assignee <uid>', 'New assignee')
    .action(async (taskId, options) => {
      await updateTask(taskId, options);
    });

  // Start task
  tasks
    .command('start [taskId]')
    .description('Start working on a task')
    .option('-b, --branch', 'Create a git branch for this task')
    .action(async (taskId, options) => {
      await startTask(taskId, options);
    });

  // Complete task
  tasks
    .command('complete [taskId]')
    .alias('done')
    .description('Mark a task as complete')
    .option('-s, --summary <text>', 'Completion summary')
    .action(async (taskId, options) => {
      await completeTask(taskId, options);
    });

  // Block task
  tasks
    .command('block <taskId>')
    .description('Mark a task as blocked')
    .option('-r, --reason <reason>', 'Reason for blocking')
    .action(async (taskId, options) => {
      await blockTask(taskId, options);
    });

  // Log time
  tasks
    .command('log <taskId>')
    .description('Log time on a task')
    .option('-h, --hours <hours>', 'Hours to log')
    .option('-n, --notes <notes>', 'Notes')
    .action(async (taskId, options) => {
      await logTime(taskId, options);
    });

  // Search tasks
  tasks
    .command('search <query>')
    .alias('find')
    .description('Search tasks')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (query, options) => {
      await searchTasks(query, options);
    });

  // Show blocked tasks
  tasks
    .command('blocked')
    .description('Show all blocked tasks')
    .action(async () => {
      await showBlockedTasks();
    });

  // Add comment
  tasks
    .command('comment <taskId>')
    .description('Add a comment to a task')
    .option('-m, --message <text>', 'Comment text')
    .action(async (taskId, options) => {
      await addComment(taskId, options);
    });

  // Show comments
  tasks
    .command('comments <taskId>')
    .description('Show comments on a task')
    .action(async (taskId) => {
      await showComments(taskId);
    });

  // Delete task
  tasks
    .command('delete <taskId>')
    .alias('rm')
    .description('Delete a task')
    .option('-f, --force', 'Skip confirmation')
    .action(async (taskId, options) => {
      await deleteTask(taskId, options);
    });

  // Shortcut commands at root level
  program
    .command('task <taskId>')
    .description('Show task details (shortcut)')
    .action(async (taskId) => {
      await showTask(taskId);
    });

  program
    .command('start [taskId]')
    .description('Start working on a task')
    .option('-b, --branch', 'Create a git branch')
    .action(async (taskId, options) => {
      await startTask(taskId, options);
    });

  program
    .command('done [taskId]')
    .description('Mark current task as done')
    .option('-s, --summary <text>', 'Completion summary')
    .action(async (taskId, options) => {
      await completeTask(taskId, options);
    });
}

/**
 * List tasks
 */
async function listTasks(options) {
  output.startSpinner('Fetching tasks...');

  try {
    const params = {
      limit: parseInt(options.limit, 10),
    };

    if (options.project) params.projectId = options.project;
    if (options.status) params.status = options.status;
    if (options.assignee) params.assignee = options.assignee;
    if (options.priority) params.priority = options.priority;

    let tasks;
    if (options.mine) {
      tasks = await api.tasks.mine(params);
    } else {
      tasks = await api.tasks.list(params);
    }

    output.stopSpinner(true);

    if (!tasks || tasks.length === 0) {
      output.info('No tasks found');
      return;
    }

    const tableData = output.table(tasks, [
      { key: 'id', header: 'ID', format: (v) => output.colors.muted(v.substring(0, 8)) },
      { key: 'title', header: 'Title', format: (v) => output.truncate(v, 40) },
      { key: 'status', header: 'Status', format: (v) => output.statusBadge(v) },
      { key: 'priority', header: 'Priority', format: (v) => output.priorityBadge(v) },
      { key: 'assignedTo', header: 'Assignee', format: (v) => v || '-' },
    ]);

    console.log(tableData);
    output.muted(`\nShowing ${tasks.length} task(s)`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show task details
 */
async function showTask(taskId) {
  output.startSpinner('Fetching task...');

  try {
    const task = await api.tasks.get(taskId);
    output.stopSpinner(true);

    console.log(output.taskCard(task));

    // Show additional details
    if (task.tags && task.tags.length > 0) {
      console.log(`Tags: ${task.tags.join(', ')}`);
    }

    if (task.progress !== undefined) {
      console.log(`Progress: ${task.progress}%`);
    }

    if (task.timeEstimate) {
      console.log(`Estimate: ${task.timeEstimate}h`);
    }

    if (task.timeLogged) {
      console.log(`Logged: ${task.timeLogged}h`);
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Create a task
 */
async function createTask(options) {
  let { project, title, description, priority, assignee, interactive } = options;

  // Interactive mode or missing required fields
  if (interactive || !project || !title) {
    const questions = [];

    if (!project) {
      // Fetch projects for selection
      output.startSpinner('Fetching projects...');
      const projects = await api.projects.list();
      output.stopSpinner(true);

      if (!projects || projects.length === 0) {
        output.error('No projects found. Create a project first.');
        process.exit(1);
      }

      questions.push({
        type: 'list',
        name: 'project',
        message: 'Select project:',
        choices: projects.map((p) => ({
          name: `${p.name} (${p.slug || p.id.substring(0, 8)})`,
          value: p.id,
        })),
      });
    }

    if (!title) {
      questions.push({
        type: 'input',
        name: 'title',
        message: 'Task title:',
        validate: (input) => (input ? true : 'Title is required'),
      });
    }

    if (!description && interactive) {
      questions.push({
        type: 'editor',
        name: 'description',
        message: 'Task description (opens editor):',
      });
    }

    if (!priority) {
      questions.push({
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: ['low', 'medium', 'high', 'urgent', 'critical'],
        default: 'medium',
      });
    }

    const answers = await inquirer.prompt(questions);
    project = project || answers.project;
    title = title || answers.title;
    description = description || answers.description;
    priority = priority || answers.priority;
  }

  output.startSpinner('Creating task...');

  try {
    const taskData = {
      title,
      description,
      priority: priority || 'medium',
    };

    if (assignee) taskData.assignedTo = assignee;

    const task = await api.tasks.create(project, taskData);

    output.stopSpinner(true, 'Task created');
    output.success(`Created task: ${task.id}`);
    console.log(output.taskCard(task));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Update a task
 */
async function updateTask(taskId, options) {
  const updates = {};

  if (options.title) updates.title = options.title;
  if (options.description) updates.description = options.description;
  if (options.status) updates.status = options.status;
  if (options.priority) updates.priority = options.priority;
  if (options.assignee) updates.assignedTo = options.assignee;

  if (Object.keys(updates).length === 0) {
    output.error('No updates specified. Use --title, --status, --priority, etc.');
    process.exit(1);
  }

  output.startSpinner('Updating task...');

  try {
    const task = await api.tasks.update(taskId, updates);
    output.stopSpinner(true, 'Task updated');
    console.log(output.taskCard(task));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Start working on a task
 */
async function startTask(taskId, options) {
  // If no task ID, try to get from branch name
  if (!taskId) {
    taskId = git.getTaskIdFromBranch();
    if (!taskId) {
      output.error('No task ID provided and could not detect from branch name.');
      output.muted('Usage: yet start <taskId> or create a branch like feature/task-123-description');
      process.exit(1);
    }
    output.info(`Detected task ID from branch: ${taskId}`);
  }

  output.startSpinner('Starting task...');

  try {
    const task = await api.tasks.start(taskId);
    output.stopSpinner(true, 'Task started');

    output.success(`Started: ${task.title}`);

    // Create branch if requested
    if (options.branch && git.isGitRepo()) {
      const branchName = git.createTaskBranch(taskId, task.title);
      if (branchName) {
        output.success(`Created branch: ${branchName}`);
      }
    }

    console.log(output.taskCard(task));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Complete a task
 */
async function completeTask(taskId, options) {
  // If no task ID, try to get from branch name
  if (!taskId) {
    taskId = git.getTaskIdFromBranch();
    if (!taskId) {
      output.error('No task ID provided and could not detect from branch name.');
      process.exit(1);
    }
    output.info(`Detected task ID from branch: ${taskId}`);
  }

  let { summary } = options;

  // Prompt for summary if not provided
  if (!summary) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'summary',
        message: 'Completion summary (optional):',
      },
    ]);
    summary = answers.summary;
  }

  output.startSpinner('Completing task...');

  try {
    const task = await api.tasks.complete(taskId, summary);
    output.stopSpinner(true, 'Task completed');

    output.success(`Completed: ${task.title}`);
    console.log(output.taskCard(task));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Block a task
 */
async function blockTask(taskId, options) {
  let { reason } = options;

  if (!reason) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'reason',
        message: 'Reason for blocking:',
        validate: (input) => (input ? true : 'Reason is required'),
      },
    ]);
    reason = answers.reason;
  }

  output.startSpinner('Blocking task...');

  try {
    const task = await api.tasks.block(taskId, reason);
    output.stopSpinner(true, 'Task blocked');

    output.warning(`Blocked: ${task.title}`);
    output.muted(`Reason: ${reason}`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Log time on a task
 */
async function logTime(taskId, options) {
  let { hours, notes } = options;

  if (!hours) {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'hours',
        message: 'Hours to log:',
        validate: (input) => (input > 0 ? true : 'Hours must be positive'),
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Notes (optional):',
      },
    ]);
    hours = answers.hours;
    notes = notes || answers.notes;
  }

  output.startSpinner('Logging time...');

  try {
    await api.tasks.logTime(taskId, parseFloat(hours), notes);
    output.stopSpinner(true, `Logged ${hours}h`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Search tasks
 */
async function searchTasks(query, options) {
  output.startSpinner(`Searching for "${query}"...`);

  try {
    const tasks = await api.tasks.search(query, {
      limit: parseInt(options.limit, 10),
    });

    output.stopSpinner(true);

    if (!tasks || tasks.length === 0) {
      output.info('No tasks found matching your search');
      return;
    }

    const tableData = output.table(tasks, [
      { key: 'id', header: 'ID', format: (v) => output.colors.muted(v.substring(0, 8)) },
      { key: 'title', header: 'Title', format: (v) => output.truncate(v, 40) },
      { key: 'status', header: 'Status', format: (v) => output.statusBadge(v) },
      { key: 'projectName', header: 'Project', format: (v) => v || '-' },
    ]);

    console.log(tableData);
    output.muted(`\nFound ${tasks.length} result(s)`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show blocked tasks
 */
async function showBlockedTasks() {
  output.startSpinner('Fetching blocked tasks...');

  try {
    const tasks = await api.tasks.blocked();

    output.stopSpinner(true);

    if (!tasks || tasks.length === 0) {
      output.success('No blocked tasks!');
      return;
    }

    output.warning(`${tasks.length} blocked task(s):\n`);

    tasks.forEach((task) => {
      console.log(output.taskCard(task));
    });
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Add comment to task
 */
async function addComment(taskId, options) {
  let { message } = options;

  if (!message) {
    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'message',
        message: 'Comment (opens editor):',
      },
    ]);
    message = answers.message;
  }

  if (!message || !message.trim()) {
    output.error('Comment cannot be empty');
    process.exit(1);
  }

  output.startSpinner('Adding comment...');

  try {
    await api.tasks.addComment(taskId, message.trim());
    output.stopSpinner(true, 'Comment added');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show task comments
 */
async function showComments(taskId) {
  output.startSpinner('Fetching comments...');

  try {
    const comments = await api.tasks.comments(taskId);

    output.stopSpinner(true);

    if (!comments || comments.length === 0) {
      output.info('No comments on this task');
      return;
    }

    console.log('');
    comments.forEach((comment) => {
      console.log(output.colors.bold(`${comment.authorName || 'Unknown'}`));
      console.log(output.colors.muted(output.formatRelativeTime(comment.createdAt)));
      console.log(comment.content);
      console.log('');
    });
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Delete a task
 */
async function deleteTask(taskId, options) {
  if (!options.force) {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'delete',
        message: `Are you sure you want to delete task ${taskId}?`,
        default: false,
      },
    ]);

    if (!confirm.delete) {
      output.info('Cancelled');
      return;
    }
  }

  output.startSpinner('Deleting task...');

  try {
    await api.tasks.delete(taskId);
    output.stopSpinner(true, 'Task deleted');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

export default { registerTaskCommands };
