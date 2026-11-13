import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenOnAvailablePort } from './platform/development/listen.js';
import { createRuntime } from './runtime.js';

const runtime = createRuntime();
let client: ChildProcess | undefined;
let closing = false;

async function shutdown(code: number) {
  if (closing) return;
  closing = true;
  try {
    if (client?.pid && client.exitCode === null && client.signalCode === null) {
      await new Promise<void>(resolve => {
        client!.once('exit', () => resolve());
        client!.kill('SIGTERM');
      });
    }
    await runtime.close();
    process.exit(code);
  } catch (error) {
    console.error('Development shutdown failed:', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => { void shutdown(0); });
process.once('SIGTERM', () => { void shutdown(0); });

async function start() {
  const port = await listenOnAvailablePort(runtime.server, Number(process.env.PORT ?? 3000));
  const apiTarget = `http://127.0.0.1:${port}`;
  console.log(`Development API: ${apiTarget}`);

  const clientDirectory = fileURLToPath(new URL('../client', import.meta.url));
  const require = createRequire(import.meta.url);
  const vitePackage = require.resolve('vite/package.json', { paths: [clientDirectory] });
  client = spawn(process.execPath, [path.join(path.dirname(vitePackage), 'bin/vite.js')], {
    cwd: clientDirectory,
    env: { ...process.env, VITE_API_TARGET: apiTarget },
    stdio: 'inherit',
  });
  client.once('error', error => {
    console.error('Could not start the development client:', error);
    void shutdown(1);
  });
  client.once('exit', (code, signal) => {
    if (!closing) void shutdown(code ?? (signal ? 1 : 0));
  });
}

void start().catch(error => {
  console.error('Development startup failed:', error);
  void shutdown(1);
});
