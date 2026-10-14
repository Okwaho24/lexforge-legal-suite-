import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { DatabaseSync } from 'node:sqlite';
import { setupEnv, mockAcerbe, listen, postWebhook, basePayload, sign, SECRETS } from './helpers.js';

let env, mock, app, base, srv, cfg, audit, anchorSvc, tokens;

before(async () => {
  mock = await mockAcerbe();
  env = setupEnv({ acerbeUrl: mock.url });
  ({ config: cfg } = await import('../src/config/index.js'));
  audit = await import('../src/db/audit.js');
  anchorSvc = await import('../src/delivery/xrplAnchorService.js');
  tokens = await import('../src/delivery/downloadTokens.js');
  const { createApp } = await import('../src/index.js');
  audit.openAudit(cfg.storage.dbPath);
  fs.mkdirSync(cfg.storage.deliveredDir, { recursive: true });
  fs.mkdirSync(cfg.storage.workDir, { recursive: true });
  const l = await listen(createApp());
  srv = l.server; base = l.base;
});

after(() => { srv.close(); mock.server.close(); audit.closeAudit(); });

const reset = () => { mock.state.mode = 'ok'; mock.state.failOnCall = null; };
const delivered = (tx) => path.join(cfg.storage.deliveredDir, tx);

test('rejects a missing, wrong or truncated signature (401) and never touches AcerbE', async () => {
  const calls = mock.state.calls.length;
  const raw = JSON.stringify(basePayload({ transaction_id: 'TXN-AUTH' }));
  for (const sig of [undefined, 'sha256=deadbeef', sign(raw, 'wrong-secret'), '', 'x']) {
    const res = await fetch(`${base}/webhook/lexforge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(sig === undefined ? {} : { 'x-rapax-signature': sig }) }, body: raw,
    });
    assert.equal(res.status, 401);
  }
  assert.equal(mock.state.calls.length, calls);
});

test('fails closed (503) when no webhook secret is configured', async () => {
  const saved = cfg.rapax.webhookSecret;
  cfg.rapax.webhookSecret = '';
  try {
    const res = await fetch(`${base}/webhook/lexforge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 503);
  } finally { cfg.rapax.webhookSecret = saved; }
});

