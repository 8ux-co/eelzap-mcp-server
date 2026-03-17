import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { claudeCodeAdapter } from './claude-code.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'eelzap-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('claudeCodeAdapter.read', () => {
  it('returns null when file does not exist', async () => {
    const result = await claudeCodeAdapter.read(join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('returns null when eelzap entry is missing', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }), 'utf-8');
    const result = await claudeCodeAdapter.read(configPath);
    expect(result).toBeNull();
  });

  it('reads an existing eelzap entry', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          eelzap: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@8ux-co/eelzap-mcp-server'],
            env: { EELZAP_API_KEY: 'secret_test' },
          },
        },
      }),
      'utf-8',
    );

    const result = await claudeCodeAdapter.read(configPath);
    expect(result).toEqual({ apiKey: 'secret_test', baseUrl: undefined, pathPrefix: undefined });
  });
});

describe('claudeCodeAdapter.write', () => {
  it('creates a new file with the eelzap entry', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    await claudeCodeAdapter.write(configPath, { apiKey: 'secret_test' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.type).toBe('stdio');
    expect(content.mcpServers.eelzap.env.EELZAP_API_KEY).toBe('secret_test');
  });

  it('merges into an existing file without overwriting other entries', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    const existing = { mcpServers: { other: { command: 'other-server' } } };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await claudeCodeAdapter.write(configPath, { apiKey: 'secret_test' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['other']).toBeDefined();
    expect(content.mcpServers['eelzap']).toBeDefined();
  });

  it('creates parent directories if they do not exist', async () => {
    const configPath = join(tmpDir, 'nested', 'dir', '.mcp.json');
    await claudeCodeAdapter.write(configPath, { apiKey: 'secret_test' });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap).toBeDefined();
  });

  it('includes custom env vars when present', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    await claudeCodeAdapter.write(configPath, {
      apiKey: 'secret_test',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/api/public/v1',
    });

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers.eelzap.env.EELZAP_BASE_URL).toBe('http://localhost:5041');
    expect(content.mcpServers.eelzap.env.EELZAP_PATH_PREFIX).toBe('/api/public/v1');
  });
});

describe('claudeCodeAdapter.remove', () => {
  it('removes the eelzap entry and preserves other entries', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    const existing = {
      mcpServers: {
        eelzap: { command: 'npx' },
        other: { command: 'other-server' },
      },
    };
    await writeFile(configPath, JSON.stringify(existing), 'utf-8');

    await claudeCodeAdapter.remove(configPath);

    const content = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(content.mcpServers['eelzap']).toBeUndefined();
    expect(content.mcpServers['other']).toBeDefined();
  });

  it('does nothing when file does not exist', async () => {
    await expect(
      claudeCodeAdapter.remove(join(tmpDir, 'nonexistent.json')),
    ).resolves.toBeUndefined();
  });
});
