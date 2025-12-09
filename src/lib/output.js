/**
 * Output Formatting
 *
 * Handles CLI output formatting: tables, JSON, colors, spinners.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import ora from 'ora';
import config from './config.js';

// ============================================
// Colors & Styling
// ============================================

export const colors = {
  primary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  muted: chalk.gray,
  highlight: chalk.cyan,
  bold: chalk.bold,
};

export const icons = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  task: '📋',
  project: '📁',
  user: '👤',
  clock: '⏱',
  check: '✅',
  blocked: '🚫',
  progress: '📊',
};

// ============================================
// Status Badges
// ============================================

export const statusColors = {
  // Task statuses
  todo: chalk.gray,
  in_progress: chalk.blue,
  in_review: chalk.yellow,
  blocked: chalk.red,
  done: chalk.green,

  // Project statuses
  planning: chalk.gray,
  active: chalk.blue,
  on_hold: chalk.yellow,
  completed: chalk.green,
  cancelled: chalk.red,

  // Priority
  low: chalk.gray,
  medium: chalk.blue,
  high: chalk.yellow,
  urgent: chalk.red,
  critical: chalk.red.bold,
};

export function statusBadge(status) {
  const colorFn = statusColors[status] || chalk.white;
  return colorFn(`[${status}]`);
}

export function priorityBadge(priority) {
  const colorFn = statusColors[priority] || chalk.white;
  const icon = priority === 'urgent' || priority === 'critical' ? '!' : '';
  return colorFn(`${icon}${priority}`);
}

// ============================================
// Spinners
// ============================================

let spinner = null;

export function startSpinner(text) {
  spinner = ora({ text, color: 'blue' }).start();
  return spinner;
}

export function stopSpinner(success = true, text = null) {
  if (spinner) {
    if (success) {
      spinner.succeed(text);
    } else {
      spinner.fail(text);
    }
    spinner = null;
  }
}

export function updateSpinner(text) {
  if (spinner) {
    spinner.text = text;
  }
}

// ============================================
// Tables
// ============================================

export function table(data, columns, options = {}) {
  if (config.get('outputFormat') === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (config.get('outputFormat') === 'minimal') {
    return data.map(row => columns.map(col => row[col.key]).join('\t')).join('\n');
  }

  const tableConfig = {
    head: columns.map(col => colors.bold(col.header)),
    style: {
      head: [],
      border: [],
    },
    ...options,
  };

  const tbl = new Table(tableConfig);

  data.forEach(row => {
    tbl.push(columns.map(col => {
      const value = row[col.key];
      if (col.format) {
        return col.format(value, row);
      }
      return value ?? '';
    }));
  });

  return tbl.toString();
}

// ============================================
// Messages
// ============================================

export function success(message) {
  console.log(`${icons.success} ${colors.success(message)}`);
}

export function error(message, details = null) {
  console.error(`${icons.error} ${colors.error(message)}`);
  if (details) {
    console.error(colors.muted(details));
  }
}

export function warning(message) {
  console.log(`${icons.warning} ${colors.warning(message)}`);
}

export function info(message) {
  console.log(`${icons.info} ${colors.primary(message)}`);
}

export function muted(message) {
  console.log(colors.muted(message));
}

// ============================================
// Boxes & Cards
// ============================================

export function box(content, title = null, type = 'info') {
  const borderColor = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  }[type] || 'blue';

  return boxen(content, {
    title: title,
    titleAlignment: 'left',
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor,
  });
}

export function taskCard(task) {
  const lines = [
    `${colors.bold(task.title)}`,
    '',
    `Status: ${statusBadge(task.status)}  Priority: ${priorityBadge(task.priority)}`,
  ];

  if (task.description) {
    lines.push('', colors.muted(task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '')));
  }

  if (task.assignedTo) {
    lines.push('', `${icons.user} ${task.assignedTo}`);
  }

  if (task.dueDate) {
    lines.push(`${icons.clock} Due: ${new Date(task.dueDate).toLocaleDateString()}`);
  }

  return box(lines.join('\n'), `Task: ${task.id}`, task.status === 'blocked' ? 'error' : 'info');
}

// ============================================
// JSON Output
// ============================================

export function json(data) {
  console.log(JSON.stringify(data, null, 2));
}

// ============================================
// Format Helpers
// ============================================

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

export function formatRelativeTime(date) {
  if (!date) return '-';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length - 3) + '...' : str;
}

export default {
  colors,
  icons,
  statusBadge,
  priorityBadge,
  startSpinner,
  stopSpinner,
  updateSpinner,
  table,
  success,
  error,
  warning,
  info,
  muted,
  box,
  taskCard,
  json,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
};