test('signature is over the raw bytes, so reordered/re-spaced JSON with the same signature fails', async () => {
  const body = JSON.stringify(basePayload({ transaction_id: 'TXN-RAW' }));
  const sig = sign(body);
  const res = await fetch(`${base}/webhook/lexforge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rapax-signature': sig }, body: body.replace('{', '{ '),
  });
  assert.equal(res.status, 401);
});

test('happy path: stamped file is delivered, original is not, bundle is a valid zip', async () => {
  reset();
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-OK', document_codes: ['NDA', 'TOS'], document_code: undefined }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.delivered, true);
  assert.equal(r.json.documents.length, 2);
  assert.equal(mock.state.calls.length >= 2, true);

  for (const d of r.json.documents) {
    const dl = await fetch(d.download_url.startsWith('http') ? d.download_url : base + d.download_url);
    assert.equal(dl.status, 200);
    const text = await dl.text();
    assert.match(text, /MOCK-FP:/, 'served file must be the STAMPED one');
    assert.match(text, /LEGAL DISCLAIMER/);
    assert.doesNotMatch(text, /\{\{/);
    assert.match(text, /Party: Acme Corp/);
    assert.match(text, /Notice period: 30 days/, '{{VAR|default}} must resolve');
  }
  // original (unstamped) renders must not exist anywhere under delivered/ or work/
  assert.deepEqual(fs.readdirSync(path.join(cfg.storage.workDir)).includes('TXN-OK'), false);

  const b = await fetch(base + new URL(r.json.bundle.download_url, base).pathname);
  assert.equal(b.status, 200);
  const zipPath = path.join(env.dir, 'bundle.zip');
  fs.writeFileSync(zipPath, Buffer.from(await b.arrayBuffer()));
  const out = execFileSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print(",".join(sorted(z.namelist())))', zipPath]).toString().trim().split('\n');
  assert.equal(out[0], 'None');
  assert.match(out[1], /MANIFEST\.json/);

  const row = audit.getSuccess('TXN-OK');
  assert.equal(row.generation_status, 'SUCCESS');
  assert.equal(JSON.parse(row.acerbe_fingerprints).length, 2);
  assert.equal(audit.verifyChains().ok, true);
});

test('idempotent replay: same request re-issues links without re-stamping; different params -> 409', async () => {
  reset();
  const before = mock.state.calls.length;
  const again = await postWebhook(base, basePayload({ transaction_id: 'TXN-OK', document_codes: ['NDA', 'TOS'], document_code: undefined }));
  assert.equal(again.status, 200);
  assert.equal(again.json.replayed, true);
  assert.equal(mock.state.calls.length, before);
  const conflict = await postWebhook(base, basePayload({ transaction_id: 'TXN-OK', document_code: 'NDA', variables: { PARTY_NAME: 'Other' } }));
  assert.equal(conflict.status, 409);
});

test('concurrent identical webhooks stamp once', async () => {
  reset();
  const before = mock.state.calls.length;
  const p = basePayload({ transaction_id: 'TXN-RACE' });
  const [a, b] = await Promise.all([postWebhook(base, p), postWebhook(base, p)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(mock.state.calls.length - before, 1);
  assert.equal([a.json.replayed, b.json.replayed].sort().join(), 'false,true');
});

test('AcerbE down/erroring -> 502, NOTHING delivered, FAILED row; later retry succeeds as attempt 2', async () => {
  for (const mode of ['http500', 'badjson', 'refuse', 'identical', 'nofile']) {
    mock.state.mode = mode;
    const tx = `TXN-FAIL-${mode}`;
    const r = await postWebhook(base, basePayload({ transaction_id: tx }));
    assert.equal(r.status, 502, `${mode}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.delivered, false);
    assert.equal(r.json.code, 'ACERBE_FAILED');
    assert.equal(fs.existsSync(delivered(tx)), false, `${mode}: no delivered files may remain`);
    assert.equal(audit.getSuccess(tx), null);
    assert.equal(audit.getLatest(tx).generation_status, 'FAILED');
  }
  reset();
  const retry = await postWebhook(base, basePayload({ transaction_id: 'TXN-FAIL-http500' }));
  assert.equal(retry.status, 200);
  assert.equal(audit.getLatest('TXN-FAIL-http500').attempt, 2);
});

test('AcerbE unreachable (connection refused) is also fail-closed', async () => {
  const saved = cfg.acerbe.baseUrl;
  cfg.acerbe.baseUrl = 'http://127.0.0.1:1';
  try {
    const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-REFUSED' }));
    assert.equal(r.status, 502);
    assert.equal(fs.existsSync(delivered('TXN-REFUSED')), false);
  } finally { cfg.acerbe.baseUrl = saved; }
});

test('atomicity: failure on the 2nd document leaves no files and no SUCCESS row', async () => {
  reset();
  mock.state.failOnCall = mock.state.calls.length + 2;
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-ATOM', document_codes: ['NDA', 'TOS'], document_code: undefined }));
  assert.equal(r.status, 502);
  assert.equal(fs.existsSync(delivered('TXN-ATOM')), false);
  assert.equal(audit.getSuccess('TXN-ATOM'), null);
  assert.equal(fs.existsSync(path.join(cfg.storage.workDir, 'TXN-ATOM')), false);
});

test('empty stub template -> 422 TEMPLATE_NOT_POPULATED, AcerbE never called', async () => {
  reset();
  const before = mock.state.calls.length;
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-STUB', jurisdiction: 'US' }));
  assert.equal(r.status, 422);
  assert.equal(r.json.code, 'TEMPLATE_NOT_POPULATED');
  assert.equal(mock.state.calls.length, before);
});

test('sell-gate: unsellable language and restricted doc -> 422 TEMPLATE_NOT_SELLABLE, AcerbE never called', async () => {
  reset();
  const before = mock.state.calls.length;
  const a = await postWebhook(base, basePayload({ transaction_id: 'TXN-LANG', language: 'AR' }));
  assert.equal(a.status, 422);
  assert.equal(a.json.code, 'TEMPLATE_NOT_SELLABLE');
  const b = await postWebhook(base, basePayload({ transaction_id: 'TXN-RESTR', document_code: 'TOS', jurisdiction: 'EU' }));
  assert.equal(b.status, 422);
  assert.equal(b.json.code, 'TEMPLATE_NOT_SELLABLE');
  assert.equal(mock.state.calls.length, before);
});

