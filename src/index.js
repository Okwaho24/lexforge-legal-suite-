/**
 * LexForge™ Server
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 * Sovereignty // Integrity // Inexorabilis
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { config, validateConfig } from './config/index.js';
import { handleWebhook, checkSignature } from './webhook/webhookHandler.js';
import { verifyToken } from './delivery/downloadTokens.js';
import { acerbeHealth } from './delivery/acerbeClient.js';
import { startAnchorWorker, stopAnchorWorker, pendingAnchorCount, getXRPLAnchor } from './delivery/xrplAnchorService.js';
import { templateCensus } from './engine/templateEngine.js';
import * as audit from './db/audit.js';
import { log, EventType } from './utils/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      product: 'LexForge™', code: 'ARC-LXF-001', version: '2.1.0', status: 'running',
      matrix: '19 documents × 7 jurisdictions × 7 languages = 931 templates',
      issuer: 'Archer Chain Analytics | ISC: 102237785',
    });
  });

  // RAW body: the RaPaX HMAC is computed over the exact bytes received.
  app.post('/webhook/lexforge', express.raw({ type: '*/*', limit: '256kb' }), handleWebhook);

  // Authenticated status lookup. Signature = HMAC over the string "GET /status/<txid>".
  app.get('/status/:txid', (req, res) => {
    const txid = req.params.txid;
    const bad = checkSignature(req.headers['x-rapax-signature'], `GET /status/${txid}`);
    if (bad) return res.status(bad.http).json({ error: bad.error });
    const row = audit.getLatest(txid);
    if (!row) return res.status(404).json({ error: 'Unknown transaction' });
    const anchored = audit.getEvents(txid, 'XRPL_ANCHORED')[0];
    res.json({
      transaction_id: txid,
      status: row.generation_status,
      attempt: row.attempt,
      bundle_hash: row.bundle_hash,
      fingerprints: row.acerbe_fingerprints ? JSON.parse(row.acerbe_fingerprints) : [],
      xrpl_anchor: anchored ? 'ANCHORED' : (config.xrpl.enabled && config.xrpl.seed ? 'PENDING' : 'DISABLED'),
      xrpl_tx_hash: anchored ? JSON.parse(anchored.detail).txHash : null,
      error: row.error_log ? JSON.parse(row.error_log) : null,
    });
  });

  // Only STAMPED files are ever served, and only through a signed, expiring token.
  app.get('/download/:token', (req, res) => {
    let rel;
    try {
      rel = verifyToken(req.params.token);
    } catch (err) {
      return res.status(err.code === 'EXPIRED' ? 410 : 404).json({ error: err.code === 'EXPIRED' ? 'Link expired' : 'Not found' });
    }
    const base = path.resolve(config.storage.deliveredDir);
    const full = path.resolve(base, rel);
    if (!full.startsWith(base + path.sep) || !fs.existsSync(full)) return res.status(404).json({ error: 'Not found' });
    try { audit.appendEvent(rel.split('/')[0], 'DOWNLOADED', { file: path.basename(rel) }); } catch { /* audit must not block a paid download */ }
    return res.download(full, path.basename(full));
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // Readiness: everything the pipeline needs to deliver correctly.
  app.get('/ready', async (_req, res) => {
    const checks = {};
    try { checks.audit_db = audit.ping(); } catch { checks.audit_db = false; }
    const a = await acerbeHealth();
    checks.acerbe = a.ok;
    const census = templateCensus();
    checks.templates_populated = census.populated;
    checks.templates_stub = census.stub;
    checks.templates_missing = census.missing;
    checks.xrpl = getXRPLAnchor() ? 'enabled' : 'disabled';
    try { checks.xrpl_pending = pendingAnchorCount(); } catch { checks.xrpl_pending = null; }
    checks.webhook_secret = config.rapax.webhookSecret.length >= 16;
    checks.download_secret = config.download.secret.length >= 32;
    const ready = checks.audit_db && a.ok && census.populated > 0 && checks.webhook_secret && checks.download_secret;
    res.status(ready ? 200 : 503).json({ ready, checks, ...(a.ok ? {} : { acerbe_reason: a.reason }) });
  });

  // JSON error handler (body too large, etc.)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: status === 413 ? 'Payload too large' : 'Request error' });
  });

  return app;
}

function main() {
  const { errors, warnings } = validateConfig();
  for (const w of warnings) log({ eventType: EventType.SYSTEM, payload: { action: 'CONFIG_WARNING', message: w } });
  if (errors.length) {
    for (const e of errors) log({ eventType: EventType.ERROR, payload: { action: 'CONFIG_ERROR', message: e } });
    process.stderr.write(`LexForge™ refusing to start:\n - ${errors.join('\n - ')}\n`);
    process.exit(1);
  }

  fs.mkdirSync(config.storage.workDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(config.storage.deliveredDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(config.logs.dir, { recursive: true });
  audit.openAudit(config.storage.dbPath);

  const server = createApp().listen(config.server.port, () => {
    log({ eventType: EventType.SYSTEM, payload: { action: 'SERVER_START', port: config.server.port, env: config.server.env,
      network: config.xrpl.network, db: config.storage.dbPath } });
  });
  startAnchorWorker();

  const shutdown = () => {
    stopAnchorWorker();
    server.close(() => { audit.closeAudit(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
