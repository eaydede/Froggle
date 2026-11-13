import type { Server } from 'node:http';

/** Bind the real server so another workspace cannot claim a probed port
 * between checking availability and starting the API. */
export async function listenOnAvailablePort(server: Server, preferredPort: number): Promise<number> {
  if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    throw new Error('The development API port must be an integer between 1 and 65535.');
  }

  for (let port = preferredPort; port <= 65535; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '0.0.0.0');
      });
      return port;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      console.log(`API port ${port} is in use; trying ${port + 1}.`);
    }
  }
  throw new Error(`No available API port at or above ${preferredPort}.`);
}
