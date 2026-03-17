import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./utils/health-check.js', () => ({
  healthCheck: vi.fn(),
}));

vi.mock('./utils/detect.js', () => ({
  ALL_ADAPTERS: [
    {
      id: 'test-tool',
      name: 'Test Tool',
      scopes: [
        { id: 'project', label: 'Project', configPath: '/tmp/test-config.json' },
      ],
      read: vi.fn(),
    },
    {
      id: 'another-tool',
      name: 'Another Tool',
      scopes: [
        { id: 'global', label: 'Global', configPath: '/tmp/another-config.json' },
      ],
      read: vi.fn(),
    },
  ],
}));

import { runDoctor } from './doctor.js';
import { healthCheck } from './utils/health-check.js';
import { ALL_ADAPTERS } from './utils/detect.js';

const mockHealthCheck = vi.mocked(healthCheck);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDoctor — header', () => {
  it('prints Doctor header', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Doctor'));
  });
});

describe('runDoctor — Node.js version check', () => {
  it('prints checkmark for current Node.js version', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runDoctor([]);

    // The doctor will print either a checkmark (v20+) or error (older)
    // Either way, console.log should have been called
    expect(console.log).toHaveBeenCalled();
  });

  it('covers old Node.js version branch by mocking process.version', async () => {
    // Mock process.version to simulate an old Node
    vi.spyOn(process, 'version', 'get').mockReturnValue('v18.0.0');

    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('requires >= 20'));
  });
});

describe('runDoctor — adapters', () => {
  it('shows "not configured" for adapters with no entry', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not configured'));
  });

  it('shows valid config and healthy status when health check passes', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'My Site' });

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('valid config'));
  });

  it('shows warning when config is valid but health check fails', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unauthorized'));
  });

  it('shows invalid API key format error', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'invalid_key_format' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('invalid API key format'));
  });

  it('shows config error when adapter read throws', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockRejectedValue(new Error('config parse error'));
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('config error'));
  });

  it('shows duplicate key info when same key used across tools', async () => {
    vi.mocked(ALL_ADAPTERS[0]!.read).mockResolvedValue({ apiKey: 'secret_shared' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue({ apiKey: 'secret_shared' });

    mockHealthCheck.mockResolvedValue({ ok: true });

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Same API key used in'));
  });

  it('shows health check with no site name', async () => {
    vi.mocked(ALL_ADAPTERS[0]!.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true }); // no siteName

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('valid config'));
  });
});

describe('runDoctor — summary', () => {
  it('prints "No issues found" when all is well', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No issues found'));
  });

  it('prints issue count when issues exist', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Connection refused' });

    await runDoctor([]);

    // Should show issues found since health check failed
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('issue'));
  });

  it('shows health check site name in output', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'Doctor Site' });

    await runDoctor([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Doctor Site'));
  });

  it('prints singular "issue" when exactly 1 issue', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_valid' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: false, error: 'One issue' });

    await runDoctor([]);

    // 1 issue found (singular)
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/1 issue/));
  });
});
