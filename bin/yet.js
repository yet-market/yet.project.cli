#!/usr/bin/env node

/**
 * Yet CLI - Command-line tool for Yet.Project
 *
 * AI-native project management from your terminal.
 *
 * @example
 * # Setup
 * yet login
 * yet config set tenant acme
 *
 * # Tasks
 * yet tasks
 * yet task create "Fix bug" --project proj-1
 * yet task done task-123 "Fixed the authentication bug"
 *
 * # Context for AI
 * yet context --json | pbcopy
 */

import { run } from '../src/index.js';

run(process.argv);
