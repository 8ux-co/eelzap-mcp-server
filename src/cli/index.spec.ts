import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CLI_COMMANDS, runCli } from './index.js';

vi.mock('./install.js', () => ({ runInstall: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./switch-key.js', () => ({ runSwitchKey: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./uninstall.js', () => ({ runUninstall: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./status.js', () => ({ runStatus: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./doctor.js', () => ({ runDoctor: vi.fn().mockResolvedValue(undefined) }));

import { runInstall } from './install.js';
import { runSwitchKey } from './switch-key.js';
import { runUninstall } from './uninstall.js';
import { runStatus } from './status.js';
import { runDoctor } from './doctor.js';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CLI_COMMANDS', () => {
  it('contains all expected subcommands', () => {
    expect(CLI_COMMANDS).toContain('install');
    expect(CLI_COMMANDS).toContain('switch-key');
    expect(CLI_COMMANDS).toContain('uninstall');
    expect(CLI_COMMANDS).toContain('status');
    expect(CLI_COMMANDS).toContain('doctor');
  });

  it('has exactly 5 commands', () => {
    expect(CLI_COMMANDS).toHaveLength(5);
  });
});

describe('runCli routing', () => {
  it('routes "install" to runInstall', async () => {
    await runCli('install', ['--tool', 'cursor']);
    expect(runInstall).toHaveBeenCalledWith(['--tool', 'cursor']);
  });

  it('routes "switch-key" to runSwitchKey', async () => {
    await runCli('switch-key', []);
    expect(runSwitchKey).toHaveBeenCalledWith([]);
  });

  it('routes "uninstall" to runUninstall', async () => {
    await runCli('uninstall', []);
    expect(runUninstall).toHaveBeenCalledWith([]);
  });

  it('routes "status" to runStatus', async () => {
    await runCli('status', []);
    expect(runStatus).toHaveBeenCalledWith([]);
  });

  it('routes "doctor" to runDoctor', async () => {
    await runCli('doctor', []);
    expect(runDoctor).toHaveBeenCalledWith([]);
  });

  it('exits with error for unknown subcommand', async () => {
    await expect(runCli('unknown', [])).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown subcommand'));
  });
});
