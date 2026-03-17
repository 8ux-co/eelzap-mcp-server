import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'eelzap-test-claude-desktop-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// We must import after mocking because the adapter evaluates configPath at module load time
// We test the read/write/remove functions by calling them with explicit paths

async function loadAdapter() {
  const { claudeDesktopAdapter } = await import('./claude-desktop.js');
  return claudeDesktopAdapter;
}

describe('claudeDesktopAdapter.read', () => {
  it('returns null when file does not exist', async () => {
    const adapter = await loadAdapter();
    const result = await adapter.read(join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry is missing', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }), 'utf-8');
    const result = await adapter.read(configPath);
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry has no EELZAP_API_KEY', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({ mcpServers: { eelzap: { command: 'npx', env: {} } } }),
      'utf-8',
    );
    const result = await adapter.read(configPath);
    expect(result).toBeNull();
  });

  it('reads an existing eelzap entry', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          eelzap: {
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: { EELZAP_API_KEY: 'secret_desktop' },
          },
        },
      }),
      'utf-8',
    );

    const result = await adapter.read(configPath);
    expect(result).toEqual({ apiKey: 'secret_desktop', baseUrl: undefined, pathPrefix: undefined });
  });

  it('reads baseUrl and pathPrefix when present', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          eelzap: {
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: {
              EELZAP_API_KEY: 'secret_desktop',
              EELZAP_BASE_URL: 'https://custom.example.com',
              EELZAP_PATH_PREFIX: '/v2',
            },
          },
        },
      }),
      'utf-8',
    );

    const result = await adapter.read(configPath);
    expect(result).toEqual({
      apiKey: 'secret_desktop',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });
  });

  it('returns null when JSON is invalid', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');
    const result = await adapter.read(configPath);
    expect(result).toBeNull();
  });
});

describe('claudeDesktopAdapter.write', () => {
  it('creates a new file with eelzap entry', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await adapter.write(configPath, { apiKey: 'secret_desktop' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.command).toBe('npx');
    expect(content.mcpServers.eelzap.env.EELZAP_API_KEY).toBe('secret_desktop');
  });

  it('merges into existing file without overwriting other entries', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    const existing = { mcpServers: { other: { command: 'other-server' } } };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await adapter.write(configPath, { apiKey: 'secret_desktop' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['other']).toBeDefined();
    expect(content.mcpServers['eelzap']).toBeDefined();
  });

  it('creates parent directories if they do not exist', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'nested', 'config.json');
    await adapter.write(configPath, { apiKey: 'secret_desktop' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap).toBeDefined();
  });

  it('includes custom env vars when present', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await adapter.write(configPath, {
      apiKey: 'secret_desktop',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.env.EELZAP_BASE_URL).toBe('https://custom.example.com');
    expect(content.mcpServers.eelzap.env.EELZAP_PATH_PREFIX).toBe('/v2');
  });

  it('throws when existing file has invalid JSON', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(adapter.write(configPath, { apiKey: 'secret_desktop' })).rejects.toThrow(
      'Cannot parse',
    );
  });
});

describe('claudeDesktopAdapter.remove', () => {
  it('removes the eelzap entry and preserves other entries', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    const existing = {
      mcpServers: {
        eelzap: { command: 'npx' },
        other: { command: 'other-server' },
      },
    };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await adapter.remove(configPath);

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['eelzap']).toBeUndefined();
    expect(content.mcpServers['other']).toBeDefined();
  });

  it('does nothing when file does not exist', async () => {
    const adapter = await loadAdapter();
    await expect(
      adapter.remove(join(tmpDir, 'nonexistent.json')),
    ).resolves.toBeUndefined();
  });

  it('throws when existing file has invalid JSON', async () => {
    const adapter = await loadAdapter();
    const configPath = join(tmpDir, 'config.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(adapter.remove(configPath)).rejects.toThrow('Cannot parse');
  });
});

describe('claudeDesktopAdapter metadata', () => {
  it('has correct id and name', async () => {
    const adapter = await loadAdapter();
    expect(adapter.id).toBe('claude-desktop');
    expect(adapter.name).toBe('Claude Desktop');
  });

  it('has a single default scope', async () => {
    const adapter = await loadAdapter();
    expect(adapter.scopes).toHaveLength(1);
    expect(adapter.scopes[0]?.id).toBe('default');
  });
});
