import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts?: Record<string, string>;
};

test('production start script does not depend on cross-env', () => {
  const startScript = packageJson.scripts?.start;

  assert.equal(typeof startScript, 'string');
  assert.equal(startScript?.includes('cross-env'), false);
  assert.equal(startScript, 'tsx server/index.ts');
});
