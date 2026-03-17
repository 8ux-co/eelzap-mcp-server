import { describe, expect, it } from 'vitest';
import { jsonResult, errorResult } from './results.js';

function getTextContent(result: ReturnType<typeof jsonResult>) {
  const item = result.content[0];
  if (!item || item.type !== 'text') throw new Error('Expected text content');
  return item.text;
}

describe('jsonResult', () => {
  it('wraps data as a text content item with JSON string', () => {
    const result = jsonResult({ foo: 'bar', count: 42 });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe('text');
    expect(getTextContent(result)).toBe(JSON.stringify({ foo: 'bar', count: 42 }, null, 2));
  });

  it('handles arrays', () => {
    const result = jsonResult([1, 2, 3]);
    expect(getTextContent(result)).toBe(JSON.stringify([1, 2, 3], null, 2));
  });

  it('handles null', () => {
    const result = jsonResult(null);
    expect(getTextContent(result)).toBe('null');
  });

  it('does not set isError', () => {
    const result = jsonResult({});
    expect(result.isError).toBeUndefined();
  });
});

describe('errorResult', () => {
  it('wraps an Error instance message with Error: prefix', () => {
    const result = errorResult(new Error('something went wrong'));
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toBe('Error: something went wrong');
  });

  it('wraps a non-Error value stringified with Error: prefix', () => {
    const result = errorResult('a raw error string');
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toBe('Error: a raw error string');
  });

  it('wraps a numeric error value', () => {
    const result = errorResult(500);
    expect(getTextContent(result)).toBe('Error: 500');
  });
});
