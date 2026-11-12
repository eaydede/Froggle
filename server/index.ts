import { createRuntime } from './runtime.js';

const runtime = createRuntime();
const port = Number(process.env.PORT) || 3000;
runtime.server.listen(port, '0.0.0.0', () => { console.log(`Server running on port ${port}`); });
let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  void runtime.close().then(() => process.exit(0)).catch(error => { console.error('Shutdown failed:', error); process.exit(1); });
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
