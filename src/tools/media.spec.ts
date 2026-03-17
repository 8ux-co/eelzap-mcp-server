/**
 * Tests for the media tool's upload_media_from_url handler.
 * This file tests the complex upload flow including SSRF protection.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { CmsHttpClient } from '../http.js';
import { createMediaTools } from './media.js';

// Mock DNS lookup to avoid real network calls
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'node:dns/promises';
const mockLookup = vi.mocked(lookup);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeClient() {
  return new CmsHttpClient({
    apiKey: 'secret_test',
    baseUrl: 'https://cms.example.com',
    pathPrefix: '/v1',
  });
}

function getUploadTool() {
  const client = makeClient();
  const tools = createMediaTools(client);
  return tools.find((t) => t.name === 'upload_media_from_url')!;
}

describe('upload_media_from_url — SSRF protection', () => {
  it('throws for non-http protocols', async () => {
    const tool = getUploadTool();
    await expect(tool.handler({ url: 'ftp://example.com/file.png' })).rejects.toThrow(
      'Only http:// and https:// URLs are allowed',
    );
  });

  it('throws when DNS resolves to private IP (10.x.x.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://internal.corp/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when DNS resolves to loopback (127.0.0.1)', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://localhost/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when DNS resolves to link-local (169.254.x.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://metadata.link/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when DNS resolves to 192.168.x.x', async () => {
    mockLookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://home-router/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when DNS resolves to 172.16.x.x range', async () => {
    mockLookup.mockResolvedValue([{ address: '172.16.0.1', family: 4 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://internal/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when IPv6 resolves to ::1 (loopback)', async () => {
    mockLookup.mockResolvedValue([{ address: '::1', family: 6 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://localhost6/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when IPv6 resolves to fc00::/7 (unique local)', async () => {
    mockLookup.mockResolvedValue([{ address: 'fc00::1', family: 6 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://ipv6local/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });

  it('throws when IPv6 resolves to fe80:: (link-local)', async () => {
    mockLookup.mockResolvedValue([{ address: 'fe80::1', family: 6 }] as never);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://linklocalv6/file.png' })).rejects.toThrow(
      'Refusing to fetch a private or local address',
    );
  });
});

describe('upload_media_from_url — download errors', () => {
  it('throws on redirect response', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 301 })));

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow(
      'Redirects are not allowed',
    );
  });

  it('throws on non-ok download response', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow(
      'Failed to download media (404)',
    );
  });

  it('throws when content-length exceeds 50MB', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    const largeSize = 51 * 1024 * 1024;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'content-length': String(largeSize), 'content-type': 'image/png' },
        }),
      ),
    );

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow(
      '50MB download limit',
    );
  });

  it('throws when content-type is missing', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-length': '3' },
          // no content-type header
        }),
      ),
    );

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow(
      'missing a content-type header',
    );
  });
});

describe('upload_media_from_url — upload flow', () => {
  it('throws when storage upload fails', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uploadUrl: 'https://storage.example.com/upload', mediaId: 'media_1', key: 'key1' }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 })); // storage upload fails

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow(
      'Failed to upload media to storage',
    );
  });

  it('returns confirmed without PATCH when no alt/title and no confirmedId from response', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: 'https://storage.example.com/upload',
            confirmPayload: { customField: 'value' },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // storage upload OK
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ); // confirm

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    const result = await tool.handler({ url: 'https://example.com/file.png' });
    expect(result).toEqual({ success: true });
    // Should not call PATCH since no confirmedId and no alt/title
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('calls PATCH when alt is provided and confirmedId from response.id', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: 'https://storage.example.com/upload',
            confirmPayload: { customField: 'value' },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // storage upload OK
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'media_from_confirm' }), { status: 200 }),
      ) // confirm returns {id}
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'media_from_confirm', alt: 'My Alt' }), { status: 200 }),
      ); // PATCH

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    await tool.handler({ url: 'https://example.com/file.png', alt: 'My Alt' });

    // 5 calls: download, upload-url, storage, confirm, patch
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const patchCall = fetchMock.mock.calls[4]![0] as URL;
    expect(patchCall.pathname).toContain('media_from_confirm');
  });

  it('uses explicit filename when provided', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uploadUrl: 'https://storage.example.com/upload', mediaId: 'media_x', key: 'k' }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    await tool.handler({ url: 'https://example.com/file.png', filename: 'custom-name.png' });

    // The upload-url body should contain the custom filename
    const uploadUrlBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string) as Record<string, unknown>;
    expect(uploadUrlBody.filename).toBe('custom-name.png');
  });

  it('falls back to "upload.bin" when URL has no pathname', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uploadUrl: 'https://storage.example.com/upload', mediaId: 'media_x', key: 'k' }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    // URL with no file in path — basename('/') = '' so fallback to 'upload.bin'
    await tool.handler({ url: 'https://example.com/' });

    const uploadUrlBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string) as Record<string, unknown>;
    expect(uploadUrlBody.filename).toBe('upload.bin');
  });

  it('uses media.id from uploadSpec when mediaId is not set directly', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: 'https://storage.example.com/upload',
            media: { id: 'media_nested' }, // mediaId via media.id
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'media_nested', alt: 'Set' }), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const tool = getUploadTool();
    await tool.handler({ url: 'https://example.com/pic.png', alt: 'Set' });

    // The PATCH should be called with media_nested
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const patchUrl = fetchMock.mock.calls[4]![0] as URL;
    expect(patchUrl.pathname).toContain('media_nested');
  });
});
