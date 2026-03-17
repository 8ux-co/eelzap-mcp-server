import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config.js';
import { createServer } from './server.js';
import { runCli, CLI_COMMANDS } from './cli/index.js';

async function main() {
  const subcommand = process.argv[2];

  if (subcommand && (CLI_COMMANDS as readonly string[]).includes(subcommand)) {
    await runCli(subcommand, process.argv.slice(3));
    return;
  }

  // Original MCP server startup — unchanged
  const config = readConfig();
  const { client, server } = createServer(config);

  await client.request({ path: '/site' });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start MCP server: ${message}`);
  process.exit(1);
});
