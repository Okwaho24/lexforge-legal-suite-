import express from 'express';
import { handleWebhook } from './webhook/webhookHandler.js';
import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log, EventType } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../output');
const PORT = process.env.PORT || 5200;

const app = express();

app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
});

app.use(express.json());

app.post('/webhook/lexforge', handleWebhook);

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  const filepath = join(OUTPUT_DIR, filename);
  if (!existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  createReadStream(filepath).pipe(res);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  log({ eventType: EventType.SERVER_START, port: PORT, service: 'LexForge™' });
});