test('missing locale falls back to EN and says so', async () => {
  reset();
  const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-FB', language: 'FR' }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.documents[0].language_fallback, true);
  assert.equal(r.json.documents[0].language_used, 'EN');
  assert.match(r.json.documents[0].filename, /_EN\.md$/);
});

test('unresolved placeholders: fill mode delivers visible blanks and reports them; strict mode rejects', async () => {
  reset();
  const noVars = basePayload({ transaction_id: 'TXN-FILL', variables: {} });
  const r = await postWebhook(base, noVars);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.documents[0].unresolved_fields, ['PARTY_NAME']);
  const text = await (await fetch(new URL(r.json.documents[0].download_url, base))).text();
  assert.match(text, /\[PARTY NAME: ________\]/);

  cfg.templates.placeholderMode = 'strict';
  try {
    const s = await postWebhook(base, basePayload({ transaction_id: 'TXN-STRICT', variables: {} }));
    assert.equal(s.status, 422);
    assert.equal(s.json.code, 'UNRESOLVED_PLACEHOLDERS');
    assert.deepEqual(s.json.details.unresolved, ['PARTY_NAME']);
  } finally { cfg.templates.placeholderMode = 'fill'; }
});

test('caller cannot spoof issuer / transaction identity via variables', async () => {
  reset();
  const r = await postWebhook(base, basePayload({
    transaction_id: 'TXN-SPOOF', jurisdiction: 'EU',
    variables: { PARTY_NAME: 'X', ISSUED_BY: 'Evil Corp', TRANSACTION_ID: 'TXN-OTHER', BUYER_WALLET: 'rEvil' },
  }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const text = await (await fetch(new URL(r.json.documents[0].download_url, base))).text();
  assert.match(text, /Issued by: Archer Chain Analytics/);
  assert.doesNotMatch(text, /Evil/);
  assert.match(text, /Transaction: TXN-SPOOF/);
  assert.match(text, /Injected: TXN-SPOOF/);
});

test('input validation: traversal ids, bad codes, bad variable keys, oversize', async () => {
  const bad = [
    { transaction_id: '../../etc/passwd' }, { transaction_id: 'a b' }, { transaction_id: '' },
    { document_code: 'XXX' }, { document_code: undefined, document_codes: [] }, { document_codes: ['NDA', 'NDA'], document_code: undefined },
    { jurisdiction: 'ZZ' }, { language: 'KLINGON' }, { buyer_wallet: 'bad\u0000wallet' },
    { variables: { 'lower': 'x' } }, { variables: { A: { nested: 1 } } }, { variables: { EFFECTIVE_DATE: 'tomorrow' } },
  ];
  for (const over of bad) {
    const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-VAL', ...over }));
    assert.equal(r.status, 400, JSON.stringify(over) + ' -> ' + JSON.stringify(r.json));
  }
  const big = await postWebhook(base, JSON.stringify({ pad: 'x'.repeat(300_000) }));
  assert.equal(big.status, 413);
});

test('download tokens: tampered -> 404, expired -> 410, traversal payload -> 404', async () => {
  const good = tokens.issueToken('TXN-OK/TXN-OK_NDA_CA_EN.md');
  assert.equal((await fetch(`${base}/download/${good}`)).status, 200);
  assert.equal((await fetch(`${base}/download/${good.slice(0, -2)}xx`)).status, 404);
  assert.equal((await fetch(`${base}/download/${tokens.issueToken('TXN-OK/TXN-OK_NDA_CA_EN.md', -10)}`)).status, 410);
  assert.equal((await fetch(`${base}/download/${tokens.issueToken('../../../etc/passwd')}`)).status, 404);
  assert.equal((await fetch(`${base}/download/..%2f..%2fetc%2fpasswd`)).status, 404);
  // the old unauthenticated filename route must be gone
  assert.equal((await fetch(`${base}/download/TXN-OK_NDA_CA_EN.md`)).status, 404);
});

test('audit log is append-only and hash-chained; tampering is detected', async () => {
  const db = new DatabaseSync(cfg.storage.dbPath);
  assert.throws(() => db.exec("UPDATE lexforge_generation_log SET buyer_ref='x'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM lexforge_generation_log'), /append-only/);
  assert.throws(() => db.exec("UPDATE lexforge_delivery_events SET detail='{}'"), /append-only/);
  assert.equal(audit.verifyChains().ok, true);
  // an attacker with file access drops the trigger and edits a row -> chain breaks
  db.exec('DROP TRIGGER lexforge_generation_log_no_update');
  db.exec("UPDATE lexforge_generation_log SET buyer_ref='rAttacker' WHERE id=1");
  db.close();
  const v = audit.verifyChains();
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt.table, 'lexforge_generation_log');
});

test('schema rejects an inconsistent SUCCESS row', () => {
  const db = new DatabaseSync(cfg.storage.dbPath);
  assert.throws(() => db.exec(`INSERT INTO lexforge_generation_log
    (transaction_id,attempt,request_fingerprint,buyer_ref,jurisdiction,language_requested,documents_generated,generation_status,
     validation_passed,disclaimer_verified,trigger_timestamp,generation_timestamp,prev_hash,row_hash)
    VALUES ('T',1,'f','b','CA','EN','[]','SUCCESS',1,1,'t','t','p','r')`), /CHECK/);
  db.close();
});

test('XRPL anchoring: success is recorded; failure stays pending and the sweep retries it', async () => {
  reset();
  const seen = [];
  let failedOnce = false;
  anchorSvc.setXRPLAnchor({
    anchorDelivery: async (d) => {
      seen.push(d);
      if (d.transactionId === 'TXN-XRPL' && !failedOnce) { failedOnce = true; return { success: false, error: 'ledger busy' }; }
      return { success: true, txHash: d.transactionId === 'TXN-XRPL' ? 'ABC123' : `BACKFILL-${d.transactionId}`, ledgerIndex: 42 };
    },
  });
  cfg.xrpl.enabled = true; cfg.xrpl.seed = 'sTESTSEEDNOTREAL'; cfg.xrpl.mode = 'sync';
  try {
    const r = await postWebhook(base, basePayload({ transaction_id: 'TXN-XRPL' }));
    assert.equal(r.status, 200);
    assert.equal(r.json.xrpl_anchor, 'PENDING');
    assert.equal(r.json.xrpl_tx_hash, null);
    assert.equal(audit.getEvents('TXN-XRPL', 'XRPL_FAILED').length, 1);
    // buyer wallet must not be written to a public ledger in clear
    assert.match(seen[0].buyerRefHash, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(seen[0]).includes('rTestBuyerWallet'), false);

    // the sweep also back-fills earlier deliveries made while anchoring was disabled
    await anchorSvc.sweepAnchors();
    const retried = await anchorSvc.anchorTransaction('TXN-XRPL'); // backoff window is skipped by the direct call
    assert.equal(retried.status, 'ANCHORED');
    assert.equal(audit.getEvents('TXN-XRPL', 'XRPL_ANCHORED').length, 1);

    const sigHdr = sign('GET /status/TXN-XRPL');
    const st = await (await fetch(`${base}/status/TXN-XRPL`, { headers: { 'x-rapax-signature': sigHdr } })).json();
    assert.equal(st.xrpl_anchor, 'ANCHORED');
    assert.equal(st.xrpl_tx_hash, 'ABC123');
    assert.equal((await fetch(`${base}/status/TXN-XRPL`)).status, 401);
  } finally {
    cfg.xrpl.enabled = false; cfg.xrpl.seed = ''; cfg.xrpl.mode = 'async';
    anchorSvc.setXRPLAnchor(undefined);
  }
});

test('/ready reflects AcerbE health and template census; /health is public', async () => {
  reset();
  const ok = await fetch(`${base}/ready`);
  const body = await ok.json();
  assert.equal(ok.status, 200, JSON.stringify(body));
  assert.equal(body.checks.acerbe, true);
  assert.ok(body.checks.templates_populated >= 3);
  const saved = cfg.acerbe.baseUrl;
  cfg.acerbe.baseUrl = 'http://127.0.0.1:1';
  try {
    const down = await fetch(`${base}/ready`);
    assert.equal(down.status, 503);
  } finally { cfg.acerbe.baseUrl = saved; }
  assert.equal((await fetch(`${base}/health`)).status, 200);
});
