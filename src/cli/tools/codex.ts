import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import * as TOML from 'smol-toml';
import type { EelzapEntry, ToolAdapter, Scope } from './types.js';

type CodexConfig = {
  mcp_servers?: Record<string, unknown>;
  [key: string]: unknown;
};

type CodexServerEntry = {
  command: string;
  args: string[];
  enabled: boolean;
  env: Record<string, string>;
};

function buildServerEntry(entry: EelzapEntry): CodexServerEntry {
  const env: Record<string, string> = { EELZAP_API_KEY: entry.apiKey };
  if (entry.baseUrl) env['EELZAP_BASE_URL'] = entry.baseUrl;
  if (entry.pathPrefix) env['EELZAP_PATH_PREFIX'] = entry.pathPrefix;

  return {
    command: 'npx',
    args: ['-y', '@8ux-co/eelzap-mcp-server'],
    enabled: true,
    env,
  };
}

async function readToml(configPath: string): Promise<CodexConfig> {
  if (!existsSync(configPath)) return {};
  const text = await readFile(configPath, 'utf-8');
  return TOML.parse(text) as CodexConfig;
}

async function writeToml(configPath: string, data: CodexConfig): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, TOML.stringify(data as Parameters<typeof TOML.stringify>[0]) + '\n', 'utf-8');
}

async function read(configPath: string): Promise<EelzapEntry | null> {
  if (!existsSync(configPath)) return null;
  try {
    const config = await readToml(configPath);
    const server = config.mcp_servers?.['eelzap'] as CodexServerEntry | undefined;
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
  let config: CodexConfig = {};
  if (existsSync(configPath)) {
    try {
      config = await readToml(configPath);
    } catch {
      throw new Error(`Cannot parse ${configPath} — fix the file manually before running install.`);
    }
  }

  config.mcp_servers = config.mcp_servers ?? {};
  config.mcp_servers['eelzap'] = buildServerEntry(entry);

  await writeToml(configPath, config);
}

async function remove(configPath: string): Promise<void> {
  if (!existsSync(configPath)) return;
  let config: CodexConfig;
  try {
    config = await readToml(configPath);
  } catch {
    throw new Error(`Cannot parse ${configPath} — fix the file manually.`);
  }
  if (config.mcp_servers) {
    delete config.mcp_servers['eelzap'];
  }
  await writeToml(configPath, config);
}

export const codexAdapter: ToolAdapter = {
  name: 'Codex',
  id: 'codex',
  scopes: [
    {
      id: 'global',
      label: 'Global (~/.codex/config.toml)',
      configPath: resolve(homedir(), '.codex', 'config.toml'),
    },
    {
      id: 'project',
      label: 'Project (.codex/config.toml)',
      configPath: resolve(process.cwd(), '.codex', 'config.toml'),
    },
  ] satisfies Scope[],
  read,
  write,
  remove,
  postInstallMessage: 'Restart Codex to pick up the new server.',
};
