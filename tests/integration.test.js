/**
 * End-to-end test against the REAL AcerbE™ engine + hardened server.py (no mock).
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
  const env = setupEnv({ acerbeUrl: `http://127.0.0.1:${port}` });
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

const ZW = /[​‌]/g;

test('AcerbE /health reports real keys; /ready is green', async (t) => {
  if (!depsOk) return t.skip();
  const r = await fetch(`${base}/ready`);
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.equal(j.checks.acerbe, true);
});

test('real engine: documents are fingerprinted, delivered stamped, and identify the buyer', async (t) => {
  if (!depsOk) return t.skip();
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-INT-1', document_codes: ['NDA', 'TOS'], document_code: undefined }));
  assert.equal(r.status, 200, JSON.stringify(r.json));

  for (const d of r.json.documents) {
    const stampedPath = path.join(cfg.storage.deliveredDir, 'TXN-INT-1', d.filename);
    const stamped = fs.readFileSync(stampedPath, 'utf8');
    assert.ok(stamped.match(ZW).length > 300, 'zero-width fingerprint present');
    const visible = stamped.replace(ZW, '');
    assert.match(visible, /LEGAL DISCLAIMER/);
    assert.doesNotMatch(visible, /\{\{/);

    // forensic scan with the engine: who bought this?
    const py = `
import sys, json, acerbe_engine as e
r = e.identify_file(sys.argv[1], sys.argv[2])
print(json.dumps({k: r.get(k) for k in ('identified','buyer_name','transaction_id','fingerprint_id','product_name')}))`;
    const out = spawnSync('python3', ['-c', py, stampedPath, d.fingerprint_id], { cwd: ACERBE_DIR, env: acerbeEnv });
    assert.equal(out.status, 0, out.stderr.toString());
    const id = JSON.parse(out.stdout.toString().trim().split('\n').pop());
    assert.equal(id.identified, true);
    assert.equal(id.buyer_name, 'rTestBuyerWallet000000000000000');
    assert.equal(id.transaction_id, 'TXN-INT-1');
    assert.equal(id.fingerprint_id, d.fingerprint_id);
  }
  // AcerbE's own output copies must have been cleaned up by LexForge
  const leftovers = fs.readdirSync(acerbeEnv.ACERBE_OUTPUT_DIR);
  assert.deepEqual(leftovers, []);
});

test('real server rejects: wrong key, path outside allowed dirs, traversal', async (t) => {
  if (!depsOk) return t.skip();
  const url = cfg.acerbe.baseUrl;
  const body = (file_path) => JSON.stringify({ file_path, buyer_wallet: 'w', transaction_id: 't', product_id: 'p' });
  const post = (key, file_path) => fetch(`${url}/fingerprint`, { method: 'POST', headers: { 'X-AcerbE-Key': key, 'Content-Type': 'application/json' }, body: body(file_path) });
  assert.equal((await post('wrong-key-wrong-key', '/etc/hostname')).status, 401);
  assert.equal((await post(SECRETS.acerbe, '/etc/hostname')).status, 403);
  assert.equal((await post(SECRETS.acerbe, path.join(cfg.storage.workDir, '..', '..', '..', 'etc', 'hostname'))).status, 403);
  assert.equal((await fetch(`${url}/api/download/..%2f..%2fetc%2fpasswd`, { headers: { 'X-AcerbE-Key': SECRETS.acerbe } })).status, 404);
  assert.equal((await fetch(`${url}/api/download/x`)).status, 401);
});

test('AcerbE killed mid-service -> LexForge refuses to deliver', async (t) => {
  if (!depsOk) return t.skip();
  proc.kill();
  await new Promise((r) => setTimeout(r, 500));
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-INT-DOWN' }));
  assert.equal(r.status, 502);
  assert.equal(fs.existsSync(path.join(cfg.storage.deliveredDir, 'TXN-INT-DOWN')), false);
  assert.equal(audit.getSuccess('TXN-INT-DOWN'), null);
});
