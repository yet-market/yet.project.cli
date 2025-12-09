/**
 * Knowledge Commands
 *
 * Commands for managing knowledge base entries: list, create, search.
 */

import inquirer from 'inquirer';
import api from '../lib/api.js';
import output from '../lib/output.js';

const CATEGORIES = [
  'architecture',
  'api',
  'deployment',
  'testing',
  'security',
  'performance',
  'workflow',
  'conventions',
  'troubleshooting',
  'other',
];

/**
 * Register knowledge commands
 * @param {Command} program - Commander program
 */
export function registerKnowledgeCommands(program) {
  const knowledge = program.command('knowledge').alias('kb').description('Manage knowledge base');

  // List knowledge entries
  knowledge
    .command('list')
    .alias('ls')
    .description('List knowledge entries')
    .option('-c, --category <category>', `Filter by category (${CATEGORIES.join(', ')})`)
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (options) => {
      await listKnowledge(options);
    });

  // Get knowledge entry
  knowledge
    .command('show <id>')
    .alias('get')
    .description('Show knowledge entry details')
    .action(async (id) => {
      await showKnowledge(id);
    });

  // Create knowledge entry
  knowledge
    .command('create')
    .alias('new')
    .description('Create a new knowledge entry')
    .option('-t, --title <title>', 'Entry title')
    .option('-c, --category <category>', `Category (${CATEGORIES.join(', ')})`)
    .option('--content <content>', 'Entry content')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (options) => {
      await createKnowledge(options);
    });

  // Update knowledge entry
  knowledge
    .command('update <id>')
    .alias('edit')
    .description('Update a knowledge entry')
    .option('-t, --title <title>', 'New title')
    .option('-c, --category <category>', 'New category')
    .option('--content <content>', 'New content')
    .action(async (id, options) => {
      await updateKnowledge(id, options);
    });

  // Search knowledge
  knowledge
    .command('search <query>')
    .alias('find')
    .description('Search knowledge base')
    .action(async (query) => {
      await searchKnowledge(query);
    });

  // Delete knowledge entry
  knowledge
    .command('delete <id>')
    .alias('rm')
    .description('Delete a knowledge entry')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      await deleteKnowledge(id, options);
    });

  // List by category
  knowledge
    .command('category <category>')
    .alias('cat')
    .description('List entries in a category')
    .action(async (category) => {
      await listByCategory(category);
    });

}

/**
 * List knowledge entries
 */
