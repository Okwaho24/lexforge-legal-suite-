import express from 'express';
import { handleWebhook } from './webhook/webhookHandler.js';
import { bundleHandler, availabilityHandler } from './bundle/bundleHandler.js';
import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log, EventType } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../output');

export function createApp() {
  const app = express();

  // One parser, keeping the exact bytes for HMAC verification. (The previous version consumed the stream in a
  // custom middleware first, so express.json() failed with "stream is not readable" on every request.)
  app.use(express.json({ limit: '256kb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));

  // Legacy un-gated route: it bypassed the legal content gate and delivered unresolved placeholders.
  // Disabled; use /webhook/lexforge/bundle (gated). Re-enable only via LEXFORGE_LEGACY_WEBHOOK=1 after review.
  app.post('/webhook/lexforge', process.env.LEXFORGE_LEGACY_WEBHOOK === '1'
    ? handleWebhook
    : (_req, res) => res.status(410).json({ error: 'endpoint retired; use /webhook/lexforge/bundle' }));
  app.post('/webhook/lexforge/bundle', bundleHandler);
  app.post('/webhook/lexforge/availability', availabilityHandler);

  app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const filepath = join(OUTPUT_DIR, filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    createReadStream(filepath).pipe(res);
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // Malformed JSON and oversized bodies get a clean 4xx, not a stack trace.
  app.use((err, _req, res, _next) => {
    const status = err.status && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'internal error' : 'invalid request body' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5200;
  createApp().listen(PORT, () => log({ eventType: EventType.SERVER_START, port: PORT, service: 'LexForge™' }));
}
