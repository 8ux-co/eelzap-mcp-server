import chalk from 'chalk';
import { ALL_ADAPTERS } from './utils/detect.js';
import { healthCheck } from './utils/health-check.js';
import { maskKeyReadable } from './utils/mask-key.js';

export async function runStatus(_args: string[]): Promise<void> {
  console.log(chalk.bold('Eel Zap MCP Server — Status'));
  console.log('');

  for (const adapter of ALL_ADAPTERS) {
    for (const scope of adapter.scopes) {
      const entry = await adapter.read(scope.configPath).catch(() => null);

      if (!entry) {
        console.log(
          `  ${chalk.dim(adapter.name + ' (' + scope.id + '):')} ${chalk.dim('Not configured')}`,
        );
        continue;
      }

      const baseUrl = entry.baseUrl ?? 'https://api.eelzap.com';
      const pathPrefix = entry.pathPrefix ?? '/v1';

      const check = await healthCheck(entry.apiKey, baseUrl, pathPrefix);

      const statusLine = check.ok
        ? chalk.green(`✓ Connected${check.siteName ? ` (site: "${check.siteName}")` : ''}`)
        : chalk.red(`✗ ${check.error ?? 'Connection failed'}`);

      const configDisplay = scope.configPath.replace(process.env['HOME'] ?? '', '~');

      console.log(`  ${chalk.bold(adapter.name + ' (' + scope.id + '):')}  ${chalk.dim(configDisplay)}`);
      console.log(`    API Key:   ${maskKeyReadable(entry.apiKey)}`);
      console.log(`    Base URL:  ${baseUrl}`);
      console.log(`    Status:    ${statusLine}`);
      console.log('');
    }
  }
}
