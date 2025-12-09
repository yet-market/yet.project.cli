/**
 * Git Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as git from '../src/lib/git.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('Git Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGitRepo', () => {
    it('returns true when in git repo', () => {
      execSync.mockReturnValue('true');
      expect(git.isGitRepo()).toBe(true);
    });

    it('returns false when not in git repo', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repo');
      });
      expect(git.isGitRepo()).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('returns branch name', () => {
      execSync.mockReturnValue('feature/task-123\n');
      expect(git.getCurrentBranch()).toBe('feature/task-123');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      expect(git.getCurrentBranch()).toBeNull();
    });
  });

  describe('extractTaskIdFromBranch', () => {
    it('extracts task ID from task-123 format', () => {
      expect(git.extractTaskIdFromBranch('feature/task-123-description')).toBe('123');
    });

    it('extracts task ID from task/123 format', () => {
      expect(git.extractTaskIdFromBranch('task/123')).toBe('123');
    });

    it('extracts JIRA-style task ID', () => {
      expect(git.extractTaskIdFromBranch('feature/PROJ-456-something')).toBe('PROJ-456');
    });

    it('extracts task ID from numeric prefix', () => {
      expect(git.extractTaskIdFromBranch('123-fix-bug')).toBe('123');
    });

    it('returns null for branches without task ID', () => {
      expect(git.extractTaskIdFromBranch('main')).toBeNull();
      expect(git.extractTaskIdFromBranch('develop')).toBeNull();
    });

    it('returns null for null/undefined branch', () => {
      expect(git.extractTaskIdFromBranch(null)).toBeNull();
      expect(git.extractTaskIdFromBranch(undefined)).toBeNull();
    });
  });

  describe('getRepoRoot', () => {
    it('returns repo root path', () => {
      execSync.mockReturnValue('/path/to/repo\n');
      expect(git.getRepoRoot()).toBe('/path/to/repo');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      expect(git.getRepoRoot()).toBeNull();
    });
  });

  describe('getCurrentCommit', () => {
    it('returns short commit hash', () => {
      execSync.mockReturnValue('abc1234\n');
      expect(git.getCurrentCommit()).toBe('abc1234');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      expect(git.getCurrentCommit()).toBeNull();
    });
  });

  describe('isWorkingDirClean', () => {
    it('returns true when clean', () => {
      execSync.mockReturnValue('');
      expect(git.isWorkingDirClean()).toBe(true);
    });

    it('returns false when dirty', () => {
      execSync.mockReturnValue('M  file.js\n');
      expect(git.isWorkingDirClean()).toBe(false);
    });

    it('returns false on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      expect(git.isWorkingDirClean()).toBe(false);
    });
  });

  describe('getChanges', () => {
    it('returns correct change counts', () => {
      execSync.mockReturnValue('M  staged.js\n M unstaged.js\n?? untracked.js\n');
      const changes = git.getChanges();
      expect(changes.staged).toBe(1);
      expect(changes.unstaged).toBe(1);
      expect(changes.untracked).toBe(1);
      expect(changes.total).toBe(3);
    });

    it('returns zeros when clean', () => {
      execSync.mockReturnValue('');
      const changes = git.getChanges();
      expect(changes.staged).toBe(0);
      expect(changes.unstaged).toBe(0);
      expect(changes.untracked).toBe(0);
      expect(changes.total).toBe(0);
    });

    it('returns zeros on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      const changes = git.getChanges();
      expect(changes.staged).toBe(0);
      expect(changes.total).toBe(0);
    });
  });

  describe('getRemoteUrl', () => {
    it('returns remote URL', () => {
      execSync.mockReturnValue('git@github.com:user/repo.git\n');
      expect(git.getRemoteUrl()).toBe('git@github.com:user/repo.git');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      expect(git.getRemoteUrl()).toBeNull();
    });
  });

  describe('parseRemoteUrl', () => {
    it('parses GitHub SSH URL', () => {
      const result = git.parseRemoteUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses GitHub HTTPS URL', () => {
      const result = git.parseRemoteUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses GitLab URL', () => {
      const result = git.parseRemoteUrl('git@gitlab.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses Bitbucket URL', () => {
      const result = git.parseRemoteUrl('git@bitbucket.org:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('returns null for unknown URL format', () => {
      expect(git.parseRemoteUrl('https://unknown.com/repo.git')).toBeNull();
    });

    it('returns null for null/undefined', () => {
      expect(git.parseRemoteUrl(null)).toBeNull();
      expect(git.parseRemoteUrl(undefined)).toBeNull();
    });
  });

  describe('commitWithTask', () => {
    it('creates commit with task reference', () => {
      execSync.mockReturnValue('');
      const result = git.commitWithTask('Fix bug', '123');
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('[123] Fix bug'),
        expect.anything()
      );
    });

    it('creates commit without task reference', () => {
      execSync.mockReturnValue('');
      const result = git.commitWithTask('Fix bug', null);
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('Fix bug'),
        expect.anything()
      );
    });

    it('returns false on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      const result = git.commitWithTask('Fix bug', '123');
      expect(result).toBe(false);
    });
  });

  describe('createTaskBranch', () => {
    it('creates branch with task ID and description', () => {
      execSync.mockReturnValue('');
      const result = git.createTaskBranch('123', 'Fix Authentication Bug', 'fix');
      expect(result).toBe('fix/task-123-fix-authentication-bug');
      expect(execSync).toHaveBeenCalledWith(
        'git checkout -b fix/task-123-fix-authentication-bug',
        expect.anything()
      );
    });

    it('truncates long descriptions', () => {
      execSync.mockReturnValue('');
      const longDesc = 'a'.repeat(100);
      const result = git.createTaskBranch('123', longDesc, 'feature');
      expect(result.length).toBeLessThanOrEqual('feature/task-123-'.length + 50);
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('Error');
      });
      const result = git.createTaskBranch('123', 'description');
      expect(result).toBeNull();
    });
  });
});
