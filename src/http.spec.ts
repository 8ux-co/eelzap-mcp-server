import { afterEach, describe, expect, it, vi } from 'vitest';
import { CmsHttpClient, parseJsonResponse } from './http.js';

const config = {
  apiKey: 'secret_test',
  baseUrl: 'https://cms.example.com',
  pathPrefix: '/v1',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseJsonResponse', () => {
  it('returns parsed JSON for successful responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({
      ok: true,
    });
  });

  it('throws HttpError with the server message for failed responses', async () => {
    const response = new Response(JSON.stringify({ error: 'Nope' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonResponse(response)).rejects.toEqual(
      expect.objectContaining({
        message: 'Nope',
        status: 403,
      }),
    );
  });

  it('surfaces validation error arrays in the HttpError message', async () => {
    const response = new Response(
      JSON.stringify({
        errors: [{ fieldKey: 'title', message: 'Field "Title" is required.' }],
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    await expect(parseJsonResponse(response)).rejects.toEqual(
      expect.objectContaining({
        message: 'Field "Title" is required.',
        status: 422,
      }),
    );
  });
});

describe('CmsHttpClient', () => {
  it('sends auth and serializes JSON bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    const result = await client.request<{ id: string }>({
      method: 'POST',
      path: '/collections',
      body: { name: 'Blog' },
    });

    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Blog' }),
      }),
    );

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer secret_test',
    );
  });

  it('falls back when the primary request returns 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Missing' }), { status: 404 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    const result = await client.requestWithFallback<{ data: unknown[] }>(
      { path: '/delivery/collections' },
      { path: '/collections' },
    );

    expect(result).toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 and succeeds on the next attempt', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '1' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    const promise = client.request<{ id: string }>({ path: '/collections' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('respects Retry-After header on 429', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    const promise = client.request({ path: '/site' });
    await vi.runAllTimersAsync();
    await promise;

    // First call fires immediately, retry fires after Retry-After delay
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws after exhausting all retries on persistent 429', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    const promise = client.request({ path: '/site' });
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection warning
    const assertion = expect(promise).rejects.toMatchObject({ status: 429 });
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    vi.useRealTimers();
  });

  it('limits concurrent requests to 5', async () => {
    let inFlight = 0;
    let peakInFlight = 0;

    const fetchMock = vi.fn().mockImplementation(async () => {
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight--;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient(config);
    await Promise.all(
      Array.from({ length: 10 }, () => client.request({ path: '/site' })),
    );

    expect(peakInFlight).toBeLessThanOrEqual(5);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('prepends a custom local path prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new CmsHttpClient({
      apiKey: 'secret_test',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/api/public/v1',
    });

    await client.request({
      path: '/site',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:5041/api/public/v1/site'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });
});
