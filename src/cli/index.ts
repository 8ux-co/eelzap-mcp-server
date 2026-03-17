import { runInstall } from './install.js';
import { runSwitchKey } from './switch-key.js';
import { runUninstall } from './uninstall.js';
import { runStatus } from './status.js';
import { runDoctor } from './doctor.js';

export const CLI_COMMANDS = ['install', 'switch-key', 'uninstall', 'status', 'doctor'] as const;
export type CliCommand = (typeof CLI_COMMANDS)[number];

export async function runCli(subcommand: string, args: string[]): Promise<void> {
  switch (subcommand as CliCommand) {
    case 'install':
      await runInstall(args);
      break;
    case 'switch-key':
      await runSwitchKey(args);
      break;
    case 'uninstall':
      await runUninstall(args);
      break;
    case 'status':
      await runStatus(args);
      break;
    case 'doctor':
      await runDoctor(args);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error(`Available commands: ${CLI_COMMANDS.join(', ')}`);
      process.exit(1);
  }
}
