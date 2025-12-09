/**
 * Project Commands
 *
 * Commands for managing projects: list, create, update, stats.
 */

import inquirer from 'inquirer';
import api from '../lib/api.js';
import output from '../lib/output.js';

/**
 * Register project commands
 * @param {Command} program - Commander program
 */
export function registerProjectCommands(program) {
  const projects = program.command('projects').description('Manage projects');

  // List projects
  projects
    .command('list')
    .alias('ls')
    .description('List all projects')
    .option('-s, --status <status>', 'Filter by status (planning, active, on_hold, completed, cancelled)')
    .action(async (options) => {
      await listProjects(options);
    });

  // Get project details
  projects
    .command('show <projectId>')
    .alias('get')
    .description('Show project details')
    .action(async (projectId) => {
      await showProject(projectId);
    });

  // Create project
  projects
    .command('create')
    .alias('new')
    .description('Create a new project')
    .option('-n, --name <name>', 'Project name')
    .option('-d, --description <desc>', 'Project description')
    .option('-s, --slug <slug>', 'Project slug (URL-friendly)')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (options) => {
      await createProject(options);
    });

  // Update project
  projects
    .command('update <projectId>')
    .alias('edit')
    .description('Update a project')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('-s, --status <status>', 'New status')
    .action(async (projectId, options) => {
      await updateProject(projectId, options);
    });

  // Project stats
  projects
    .command('stats <projectId>')
    .description('Show project statistics')
    .action(async (projectId) => {
      await projectStats(projectId);
    });

  // List project tasks
  projects
    .command('tasks <projectId>')
    .description('List tasks in a project')
    .option('-s, --status <status>', 'Filter by status')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (projectId, options) => {
      await projectTasks(projectId, options);
    });

  // Delete project
  projects
    .command('delete <projectId>')
    .alias('rm')
    .description('Delete a project')
    .option('-f, --force', 'Skip confirmation')
    .action(async (projectId, options) => {
      await deleteProject(projectId, options);
    });

  // Shortcut at root level
  program
    .command('project <projectId>')
    .description('Show project details (shortcut)')
    .action(async (projectId) => {
      await showProject(projectId);
    });
}

/**
 * List projects
 */
