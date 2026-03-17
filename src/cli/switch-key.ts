import { select, password } from '@inquirer/prompts';
import chalk from 'chalk';
import { detectInstallations, findAdapter } from './utils/detect.js';
import { healthCheck } from './utils/health-check.js';
import { maskKeyReadable } from './utils/mask-key.js';
import type { DetectedInstallation } from './tools/types.js';

type SwitchKeyFlags = {
  apiKey?: string;
  tool?: string;
};

function parseFlags(args: string[]): SwitchKeyFlags {
  const flags: SwitchKeyFlags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--api-key' && args[i + 1]) flags.apiKey = args[++i];
    else if (arg === '--tool' && args[i + 1]) flags.tool = args[++i];
    else if (arg?.startsWith('--api-key=')) flags.apiKey = arg.slice(10);
    else if (arg?.startsWith('--tool=')) flags.tool = arg.slice(7);
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

export async function runSwitchKey(args: string[]): Promise<void> {
  const flags = parseFlags(args);

  // 1. Detect installations
  let installations = await detectInstallations();

  if (flags.tool) {
    const adapter = findAdapter(flags.tool);
    if (!adapter) {
      console.error(chalk.red(`Unknown tool: ${flags.tool}`));
      process.exit(1);
    }
    installations = installations.filter((i) => i.tool.id === flags.tool);
  }

  if (installations.length === 0) {
    console.log(chalk.yellow('No eelzap installations found.'));
    console.log(chalk.dim('Run `eelzap-mcp install` to set up the MCP server.'));
    process.exit(0);
  }

  // 2. Select which installation(s) to update
  let targets: DetectedInstallation[];

  if (installations.length === 1) {
    targets = installations;
  } else {
    const choices = [
      { name: 'All installations', value: 'all' },
      ...installations.map((inst) => ({
        name: `${inst.tool.name} (${inst.scope.label}) — ${maskKeyReadable(inst.entry.apiKey)}`,
        value: inst.scope.configPath,
      })),
    ];

    const selected = await select({
      message: 'Which installation do you want to update?',
      choices,
    });

    targets = selected === 'all' ? installations : installations.filter((i) => i.scope.configPath === selected);
  }

  // 3. Enter new API key
  let newApiKey: string;
  if (flags.apiKey) {
    const valid = validateApiKey(flags.apiKey);
    if (valid !== true) {
      console.error(chalk.red(valid));
      process.exit(1);
    }
    newApiKey = flags.apiKey;
  } else {
    newApiKey = await password({
      message: 'Enter new API key:',
      validate: validateApiKey,
    });
  }

  // 4. Validate key
  console.log(chalk.dim('Verifying new API key...'));
  const firstTarget = targets[0]!;
  const check = await healthCheck(
    newApiKey,
    firstTarget.entry.baseUrl,
    firstTarget.entry.pathPrefix,
  );

  if (check.ok) {
    const site = check.siteName ? ` (site: "${check.siteName}")` : '';
    console.log(chalk.green(`✓ API key verified${site}`));
  } else {
    console.log(chalk.yellow(`⚠  Could not verify API key: ${check.error}`));
  }

  // 5. Update each target
  for (const inst of targets) {
    const updatedEntry = { ...inst.entry, apiKey: newApiKey };
    try {
      await inst.tool.write(inst.scope.configPath, updatedEntry);
      console.log(chalk.green(`✓ Updated ${inst.tool.name} (${inst.scope.label})`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✗ Failed to update ${inst.tool.name}: ${message}`));
    }
  }

  console.log('');
  console.log(chalk.dim('Restart your tool(s) to pick up the new API key.'));
}
