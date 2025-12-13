/**
 * API Client
 *
 * Handles all HTTP communication with the Erold API.
 * Features: error handling, retries, timeouts, rate limit handling.
 */

import config from './config.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Custom API Error
 */
export class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Sleep helper for retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an API request with retry logic
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function request(endpoint, options = {}) {
  const { apiKey, apiUrl, tenant } = config.getApiConfig();

  if (!apiKey) {
    throw new ApiError(
      'Not authenticated. Run `erold login` first.',
      401
    );
  }

  const url = `${apiUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'User-Agent': '@erold/cli/1.0.0',
    ...options.headers,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  const fetchOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeout);

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || 60;
        throw new ApiError(
          `Rate limited. Try again in ${retryAfter} seconds.`,
          429
        );
      }

      // Handle errors
      if (!response.ok) {
        const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
        throw new ApiError(message, response.status, data?.error?.details);
      }

      // Return data (unwrap if wrapped in { success, data })
      return data?.data !== undefined ? data.data : data;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      // Don't retry on client errors (4xx) except 429
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      // Don't retry on abort
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408);
      }

      // Last attempt, throw error
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await sleep(RETRY_DELAY * attempt);
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    lastError?.message || 'Request failed after retries',
    lastError?.statusCode || 500
  );
}

// ============================================
// HTTP Methods
// ============================================

/**
 * GET request
 */
export async function get(endpoint, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  return request(url, { method: 'GET' });
}

/**
 * POST request
 */
export async function post(endpoint, data = {}) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request
 */
export async function patch(endpoint, data = {}) {
  return request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get tenant prefix for API calls
 */
function getTenantPath() {
  const tenant = config.get('tenant');
  if (!tenant) {
    throw new ApiError(
      'No tenant configured. Run `erold config set tenant <tenant-id>` first.',
      400
    );
  }
  return `/tenants/${tenant}`;
}

// ============================================
// High-Level API Methods
// ============================================

// --- User ---
export const user = {
  me: () => get('/me'),
  notifications: (params) => get('/me/notifications', params),
  markNotificationRead: (id) => patch(`/me/notifications/${id}`),
  markAllNotificationsRead: () => post('/me/notifications/read-all'),
};

// --- Tasks ---
export const tasks = {
  list: (params = {}) => get(`${getTenantPath()}/tasks`, params),
  search: (query, params = {}) => get(`${getTenantPath()}/tasks/search`, { q: query, ...params }),
  mine: (params = {}) => get(`${getTenantPath()}/tasks/mine`, params),
  blocked: () => get(`${getTenantPath()}/tasks/blocked`),
  get: (id) => get(`${getTenantPath()}/tasks/${id}`),
  create: (projectId, data) => post(`${getTenantPath()}/projects/${projectId}/tasks`, data),
  update: (id, data) => patch(`${getTenantPath()}/tasks/${id}`, data),
  delete: (id) => del(`${getTenantPath()}/tasks/${id}`),
  bulk: (taskIds, updates) => post(`${getTenantPath()}/tasks/bulk`, { taskIds, updates }),

  // Actions
  start: (id) => post(`${getTenantPath()}/tasks/${id}/start`),
  complete: (id, summary) => post(`${getTenantPath()}/tasks/${id}/complete`, { summary }),
  block: (id, reason) => post(`${getTenantPath()}/tasks/${id}/block`, { reason }),
  progress: (id, percent, notes) => post(`${getTenantPath()}/tasks/${id}/progress`, { percent, notes }),
  logTime: (id, hours, notes) => post(`${getTenantPath()}/tasks/${id}/log`, { hours, notes }),

  // Comments
  comments: (id) => get(`${getTenantPath()}/tasks/${id}/comments`),
  addComment: (id, content) => post(`${getTenantPath()}/tasks/${id}/comments`, { content }),
};

// --- Projects ---
export const projects = {
  list: (params = {}) => get(`${getTenantPath()}/projects`, params),
  get: (id) => get(`${getTenantPath()}/projects/${id}`),
  create: (data) => post(`${getTenantPath()}/projects`, data),
  update: (id, data) => patch(`${getTenantPath()}/projects/${id}`, data),
  delete: (id) => del(`${getTenantPath()}/projects/${id}`),
  stats: (id) => get(`${getTenantPath()}/projects/${id}/stats`),
  tasks: (id, params = {}) => get(`${getTenantPath()}/projects/${id}/tasks`, params),
};

// --- Knowledge ---
export const knowledge = {
  list: (params = {}) => get(`${getTenantPath()}/knowledge`, params),
  get: (id) => get(`${getTenantPath()}/knowledge/${id}`),
  getByCategory: (category) => get(`${getTenantPath()}/knowledge/category/${category}`),
  create: (data) => post(`${getTenantPath()}/knowledge`, data),
  update: (id, data) => patch(`${getTenantPath()}/knowledge/${id}`, data),
  delete: (id) => del(`${getTenantPath()}/knowledge/${id}`),
  search: (query) => get(`${getTenantPath()}/knowledge`, { search: query }),
};

// --- Vault (Project Secrets) ---
export const vault = {
  list: (projectId) => get(`${getTenantPath()}/projects/${projectId}/vault`),
  get: (projectId, entryId) => get(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`),
  create: (projectId, data) => post(`${getTenantPath()}/projects/${projectId}/vault`, data),
  update: (projectId, entryId, data) => patch(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`, data),
  delete: (projectId, entryId) => del(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`),
};

// --- Tech Info (Project Tech Stack) ---
export const techInfo = {
  get: (projectId) => get(`${getTenantPath()}/projects/${projectId}/tech-info`),
  update: (projectId, data) => patch(`${getTenantPath()}/projects/${projectId}/tech-info`, data),
};

// --- Context ---
export const context = {
  get: () => get(`${getTenantPath()}/context`),
  dashboard: () => get(`${getTenantPath()}/dashboard`),
  stats: () => get(`${getTenantPath()}/stats`),
  workload: () => get(`${getTenantPath()}/workload`),
};

// --- Members ---
export const members = {
  list: () => get(`${getTenantPath()}/members`),
  get: (uid) => get(`${getTenantPath()}/members/${uid}`),
  invite: (email, role = 'member') => post(`${getTenantPath()}/members/invite`, { email, role }),
  updateRole: (uid, role) => patch(`${getTenantPath()}/members/${uid}`, { role }),
  remove: (uid) => del(`${getTenantPath()}/members/${uid}`),
};

// --- Invites ---
export const invites = {
  list: () => get(`${getTenantPath()}/invites`),
  accept: (id) => post(`/invites/${id}/accept`),
  decline: (id) => post(`/invites/${id}/decline`),
};

// --- Activity ---
export const activity = {
  list: (params = {}) => get(`${getTenantPath()}/activity`, params),
  forTask: (taskId) => get(`${getTenantPath()}/tasks/${taskId}/activity`),
};

// --- Export ---
export const exportData = {
  tasks: (format = 'json') => get(`${getTenantPath()}/export/tasks`, { format }),
  projects: (format = 'json') => get(`${getTenantPath()}/export/projects`, { format }),
  activity: (format = 'json') => get(`${getTenantPath()}/export/activity`, { format }),
};

// --- Tenants ---
export const tenants = {
  list: () => get('/tenants'),
  get: (id) => get(`/tenants/${id}`),
};

export default {
  get,
  post,
  patch,
  del,
  user,
  tasks,
  projects,
  knowledge,
  vault,
  techInfo,
  context,
  members,
  invites,
  activity,
  exportData,
  tenants,
  ApiError,
};
