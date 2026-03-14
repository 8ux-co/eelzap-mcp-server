export type ServerConfig = {
  apiKey: string;
  baseUrl: string;
  pathPrefix: string;
};

function getRequiredEnv(name: 'EELZAP_API_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

export function readConfig(env = process.env): ServerConfig {
  const apiKey = env.EELZAP_API_KEY?.trim() ?? getRequiredEnv('EELZAP_API_KEY');
  const rawBaseUrl = env.EELZAP_BASE_URL?.trim() || 'https://api.eelzap.com';
  const rawPathPrefix = env.EELZAP_PATH_PREFIX?.trim() || '/v1';

  const url = new URL(rawBaseUrl);
  url.pathname = url.pathname.replace(/\/+$/, '');

  return {
    apiKey,
    baseUrl: url.toString().replace(/\/+$/, ''),
    pathPrefix: normalizePathPrefix(rawPathPrefix),
  };
}

function normalizePathPrefix(pathPrefix: string): string {
  const trimmed = pathPrefix.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