async function listKnowledge(options) {
  output.startSpinner('Fetching knowledge entries...');

  try {
    const params = {
      limit: parseInt(options.limit, 10),
    };
    if (options.category) params.category = options.category;

    const entries = await api.knowledge.list(params);

    output.stopSpinner(true);

    if (!entries || entries.length === 0) {
      output.info('No knowledge entries found');
      return;
    }

    const tableData = output.table(entries, [
      { key: 'id', header: 'ID', format: (v) => output.colors.muted(v.substring(0, 8)) },
      { key: 'title', header: 'Title', format: (v) => output.truncate(v, 40) },
      { key: 'category', header: 'Category', format: (v) => output.colors.highlight(v) },
      { key: 'updatedAt', header: 'Updated', format: (v) => output.formatRelativeTime(v) },
    ]);

    console.log(tableData);
    output.muted(`\nShowing ${entries.length} entry(ies)`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Show knowledge entry details
 */
async function showKnowledge(id) {
  output.startSpinner('Fetching entry...');

  try {
    const entry = await api.knowledge.get(id);

    output.stopSpinner(true);

    console.log('');
    console.log(output.colors.bold(entry.title));
    console.log(output.colors.muted(`Category: ${entry.category}`));
    console.log(output.colors.muted(`Updated: ${output.formatDateTime(entry.updatedAt)}`));
    console.log('');
    console.log(entry.content);
    console.log('');

    if (entry.tags && entry.tags.length > 0) {
      console.log(output.colors.muted(`Tags: ${entry.tags.join(', ')}`));
    }
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Create a knowledge entry
 */
async function createKnowledge(options) {
  let { title, category, content, interactive } = options;

  // Interactive mode or missing required fields
  if (interactive || !title || !category || !content) {
    const questions = [];

    if (!title) {
      questions.push({
        type: 'input',
        name: 'title',
        message: 'Entry title:',
        validate: (input) => (input ? true : 'Title is required'),
      });
    }

    if (!category) {
      questions.push({
        type: 'list',
        name: 'category',
        message: 'Category:',
        choices: CATEGORIES,
      });
    }

    if (!content) {
      questions.push({
        type: 'editor',
        name: 'content',
        message: 'Content (opens editor):',
        validate: (input) => (input && input.trim() ? true : 'Content is required'),
      });
    }

    const answers = await inquirer.prompt(questions);
    title = title || answers.title;
    category = category || answers.category;
    content = content || answers.content;
  }

  // Validate category
  if (!CATEGORIES.includes(category)) {
    output.error(`Invalid category. Must be one of: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  output.startSpinner('Creating entry...');

  try {
    const entryData = {
      title,
      category,
      content,
    };

    const entry = await api.knowledge.create(entryData);

    output.stopSpinner(true, 'Entry created');
    output.success(`Created: ${entry.id}`);

    console.log('');
    console.log(output.colors.bold(entry.title));
    console.log(output.colors.muted(`Category: ${entry.category}`));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Update a knowledge entry
 */
async function updateKnowledge(id, options) {
  const updates = {};

  if (options.title) updates.title = options.title;
  if (options.category) {
    if (!CATEGORIES.includes(options.category)) {
      output.error(`Invalid category. Must be one of: ${CATEGORIES.join(', ')}`);
      process.exit(1);
    }
    updates.category = options.category;
  }
  if (options.content) updates.content = options.content;

  if (Object.keys(updates).length === 0) {
    // If no updates, offer to edit content
    const entry = await api.knowledge.get(id);

    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'content',
        message: 'Edit content:',
        default: entry.content,
      },
    ]);

    if (answers.content && answers.content !== entry.content) {
      updates.content = answers.content;
    } else {
      output.info('No changes made');
      return;
    }
  }

  output.startSpinner('Updating entry...');

  try {
    const entry = await api.knowledge.update(id, updates);
    output.stopSpinner(true, 'Entry updated');

    console.log('');
    console.log(output.colors.bold(entry.title));
    console.log(output.colors.muted(`Category: ${entry.category}`));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Search knowledge base
 */
async function searchKnowledge(query) {
  output.startSpinner(`Searching for "${query}"...`);

  try {
    const entries = await api.knowledge.search(query);

    output.stopSpinner(true);

    if (!entries || entries.length === 0) {
      output.info('No entries found matching your search');
      return;
    }

    console.log('');
    entries.forEach((entry) => {
      console.log(output.colors.bold(entry.title));
      console.log(output.colors.muted(`  ${entry.category} | ${entry.id.substring(0, 8)}`));

      // Show content preview
      if (entry.content) {
        const preview = entry.content.substring(0, 150).replace(/\n/g, ' ');
        console.log(`  ${preview}${entry.content.length > 150 ? '...' : ''}`);
      }
      console.log('');
    });

    output.muted(`Found ${entries.length} result(s)`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Delete a knowledge entry
 */
async function deleteKnowledge(id, options) {
  if (!options.force) {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'delete',
        message: `Are you sure you want to delete entry ${id}?`,
        default: false,
      },
    ]);

    if (!confirm.delete) {
      output.info('Cancelled');
      return;
    }
  }

  output.startSpinner('Deleting entry...');

  try {
    await api.knowledge.delete(id);
    output.stopSpinner(true, 'Entry deleted');
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * List entries by category
 */
async function listByCategory(category) {
  if (!CATEGORIES.includes(category)) {
    output.error(`Invalid category. Must be one of: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  output.startSpinner(`Fetching ${category} entries...`);

  try {
    const entries = await api.knowledge.getByCategory(category);

    output.stopSpinner(true);

    if (!entries || entries.length === 0) {
      output.info(`No entries in category: ${category}`);
      return;
    }

    console.log(`\n${output.colors.bold(`Category: ${category}`)}\n`);

    entries.forEach((entry) => {
      console.log(`  ${output.colors.highlight('•')} ${entry.title}`);
      console.log(`    ${output.colors.muted(entry.id.substring(0, 8))} | ${output.formatRelativeTime(entry.updatedAt)}`);
    });

    console.log('');
    output.muted(`${entries.length} entry(ies) in this category`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

export default { registerKnowledgeCommands };
