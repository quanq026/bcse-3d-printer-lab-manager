import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const testsDir = join(rootDir, 'tests');

function collectTests(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectTests(fullPath));
      continue;
    }
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
      files.push(relative(rootDir, fullPath));
    }
  }

  return files.sort();
}

const testFiles = collectTests(testsDir);

if (testFiles.length === 0) {
  console.log('No tests found.');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['--test', '--import', 'tsx', ...testFiles], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
