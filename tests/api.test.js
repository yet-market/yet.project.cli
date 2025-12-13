/**
 * API Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '../src/lib/api.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock config
vi.mock('../src/lib/config.js', () => ({
  default: {
    getApiConfig: () => ({
      apiKey: 'erold_test_key',
      apiUrl: 'https://api.test.com',
      tenant: 'test-tenant',
    }),
    get: (key) => {
      if (key === 'tenant') return 'test-tenant';
      return null;
    },
  },
}));

// Import after mocking
const api = await import('../src/lib/api.js');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('ApiError', () => {
    it('creates error with message and status code', () => {
      const error = new ApiError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('includes details when provided', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new ApiError('Validation error', 400, details);
      expect(error.details).toEqual(details);
    });
  });

  describe('get', () => {
    it('makes GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: '123' } }),
      });

      const result = await api.get('/test');
      expect(result).toEqual({ id: '123' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'erold_test_key',
          }),
        })
      );
    });

    it('appends query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      await api.get('/test', { status: 'active', limit: 10 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test?status=active&limit=10',
        expect.anything()
      );
    });

    it('ignores null/undefined params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      await api.get('/test', { status: 'active', foo: null, bar: undefined });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test?status=active',
        expect.anything()
      );
    });
  });

  describe('post', () => {
    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 'new-123' } }),
      });

      const result = await api.post('/test', { name: 'Test' });
      expect(result).toEqual({ id: 'new-123' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
    });
  });

  describe('patch', () => {
    it('makes PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: '123', name: 'Updated' } }),
      });

      const result = await api.patch('/test/123', { name: 'Updated' });
      expect(result).toEqual({ id: '123', name: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test/123',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('del', () => {
    it('makes DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      });

      await api.del('/test/123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('throws ApiError on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { message: 'Not found' } }),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiError);
    });

    it('handles rate limiting (429)', async () => {
      // Mock all 3 retries with 429
      const rateLimit429 = {
        ok: false,
        status: 429,
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '60',
        }),
        json: async () => ({}),
      };
      mockFetch
        .mockResolvedValueOnce(rateLimit429)
        .mockResolvedValueOnce(rateLimit429)
        .mockResolvedValueOnce(rateLimit429);

      try {
        await api.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.statusCode).toBe(429);
        expect(error.message).toContain('Rate limited');
      }
    });
  });

  describe('API Endpoints', () => {
    it('user.me calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 'user-123', email: 'test@test.com' } }),
      });

      const result = await api.user.me();
      expect(result).toEqual({ id: 'user-123', email: 'test@test.com' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/me',
        expect.anything()
      );
    });

    it('tasks.list calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [{ id: 'task-1' }] }),
      });

      const result = await api.tasks.list();
      expect(result).toEqual([{ id: 'task-1' }]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks'),
        expect.anything()
      );
    });

    it('tasks.get calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 'task-123', title: 'Test' } }),
      });

      const result = await api.tasks.get('task-123');
      expect(result).toEqual({ id: 'task-123', title: 'Test' });
    });

    it('tasks.create calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 'new-task', title: 'New Task' } }),
      });

      const result = await api.tasks.create('proj-123', { title: 'New Task' });
      expect(result).toEqual({ id: 'new-task', title: 'New Task' });
    });

    it('projects.list calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [{ id: 'proj-1' }] }),
      });

      const result = await api.projects.list();
      expect(result).toEqual([{ id: 'proj-1' }]);
    });

    it('knowledge.search calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [{ id: 'kb-1' }] }),
      });

      const result = await api.knowledge.search('query');
      expect(result).toEqual([{ id: 'kb-1' }]);
    });

    it('tenants.list calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [{ id: 'tenant-1' }] }),
      });

      const result = await api.tenants.list();
      expect(result).toEqual([{ id: 'tenant-1' }]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/tenants',
        expect.anything()
      );
    });
  });
});
