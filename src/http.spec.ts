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
