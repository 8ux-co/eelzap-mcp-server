import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import { ALL_ADAPTERS } from './utils/detect.js';
import { healthCheck } from './utils/health-check.js';
import { maskKeyReadable } from './utils/mask-key.js';

const execFileAsync = promisify(execFile);

type Issue = {
  label: string;
  fix: string;
};

export async function runDoctor(_args: string[]): Promise<void> {
  console.log(chalk.bold('Eel Zap MCP Server — Doctor'));
  console.log('');

  const issues: Issue[] = [];

  // 1. Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  if (major >= 20) {
    console.log(chalk.green(`  ✓ Node.js ${nodeVersion} (>= 20 required)`));
  } else {
    console.log(chalk.red(`  ✗ Node.js ${nodeVersion} — requires >= 20`));
    issues.push({ label: 'Node.js version', fix: 'Upgrade Node.js to v20 or later: https://nodejs.org' });
  }

  // 2. npx availability
  try {
    await execFileAsync('npx', ['--version']);
    console.log(chalk.green('  ✓ npx available'));
  } catch {
    console.log(chalk.red('  ✗ npx not found on PATH'));
    issues.push({ label: 'npx not found', fix: 'Install Node.js (includes npm/npx): https://nodejs.org' });
  }

  // 3. Check each tool
  const seenKeys = new Map<string, string[]>();

  for (const adapter of ALL_ADAPTERS) {
    for (const scope of adapter.scopes) {
      const label = `${adapter.name} (${scope.id})`;

      let entry;
      try {
        entry = await adapter.read(scope.configPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`  ✗ ${label} — config error: ${message}`));
        issues.push({ label, fix: `Fix ${scope.configPath}: ${message}` });
        continue;
      }

      if (!entry) {
        console.log(chalk.dim(`  - ${label} — not configured`));
        continue;
      }

      // Validate key format
      if (
        !entry.apiKey.startsWith('secret_') &&
        !entry.apiKey.startsWith('public_') &&
        !entry.apiKey.startsWith('cms_secret_') &&
        !entry.apiKey.startsWith('cms_public_')
      ) {
        console.log(chalk.red(`  ✗ ${label} — invalid API key format`));
        issues.push({
          label,
          fix: `Run \`eelzap-mcp switch-key --tool ${adapter.id}\` to update the API key.`,
        });
        continue;
      }

      // Track duplicate keys
      const existing = seenKeys.get(entry.apiKey) ?? [];
      existing.push(label);
      seenKeys.set(entry.apiKey, existing);

      // Health check
      const baseUrl = entry.baseUrl ?? 'https://api.eelzap.com';
      const pathPrefix = entry.pathPrefix ?? '/v1';
      const check = await healthCheck(entry.apiKey, baseUrl, pathPrefix);

      if (check.ok) {
        const site = check.siteName ? `, site: "${check.siteName}"` : '';
        console.log(
          chalk.green(
            `  ✓ ${label} — valid config, key verified${site} (${maskKeyReadable(entry.apiKey)})`,
          ),
        );
      } else {
        console.log(chalk.yellow(`  ⚠ ${label} — config valid, but: ${check.error}`));
        issues.push({
          label,
          fix: `Run \`eelzap-mcp switch-key --tool ${adapter.id}\` to update the API key.`,
        });
      }
    }
  }

  // 4. Warn about duplicate keys
  for (const [, tools] of seenKeys) {
    if (tools.length > 1) {
      console.log(chalk.dim(`  ℹ Same API key used in: ${tools.join(', ')} (not an error)`));
    }
  }

  // Summary
  console.log('');
  if (issues.length === 0) {
    console.log(chalk.green('  No issues found.'));
  } else {
    console.log(chalk.yellow(`  ${issues.length} issue${issues.length === 1 ? '' : 's'} found:`));
    for (const issue of issues) {
      console.log(`  → ${issue.label}: ${issue.fix}`);
    }
  }
}
