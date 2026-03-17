import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
  password: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('./utils/health-check.js', () => ({
  healthCheck: vi.fn(),
}));

// Build adapters once so we can spy on them
const singleScopeAdapter = {
  id: 'test-tool',
  name: 'Test Tool',
  scopes: [{ id: 'project', label: 'Project (.test/config.json)', configPath: '/tmp/test-config.json' }],
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  postInstallMessage: 'Restart test tool.',
};

const multiScopeAdapter = {
  id: 'multi-scope-tool',
  name: 'Multi Scope Tool',
  scopes: [
    { id: 'project', label: 'Project', configPath: '/tmp/multi-project.json' },
    { id: 'global', label: 'Global', configPath: '/tmp/multi-global.json' },
  ],
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  postInstallMessage: 'Restart multi tool.',
};

const ALL_ADAPTERS_MOCK = [singleScopeAdapter, multiScopeAdapter];

vi.mock('./utils/detect.js', () => ({
  get ALL_ADAPTERS() {
    return ALL_ADAPTERS_MOCK;
  },
  findAdapter: vi.fn((id: string) => ALL_ADAPTERS_MOCK.find((a) => a.id === id)),
}));

import { runInstall } from './install.js';
import { select, password, confirm, input } from '@inquirer/prompts';
import { healthCheck } from './utils/health-check.js';

const mockSelect = vi.mocked(select);
const mockPassword = vi.mocked(password);
const mockConfirm = vi.mocked(confirm);
const mockInput = vi.mocked(input);
const mockHealthCheck = vi.mocked(healthCheck);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('process.exit called'); }) as never);
  singleScopeAdapter.write.mockReset();
  singleScopeAdapter.write.mockResolvedValue(undefined);
  multiScopeAdapter.write.mockReset();
  multiScopeAdapter.write.mockResolvedValue(undefined);
  // Default confirm to false to avoid leaking behavior
  mockConfirm.mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runInstall — flag parsing', () => {
  it('uses --tool flag to skip select prompt and --api-key to skip password prompt', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'My Site' });

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_flagtest']);

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockPassword).not.toHaveBeenCalled();
    expect(singleScopeAdapter.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({ apiKey: 'cms_secret_flagtest' }),
    );
  });

  it('uses --tool= syntax to parse flags', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool=test-tool', '--api-key=cms_secret_eq']);

    expect(singleScopeAdapter.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({ apiKey: 'cms_secret_eq' }),
    );
  });

  it('exits with error for unknown --tool', async () => {
    await expect(
      runInstall(['--tool', 'nonexistent-tool', '--api-key', 'cms_secret_x']),
    ).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });

  it('exits with error for invalid --api-key', async () => {
    await expect(
      runInstall(['--tool', 'test-tool', '--api-key', 'invalid_key']),
    ).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('runInstall — interactive prompts', () => {
  it('uses prompts when no flags are provided', async () => {
    mockSelect.mockResolvedValueOnce('test-tool');
    mockPassword.mockResolvedValueOnce('cms_secret_interactive');
    // mockConfirm defaults to false (no custom base URL) from beforeEach
    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'Interactive Site' });

    await runInstall([]);

    expect(mockSelect).toHaveBeenCalled();
    expect(mockPassword).toHaveBeenCalled();
    expect(singleScopeAdapter.write).toHaveBeenCalled();
  });

  it('warns when using a public key', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_public_readonlykey']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('public key'));
  });

  it('includes custom baseUrl when --base-url flag is provided', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall([
      '--tool', 'test-tool',
      '--api-key', 'cms_secret_custom',
      '--base-url', 'http://localhost:5041',
      '--path-prefix', '/api/v1',
    ]);

    expect(singleScopeAdapter.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({
        apiKey: 'cms_secret_custom',
        baseUrl: 'http://localhost:5041',
        pathPrefix: '/api/v1',
      }),
    );
  });

  it('does not include baseUrl when it matches the default', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall([
      '--tool', 'test-tool',
      '--api-key', 'cms_secret_default',
      '--base-url', 'https://api.eelzap.com',
    ]);

    const callArgs = singleScopeAdapter.write.mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs.baseUrl).toBeUndefined();
  });
});

describe('runInstall — health check', () => {
  it('shows warning and prompts to continue when health check fails', async () => {
    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Unauthorized' });
    mockConfirm.mockResolvedValue(true); // override default to allow proceeding

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_bad']);

    expect(mockConfirm).toHaveBeenCalled();
    expect(singleScopeAdapter.write).toHaveBeenCalled();
  });

  it('exits when user declines to continue after failed health check', async () => {
    mockHealthCheck.mockResolvedValue({ ok: false, error: 'Unauthorized' });
    mockConfirm.mockResolvedValueOnce(false); // decline

    await expect(
      runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_bad']),
    ).rejects.toThrow('process.exit called');
  });

  it('logs success message including site name when health check succeeds', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true, siteName: 'Awesome Site' });

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_ok']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Awesome Site'));
  });

  it('logs success message without site name when siteName is not returned', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_ok']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('API key verified'));
  });
});

describe('runInstall — scope selection', () => {
  it('exits with error when invalid --scope is provided', async () => {
    await expect(
      runInstall(['--tool', 'multi-scope-tool', '--api-key', 'cms_secret_x', '--scope', 'bad-scope']),
    ).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalled();
  });

  it('selects scope via prompt when adapter has multiple scopes and no --scope flag', async () => {
    mockSelect.mockResolvedValueOnce('global');
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool', 'multi-scope-tool', '--api-key', 'cms_secret_multi']);

    expect(mockSelect).toHaveBeenCalled();
    expect(multiScopeAdapter.write).toHaveBeenCalledWith('/tmp/multi-global.json', expect.any(Object));
  });

  it('uses custom baseUrl from interactive prompt', async () => {
    mockConfirm.mockResolvedValueOnce(true); // use custom base URL
    mockInput.mockResolvedValueOnce('http://localhost:5041'); // base URL
    mockInput.mockResolvedValueOnce('/v2'); // path prefix
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_custom_interactive']);

    expect(singleScopeAdapter.write).toHaveBeenCalledWith(
      '/tmp/test-config.json',
      expect.objectContaining({
        baseUrl: 'http://localhost:5041',
        pathPrefix: '/v2',
      }),
    );
  });

  it('selects scope using --scope flag with --scope= syntax', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });

    await runInstall(['--tool=multi-scope-tool', '--api-key=cms_secret_scoped', '--scope=project']);

    expect(multiScopeAdapter.write).toHaveBeenCalledWith('/tmp/multi-project.json', expect.any(Object));
  });
});

describe('runInstall — write error', () => {
  it('exits with error when write fails', async () => {
    mockHealthCheck.mockResolvedValue({ ok: true });
    singleScopeAdapter.write.mockRejectedValue(new Error('disk full'));

    await expect(
      runInstall(['--tool', 'test-tool', '--api-key', 'cms_secret_fail']),
    ).rejects.toThrow('process.exit called');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('disk full'));
  });
});
