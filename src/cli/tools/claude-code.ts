import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { EelzapEntry, ToolAdapter, Scope } from './types.js';

type ClaudeCodeConfig = {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
};

type EelzapServerEntry = {
  type: 'stdio';
  command: 'npx';
  args: ['-y', '@8ux-co/eelzap-mcp-server'];
  env: Record<string, string>;
};

function buildServerEntry(entry: EelzapEntry): EelzapServerEntry {
  const env: Record<string, string> = { EELZAP_API_KEY: entry.apiKey };
  if (entry.baseUrl) env['EELZAP_BASE_URL'] = entry.baseUrl;
  if (entry.pathPrefix) env['EELZAP_PATH_PREFIX'] = entry.pathPrefix;

  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@8ux-co/eelzap-mcp-server'],
    env,
  };
}

async function readJson(configPath: string): Promise<ClaudeCodeConfig> {
  if (!existsSync(configPath)) return {};
  const text = await readFile(configPath, 'utf-8');
  return JSON.parse(text) as ClaudeCodeConfig;
}

async function writeJson(configPath: string, data: ClaudeCodeConfig): Promise<void> {
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
  let config: ClaudeCodeConfig = {};
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
  let config: ClaudeCodeConfig;
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

export const claudeCodeAdapter: ToolAdapter = {
  name: 'Claude Code',
  id: 'claude-code',
  scopes: [
    {
      id: 'project',
      label: 'Project (.mcp.json)',
      configPath: resolve(process.cwd(), '.mcp.json'),
    },
    {
      id: 'user',
      label: 'User (~/.claude.json)',
      configPath: resolve(homedir(), '.claude.json'),
    },
  ] satisfies Scope[],
  read,
  write,
  remove,
  postInstallMessage: 'Restart Claude Code to pick up the new server.',
};
