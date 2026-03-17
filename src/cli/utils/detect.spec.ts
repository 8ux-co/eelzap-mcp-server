import { describe, expect, it, vi } from 'vitest';
import { ALL_ADAPTERS, detectInstallations, findAdapter } from './detect.js';

describe('ALL_ADAPTERS', () => {
  it('contains claude-code adapter', () => {
    expect(ALL_ADAPTERS.find((a) => a.id === 'claude-code')).toBeDefined();
  });

  it('contains cursor adapter', () => {
    expect(ALL_ADAPTERS.find((a) => a.id === 'cursor')).toBeDefined();
  });

  it('contains vscode adapter', () => {
    expect(ALL_ADAPTERS.find((a) => a.id === 'vscode')).toBeDefined();
  });

  it('contains codex adapter', () => {
    expect(ALL_ADAPTERS.find((a) => a.id === 'codex')).toBeDefined();
  });

  it('contains claude-desktop adapter', () => {
    expect(ALL_ADAPTERS.find((a) => a.id === 'claude-desktop')).toBeDefined();
  });

  it('has exactly 5 adapters', () => {
    expect(ALL_ADAPTERS).toHaveLength(5);
  });
});

describe('findAdapter', () => {
  it('returns the correct adapter for a known id', () => {
    const adapter = findAdapter('cursor');
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe('cursor');
  });

  it('returns undefined for an unknown id', () => {
    const adapter = findAdapter('unknown-tool');
    expect(adapter).toBeUndefined();
  });

  it('returns claude-code adapter', () => {
    const adapter = findAdapter('claude-code');
    expect(adapter?.id).toBe('claude-code');
  });

  it('returns vscode adapter', () => {
    const adapter = findAdapter('vscode');
    expect(adapter?.id).toBe('vscode');
  });
});

describe('detectInstallations', () => {
  it('returns empty array when no adapters have installations', async () => {
    // Mock all adapters to return null
    for (const adapter of ALL_ADAPTERS) {
      vi.spyOn(adapter, 'read').mockResolvedValue(null);
    }

    const installations = await detectInstallations();
    expect(installations).toEqual([]);
  });

  it('returns installations for adapters that have an entry', async () => {
    // Mock one adapter to return an entry
    const targetAdapter = ALL_ADAPTERS.find((a) => a.id === 'claude-code')!;
    vi.spyOn(targetAdapter, 'read').mockResolvedValue({
      apiKey: 'cms_secret_found',
    });

    // Mock all others to return null
    for (const adapter of ALL_ADAPTERS) {
      if (adapter.id !== 'claude-code') {
        vi.spyOn(adapter, 'read').mockResolvedValue(null);
      }
    }

    const installations = await detectInstallations();
    const found = installations.filter((i) => i.tool.id === 'claude-code');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]?.entry.apiKey).toBe('cms_secret_found');
  });

  it('handles errors from adapter reads gracefully', async () => {
    for (const adapter of ALL_ADAPTERS) {
      vi.spyOn(adapter, 'read').mockRejectedValue(new Error('read error'));
    }

    // Should not throw — errors are caught
    const installations = await detectInstallations();
    expect(installations).toEqual([]);
  });

  it('returns multiple installations when multiple adapters are configured', async () => {
    const claudeCode = ALL_ADAPTERS.find((a) => a.id === 'claude-code')!;
    const cursor = ALL_ADAPTERS.find((a) => a.id === 'cursor')!;

    vi.spyOn(claudeCode, 'read').mockResolvedValue({ apiKey: 'cms_secret_cc' });
    vi.spyOn(cursor, 'read').mockImplementation(async (configPath: string) => {
      if (configPath.includes('global')) return { apiKey: 'cms_secret_cursor' };
      return null;
    });

    // Mock remaining
    for (const adapter of ALL_ADAPTERS) {
      if (adapter.id !== 'claude-code' && adapter.id !== 'cursor') {
        vi.spyOn(adapter, 'read').mockResolvedValue(null);
      }
    }

    const installations = await detectInstallations();
    expect(installations.length).toBeGreaterThanOrEqual(2);
  });
});
