import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cursorAdapter } from './cursor.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'eelzap-test-cursor-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('cursorAdapter.read', () => {
  it('returns null when file does not exist', async () => {
    const result = await cursorAdapter.read(join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry is missing', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }), 'utf-8');
    const result = await cursorAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry has no EELZAP_API_KEY', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({ mcpServers: { eelzap: { command: 'npx', env: {} } } }),
      'utf-8',
    );
    const result = await cursorAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('reads an existing eelzap entry', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          eelzap: {
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: { EELZAP_API_KEY: 'cms_secret_cursor' },
          },
        },
      }),
      'utf-8',
    );

    const result = await cursorAdapter.read(configPath);
    expect(result).toEqual({ apiKey: 'cms_secret_cursor', baseUrl: undefined, pathPrefix: undefined });
  });

  it('reads baseUrl and pathPrefix when present', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          eelzap: {
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: {
              EELZAP_API_KEY: 'cms_secret_cursor',
              EELZAP_BASE_URL: 'http://localhost:5041',
              EELZAP_PATH_PREFIX: '/v2',
            },
          },
        },
      }),
      'utf-8',
    );

    const result = await cursorAdapter.read(configPath);
    expect(result).toEqual({
      apiKey: 'cms_secret_cursor',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/v2',
    });
  });

  it('returns null when JSON is invalid', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');
    const result = await cursorAdapter.read(configPath);
    expect(result).toBeNull();
  });
});

describe('cursorAdapter.write', () => {
  it('creates a new file with eelzap entry', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await cursorAdapter.write(configPath, { apiKey: 'cms_secret_cursor' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.command).toBe('npx');
    expect(content.mcpServers.eelzap.env.EELZAP_API_KEY).toBe('cms_secret_cursor');
  });

  it('merges into existing file without overwriting other entries', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    const existing = { mcpServers: { other: { command: 'other-server' } } };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await cursorAdapter.write(configPath, { apiKey: 'cms_secret_cursor' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['other']).toBeDefined();
    expect(content.mcpServers['eelzap']).toBeDefined();
  });

  it('creates parent directories if they do not exist', async () => {
    const configPath = join(tmpDir, 'nested', 'dir', 'mcp.json');
    await cursorAdapter.write(configPath, { apiKey: 'cms_secret_cursor' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap).toBeDefined();
  });

  it('includes custom env vars when present', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await cursorAdapter.write(configPath, {
      apiKey: 'cms_secret_cursor',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/api/v1',
    });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.env.EELZAP_BASE_URL).toBe('http://localhost:5041');
    expect(content.mcpServers.eelzap.env.EELZAP_PATH_PREFIX).toBe('/api/v1');
  });

  it('throws when existing file has invalid JSON', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(cursorAdapter.write(configPath, { apiKey: 'cms_secret_cursor' })).rejects.toThrow(
      'Cannot parse',
    );
  });
});

describe('cursorAdapter.remove', () => {
  it('removes the eelzap entry and preserves other entries', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    const existing = {
      mcpServers: {
        eelzap: { command: 'npx' },
        other: { command: 'other-server' },
      },
    };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await cursorAdapter.remove(configPath);

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['eelzap']).toBeUndefined();
    expect(content.mcpServers['other']).toBeDefined();
  });

  it('does nothing when file does not exist', async () => {
    await expect(
      cursorAdapter.remove(join(tmpDir, 'nonexistent.json')),
    ).resolves.toBeUndefined();
  });

  it('throws when existing file has invalid JSON', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(cursorAdapter.remove(configPath)).rejects.toThrow('Cannot parse');
  });
});

describe('cursorAdapter metadata', () => {
  it('has correct id and name', () => {
    expect(cursorAdapter.id).toBe('cursor');
    expect(cursorAdapter.name).toBe('Cursor');
  });

  it('has project and global scopes', () => {
    expect(cursorAdapter.scopes).toHaveLength(2);
    expect(cursorAdapter.scopes.map((s) => s.id)).toContain('project');
    expect(cursorAdapter.scopes.map((s) => s.id)).toContain('global');
  });
});
