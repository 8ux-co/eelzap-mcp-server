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

import { runStatus } from './status.js';
import { healthCheck } from './utils/health-check.js';
import { ALL_ADAPTERS } from './utils/detect.js';

const mockHealthCheck = vi.mocked(healthCheck);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runStatus', () => {
  it('prints "Not configured" for adapters with no entry', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runStatus([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not configured'));
  });

  it('prints status for a configured adapter', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_test' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'My Site' });

    await runStatus([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Connected'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('My Site'));
  });

  it('prints error status when health check fails', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_bad' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Connection failed' });

    await runStatus([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Connection failed'));
  });

  it('handles adapter read errors gracefully', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockRejectedValue(new Error('read error'));
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    // Should not throw
    await expect(runStatus([])).resolves.toBeUndefined();
  });

  it('uses default baseUrl and pathPrefix when not set in entry', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_defaults' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true });

    await runStatus([]);

    expect(mockHealthCheck).toHaveBeenCalledWith(
      'secret_defaults',
      'https://api.eelzap.com',
      '/v1',
    );
  });

  it('uses entry baseUrl and pathPrefix when set', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({
      apiKey: 'secret_custom',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/api/v1',
    });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true });

    await runStatus([]);

    expect(mockHealthCheck).toHaveBeenCalledWith(
      'secret_custom',
      'http://localhost:5041',
      '/api/v1',
    );
  });

  it('prints header at the start', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.mocked(adapter.read).mockResolvedValue(null);
    }

    await runStatus([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Eel Zap MCP Server'));
  });

  it('shows health check status without site name when not returned', async () => {
    const adapter = ALL_ADAPTERS[0]!;
    vi.mocked(adapter.read).mockResolvedValue({ apiKey: 'secret_nosite' });
    vi.mocked(ALL_ADAPTERS[1]!.read).mockResolvedValue(null);

    mockHealthCheck.mockResolvedValue({ ok: true }); // no siteName

    await runStatus([]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Connected'));
  });
});
