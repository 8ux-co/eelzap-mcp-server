import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { detectInstallations, findAdapter } from './utils/detect.js';
import { maskKeyReadable } from './utils/mask-key.js';
import type { DetectedInstallation } from './tools/types.js';

type UninstallFlags = {
  tool?: string;
  scope?: string;
};

function parseFlags(args: string[]): UninstallFlags {
  const flags: UninstallFlags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tool' && args[i + 1]) flags.tool = args[++i];
    else if (arg === '--scope' && args[i + 1]) flags.scope = args[++i];
    else if (arg?.startsWith('--tool=')) flags.tool = arg.slice(7);
    else if (arg?.startsWith('--scope=')) flags.scope = arg.slice(8);
  }
  return flags;
}

export async function runUninstall(args: string[]): Promise<void> {
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
    if (flags.scope) {
      installations = installations.filter((i) => i.scope.id === flags.scope);
    }
  }

  if (installations.length === 0) {
    console.log(chalk.yellow('No eelzap installations found.'));
    process.exit(0);
  }

  // 2. Select which installation to remove
  let target: DetectedInstallation;

  if (installations.length === 1) {
    target = installations[0]!;
  } else {
    const configPath = await select({
      message: 'Which installation do you want to remove?',
      choices: installations.map((inst) => ({
        name: `${inst.tool.name} (${inst.scope.label}) — ${maskKeyReadable(inst.entry.apiKey)}`,
        value: inst.scope.configPath,
      })),
    });
    target = installations.find((i) => i.scope.configPath === configPath)!;
  }

  // 3. Confirm
  const ok = await confirm({
    message: `Remove eelzap from ${target.tool.name} (${target.scope.label})?`,
    default: false,
  });

  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  // 4. Remove
  try {
    await target.tool.remove(target.scope.configPath);
    console.log(chalk.green(`✓ Removed eelzap from ${target.tool.name} (${target.scope.label})`));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`✗ Failed: ${message}`));
    process.exit(1);
  }
}