async function listProjects(options) {
  output.startSpinner('Fetching projects...');

  try {
    const params = {};
    if (options.status) params.status = options.status;

    const projects = await api.projects.list(params);

    output.stopSpinner(true);

    if (!projects || projects.length === 0) {
      output.info('No projects found');
      return;
    }

    const tableData = output.table(projects, [
      { key: 'id', header: 'ID', format: (v) => output.colors.muted(v.substring(0, 8)) },
      { key: 'name', header: 'Name', format: (v) => output.truncate(v, 30) },
      { key: 'slug', header: 'Slug', format: (v) => v || '-' },
      { key: 'status', header: 'Status', format: (v) => output.statusBadge(v) },
      { key: 'taskCount', header: 'Tasks', format: (v) => v ?? '-' },
    ]);

    console.log(tableData);
    output.muted(`\nShowing ${projects.length} project(s)`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show project details
 */
async function showProject(projectId) {
  output.startSpinner('Fetching project...');

  try {
    const project = await api.projects.get(projectId);

    output.stopSpinner(true);

    const content = [
      `${output.colors.bold(project.name)}`,
      '',
      `Status: ${output.statusBadge(project.status)}`,
      project.slug ? `Slug: ${project.slug}` : null,
      '',
      project.description || output.colors.muted('No description'),
    ]
      .filter(Boolean)
      .join('\n');

    console.log(output.box(content, `Project: ${project.id.substring(0, 8)}`, 'info'));

    // Show quick stats if available
    if (project.taskCount !== undefined) {
      console.log(`\nTasks: ${project.taskCount}`);
    }

    if (project.completedTasks !== undefined && project.taskCount) {
      const percent = Math.round((project.completedTasks / project.taskCount) * 100);
      console.log(`Progress: ${percent}% (${project.completedTasks}/${project.taskCount} done)`);
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Create a project
 */
async function createProject(options) {
  let { name, description, slug, interactive } = options;

  // Interactive mode or missing required fields
  if (interactive || !name) {
    const questions = [];

    if (!name) {
      questions.push({
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (input) => (input ? true : 'Name is required'),
      });
    }

    if (!slug) {
      questions.push({
        type: 'input',
        name: 'slug',
        message: 'Project slug (URL-friendly, optional):',
        default: (answers) => {
          const n = name || answers.name;
          return n
            ? n
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            : undefined;
        },
      });
    }

    if (!description && interactive) {
      questions.push({
        type: 'editor',
        name: 'description',
        message: 'Project description (opens editor):',
      });
    }

    const answers = await inquirer.prompt(questions);
    name = name || answers.name;
    slug = slug || answers.slug;
    description = description || answers.description;
  }

  output.startSpinner('Creating project...');

  try {
    const projectData = {
      name,
      slug,
      description,
      status: 'planning',
    };

    const project = await api.projects.create(projectData);

    output.stopSpinner(true, 'Project created');
    output.success(`Created project: ${project.id}`);

    const content = [
      `${output.colors.bold(project.name)}`,
      '',
      `Status: ${output.statusBadge(project.status)}`,
      project.slug ? `Slug: ${project.slug}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    console.log(output.box(content, `Project: ${project.id.substring(0, 8)}`, 'success'));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Update a project
 */
async function updateProject(projectId, options) {
  const updates = {};

  if (options.name) updates.name = options.name;
  if (options.description) updates.description = options.description;
  if (options.status) updates.status = options.status;

  if (Object.keys(updates).length === 0) {
    output.error('No updates specified. Use --name, --description, or --status.');
    process.exit(1);
  }

  output.startSpinner('Updating project...');

  try {
    const project = await api.projects.update(projectId, updates);
    output.stopSpinner(true, 'Project updated');

    const content = [
      `${output.colors.bold(project.name)}`,
      '',
      `Status: ${output.statusBadge(project.status)}`,
    ].join('\n');

    console.log(output.box(content, `Project: ${project.id.substring(0, 8)}`, 'success'));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show project statistics
 */
async function projectStats(projectId) {
  output.startSpinner('Fetching project stats...');

  try {
    const [project, stats] = await Promise.all([
      api.projects.get(projectId),
      api.projects.stats(projectId),
    ]);

    output.stopSpinner(true);

    console.log(`\n${output.colors.bold(project.name)} - Statistics\n`);

    // Task breakdown
    console.log(output.colors.bold('Tasks by Status:'));
    const statuses = ['todo', 'in_progress', 'in_review', 'blocked', 'done'];
    statuses.forEach((status) => {
      const count = stats.byStatus?.[status] || 0;
      console.log(`  ${output.statusBadge(status)}: ${count}`);
    });

    console.log('');

    // Priority breakdown
    if (stats.byPriority) {
      console.log(output.colors.bold('Tasks by Priority:'));
      const priorities = ['critical', 'urgent', 'high', 'medium', 'low'];
      priorities.forEach((priority) => {
        const count = stats.byPriority[priority] || 0;
        if (count > 0) {
          console.log(`  ${output.priorityBadge(priority)}: ${count}`);
        }
      });
      console.log('');
    }

    // Overall stats
    console.log(output.colors.bold('Overview:'));
    console.log(`  Total Tasks: ${stats.totalTasks || 0}`);
    console.log(`  Completed: ${stats.completedTasks || 0}`);

    if (stats.totalTasks > 0) {
      const percent = Math.round(((stats.completedTasks || 0) / stats.totalTasks) * 100);
      console.log(`  Progress: ${percent}%`);
    }

    if (stats.totalTimeLogged) {
      console.log(`  Time Logged: ${stats.totalTimeLogged}h`);
    }

    console.log('');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * List project tasks
 */
async function projectTasks(projectId, options) {
  output.startSpinner('Fetching tasks...');

  try {
    const params = {
      limit: parseInt(options.limit, 10),
    };
    if (options.status) params.status = options.status;

    const tasks = await api.projects.tasks(projectId, params);

    output.stopSpinner(true);

    if (!tasks || tasks.length === 0) {
      output.info('No tasks in this project');
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
 * Delete a project
 */
async function deleteProject(projectId, options) {
  if (!options.force) {
    output.warning('This will delete the project and all its tasks!');

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'delete',
        message: `Are you sure you want to delete project ${projectId}?`,
        default: false,
      },
    ]);

    if (!confirm.delete) {
      output.info('Cancelled');
      return;
    }
  }

  output.startSpinner('Deleting project...');

  try {
    await api.projects.delete(projectId);
    output.stopSpinner(true, 'Project deleted');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

export default { registerProjectCommands };
