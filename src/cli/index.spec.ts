import { describe, expect, it } from 'vitest';
import { CLI_COMMANDS } from './index.js';

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
