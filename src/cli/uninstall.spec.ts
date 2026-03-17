import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

const mockInstallations: Array<{
  tool: { id: string; name: string; remove: ReturnType<typeof vi.fn> };
  scope: { id: string; label: string; configPath: string };
  entry: { apiKey: string };
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

import { runUninstall } from './uninstall.js';
import { select, confirm } from '@inquirer/prompts';
import { detectInstallations } from './utils/detect.js';

const mockSelect = vi.mocked(select);
const mockConfirm = vi.mocked(confirm);
const mockDetectInstallations = vi.mocked(detectInstallations);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
  mockInstallations.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeInstallation(overrides: Partial<typeof mockInstallations[0]> = {}) {
  return {
    tool: { id: 'test-tool', name: 'Test Tool', remove: vi.fn().mockResolvedValue(undefined) },
    scope: { id: 'project', label: 'Project', configPath: '/tmp/test-config.json' },
    entry: { apiKey: 'cms_secret_old' },
    ...overrides,
  };
}

describe('runUninstall — no installations', () => {
  it('prints message and exits when no installations found', async () => {
    mockDetectInstallations.mockResolvedValue([]);

    await expect(runUninstall([])).rejects.toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No eelzap installations'));
  });

  it('exits with error for unknown --tool flag', async () => {
    mockDetectInstallations.mockResolvedValue([]);

    await expect(runUninstall(['--tool', 'nonexistent'])).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });

  it('filters and exits when no matching installations for --tool', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);

    await expect(runUninstall(['--tool', 'cursor'])).rejects.toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No eelzap installations'));
  });
});

describe('runUninstall — single installation', () => {
  it('confirms and removes single installation', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall([]);

    expect(mockConfirm).toHaveBeenCalled();
    expect(inst.tool.remove).toHaveBeenCalledWith('/tmp/test-config.json');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed'));
  });

  it('aborts and exits when user declines confirmation', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockConfirm.mockResolvedValueOnce(false);

    await expect(runUninstall([])).rejects.toThrow('process.exit called');
    expect(inst.tool.remove).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Aborted.');
  });

  it('exits with error when remove throws', async () => {
    const inst = makeInstallation();
    inst.tool.remove.mockRejectedValue(new Error('remove failed'));
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await expect(runUninstall([])).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('remove failed'));
  });
});

describe('runUninstall — multiple installations', () => {
  it('prompts to select installation when multiple exist', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      tool: { id: 'cursor', name: 'Cursor', remove: vi.fn().mockResolvedValue(undefined) },
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockSelect.mockResolvedValueOnce('/tmp/inst1.json');
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall([]);

    expect(mockSelect).toHaveBeenCalled();
    expect(inst1.tool.remove).toHaveBeenCalled();
    expect(inst2.tool.remove).not.toHaveBeenCalled();
  });
});

describe('runUninstall — flag parsing', () => {
  it('uses --tool flag to filter installations', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      tool: { id: 'cursor', name: 'Cursor', remove: vi.fn().mockResolvedValue(undefined) },
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall(['--tool', 'test-tool']);

    expect(inst1.tool.remove).toHaveBeenCalled();
    expect(inst2.tool.remove).not.toHaveBeenCalled();
  });

  it('uses --scope flag to filter installations further', async () => {
    const inst1 = makeInstallation({ scope: { id: 'project', label: 'Project', configPath: '/tmp/inst1.json' } });
    const inst2 = makeInstallation({
      scope: { id: 'global', label: 'Global', configPath: '/tmp/inst2.json' },
    });
    mockDetectInstallations.mockResolvedValue([inst1 as never, inst2 as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall(['--tool', 'test-tool', '--scope', 'project']);

    expect(inst1.tool.remove).toHaveBeenCalled();
    expect(inst2.tool.remove).not.toHaveBeenCalled();
  });

  it('uses --tool= syntax', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall(['--tool=test-tool']);

    expect(inst.tool.remove).toHaveBeenCalled();
  });

  it('uses --scope= syntax', async () => {
    const inst = makeInstallation();
    mockDetectInstallations.mockResolvedValue([inst as never]);
    mockConfirm.mockResolvedValueOnce(true);

    await runUninstall(['--tool=test-tool', '--scope=project']);

    expect(inst.tool.remove).toHaveBeenCalled();
  });
});
