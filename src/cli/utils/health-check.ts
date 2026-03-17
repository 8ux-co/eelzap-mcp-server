const DEFAULT_BASE_URL = 'https://api.eelzap.com';
const DEFAULT_PATH_PREFIX = '/v1';

export type HealthCheckResult = {
  ok: boolean;
  siteName?: string;
  error?: string;
};

type SiteResponse = {
  name?: string;
  data?: { name?: string };
};

export async function healthCheck(
  apiKey: string,
  baseUrl: string = DEFAULT_BASE_URL,
  pathPrefix: string = DEFAULT_PATH_PREFIX,
): Promise<HealthCheckResult> {
  try {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPrefix = pathPrefix === '/' ? '' : `/${pathPrefix.replace(/^\/+|\/+$/g, '')}`;
    const url = `${normalizedBase}${normalizedPrefix}/site`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const data = safeJsonParse(text);
      const message = extractMessage(data) ?? response.statusText;
      return { ok: false, error: `${response.status} ${message}` };
    }

    const text = await response.text().catch(() => '');
    const data = safeJsonParse(text) as SiteResponse | null;
    const siteName = data?.name ?? data?.data?.name;

    return { ok: true, siteName };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  for (const key of ['message', 'error']) {
    if (typeof p[key] === 'string' && (p[key] as string).trim()) {
      return p[key] as string;
    }
  }
  return null;
}
