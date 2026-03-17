import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { EelzapEntry, ToolAdapter, Scope } from './types.js';

type CursorConfig = {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
};

type EelzapServerEntry = {
  command: 'npx';
  args: ['-y', '@8ux-co/eelzap-mcp-server'];
  env: Record<string, string>;
};

function buildServerEntry(entry: EelzapEntry): EelzapServerEntry {
  const env: Record<string, string> = { EELZAP_API_KEY: entry.apiKey };
  if (entry.baseUrl) env['EELZAP_BASE_URL'] = entry.baseUrl;
  if (entry.pathPrefix) env['EELZAP_PATH_PREFIX'] = entry.pathPrefix;

  return {
    command: 'npx',
    args: ['-y', '@8ux-co/eelzap-mcp-server'],
    env,
  };
}

async function readJson(configPath: string): Promise<CursorConfig> {
  if (!existsSync(configPath)) return {};
  const text = await readFile(configPath, 'utf-8');
  return JSON.parse(text) as CursorConfig;
}

async function writeJson(configPath: string, data: CursorConfig): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

async function read(configPath: string): Promise<EelzapEntry | null> {
  if (!existsSync(configPath)) return null;
  try {
    const config = await readJson(configPath);
    const server = config.mcpServers?.['eelzap'] as EelzapServerEntry | undefined;
    if (!server?.env?.['EELZAP_API_KEY']) return null;
    return {
      apiKey: server.env['EELZAP_API_KEY'],
      baseUrl: server.env['EELZAP_BASE_URL'],
      pathPrefix: server.env['EELZAP_PATH_PREFIX'],
    };
  } catch {
    return null;
  }
}

async function write(configPath: string, entry: EelzapEntry): Promise<void> {
  let config: CursorConfig = {};
  if (existsSync(configPath)) {
    try {
      config = await readJson(configPath);
    } catch {
      throw new Error(`Cannot parse ${configPath} — fix the file manually before running install.`);
    }
  }

  config.mcpServers = config.mcpServers ?? {};
  config.mcpServers['eelzap'] = buildServerEntry(entry);
  await writeJson(configPath, config);
}

async function remove(configPath: string): Promise<void> {
  if (!existsSync(configPath)) return;
  let config: CursorConfig;
  try {
    config = await readJson(configPath);
  } catch {
    throw new Error(`Cannot parse ${configPath} — fix the file manually.`);
  }
  if (config.mcpServers) {
    delete config.mcpServers['eelzap'];
  }
  await writeJson(configPath, config);
}

export const cursorAdapter: ToolAdapter = {
  name: 'Cursor',
  id: 'cursor',
  scopes: [
    {
      id: 'project',
      label: 'Project (.cursor/mcp.json)',
      configPath: resolve(process.cwd(), '.cursor', 'mcp.json'),
    },
    {
      id: 'global',
      label: 'Global (~/.cursor/mcp.json)',
      configPath: resolve(homedir(), '.cursor', 'mcp.json'),
    },
  ] satisfies Scope[],
  read,
  write,
  remove,
  postInstallMessage: 'Restart Cursor to pick up the new server.',
};
