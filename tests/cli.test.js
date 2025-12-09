/**
 * CLI Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProgram } from '../src/index.js';

describe('CLI', () => {
  let program;

  beforeEach(() => {
    program = createProgram();
  });

  describe('createProgram', () => {
    it('creates program with correct name', () => {
      expect(program.name()).toBe('yet');
    });

    it('has version option', () => {
      const versionOption = program.options.find(o => o.short === '-v');
      expect(versionOption).toBeDefined();
    });

    it('has json option', () => {
      const jsonOption = program.options.find(o => o.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('has no-color option', () => {
      const noColorOption = program.options.find(o => o.long === '--no-color');
      expect(noColorOption).toBeDefined();
    });

    it('has quiet option', () => {
      const quietOption = program.options.find(o => o.long === '--quiet');
      expect(quietOption).toBeDefined();
    });
  });

  describe('Commands', () => {
    it('has login command', () => {
      const cmd = program.commands.find(c => c.name() === 'login');
      expect(cmd).toBeDefined();
    });

    it('has logout command', () => {
      const cmd = program.commands.find(c => c.name() === 'logout');
      expect(cmd).toBeDefined();
    });

    it('has whoami command', () => {
      const cmd = program.commands.find(c => c.name() === 'whoami');
      expect(cmd).toBeDefined();
    });

    it('has switch command', () => {
      const cmd = program.commands.find(c => c.name() === 'switch');
      expect(cmd).toBeDefined();
    });

    it('has tasks command', () => {
      const cmd = program.commands.find(c => c.name() === 'tasks');
      expect(cmd).toBeDefined();
    });

    it('has projects command', () => {
      const cmd = program.commands.find(c => c.name() === 'projects');
      expect(cmd).toBeDefined();
    });

    it('has knowledge command with kb alias', () => {
      const cmd = program.commands.find(c => c.name() === 'knowledge');
      expect(cmd).toBeDefined();
      expect(cmd.alias()).toBe('kb');
    });

    it('has context command with ctx alias', () => {
      const cmd = program.commands.find(c => c.name() === 'context');
      expect(cmd).toBeDefined();
      expect(cmd.alias()).toBe('ctx');
    });

    it('has dashboard command with dash alias', () => {
      const cmd = program.commands.find(c => c.name() === 'dashboard');
      expect(cmd).toBeDefined();
      expect(cmd.alias()).toBe('dash');
    });

    it('has stats command', () => {
      const cmd = program.commands.find(c => c.name() === 'stats');
      expect(cmd).toBeDefined();
    });

    it('has workload command', () => {
      const cmd = program.commands.find(c => c.name() === 'workload');
      expect(cmd).toBeDefined();
    });

    it('has config command', () => {
      const cmd = program.commands.find(c => c.name() === 'config');
      expect(cmd).toBeDefined();
    });

    it('has git command', () => {
      const cmd = program.commands.find(c => c.name() === 'git');
      expect(cmd).toBeDefined();
    });

    it('has task shortcut command', () => {
      const cmd = program.commands.find(c => c.name() === 'task');
      expect(cmd).toBeDefined();
    });

    it('has project shortcut command', () => {
      const cmd = program.commands.find(c => c.name() === 'project');
      expect(cmd).toBeDefined();
    });

    it('has start shortcut command', () => {
      const cmd = program.commands.find(c => c.name() === 'start');
      expect(cmd).toBeDefined();
    });

    it('has done shortcut command', () => {
      const cmd = program.commands.find(c => c.name() === 'done');
      expect(cmd).toBeDefined();
    });
  });

  describe('Tasks Subcommands', () => {
    it('tasks has list subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const list = tasks.commands.find(c => c.name() === 'list');
      expect(list).toBeDefined();
      expect(list.alias()).toBe('ls');
    });

    it('tasks has create subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const create = tasks.commands.find(c => c.name() === 'create');
      expect(create).toBeDefined();
      expect(create.alias()).toBe('new');
    });

    it('tasks has show subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const show = tasks.commands.find(c => c.name() === 'show');
      expect(show).toBeDefined();
      expect(show.alias()).toBe('get');
    });

    it('tasks has update subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const update = tasks.commands.find(c => c.name() === 'update');
      expect(update).toBeDefined();
      expect(update.alias()).toBe('edit');
    });

    it('tasks has start subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const start = tasks.commands.find(c => c.name() === 'start');
      expect(start).toBeDefined();
    });

    it('tasks has complete subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const complete = tasks.commands.find(c => c.name() === 'complete');
      expect(complete).toBeDefined();
      expect(complete.alias()).toBe('done');
    });

    it('tasks has block subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const block = tasks.commands.find(c => c.name() === 'block');
      expect(block).toBeDefined();
    });

    it('tasks has search subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const search = tasks.commands.find(c => c.name() === 'search');
      expect(search).toBeDefined();
      expect(search.alias()).toBe('find');
    });

    it('tasks has blocked subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const blocked = tasks.commands.find(c => c.name() === 'blocked');
      expect(blocked).toBeDefined();
    });

    it('tasks has delete subcommand', () => {
      const tasks = program.commands.find(c => c.name() === 'tasks');
      const del = tasks.commands.find(c => c.name() === 'delete');
      expect(del).toBeDefined();
      expect(del.alias()).toBe('rm');
    });
  });

  describe('Projects Subcommands', () => {
    it('projects has list subcommand', () => {
      const projects = program.commands.find(c => c.name() === 'projects');
      const list = projects.commands.find(c => c.name() === 'list');
      expect(list).toBeDefined();
    });

    it('projects has show subcommand', () => {
      const projects = program.commands.find(c => c.name() === 'projects');
      const show = projects.commands.find(c => c.name() === 'show');
      expect(show).toBeDefined();
    });

    it('projects has create subcommand', () => {
      const projects = program.commands.find(c => c.name() === 'projects');
      const create = projects.commands.find(c => c.name() === 'create');
      expect(create).toBeDefined();
    });

    it('projects has stats subcommand', () => {
      const projects = program.commands.find(c => c.name() === 'projects');
      const stats = projects.commands.find(c => c.name() === 'stats');
      expect(stats).toBeDefined();
    });

    it('projects has tasks subcommand', () => {
      const projects = program.commands.find(c => c.name() === 'projects');
      const tasks = projects.commands.find(c => c.name() === 'tasks');
      expect(tasks).toBeDefined();
    });
  });

  describe('Git Subcommands', () => {
    it('git has status subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const status = git.commands.find(c => c.name() === 'status');
      expect(status).toBeDefined();
      expect(status.alias()).toBe('st');
    });

    it('git has branch subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const branch = git.commands.find(c => c.name() === 'branch');
      expect(branch).toBeDefined();
      expect(branch.alias()).toBe('br');
    });

    it('git has commit subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const commit = git.commands.find(c => c.name() === 'commit');
      expect(commit).toBeDefined();
      expect(commit.alias()).toBe('ci');
    });

    it('git has link subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const link = git.commands.find(c => c.name() === 'link');
      expect(link).toBeDefined();
    });

    it('git has info subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const info = git.commands.find(c => c.name() === 'info');
      expect(info).toBeDefined();
    });

    it('git has changes subcommand', () => {
      const git = program.commands.find(c => c.name() === 'git');
      const changes = git.commands.find(c => c.name() === 'changes');
      expect(changes).toBeDefined();
    });
  });

  describe('Config Subcommands', () => {
    it('config has show subcommand', () => {
      const config = program.commands.find(c => c.name() === 'config');
      const show = config.commands.find(c => c.name() === 'show');
      expect(show).toBeDefined();
    });

    it('config has get subcommand', () => {
      const config = program.commands.find(c => c.name() === 'config');
      const get = config.commands.find(c => c.name() === 'get');
      expect(get).toBeDefined();
    });

    it('config has set subcommand', () => {
      const config = program.commands.find(c => c.name() === 'config');
      const set = config.commands.find(c => c.name() === 'set');
      expect(set).toBeDefined();
    });

    it('config has reset subcommand', () => {
      const config = program.commands.find(c => c.name() === 'config');
      const reset = config.commands.find(c => c.name() === 'reset');
      expect(reset).toBeDefined();
    });

    it('config has path subcommand', () => {
      const config = program.commands.find(c => c.name() === 'config');
      const path = config.commands.find(c => c.name() === 'path');
      expect(path).toBeDefined();
    });
  });

  describe('Knowledge Subcommands', () => {
    it('knowledge has list subcommand', () => {
      const knowledge = program.commands.find(c => c.name() === 'knowledge');
      const list = knowledge.commands.find(c => c.name() === 'list');
      expect(list).toBeDefined();
    });

    it('knowledge has show subcommand', () => {
      const knowledge = program.commands.find(c => c.name() === 'knowledge');
      const show = knowledge.commands.find(c => c.name() === 'show');
      expect(show).toBeDefined();
    });

    it('knowledge has create subcommand', () => {
      const knowledge = program.commands.find(c => c.name() === 'knowledge');
      const create = knowledge.commands.find(c => c.name() === 'create');
      expect(create).toBeDefined();
    });

    it('knowledge has search subcommand', () => {
      const knowledge = program.commands.find(c => c.name() === 'knowledge');
      const search = knowledge.commands.find(c => c.name() === 'search');
      expect(search).toBeDefined();
    });

    it('knowledge has category subcommand', () => {
      const knowledge = program.commands.find(c => c.name() === 'knowledge');
      const category = knowledge.commands.find(c => c.name() === 'category');
      expect(category).toBeDefined();
      expect(category.alias()).toBe('cat');
    });
  });
});
