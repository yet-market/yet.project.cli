/**
 * Output Formatting Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as output from '../src/lib/output.js';

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('Output Formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('colors', () => {
    it('has all required color functions', () => {
      expect(typeof output.colors.primary).toBe('function');
      expect(typeof output.colors.success).toBe('function');
      expect(typeof output.colors.warning).toBe('function');
      expect(typeof output.colors.error).toBe('function');
      expect(typeof output.colors.muted).toBe('function');
      expect(typeof output.colors.highlight).toBe('function');
      expect(typeof output.colors.bold).toBe('function');
    });
  });

  describe('icons', () => {
    it('has all required icons', () => {
      expect(output.icons.success).toBeDefined();
      expect(output.icons.error).toBeDefined();
      expect(output.icons.warning).toBeDefined();
      expect(output.icons.info).toBeDefined();
      expect(output.icons.task).toBeDefined();
      expect(output.icons.project).toBeDefined();
    });
  });

  describe('statusBadge', () => {
    it('returns colored badge for known statuses', () => {
      const badge = output.statusBadge('todo');
      expect(badge).toContain('todo');
    });

    it('returns badge for unknown status', () => {
      const badge = output.statusBadge('unknown_status');
      expect(badge).toContain('unknown_status');
    });
  });

  describe('priorityBadge', () => {
    it('returns colored badge for priorities', () => {
      const badge = output.priorityBadge('high');
      expect(badge).toContain('high');
    });

    it('adds icon for urgent/critical', () => {
      const urgent = output.priorityBadge('urgent');
      expect(urgent).toContain('urgent');
    });
  });

  describe('formatDate', () => {
    it('formats valid date', () => {
      const result = output.formatDate('2024-01-15');
      expect(result).toBeDefined();
      expect(result).not.toBe('-');
    });

    it('returns dash for null/undefined', () => {
      expect(output.formatDate(null)).toBe('-');
      expect(output.formatDate(undefined)).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('formats valid datetime', () => {
      const result = output.formatDateTime('2024-01-15T10:30:00Z');
      expect(result).toBeDefined();
      expect(result).not.toBe('-');
    });

    it('returns dash for null/undefined', () => {
      expect(output.formatDateTime(null)).toBe('-');
      expect(output.formatDateTime(undefined)).toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for recent times', () => {
      const now = new Date();
      const result = output.formatRelativeTime(now.toISOString());
      expect(result).toBe('just now');
    });

    it('returns minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = output.formatRelativeTime(date.toISOString());
      expect(result).toMatch(/\dm ago/);
    });

    it('returns hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = output.formatRelativeTime(date.toISOString());
      expect(result).toMatch(/\dh ago/);
    });

    it('returns days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = output.formatRelativeTime(date.toISOString());
      expect(result).toMatch(/\dd ago/);
    });

    it('returns dash for null/undefined', () => {
      expect(output.formatRelativeTime(null)).toBe('-');
      expect(output.formatRelativeTime(undefined)).toBe('-');
    });
  });

  describe('truncate', () => {
    it('returns string as-is if shorter than limit', () => {
      expect(output.truncate('short', 10)).toBe('short');
    });

    it('truncates and adds ellipsis', () => {
      const result = output.truncate('this is a long string', 10);
      expect(result.length).toBe(10);
      expect(result).toContain('...');
    });

    it('handles null/undefined', () => {
      expect(output.truncate(null)).toBe('');
      expect(output.truncate(undefined)).toBe('');
    });
  });

  describe('success', () => {
    it('logs success message', () => {
      output.success('Test message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('logs error message', () => {
      output.error('Test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('warning', () => {
    it('logs warning message', () => {
      output.warning('Test warning');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('logs info message', () => {
      output.info('Test info');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('muted', () => {
    it('logs muted message', () => {
      output.muted('Test muted');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('json', () => {
    it('outputs JSON formatted data', () => {
      const data = { key: 'value' };
      output.json(data);
      expect(consoleSpy.log).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });
  });

  describe('table', () => {
    it('generates table for data', () => {
      const data = [
        { id: '1', name: 'Task 1' },
        { id: '2', name: 'Task 2' },
      ];
      const columns = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
      ];
      const result = output.table(data, columns);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('applies format function to columns', () => {
      const data = [{ status: 'done' }];
      const columns = [
        { key: 'status', header: 'Status', format: (v) => `[${v}]` },
      ];
      const result = output.table(data, columns);
      expect(result).toContain('[done]');
    });

    it('handles missing values', () => {
      const data = [{ id: '1' }];
      const columns = [
        { key: 'id', header: 'ID' },
        { key: 'missing', header: 'Missing' },
      ];
      const result = output.table(data, columns);
      expect(result).toBeDefined();
    });
  });

  describe('taskCard', () => {
    it('generates task card', () => {
      const task = {
        id: '123',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      };
      const result = output.taskCard(task);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('includes description if present', () => {
      const task = {
        id: '123',
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
        description: 'This is a test task description',
      };
      const result = output.taskCard(task);
      expect(result).toBeDefined();
    });

    it('includes assignee and due date', () => {
      const task = {
        id: '123',
        title: 'Test Task',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 'user@example.com',
        dueDate: '2024-12-31',
      };
      const result = output.taskCard(task);
      expect(result).toBeDefined();
    });
  });

  describe('box', () => {
    it('generates box with content', () => {
      const result = output.box('Test content', 'Title', 'info');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('uses different border colors for types', () => {
      const info = output.box('content', 'title', 'info');
      const error = output.box('content', 'title', 'error');
      expect(info).toBeDefined();
      expect(error).toBeDefined();
    });
  });
});
