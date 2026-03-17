/**
 * Mask an API key for display, showing only the last 4 characters.
 * e.g. "secret_abcdef1234" → "secret_****1234"
 */
export function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '****';
  }

  const visible = apiKey.slice(-4);
  const prefix = apiKey.slice(0, Math.max(0, apiKey.length - 4));
  return `${prefix.replace(/./g, '*')}${visible}`;
}

/**
 * Mask just the secret portion of a key, preserving the readable prefix.
 * e.g. "secret_abcdef1234" → "secret_****1234"
 */
export function maskKeyReadable(apiKey: string): string {
  const prefixMatch = apiKey.match(/^((?:cms_)?(?:secret|public)_)/);
  if (!prefixMatch) {
    return maskKey(apiKey);
  }

  const prefix = prefixMatch[1];
  const rest = apiKey.slice(prefix.length);

  if (rest.length <= 4) {
    return `${prefix}****`;
  }

  const visible = rest.slice(-4);
  return `${prefix}****${visible}`;
}
