/**
 * Configuration Management
 *
 * Handles CLI configuration stored in ~/.erold/config.json
 * Uses the 'conf' package for cross-platform config storage.
 */

import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure config directory exists
const configDir = join(homedir(), '.erold');
if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true });
}

// Configuration schema with defaults
const schema = {
  apiKey: {
    type: 'string',
    default: '',
  },
  apiUrl: {
    type: 'string',
    default: process.env.EROLD_API_URL || 'https://api.erold.dev/api/v1',
  },
  tenant: {
    type: 'string',
    default: '',
  },
  defaultProject: {
    type: 'string',
    default: '',
  },
  outputFormat: {
    type: 'string',
    enum: ['table', 'json', 'minimal'],
    default: 'table',
  },
  colorOutput: {
    type: 'boolean',
    default: true,
  },
};

// Initialize config store
const config = new Conf({
  projectName: 'erold',
  projectSuffix: '',
  cwd: configDir,
  schema,
});

/**
 * Get a configuration value
 * @param {string} key - Configuration key
 * @returns {any} Configuration value
 */
export function get(key) {
  // Check environment variables first (for CI/CD)
  const envKey = `EROLD_${key.toUpperCase()}`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  return config.get(key);
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 */
export function set(key, value) {
  config.set(key, value);
}

/**
 * Delete a configuration value
 * @param {string} key - Configuration key
 */
export function remove(key) {
  config.delete(key);
}

/**
 * Get all configuration values
 * @returns {object} All configuration
 */
export function getAll() {
  return {
    ...config.store,
    // Override with env vars
    apiKey: get('apiKey'),
    apiUrl: get('apiUrl'),
    tenant: get('tenant'),
  };
}

/**
 * Clear all configuration
 */
export function clear() {
  config.clear();
}

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export function isConfigured() {
  const apiKey = get('apiKey');
  return apiKey && apiKey.startsWith('erold_');
}

/**
 * Get API configuration
 * @returns {object} API configuration
 */
export function getApiConfig() {
  return {
    apiKey: get('apiKey'),
    apiUrl: get('apiUrl'),
    tenant: get('tenant'),
  };
}

/**
 * Save API key and tenant
 * @param {string} apiKey - API key
 * @param {string} tenant - Tenant ID/slug
 */
export function saveCredentials(apiKey, tenant) {
  set('apiKey', apiKey);
  if (tenant) {
    set('tenant', tenant);
  }
}

/**
 * Clear credentials
 */
export function clearCredentials() {
  remove('apiKey');
  remove('tenant');
}

/**
 * Get config file path
 * @returns {string} Config file path
 */
export function getConfigPath() {
  return config.path;
}

export default {
  get,
  set,
  remove,
  getAll,
  clear,
  isConfigured,
  getApiConfig,
  saveCredentials,
  clearCredentials,
  getConfigPath,
};
