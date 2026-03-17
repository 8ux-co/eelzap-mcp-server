import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { healthCheck } from './utils/health-check.js';
import { ALL_ADAPTERS, findAdapter } from './utils/detect.js';
import type { EelzapEntry, Scope, ToolAdapter } from './tools/types.js';

const DEFAULT_BASE_URL = 'https://api.eelzap.com';
const DEFAULT_PATH_PREFIX = '/v1';

type InstallFlags = {
  tool?: string;
  scope?: string;
  apiKey?: string;
  baseUrl?: string;
  pathPrefix?: string;
};

function parseFlags(args: string[]): InstallFlags {
  const flags: InstallFlags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tool' && args[i + 1]) flags.tool = args[++i];
    else if (arg === '--scope' && args[i + 1]) flags.scope = args[++i];
    else if (arg === '--api-key' && args[i + 1]) flags.apiKey = args[++i];
    else if (arg === '--base-url' && args[i + 1]) flags.baseUrl = args[++i];
    else if (arg === '--path-prefix' && args[i + 1]) flags.pathPrefix = args[++i];
    else if (arg?.startsWith('--tool=')) flags.tool = arg.slice(7);
    else if (arg?.startsWith('--scope=')) flags.scope = arg.slice(8);
    else if (arg?.startsWith('--api-key=')) flags.apiKey = arg.slice(10);
    else if (arg?.startsWith('--base-url=')) flags.baseUrl = arg.slice(11);
    else if (arg?.startsWith('--path-prefix=')) flags.pathPrefix = arg.slice(14);
  }
  return flags;
}

function validateApiKey(key: string): string | true {
  if (
    !key.startsWith('secret_') &&
    !key.startsWith('public_') &&
    !key.startsWith('cms_secret_') &&
    !key.startsWith('cms_public_')
  ) {
    return 'API key must start with secret_ or public_';
  }
  return true;
}

export async function runInstall(args: string[]): Promise<void> {
  const flags = parseFlags(args);

  // 1. Select tool
  let adapter: ToolAdapter;
  if (flags.tool) {
    const found = findAdapter(flags.tool);
    if (!found) {
      const valid = ALL_ADAPTERS.map((a) => a.id).join(', ');
      console.error(chalk.red(`Unknown tool: ${flags.tool}. Valid options: ${valid}`));
      process.exit(1);
    }
    adapter = found;
  } else {
    const toolId = await select({
      message: 'Which tool do you want to configure?',
      choices: ALL_ADAPTERS.map((a) => ({ name: a.name, value: a.id })),
    });
    adapter = findAdapter(toolId)!;
  }

  // 2. Select scope
  let scope: Scope;
  if (adapter.scopes.length === 1) {
    scope = adapter.scopes[0]!;
  } else if (flags.scope) {
    const found = adapter.scopes.find((s) => s.id === flags.scope);
    if (!found) {
      const valid = adapter.scopes.map((s) => s.id).join(', ');
      console.error(chalk.red(`Unknown scope: ${flags.scope}. Valid options: ${valid}`));
      process.exit(1);
    }
    scope = found;
  } else {
    const scopeId = await select({
      message: 'Which scope?',
      choices: adapter.scopes.map((s) => ({ name: s.label, value: s.id })),
    });
    scope = adapter.scopes.find((s) => s.id === scopeId)!;
  }

  // 3. Enter API key
  let apiKey: string;
  if (flags.apiKey) {
    const valid = validateApiKey(flags.apiKey);
    if (valid !== true) {
      console.error(chalk.red(valid));
      process.exit(1);
    }
    apiKey = flags.apiKey;
  } else {
    apiKey = await input({
      message: 'Enter your Eel Zap API key (secret_... or public_...):',
      validate: validateApiKey,
    });
  }

  if (apiKey.startsWith('public_') || apiKey.startsWith('cms_public_')) {
    console.log(
      chalk.yellow(
        '⚠  You entered a public key (read-only). Most write operations will fail. Use a secret key for full access.',
      ),
    );
  }

  // 4. Optional: Custom base URL
  let baseUrl: string | undefined;
  let pathPrefix: string | undefined;

  if (flags.baseUrl) {
    baseUrl = flags.baseUrl;
    pathPrefix = flags.pathPrefix;
  } else {
    const useCustom = await confirm({
      message: `Use custom API base URL? (default: ${DEFAULT_BASE_URL})`,
      default: false,
    });

    if (useCustom) {
      baseUrl = await input({
        message: 'API base URL:',
        default: DEFAULT_BASE_URL,
      });
      pathPrefix = await input({
        message: 'Path prefix:',
        default: DEFAULT_PATH_PREFIX,
      });
    }
  }

  // 5. Validate key
  console.log(chalk.dim('Verifying API key...'));
  const check = await healthCheck(apiKey, baseUrl, pathPrefix);
  if (check.ok) {
    const site = check.siteName ? ` (site: "${check.siteName}")` : '';
    console.log(chalk.green(`✓ API key verified${site}`));
  } else {
    console.log(chalk.yellow(`⚠  Could not verify API key: ${check.error}`));
    const proceed = await confirm({
      message: 'Continue anyway?',
      default: true,
    });
    if (!proceed) process.exit(0);
  }

  // 6. Write config
  const entry: EelzapEntry = {
    apiKey,
    ...(baseUrl && baseUrl !== DEFAULT_BASE_URL ? { baseUrl } : {}),
    ...(pathPrefix && pathPrefix !== DEFAULT_PATH_PREFIX ? { pathPrefix } : {}),
  };

  try {
    await adapter.write(scope.configPath, entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`✗ Failed to write config: ${message}`));
    process.exit(1);
  }

  // 7. Success message
  const scopeDisplay = scope.configPath.startsWith(process.env['HOME'] ?? '/nonexistent')
    ? scope.configPath.replace(process.env['HOME'] ?? '', '~')
    : scope.configPath;

  console.log('');
  console.log(chalk.green(`✓ Configured eelzap MCP server for ${adapter.name} (${scopeDisplay})`));
  console.log('');
  console.log('Next steps:');
  console.log(`  - ${adapter.postInstallMessage}`);
  console.log('  - Try asking: "List all my collections in Eel Zap"');
}
