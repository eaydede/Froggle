import { createServer, type Server } from 'node:http';
import { afterEach, expect, it } from 'vitest';
import { listenOnAvailablePort } from './listen.js';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    if (server.listening) server.close(() => resolve());
    else resolve();
  })));
});

async function reservePort() {
  const server = createServer();
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '0.0.0.0', resolve));
  return { server, port: (server.address() as { port: number }).port };
}

it('uses the preferred port when it is available', async () => {
  const reserved = await reservePort();
  await new Promise<void>(resolve => reserved.server.close(() => resolve()));
  const api = createServer();
  servers.push(api);
  expect(await listenOnAvailablePort(api, reserved.port)).toBe(reserved.port);
  expect(api.listening).toBe(true);
});

it('skips occupied ports and starts a working HTTP server without disturbing their owners', async () => {
  const occupied = await reservePort();
  const api = createServer((_req, res) => res.end('ready'));
  servers.push(api);
  const port = await listenOnAvailablePort(api, occupied.port);
  expect(port).toBeGreaterThan(occupied.port);
  expect(occupied.server.listening).toBe(true);
  const response = await fetch(`http://127.0.0.1:${port}`);
  expect(await response.text()).toBe('ready');
});
