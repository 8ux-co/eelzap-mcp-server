import { describe, expect, it } from 'vitest';
import { maskKey, maskKeyReadable } from './mask-key.js';

describe('maskKey', () => {
  it('masks all but the last 4 characters', () => {
    expect(maskKey('cms_secret_abcdef1234')).toBe('*****************1234');
  });

  it('masks short keys entirely', () => {
    expect(maskKey('abc')).toBe('****');
  });

  it('masks a 4-character key entirely', () => {
    expect(maskKey('abcd')).toBe('****');
  });
});

describe('maskKeyReadable', () => {
  it('preserves the cms_secret_ prefix and masks the rest', () => {
    expect(maskKeyReadable('cms_secret_abcdef1234')).toBe('cms_secret_****1234');
  });

  it('preserves the cms_public_ prefix and masks the rest', () => {
    expect(maskKeyReadable('cms_public_abcdef1234')).toBe('cms_public_****1234');
  });

  it('falls back to full masking for unknown prefixes', () => {
    expect(maskKeyReadable('unknownkey1234')).toBe('**********1234');
  });

  it('masks a short suffix (<=4 chars after prefix) without showing visible chars', () => {
    expect(maskKeyReadable('cms_secret_1234')).toBe('cms_secret_****');
  });
});
