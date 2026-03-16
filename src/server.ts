import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerConfig } from './config.js';
import { CmsHttpClient } from './http.js';
import { registerPrompts, registerTools } from './toolkit.js';
import { createAllTools } from './tools/index.js';

export function createServer(config: ServerConfig): {
  server: McpServer;
  client: CmsHttpClient;
} {
  const server = new McpServer({
    name: '@8ux-co/eelzap-mcp-server',
    version: '0.2.0',
  });
  const client = new CmsHttpClient(config);

  registerTools(server, createAllTools(client));
  registerPrompts(server);

  return { server, client };
}
