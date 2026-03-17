import { claudeCodeAdapter } from '../tools/claude-code.js';
import { cursorAdapter } from '../tools/cursor.js';
import { vscodeAdapter } from '../tools/vscode.js';
import { codexAdapter } from '../tools/codex.js';
import { claudeDesktopAdapter } from '../tools/claude-desktop.js';
import type { DetectedInstallation, ToolAdapter } from '../tools/types.js';

export const ALL_ADAPTERS: ToolAdapter[] = [
  claudeCodeAdapter,
  cursorAdapter,
  vscodeAdapter,
  codexAdapter,
  claudeDesktopAdapter,
];

/**
 * Scan all known config locations and return detected eelzap installations.
 */
export async function detectInstallations(): Promise<DetectedInstallation[]> {
  const results: DetectedInstallation[] = [];

  for (const tool of ALL_ADAPTERS) {
    for (const scope of tool.scopes) {
      const entry = await tool.read(scope.configPath).catch(() => null);
      if (entry) {
        results.push({ tool, scope, entry });
      }
    }
  }

  return results;
}

/**
 * Find a specific adapter by its id.
 */
export function findAdapter(toolId: string): ToolAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.id === toolId);
}
