/**
 * End-to-end against the REAL AcerbE™ engine AND the REAL repo templates (all 19 documents, CA/EN).
 * Runs only when ACERBE_DIR points at a directory containing server.py and acerbe_engine.py
 * and python3 has the engine's dependencies (cryptography, Pillow, pikepdf).
 *   ACERBE_DIR=/path/to/acerbe-server-fix npm run test:integration
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';
import crypto from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { setupEnv, listen, postWebhook, basePayload, SECRETS } from './helpers.js';

const ACERBE_DIR = process.env.ACERBE_DIR;
const depsOk = ACERBE_DIR && fs.existsSync(path.join(ACERBE_DIR, 'server.py')) &&
  spawnSync('python3', ['-c', 'import cryptography, PIL, pikepdf'], { cwd: ACERBE_DIR }).status === 0;

const freePort = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

let proc, srv, base, cfg, audit, tmp, acerbeEnv;

before(async (t) => {
  if (!depsOk) return t.skip('ACERBE_DIR not set or python deps missing');
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-int-'));
  const port = await freePort();
  const env = setupEnv({ acerbeUrl: `http://127.0.0.1:${port}`, extra: { TEMPLATES_DIR: path.resolve('templates'), ALLOW_EN_FALLBACK: 'false', SELLABLE_LANGUAGES: 'EN', RESTRICTED_DOCUMENTS: 'PSA:CA;CES:CA;INV:CA' } });
  ({ config: cfg } = await import('../src/config/index.js'));
  audit = await import('../src/db/audit.js');
  fs.mkdirSync(cfg.storage.workDir, { recursive: true });
  fs.mkdirSync(cfg.storage.deliveredDir, { recursive: true });
  audit.openAudit(cfg.storage.dbPath);

  acerbeEnv = {
    ...process.env,
    ACERBE_ENV: 'production',
    ACERBE_PORT: String(port),
    ACERBE_API_KEY: SECRETS.acerbe,
    ACERBE_SECRET_KEY: crypto.randomBytes(32).toString('hex'),
    ACERBE_REGISTRY_KEY: crypto.randomBytes(24).toString('hex'),
    ACERBE_REGISTRY: path.join(tmp, 'registry.db'),
    ACERBE_ALLOWED_INPUT_DIRS: cfg.storage.workDir,
    ACERBE_OUTPUT_DIR: path.join(tmp, 'acerbe_out'),
  };
  proc = spawn('python3', ['server.py'], { cwd: ACERBE_DIR, env: acerbeEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d; });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`, { headers: { 'X-AcerbE-Key': SECRETS.acerbe } })).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
    if (i === 59) throw new Error('AcerbE did not start: ' + stderr);
  }
  const { createApp } = await import('../src/index.js');
  const l = await listen(createApp());
  srv = l.server; base = l.base;
});

after(() => { if (srv) srv.close(); if (proc) proc.kill(); if (audit && depsOk) audit.closeAudit(); });

const ZW = /[\u200B\u200C]/g;
const ALL = ['SLA','MSA','NDA','ICA','EUA','TOS','PP','RPA','LOI','MOU','IP','ESA','PSA','DPA','WA','LIC','PAR','CES','INV'];

test('all 19 real CA/EN documents deliver stamped, with no leftover placeholders or "undefined"', async (t) => {
  if (!depsOk) return t.skip();
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-REAL-ALL', document_codes: ALL, document_code: undefined }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.documents.length, 19);
  for (const d of r.json.documents) {
    const stamped = fs.readFileSync(path.join(cfg.storage.deliveredDir, 'TXN-REAL-ALL', d.filename), 'utf8');
    assert.ok((stamped.match(ZW) || []).length > 300, `${d.filename}: fingerprint present`);
    const visible = stamped.replace(ZW, '');
    assert.match(visible, /LEGAL DISCLAIMER/, d.filename);
    assert.doesNotMatch(visible, /\{\{/, d.filename);
    assert.doesNotMatch(visible, /\bundefined\b/, d.filename);
  }
});

test('real templates: FR/AR and a mismatched non-CA document are refused before AcerbE', async (t) => {
  if (!depsOk) return t.skip();
  for (const over of [{ language: 'AR' }, { language: 'FR' }, { document_code: 'INV', jurisdiction: 'US' }, { document_code: 'CES', jurisdiction: 'EU' }]) {
    const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-REFUSE-' + Math.random().toString(36).slice(2, 8), ...over }));
    assert.equal(r.status, 422, JSON.stringify(over));
    assert.equal(r.json.code, 'TEMPLATE_NOT_SELLABLE');
  }
});

test('real templates: EN documents for other jurisdictions deliver (NDA/SLA/MSA/TOS x 7)', async (t) => {
  if (!depsOk) return t.skip();
  for (const jurisdiction of ['US', 'EU', 'UK', 'BR', 'AE', 'SG']) {
    const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-REAL-' + jurisdiction, jurisdiction, document_codes: ['NDA', 'SLA', 'MSA', 'TOS'], document_code: undefined }));
    assert.equal(r.status, 200, jurisdiction + ' ' + JSON.stringify(r.json));
    for (const d of r.json.documents) {
      const v = fs.readFileSync(path.join(cfg.storage.deliveredDir, 'TXN-REAL-' + jurisdiction, d.filename), 'utf8').replace(ZW, '');
      assert.doesNotMatch(v, /\bundefined\b/);
    }
  }
});
