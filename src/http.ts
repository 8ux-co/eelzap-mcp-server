import type { ServerConfig } from './config.js';

// ---------------------------------------------------------------------------
// Concurrency semaphore — caps the number of simultaneous in-flight requests.
// Without this, a fast LLM issuing many tool calls in parallel can exhaust
// the server's connection pool.
// ---------------------------------------------------------------------------

class Semaphore {
  readonly #limit: number;
  #running = 0;
  readonly #queue: Array<() => void> = [];

  constructor(limit: number) {
    this.#limit = limit;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.#acquire();
    try {
      return await fn();
    } finally {
      this.#release();
    }
  }

  #acquire(): Promise<void> {
    if (this.#running < this.#limit) {
      this.#running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.#queue.push(resolve);
    });
  }

  #release(): void {
    const next = this.#queue.shift();
    if (next) {
      next();
    } else {
      this.#running--;
    }
  }
}

// ---------------------------------------------------------------------------

export class HttpError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export type RequestOptions = {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: HeadersInit;
};

const MAX_CONCURRENT_REQUESTS = 5;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export class CmsHttpClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #pathPrefix: string;
  readonly #semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

  constructor(config: ServerConfig) {
    this.#apiKey = config.apiKey;
    this.#baseUrl = config.baseUrl;
    this.#pathPrefix = config.pathPrefix;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    return this.#semaphore.run(() => this.#fetchWithRetry<T>(options));
  }

  async #fetchWithRetry<T>(options: RequestOptions, attempt = 0): Promise<T> {
    const url = new URL(this.#resolvePath(options.path), `${this.#baseUrl}/`);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.#apiKey}`);

    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);

    // Retry on 429 Too Many Requests with exponential backoff
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const delayMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : RETRY_BASE_DELAY_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.#fetchWithRetry<T>(options, attempt + 1);
    }

    return parseJsonResponse<T>(response);
  }

  async requestWithFallback<T>(
    primary: RequestOptions,
    fallback: RequestOptions,
  ): Promise<T> {
    try {
      return await this.request<T>(primary);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return this.request<T>(fallback);
      }

      throw error;
    }
  }

  #resolvePath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (this.#pathPrefix === '/') {
      return normalizedPath;
    }

    return `${this.#pathPrefix}${normalizedPath}`;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? response.statusText;
    throw new HttpError(message, response.status, data);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object') {
    const errors = (payload as Record<string, unknown>).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const messages = errors
        .flatMap((entry) => {
          if (
            typeof entry === 'object' &&
            entry !== null &&
            'message' in entry &&
            typeof (entry as Record<string, unknown>).message === 'string'
          ) {
            return [(entry as Record<string, string>).message];
          }

          return [];
        })
        .filter((message) => message.trim().length > 0);

      if (messages.length > 0) {
        return messages.join('; ');
      }
    }

    for (const key of ['message', 'error']) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return null;
}
