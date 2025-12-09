/**
 * Auth Commands
 *
 * Commands for authentication and user management.
 */

import inquirer from 'inquirer';
import open from 'open';
import config from '../lib/config.js';
import api from '../lib/api.js';
import output from '../lib/output.js';

/**
 * Register auth commands
 * @param {Command} program - Commander program
 */
export function registerAuthCommands(program) {
  // Login command
  program
    .command('login')
    .description('Authenticate with Yet.Project')
    .option('-k, --key <apiKey>', 'API key (or set YET_API_KEY env var)')
    .option('-t, --tenant <tenant>', 'Tenant ID or slug')
    .action(async (options) => {
      await loginCommand(options);
    });

  // Logout command
  program
    .command('logout')
    .description('Clear stored credentials')
    .action(async () => {
      await logoutCommand();
    });

  // Whoami command
  program
    .command('whoami')
    .description('Show current user and tenant')
    .action(async () => {
      await whoamiCommand();
    });

  // Switch tenant command
  program
    .command('switch <tenant>')
    .description('Switch to a different tenant')
    .action(async (tenant) => {
      await switchCommand(tenant);
    });
}

/**
 * Login command handler
 */
async function loginCommand(options) {
  let { key, tenant } = options;

  // If no key provided, prompt for it
  if (!key) {
    output.info('Enter your API key. You can generate one at:');
    output.muted('  https://your-app.com/settings/api-keys\n');

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key:',
        mask: '*',
        validate: (input) => {
          if (!input) return 'API key is required';
          if (!input.startsWith('yet_')) return 'Invalid API key format (should start with yet_)';
          return true;
        },
      },
    ]);
    key = answers.apiKey;
  }

  // Validate API key format
  if (!key.startsWith('yet_')) {
    output.error('Invalid API key format. Keys should start with "yet_"');
    process.exit(1);
  }

  // Save credentials temporarily to test
  config.saveCredentials(key, tenant || '');

  // Test the connection
  output.startSpinner('Verifying credentials...');

  try {
    // Get user info to verify key works
    const user = await api.user.me();

    // Get available tenants
    const tenants = await api.tenants.list();

    output.stopSpinner(true, 'Credentials verified');

    // If no tenant specified and user has multiple, prompt to select
    if (!tenant && tenants.length > 0) {
      if (tenants.length === 1) {
        tenant = tenants[0].id;
        output.info(`Using tenant: ${tenants[0].name}`);
      } else {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'tenant',
            message: 'Select a tenant:',
            choices: tenants.map(t => ({
              name: `${t.name} (${t.slug})`,
              value: t.id,
            })),
          },
        ]);
        tenant = answer.tenant;
      }
    }

    // Save final credentials
    config.saveCredentials(key, tenant);

    output.success(`Logged in as ${user.name || user.email}`);
    if (tenant) {
      const selectedTenant = tenants.find(t => t.id === tenant);
      output.muted(`Tenant: ${selectedTenant?.name || tenant}`);
    }
  } catch (err) {
    output.stopSpinner(false, 'Authentication failed');
    config.clearCredentials();
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Logout command handler
 */
async function logoutCommand() {
  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'logout',
      message: 'Are you sure you want to logout?',
      default: false,
    },
  ]);

  if (confirm.logout) {
    config.clearCredentials();
    output.success('Logged out successfully');
  }
}

/**
 * Whoami command handler
 */
async function whoamiCommand() {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  output.startSpinner('Fetching user info...');

  try {
    const user = await api.user.me();
    const tenant = config.get('tenant');

    output.stopSpinner(true);

    console.log('');
    console.log(output.colors.bold('User:'));
    console.log(`  Name:  ${user.name || '-'}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID:    ${user.id}`);
    console.log('');
    console.log(output.colors.bold('Tenant:'));
    console.log(`  ID:    ${tenant || 'Not set'}`);
    console.log('');
    console.log(output.colors.muted(`Config: ${config.getConfigPath()}`));
  } catch (err) {
    output.stopSpinner(false);
    output.error(err.message);
    process.exit(1);
  }
}

/**
 * Switch tenant command handler
 */
async function switchCommand(tenant) {
  if (!config.isConfigured()) {
    output.error('Not logged in. Run `yet login` first.');
    process.exit(1);
  }

  output.startSpinner('Verifying tenant access...');

  try {
    // Verify we have access to this tenant
    const tenantInfo = await api.tenants.get(tenant);

    config.set('tenant', tenant);
    output.stopSpinner(true, `Switched to tenant: ${tenantInfo.name}`);
  } catch (err) {
    output.stopSpinner(false);
    output.error(`Cannot access tenant: ${err.message}`);
    process.exit(1);
  }
}

export default { registerAuthCommands };
