import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vscodeAdapter } from './vscode.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'eelzap-test-vscode-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('vscodeAdapter.read', () => {
  it('returns null when file does not exist', async () => {
    const result = await vscodeAdapter.read(join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry is missing from servers', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, JSON.stringify({ servers: {} }), 'utf-8');
    const result = await vscodeAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('returns null when servers key is missing entirely', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, JSON.stringify({}), 'utf-8');
    const result = await vscodeAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('reads an existing eelzap entry from servers key', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        servers: {
          eelzap: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: { EELZAP_API_KEY: 'cms_secret_vscode' },
          },
        },
      }),
      'utf-8',
    );

    const result = await vscodeAdapter.read(configPath);
    expect(result).toEqual({ apiKey: 'cms_secret_vscode', baseUrl: undefined, pathPrefix: undefined });
  });

  it('reads baseUrl and pathPrefix when present', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        servers: {
          eelzap: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: {
              EELZAP_API_KEY: 'cms_secret_vscode',
              EELZAP_BASE_URL: 'https://custom.example.com',
              EELZAP_PATH_PREFIX: '/v2',
            },
          },
        },
      }),
      'utf-8',
    );

    const result = await vscodeAdapter.read(configPath);
    expect(result).toEqual({
      apiKey: 'cms_secret_vscode',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });
  });

  it('returns null when JSON is invalid', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');
    const result = await vscodeAdapter.read(configPath);
    expect(result).toBeNull();
  });
});

describe('vscodeAdapter.write', () => {
  it('creates a new file with eelzap entry under servers key', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await vscodeAdapter.write(configPath, { apiKey: 'cms_secret_vscode' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.servers.eelzap.type).toBe('stdio');
    expect(content.servers.eelzap.command).toBe('npx');
    expect(content.servers.eelzap.env.EELZAP_API_KEY).toBe('cms_secret_vscode');
  });

  it('merges into existing file without overwriting other entries', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    const existing = { servers: { other: { command: 'other-server' } } };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await vscodeAdapter.write(configPath, { apiKey: 'cms_secret_vscode' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.servers['other']).toBeDefined();
    expect(content.servers['eelzap']).toBeDefined();
  });

  it('creates parent directories if they do not exist', async () => {
    const configPath = join(tmpDir, 'nested', 'dir', 'mcp.json');
    await vscodeAdapter.write(configPath, { apiKey: 'cms_secret_vscode' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.servers.eelzap).toBeDefined();
  });

  it('includes custom env vars when present', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await vscodeAdapter.write(configPath, {
      apiKey: 'cms_secret_vscode',
      baseUrl: 'https://custom.example.com',
      pathPrefix: '/v2',
    });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.servers.eelzap.env.EELZAP_BASE_URL).toBe('https://custom.example.com');
    expect(content.servers.eelzap.env.EELZAP_PATH_PREFIX).toBe('/v2');
  });

  it('throws when existing file has invalid JSON', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(vscodeAdapter.write(configPath, { apiKey: 'cms_secret_vscode' })).rejects.toThrow(
      'Cannot parse',
    );
  });
});

describe('vscodeAdapter.remove', () => {
  it('removes the eelzap entry and preserves other entries', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    const existing = {
      servers: {
        eelzap: { command: 'npx' },
        other: { command: 'other-server' },
      },
    };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await vscodeAdapter.remove(configPath);

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.servers['eelzap']).toBeUndefined();
    expect(content.servers['other']).toBeDefined();
  });

  it('does nothing when file does not exist', async () => {
    await expect(
      vscodeAdapter.remove(join(tmpDir, 'nonexistent.json')),
    ).resolves.toBeUndefined();
  });

  it('throws when existing file has invalid JSON', async () => {
    const configPath = join(tmpDir, 'mcp.json');
    await writeFile(configPath, 'not valid json{{', 'utf-8');

    await expect(vscodeAdapter.remove(configPath)).rejects.toThrow('Cannot parse');
  });
});

describe('vscodeAdapter metadata', () => {
  it('has correct id and name', () => {
    expect(vscodeAdapter.id).toBe('vscode');
    expect(vscodeAdapter.name).toBe('VS Code');
  });

  it('has a single workspace scope', () => {
    expect(vscodeAdapter.scopes).toHaveLength(1);
    expect(vscodeAdapter.scopes[0]?.id).toBe('workspace');
  });
});
