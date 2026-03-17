import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  password: vi.fn(),
}));

vi.mock('./utils/health-check.js', () => ({
  healthCheck: vi.fn(),
}));

const mockInstallations: Array<{
  tool: { id: string; name: string; write: ReturnType<typeof vi.fn> };
  scope: { id: string; label: string; configPath: string };
  entry: { apiKey: string; baseUrl?: string; pathPrefix?: string };
}> = [];

vi.mock('./utils/detect.js', () => ({
  detectInstallations: vi.fn(() => Promise.resolve(mockInstallations)),
  findAdapter: vi.fn((id: string) => {
    const adapters = [
      { id: 'test-tool', name: 'Test Tool' },
      { id: 'cursor', name: 'Cursor' },
    ];
    return adapters.find((a) => a.id === id);
  }),
}));

import { runSwitchKey } from './switch-key.js';
import { select, password } from '@inquirer/prompts';
import { healthCheck } from './utils/health-check.js';
import { detectInstallations } from './utils/detect.js';

const mockSelect = vi.mocked(select);
const mockPassword = vi.mocked(password);
const mockHealthCheck = vi.mocked(healthCheck);
const mockDetectInstallations = vi.mocked(detectInstallations);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
  // Clear mock installations
  mockInstallations.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeInstallation(overrides: Partial<typeof mockInstallations[0]> = {}) {
  return {
    tool: { id: 'test-tool', name: 'Test Tool', write: vi.fn().mockResolvedValue(undefined) },
    scope: { id: 'project', label: 'Project', configPath: '/tmp/test-config.json' },
    entry: { apiKey: 'cms_secret_old' },
    ...overrides,
  };
}

describe('runSwitchKey — no installations', () => {
  it('prints message and exits when no installations found', async () => {
    mockDetectInstallations.mockResolvedValue([]);

    await expect(runSwitchKey([])).rejects.toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No eelzap installations'));
  });

  it('filters by --tool flag and exits when no matching installations', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);

    await expect(runSwitchKey(['--tool', 'cursor'])).rejects.toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No eelzap installations'));
  });

  it('exits with error for unknown --tool flag', async () => {
    mockDetectInstallations.mockResolvedValue([]);

    await expect(runSwitchKey(['--tool', 'nonexistent'])).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('runSwitchKey — single installation', () => {
  it('updates single installation with --api-key flag', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'My Site' });

    await runSwitchKey(['--api-key', 'cms_secret_new']);

    expect(inst.tool.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({ apiKey: 'cms_secret_new' }),
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Updated'));
  });

  it('uses password prompt when no --api-key flag', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockPassword.mockResolvedValueOnce('cms_secret_prompted');
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runSwitchKey([]);

    expect(mockPassword).toHaveBeenCalled();
    expect(inst.tool.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({ apiKey: 'cms_secret_prompted' }),
    );
  });

  it('exits with error for invalid --api-key', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);

    await expect(runSwitchKey(['--api-key', 'invalid_key'])).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('runSwitchKey — multiple installations', () => {
  it('prompts to select installation when multiple exist', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      tool: { id: 'cursor', name: 'Cursor', write: vi.fn().mockResolvedValue(undefined) },
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockSelect.mockResolvedValueOnce('/tmp/inst1.json'); // select specific installation
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runSwitchKey(['--api-key', 'cms_secret_multi']);

    expect(mockSelect).toHaveBeenCalled();
    expect(inst1.tool.write).toHaveBeenCalled();
    expect(inst2.tool.write).not.toHaveBeenCalled();
  });

  it('updates all installations when "all" is selected', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      tool: { id: 'cursor', name: 'Cursor', write: vi.fn().mockResolvedValue(undefined) },
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockSelect.mockResolvedValueOnce('all');
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runSwitchKey(['--api-key', 'cms_secret_all']);

    expect(inst1.tool.write).toHaveBeenCalled();
    expect(inst2.tool.write).toHaveBeenCalled();
  });
});

describe('runSwitchKey — health check', () => {
  it('shows warning when health check fails but continues', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    await runSwitchKey(['--api-key', 'cms_secret_bad']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Could not verify'));
    expect(inst.tool.write).toHaveBeenCalled();
  });

  it('handles write errors gracefully', async () => {
    const inst = makeInstallation();
    inst.tool.write.mockRejectedValue(new Error('write failed'));
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockHealthCheck.mockResolvedValue({ ok: true });

    // Should not throw
    await runSwitchKey(['--api-key', 'cms_secret_write_fail']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('write failed'));
  });
});

describe('runSwitchKey — --tool flag', () => {
  it('filters installations by --tool flag', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      tool: { id: 'cursor', name: 'Cursor', write: vi.fn().mockResolvedValue(undefined) },
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runSwitchKey(['--tool', 'test-tool', '--api-key', 'cms_secret_filtered']);

    expect(inst1.tool.write).toHaveBeenCalled();
    expect(inst2.tool.write).not.toHaveBeenCalled();
  });

  it('uses --tool= syntax', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runSwitchKey(['--tool=test-tool', '--api-key=cms_secret_eq']);

    expect(inst.tool.write).toHaveBeenCalled();
  });
});
