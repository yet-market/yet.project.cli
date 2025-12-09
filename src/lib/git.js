/**
 * Git Integration
 *
 * Helpers for Git operations: branch detection, task linking.
 */

import { execSync } from 'child_process';

/**
 * Check if current directory is a git repository
 * @returns {boolean}
 */
export function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 * @returns {string|null}
 */
export function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Get repository root directory
 * @returns {string|null}
 */
export function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Extract task ID from branch name
 *
 * Supports formats:
 * - feature/TASK-123-description
 * - fix/task-456
 * - TASK-789
 * - task/123
 *
 * @param {string} branch - Branch name
 * @returns {string|null} Task ID or null
 */
export function extractTaskIdFromBranch(branch) {
  if (!branch) return null;

  // Pattern: task-123, TASK-123, task/123
  const patterns = [
    /task[-/](\d+)/i,           // task-123, task/123
    /([A-Z]+-\d+)/,             // JIRA-style: TASK-123
    /(\d+)[-_]/,                // 123-description
  ];

  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get task ID from current branch
 * @returns {string|null}
 */
export function getTaskIdFromBranch() {
  const branch = getCurrentBranch();
  return extractTaskIdFromBranch(branch);
}

/**
 * Get current commit hash (short)
 * @returns {string|null}
 */
export function getCurrentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Check if working directory is clean
 * @returns {boolean}
 */
export function isWorkingDirClean() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    return status === '';
  } catch {
    return false;
  }
}

/**
 * Get uncommitted changes summary
 * @returns {object} { staged, unstaged, untracked }
 */
export function getChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    const lines = status.split('\n').filter(Boolean);

    return {
      staged: lines.filter(l => l[0] !== ' ' && l[0] !== '?').length,
      unstaged: lines.filter(l => l[1] !== ' ' && l[0] !== '?').length,
      untracked: lines.filter(l => l.startsWith('??')).length,
      total: lines.length,
    };
  } catch {
    return { staged: 0, unstaged: 0, untracked: 0, total: 0 };
  }
}

/**
 * Create a commit with task reference
 * @param {string} message - Commit message
 * @param {string} taskId - Task ID to reference
 * @returns {boolean} Success
 */
export function commitWithTask(message, taskId) {
  try {
    const fullMessage = taskId ? `[${taskId}] ${message}` : message;
    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new branch for a task
 * @param {string} taskId - Task ID
 * @param {string} description - Branch description
 * @param {string} prefix - Branch prefix (feature, fix, etc.)
 * @returns {string|null} New branch name or null
 */
export function createTaskBranch(taskId, description, prefix = 'feature') {
  try {
    const safeName = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const branchName = `${prefix}/task-${taskId}-${safeName}`;
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
    return branchName;
  } catch {
    return null;
  }
}

/**
 * Get remote URL
 * @returns {string|null}
 */
export function getRemoteUrl() {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Parse GitHub/GitLab URL to get owner/repo
 * @param {string} url - Remote URL
 * @returns {object|null} { owner, repo }
 */
export function parseRemoteUrl(url) {
  if (!url) return null;

  // SSH format: git@github.com:owner/repo.git
  // HTTPS format: https://github.com/owner/repo.git
  const patterns = [
    /github\.com[:/]([^/]+)\/([^/.]+)/,
    /gitlab\.com[:/]([^/]+)\/([^/.]+)/,
    /bitbucket\.org[:/]([^/]+)\/([^/.]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

export default {
  isGitRepo,
  getCurrentBranch,
  getRepoRoot,
  extractTaskIdFromBranch,
  getTaskIdFromBranch,
  getCurrentCommit,
  isWorkingDirClean,
  getChanges,
  commitWithTask,
  createTaskBranch,
  getRemoteUrl,
  parseRemoteUrl,
};
