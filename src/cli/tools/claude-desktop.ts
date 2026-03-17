import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { EelzapEntry, ToolAdapter, Scope } from './types.js';

type ClaudeDesktopConfig = {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
};

type EelzapServerEntry = {
  command: 'npx';
  args: ['-y', '@8ux-co/eelzap-mcp-server'];
  env: Record<string, string>;
};

function getConfigPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    const appData = process.env['APPDATA'] ?? resolve(homedir(), 'AppData', 'Roaming');
    return resolve(appData, 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'linux') {
    return resolve(homedir(), '.config', 'claude', 'claude_desktop_config.json');
  } else {
    // macOS
    return resolve(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
}

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

async function readJson(configPath: string): Promise<ClaudeDesktopConfig> {
  if (!existsSync(configPath)) return {};
  const text = await readFile(configPath, 'utf-8');
  return JSON.parse(text) as ClaudeDesktopConfig;
}

async function writeJson(configPath: string, data: ClaudeDesktopConfig): Promise<void> {
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
  let config: ClaudeDesktopConfig = {};
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
  let config: ClaudeDesktopConfig;
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

const configPath = getConfigPath();

export const claudeDesktopAdapter: ToolAdapter = {
  name: 'Claude Desktop',
  id: 'claude-desktop',
  scopes: [
    {
      id: 'default',
      label: `Default (${configPath})`,
      configPath,
    },
  ] satisfies Scope[],
  read,
  write,
  remove,
  postInstallMessage: 'Fully quit and reopen Claude Desktop (config changes require a restart).',
};
