import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DEV_SERVER_URL = "http://localhost:4321";
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;
const KILL_GRACE_MS = 2_000;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      // server not ready yet — wait before next poll
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Dev server did not respond at ${url} within ${timeoutMs}ms`);
}

function killProcessTree(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    const pid = child.pid;
    if (pid === undefined) {
      resolve();
      return;
    }

    // On Windows kill the entire process tree via taskkill.
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { shell: true });
      setTimeout(resolve, KILL_GRACE_MS);
      return;
    }

    // On POSIX, SIGTERM first then SIGKILL after grace period.
    child.kill("SIGTERM");
    const sigkillTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, KILL_GRACE_MS);

    child.once("exit", () => {
      clearTimeout(sigkillTimer);
      resolve();
    });
  });
}

export default async function setup(): Promise<() => Promise<void>> {
  // Load .env.test if present — provides SUPABASE_TEST_* for integration tests.
  const envTestPath = resolve(process.cwd(), ".env.test");
  if (existsSync(envTestPath)) {
    // process.loadEnvFile is available in Node 20.12+; guard before calling.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const loadEnvFile = (process as NodeJS.Process & { loadEnvFile?: (path: string) => void }).loadEnvFile;
    if (typeof loadEnvFile === "function") {
      loadEnvFile.call(process, envTestPath);
    }
  }

  // Reuse an already-running dev server (e.g. started manually with `npm run dev`).
  try {
    await fetch(DEV_SERVER_URL);
    // eslint-disable-next-line no-console
    console.log(`[global-setup] Reusing pre-existing dev server at ${DEV_SERVER_URL}`);
    return () => Promise.resolve();
  } catch {
    // fall through to start it
  }

  // Unset CLAUDECODE so Astro does not detect the Claude Code agent env and
  // fall into a 30s-capped background mode that prevents the server from
  // responding in time.
  const { CLAUDECODE: _dropped, ...cleanEnv } = process.env;
  const child = spawn("npm", ["run", "dev"], {
    shell: true,
    stdio: "pipe",
    env: cleanEnv,
  });

  try {
    await waitForServer(DEV_SERVER_URL, STARTUP_TIMEOUT_MS);
    return async () => {
      await killProcessTree(child);
    };
  } catch {
    await killProcessTree(child);
    // Non-fatal: tests that make HTTP requests will fail with ECONNREFUSED.
    // The @astrojs/cloudflare dev server requires Node 22 (see .nvmrc).
    // Fix: install nvm-windows, run `nvm use 22.14.0`, then re-run npm test.
    // Or start the server manually before running tests.
    // eslint-disable-next-line no-console
    console.warn(
      `[global-setup] Dev server did not start (Node ${process.version}, requires Node 22). ` +
        `HTTP integration tests will be skipped or fail. ` +
        `Start the server with \`npm run dev\` manually to enable them.`,
    );
    return () => Promise.resolve();
  }
}
