import { afterEach, describe, expect, it, vi } from 'vitest';
import { healthCheck } from './health-check.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('healthCheck', () => {
  it('returns ok: true and site name on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: 'My Portfolio' }), { status: 200 }),
    ));

    const result = await healthCheck('secret_abc', 'https://api.eelzap.com', '/v1');
    expect(result).toEqual({ ok: true, siteName: 'My Portfolio' });
  });

  it('returns ok: false with error message on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    ));

    const result = await healthCheck('secret_bad', 'https://api.eelzap.com', '/v1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns ok: false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const result = await healthCheck('secret_abc');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('sends Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await healthCheck('secret_test123');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('Authorization')).toBe('Bearer secret_test123');
  });
});
