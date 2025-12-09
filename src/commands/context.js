/**
 * Context Commands
 *
 * Commands for getting AI context and dashboard data.
 */

import api from '../lib/api.js';
import output from '../lib/output.js';

/**
 * Register context commands
 * @param {Command} program - Commander program
 */
export function registerContextCommands(program) {
  // Context command - shows AI-ready context
  program
    .command('context')
    .alias('ctx')
    .description('Get AI-ready project context')
    .option('-p, --project <id>', 'Specific project context')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      await getContext(options);
    });

  // Dashboard command
  program
    .command('dashboard')
    .alias('dash')
    .description('Show dashboard overview')
    .action(async () => {
      await showDashboard();
    });

  // Stats command
  program
    .command('stats')
    .description('Show tenant statistics')
    .action(async () => {
      await showStats();
    });

  // Workload command
  program
    .command('workload')
    .description('Show team workload distribution')
    .action(async () => {
      await showWorkload();
    });
}

/**
 * Get AI-ready context
 */
async function getContext(options) {
  output.startSpinner('Generating context...');

  try {
    const context = await api.context.get();

    output.stopSpinner(true);

    if (options.json) {
      output.json(context);
      return;
    }

    // Format context for display
    console.log('\n' + output.colors.bold('=== AI Context ===\n'));

    // Active project info
    if (context.activeProject) {
      console.log(output.colors.bold('Active Project:'));
      console.log(`  ${context.activeProject.name}`);
      console.log(`  Status: ${output.statusBadge(context.activeProject.status)}`);
      console.log('');
    }

    // Current tasks
    if (context.currentTasks && context.currentTasks.length > 0) {
      console.log(output.colors.bold('Current Tasks:'));
      context.currentTasks.forEach((task) => {
        console.log(`  ${output.statusBadge(task.status)} ${task.title}`);
        if (task.priority === 'urgent' || task.priority === 'critical') {
          console.log(`    ${output.priorityBadge(task.priority)}`);
        }
      });
      console.log('');
    }

    // Blockers
    if (context.blockers && context.blockers.length > 0) {
      console.log(output.colors.bold(output.colors.error('Blockers:')));
      context.blockers.forEach((blocker) => {
        console.log(`  ${output.icons.blocked} ${blocker.title}`);
        if (blocker.reason) {
          console.log(`    ${output.colors.muted(blocker.reason)}`);
        }
      });
      console.log('');
    }

    // Recent activity
    if (context.recentActivity && context.recentActivity.length > 0) {
      console.log(output.colors.bold('Recent Activity:'));
      context.recentActivity.slice(0, 5).forEach((activity) => {
        console.log(
          `  ${output.colors.muted(output.formatRelativeTime(activity.createdAt))} ${activity.description}`
        );
      });
      console.log('');
    }

    // Knowledge snippets
    if (context.relevantKnowledge && context.relevantKnowledge.length > 0) {
      console.log(output.colors.bold('Relevant Knowledge:'));
      context.relevantKnowledge.forEach((kb) => {
        console.log(`  ${output.colors.highlight('•')} ${kb.title} (${kb.category})`);
      });
      console.log('');
    }

    output.muted('Use --json for full context data');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show dashboard
 */
async function showDashboard() {
  output.startSpinner('Loading dashboard...');

  try {
    const dashboard = await api.context.dashboard();

    output.stopSpinner(true);

    console.log('\n' + output.colors.bold('=== Dashboard ===\n'));

    // Quick stats
    console.log(output.colors.bold('Overview:'));
    console.log(`  Total Projects: ${dashboard.projectCount || 0}`);
    console.log(`  Total Tasks: ${dashboard.taskCount || 0}`);
    console.log(`  Open Tasks: ${dashboard.openTasks || 0}`);
    console.log(`  Blocked Tasks: ${dashboard.blockedTasks || 0}`);
    console.log('');

    // My tasks
    if (dashboard.myTasks && dashboard.myTasks.length > 0) {
      console.log(output.colors.bold('My Tasks:'));
      dashboard.myTasks.forEach((task) => {
        console.log(`  ${output.statusBadge(task.status)} ${output.truncate(task.title, 50)}`);
      });
      console.log('');
    }

    // Upcoming due dates
    if (dashboard.upcomingDue && dashboard.upcomingDue.length > 0) {
      console.log(output.colors.bold('Upcoming Due:'));
      dashboard.upcomingDue.forEach((task) => {
        const due = task.dueDate ? output.formatDate(task.dueDate) : 'No date';
        console.log(`  ${output.icons.clock} ${due} - ${output.truncate(task.title, 40)}`);
      });
      console.log('');
    }

    // Recent completions
    if (dashboard.recentCompleted && dashboard.recentCompleted.length > 0) {
      console.log(output.colors.bold('Recently Completed:'));
      dashboard.recentCompleted.forEach((task) => {
        console.log(`  ${output.icons.check} ${output.truncate(task.title, 50)}`);
      });
      console.log('');
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show tenant statistics
 */
async function showStats() {
  output.startSpinner('Loading statistics...');

  try {
    const stats = await api.context.stats();

    output.stopSpinner(true);

    console.log('\n' + output.colors.bold('=== Statistics ===\n'));

    // Overall stats
    console.log(output.colors.bold('Tasks:'));
    console.log(`  Total: ${stats.totalTasks || 0}`);
    console.log(`  Completed: ${stats.completedTasks || 0}`);
    console.log(`  Open: ${stats.openTasks || 0}`);
    console.log(`  Blocked: ${stats.blockedTasks || 0}`);
    console.log('');

    // By status
    if (stats.byStatus) {
      console.log(output.colors.bold('Tasks by Status:'));
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`  ${output.statusBadge(status)}: ${count}`);
      });
      console.log('');
    }

    // By priority
    if (stats.byPriority) {
      console.log(output.colors.bold('Tasks by Priority:'));
      Object.entries(stats.byPriority).forEach(([priority, count]) => {
        if (count > 0) {
          console.log(`  ${output.priorityBadge(priority)}: ${count}`);
        }
      });
      console.log('');
    }

    // Projects
    console.log(output.colors.bold('Projects:'));
    console.log(`  Total: ${stats.totalProjects || 0}`);
    console.log(`  Active: ${stats.activeProjects || 0}`);
    console.log('');

    // Time
    if (stats.totalTimeLogged) {
      console.log(output.colors.bold('Time:'));
      console.log(`  Total Logged: ${stats.totalTimeLogged}h`);
      if (stats.timeThisWeek) {
        console.log(`  This Week: ${stats.timeThisWeek}h`);
      }
      console.log('');
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show workload distribution
 */
async function showWorkload() {
  output.startSpinner('Loading workload...');

  try {
    const workload = await api.context.workload();

    output.stopSpinner(true);

    console.log('\n' + output.colors.bold('=== Team Workload ===\n'));

    if (!workload.members || workload.members.length === 0) {
      output.info('No workload data available');
      return;
    }

    // Table format
    const tableData = output.table(workload.members, [
      { key: 'name', header: 'Member', format: (v) => v || 'Unknown' },
      { key: 'assignedTasks', header: 'Assigned', format: (v) => v || 0 },
      { key: 'inProgress', header: 'In Progress', format: (v) => v || 0 },
      { key: 'completed', header: 'Completed', format: (v) => v || 0 },
      {
        key: 'utilization',
        header: 'Load',
        format: (v) => {
          const percent = v || 0;
          if (percent >= 100) return output.colors.error(`${percent}%`);
          if (percent >= 80) return output.colors.warning(`${percent}%`);
          return `${percent}%`;
        },
      },
    ]);

    console.log(tableData);

    // Summary
    if (workload.summary) {
      console.log('');
      console.log(output.colors.bold('Summary:'));
      console.log(`  Total Tasks: ${workload.summary.totalTasks || 0}`);
      console.log(`  Unassigned: ${workload.summary.unassigned || 0}`);
      console.log(`  Average Load: ${workload.summary.averageLoad || 0}%`);
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

export default { registerContextCommands };
