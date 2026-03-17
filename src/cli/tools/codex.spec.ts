import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as TOML from 'smol-toml';
import { codexAdapter } from './codex.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'eelzap-test-codex-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('codexAdapter.read', () => {
  it('returns null when file does not exist', async () => {
    const result = await codexAdapter.read(join(tmpDir, 'nonexistent.toml'));
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry is missing', async () => {
    const configPath = join(tmpDir, 'config.toml');
    await writeFile(configPath, '[other]\nkey = "value"\n', 'utf-8');
    const result = await codexAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry has no env.EELZAP_API_KEY', async () => {
    const configPath = join(tmpDir, 'config.toml');
    const toml = TOML.stringify({
      mcp_servers: {
        eelzap: { command: 'npx', args: ['-y', '@8ux-co/eelzap-mcp-server'], enabled: true },
      },
    });
    await writeFile(configPath, toml, 'utf-8');

    const result = await codexAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('reads an existing eelzap entry from the TOML env block', async () => {
    const configPath = join(tmpDir, 'config.toml');
    const toml = TOML.stringify({
      mcp_servers: {
        eelzap: {
          command: 'npx',
          args: ['-y', '@8ux-co/eelzap-mcp-server'],
          enabled: true,
          env: { EELZAP_API_KEY: 'cms_secret_fromtoml' },
        },
      },
    });
    await writeFile(configPath, toml, 'utf-8');

    const result = await codexAdapter.read(configPath);
    expect(result).toEqual({ apiKey: 'cms_secret_fromtoml' });
  });

  it('reads baseUrl and pathPrefix from the TOML env block when present', async () => {
    const configPath = join(tmpDir, 'config.toml');
    const toml = TOML.stringify({
      mcp_servers: {
        eelzap: {
          command: 'npx',
          args: ['-y', '@8ux-co/eelzap-mcp-server'],
          enabled: true,
          env: {
            EELZAP_API_KEY: 'cms_secret_test',
            EELZAP_BASE_URL: 'https://custom.example.com',
            EELZAP_PATH_PREFIX: '/v2',
          },
        },
      },
    });
    await writeFile(configPath, toml, 'utf-8');

    const result = await codexAdapter.read(configPath);
    expect(result).toEqual({
      apiKey: 'cms_secret_test',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });
  });
});

describe('codexAdapter.write', () => {
  it('creates a new TOML file with the eelzap entry and env block', async () => {
    const configPath = join(tmpDir, 'config.toml');
    await codexAdapter.write(configPath, { apiKey: 'cms_secret_test' });

    const text = await readFile(configPath, 'utf-8');
    const parsed = TOML.parse(text) as Record<string, unknown>;
    const servers = parsed['mcp_servers'] as Record<string, unknown>;
    expect(servers['eelzap']).toBeDefined();
    const eelzap = servers['eelzap'] as Record<string, unknown>;
    expect(eelzap['command']).toBe('npx');
    expect(eelzap['enabled']).toBe(true);
    const env = eelzap['env'] as Record<string, string>;
    expect(env['EELZAP_API_KEY']).toBe('cms_secret_test');
  });

  it('writes optional baseUrl and pathPrefix into the env block', async () => {
    const configPath = join(tmpDir, 'config.toml');
    await codexAdapter.write(configPath, {
      apiKey: 'cms_secret_test',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });

    const text = await readFile(configPath, 'utf-8');
    const parsed = TOML.parse(text) as Record<string, unknown>;
    const servers = parsed['mcp_servers'] as Record<string, unknown>;
    const eelzap = servers['eelzap'] as Record<string, unknown>;
    const env = eelzap['env'] as Record<string, string>;
    expect(env['EELZAP_API_KEY']).toBe('cms_secret_test');
    expect(env['EELZAP_BASE_URL']).toBe('https://custom.example.com');
    expect(env['EELZAP_PATH_PREFIX']).toBe('/v2');
  });

  it('merges into an existing TOML file without overwriting other entries', async () => {
    const configPath = join(tmpDir, 'config.toml');
    const existing = TOML.stringify({ mcp_servers: { other: { command: 'other', enabled: true } } });
    await writeFile(configPath, existing, 'utf-8');

    await codexAdapter.write(configPath, { apiKey: 'cms_secret_test' });

    const text = await readFile(configPath, 'utf-8');
    const parsed = TOML.parse(text) as Record<string, unknown>;
    const servers = parsed['mcp_servers'] as Record<string, unknown>;
    expect(servers['other']).toBeDefined();
    expect(servers['eelzap']).toBeDefined();
  });
});

describe('codexAdapter.remove', () => {
  it('removes the eelzap entry from the TOML file', async () => {
    const configPath = join(tmpDir, 'config.toml');
    const existing = TOML.stringify({
      mcp_servers: {
        eelzap: {
          command: 'npx',
          args: ['-y', '@8ux-co/eelzap-mcp-server'],
          enabled: true,
          env: { EELZAP_API_KEY: 'cms_secret_test' },
        },
        other: { command: 'other', enabled: true },
      },
    });
    await writeFile(configPath, existing, 'utf-8');

    await codexAdapter.remove(configPath);

    const text = await readFile(configPath, 'utf-8');
    const parsed = TOML.parse(text) as Record<string, unknown>;
    const servers = parsed['mcp_servers'] as Record<string, unknown>;
    expect(servers['eelzap']).toBeUndefined();
    expect(servers['other']).toBeDefined();
  });

  it('does nothing when file does not exist', async () => {
    await expect(
      codexAdapter.remove(join(tmpDir, 'nonexistent.toml')),
    ).resolves.toBeUndefined();
  });
});
