import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

const ROOT_DIR = process.cwd();
const TSX_CLI = join(ROOT_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs');

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not allocate a free port for the auth test server.'));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForServer(baseUrl: string, deadlineMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      const response = await fetch(`${baseUrl}/api/settings`);
      if (response.ok) return;
    } catch {
      // Keep polling until the server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready within ${deadlineMs}ms.`);
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.killed || server.exitCode !== null) return;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      server.kill('SIGKILL');
    }, 5_000);

    server.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    server.kill('SIGTERM');
  });
}

async function login(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `Login failed unexpectedly: ${JSON.stringify(payload)}`);
  return payload as { token: string; user: { id: string; email: string } };
}

test('rejects an old token after the user changes password', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'bcse-auth-session-'));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [TSX_CLI, 'server/index.ts'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      NODE_ENV: 'development',
      LOG_LEVEL: 'error',
      ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
      JWT_SECRET: 'test-secret',
      SEED_ADMIN_PASSWORD: 'Admin@2024',
      SEED_MOD_PASSWORD: 'Mod@2024',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(baseUrl);

    const { token } = await login(baseUrl, 'admin@vju.ac.vn', 'Admin@2024');
    const changePasswordResponse = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@2024',
        newPassword: 'Admin@2025',
      }),
    });
    assert.equal(changePasswordResponse.status, 200, 'Password change should succeed before the old token is checked.');

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(meResponse.status, 401, 'Old token should be rejected once the password changes.');
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('invalidates a moderator session after an admin resets that moderator password', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'bcse-auth-managed-reset-'));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [TSX_CLI, 'server/index.ts'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      NODE_ENV: 'development',
      LOG_LEVEL: 'error',
      ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
      JWT_SECRET: 'test-secret',
      SEED_ADMIN_PASSWORD: 'Admin@2024',
      SEED_MOD_PASSWORD: 'Mod@2024',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(baseUrl);

    const adminSession = await login(baseUrl, 'admin@vju.ac.vn', 'Admin@2024');
    const moderatorSession = await login(baseUrl, 'mod@vju.ac.vn', 'Mod@2024');

    const resetResponse = await fetch(`${baseUrl}/api/users/${moderatorSession.user.id}/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSession.token}`,
      },
      body: JSON.stringify({
        newPassword: 'Mod@2025',
      }),
    });
    assert.equal(resetResponse.status, 200, 'Admin-managed password reset should succeed.');

    const moderatorMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${moderatorSession.token}`,
      },
    });
    assert.equal(moderatorMe.status, 401, 'Moderator token should be invalid after admin resets the password.');

    const adminMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${adminSession.token}`,
      },
    });
    assert.equal(adminMe.status, 200, 'Admin token should stay valid after resetting another account.');

    const loginWithOldPassword = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mod@vju.ac.vn',
        password: 'Mod@2024',
      }),
    });
    assert.equal(loginWithOldPassword.status, 401, 'Old moderator password should no longer work.');

    const loginWithNewPassword = await login(baseUrl, 'mod@vju.ac.vn', 'Mod@2025');
    assert.ok(loginWithNewPassword.token, 'Moderator should be able to sign in with the new password.');
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});
