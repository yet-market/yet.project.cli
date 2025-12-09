/**
 * Config Commands
 *
 * Commands for managing CLI configuration.
 */

import inquirer from 'inquirer';
import config from '../lib/config.js';
import output from '../lib/output.js';

/**
 * Register config commands
 * @param {Command} program - Commander program
 */
export function registerConfigCommands(program) {
  const cfg = program.command('config').description('Manage CLI configuration');

  // Show config
  cfg
    .command('show')
    .alias('ls')
    .description('Show current configuration')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      await showConfig(options);
    });

  // Get config value
  cfg
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key) => {
      await getConfig(key);
    });

  // Set config value
  cfg
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key, value) => {
      await setConfig(key, value);
    });

  // Reset config
  cfg
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      await resetConfig(options);
    });

  // Show config path
  cfg
    .command('path')
    .description('Show configuration file path')
    .action(async () => {
      console.log(config.getConfigPath());
    });

  // Edit config
  cfg
    .command('edit')
    .description('Open config in editor')
    .action(async () => {
      await editConfig();
    });
}

/**
 * Show current configuration
 */
async function showConfig(options) {
  const allConfig = config.getAll();

  // Hide sensitive data
  const safeConfig = { ...allConfig };
  if (safeConfig.apiKey) {
    safeConfig.apiKey = safeConfig.apiKey.substring(0, 10) + '...[hidden]';
  }

  if (options.json) {
    output.json(safeConfig);
    return;
  }

  console.log('\n' + output.colors.bold('Current Configuration:\n'));

  const configKeys = [
    { key: 'apiKey', label: 'API Key', format: (v) => (v ? v.substring(0, 10) + '...' : output.colors.muted('Not set')) },
    { key: 'apiUrl', label: 'API URL', format: (v) => v || output.colors.muted('Default') },
    { key: 'tenant', label: 'Tenant', format: (v) => v || output.colors.muted('Not set') },
    { key: 'outputFormat', label: 'Output Format', format: (v) => v || 'table' },
  ];

  configKeys.forEach(({ key, label, format }) => {
    const value = allConfig[key];
    console.log(`  ${output.colors.bold(label)}: ${format(value)}`);
  });

  console.log('');
  console.log(output.colors.muted(`Config file: ${config.getConfigPath()}`));
}

/**
 * Get a specific config value
 */
async function getConfig(key) {
  const value = config.get(key);

  // Don't show full API key
  if (key === 'apiKey' && value) {
    console.log(value.substring(0, 10) + '...[hidden]');
    return;
  }

  if (value === undefined || value === null) {
    output.muted('(not set)');
  } else {
    console.log(value);
  }
}

/**
 * Set a config value
 */
async function setConfig(key, value) {
  // Validate known keys
  const validKeys = ['apiKey', 'apiUrl', 'tenant', 'outputFormat'];

  if (!validKeys.includes(key)) {
    output.warning(`Unknown key: ${key}`);
    output.muted(`Valid keys: ${validKeys.join(', ')}`);

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Set anyway?',
        default: false,
      },
    ]);

    if (!confirm.proceed) {
      return;
    }
  }

  // Validate specific values
  if (key === 'outputFormat') {
    const validFormats = ['table', 'json', 'minimal'];
    if (!validFormats.includes(value)) {
      output.error(`Invalid output format. Must be: ${validFormats.join(', ')}`);
      process.exit(1);
    }
  }

  if (key === 'apiKey' && value && !value.startsWith('yet_')) {
    output.warning('API keys typically start with "yet_"');
  }

  config.set(key, value);
  output.success(`Set ${key} = ${key === 'apiKey' ? value.substring(0, 10) + '...' : value}`);
}

/**
 * Reset configuration
 */
async function resetConfig(options) {
  if (!options.force) {
    output.warning('This will clear all configuration including credentials!');

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reset',
        message: 'Are you sure you want to reset all configuration?',
        default: false,
      },
    ]);

    if (!confirm.reset) {
      output.info('Cancelled');
      return;
    }
  }

  config.clearCredentials();

  // Reset other settings
  config.set('outputFormat', 'table');

  output.success('Configuration reset to defaults');
  output.muted('Run `yet login` to authenticate again');
}

/**
 * Edit config in editor
 */
async function editConfig() {
  const configPath = config.getConfigPath();

  output.info(`Config file: ${configPath}`);
  output.muted('Opening in default editor...');

  // Use inquirer editor
  const currentConfig = config.getAll();

  // Create editable version (hide API key)
  const editableConfig = {
    ...currentConfig,
    _note: 'Edit values below. API key changes require re-login.',
    apiUrl: currentConfig.apiUrl || 'https://api.yet.project',
    tenant: currentConfig.tenant || '',
    outputFormat: currentConfig.outputFormat || 'table',
  };

  // Don't include apiKey in editable config for safety
  delete editableConfig.apiKey;

  const answers = await inquirer.prompt([
    {
      type: 'editor',
      name: 'config',
      message: 'Edit configuration (JSON):',
      default: JSON.stringify(editableConfig, null, 2),
      validate: (input) => {
        try {
          JSON.parse(input);
          return true;
        } catch {
          return 'Invalid JSON';
        }
      },
    },
  ]);

  try {
    const newConfig = JSON.parse(answers.config);

    // Apply changes (except apiKey and internal fields)
    const safeKeys = ['apiUrl', 'tenant', 'outputFormat'];
    safeKeys.forEach((key) => {
      if (newConfig[key] !== undefined) {
        config.set(key, newConfig[key]);
      }
    });

    output.success('Configuration updated');
  } catch (err) {
    output.error(`Failed to update config: ${err.message}`);
    process.exit(1);
  }
}

export default { registerConfigCommands };
