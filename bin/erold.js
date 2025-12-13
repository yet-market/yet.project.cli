#!/usr/bin/env node

/**
 * Erold CLI - Command-line tool for Erold
 *
 * AI-native project management from your terminal.
 *
 * @example
 * # Setup
 * erold login
 * erold config set tenant acme
 *
 * # Tasks
 * erold tasks
 * erold task create "Fix bug" --project proj-1
 * erold task done task-123 "Fixed the authentication bug"
 *
 * # Context for AI
 * erold context --json | pbcopy
 */

import { run } from '../src/index.js';

run(process.argv);
