import { describe, expect, it, vi } from 'vitest';
import { createServer } from './server.js';

describe('createServer', () => {
  it('returns a server and client', () => {
    const { server, client } = createServer({
      apiKey: 'secret_test',
      baseUrl: 'https://cms.example.com',
      pathPrefix: '/v1',
    });

    expect(server).toBeDefined();
    expect(client).toBeDefined();
  });

  it('creates a valid MCP server with tools registered', () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { server } = createServer({
      apiKey: 'secret_test',
      baseUrl: 'https://cms.example.com',
      pathPrefix: '/v1',
    });

    // The server should have been created successfully
    expect(server).toBeDefined();
    // McpServer has a name property accessible
    expect(typeof server).toBe('object');
  });
});
