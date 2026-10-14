/**
 * Shared test helpers. Environment must be configured BEFORE src/config is imported,
 * so each test file calls setupEnv() first and then dynamically imports the app.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

export const SECRETS = {
  webhook: 'test-webhook-secret-0123456789abcdef',
  download: 'test-download-signing-secret-0123456789abcdef',
  acerbe: 'test-acerbe-api-key-0123456789',
};

const BODY = 'x'.repeat(0);

function longText(title, extra = '') {
  const clause = (n) => `${n}. The Parties agree that this clause is a synthetic test paragraph long enough to exceed the minimum template size and to behave like real contract text.`;
  return `# ${title}

Transaction: {{TRANSACTION_ID}}
Effective: {{EFFECTIVE_DATE}}
Issued by: {{ISSUED_BY}}
Buyer: {{BUYER_WALLET}}
Jurisdiction: {{JURISDICTION}} / Language: {{LANGUAGE}}
Party: {{PARTY_NAME}}
Notice period: {{NOTICE_DAYS|30}} days
${extra}
${[1, 2, 3, 4, 5, 6].map(clause).join('\n')}
${BODY}`;
}

/** Create a temp templates tree: populated CA/EN for NDA+TOS, a stub NDA/CA/FR and a stub NDA/US/EN. */
export function makeTemplates(root) {
  const put = (code, jur, lang, text) => {
    const d = path.join(root, code, jur);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${lang}.md`), text);
  };
  put('03-NDA', 'CA', 'EN', longText('NON-DISCLOSURE AGREEMENT'));
  put('06-TOS', 'CA', 'EN', longText('TERMS OF SERVICE'));
  put('03-NDA', 'CA', 'FR', '');          // stub -> EN fallback
  put('03-NDA', 'US', 'EN', '');          // stub, no fallback possible
  put('03-NDA', 'EU', 'EN', longText('NDA (EU)', 'Injected: {{TRANSACTION_ID}}'));
}

export function setupEnv({ acerbeUrl, extra = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexforge-test-'));
  const templates = path.join(dir, 'templates');
  makeTemplates(templates);
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATA_DIR: path.join(dir, 'data'),
    LOGS_DIR: path.join(dir, 'logs'),
    TEMPLATES_DIR: templates,
    RAPAX_WEBHOOK_SECRET: SECRETS.webhook,
    DOWNLOAD_SIGNING_SECRET: SECRETS.download,
    ACERBE_API_KEY: SECRETS.acerbe,
    ACERBE_BASE_URL: acerbeUrl ?? 'http://127.0.0.1:1',
    ACERBE_RETRIES: '0',
    ACERBE_TIMEOUT_MS: '3000',
    XRPL_ENABLED: 'false',
    XRPL_SEED: '',
    MIN_TEMPLATE_BYTES: '400',
    // Fixture tests exercise the fallback path; production defaults are covered by the sell-gate tests.
    ALLOW_EN_FALLBACK: 'true',
    SELLABLE_LANGUAGES: 'EN,FR',
    RESTRICTED_DOCUMENTS: 'TOS:CA',
    ...extra,
  });
  return { dir, templates };
}

export function sign(raw, secret = SECRETS.webhook) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

export async function postWebhook(base, payload, { secret = SECRETS.webhook, headers = {} } = {}) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const res = await fetch(`${base}/webhook/lexforge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rapax-signature': sign(raw, secret), ...headers },
    body: raw,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

export function basePayload(over = {}) {
  return {
    transaction_id: 'TXN-TEST-0001',
    buyer_wallet: 'rTestBuyerWallet000000000000000',
    jurisdiction: 'CA',
    language: 'EN',
    document_code: 'NDA',
    variables: { PARTY_NAME: 'Acme Corp' },
    ...over,
  };
}

export function listen(app) {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ server: s, base: `http://127.0.0.1:${s.address().port}` }));
  });
}

/**
 * Mock AcerbE™ following the real server contract. Stamping = appending a marker line, so the
 * output always differs from the input. mode: 'ok' | 'identical' | 'refuse' | 'http500' | 'badjson' | 'nofile'
 */
export function mockAcerbe() {
  const state = { mode: 'ok', calls: [], failOnCall: null, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mock-acerbe-')) };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.headers['x-acerbe-key'] !== SECRETS.acerbe) return send(401, { error: 'Unauthorized' });
      if (req.url === '/health') return send(200, { status: 'ok', keys_configured: true, engine_version: 'mock' });
      if (req.url !== '/fingerprint') return send(404, { error: 'nope' });
      const b = JSON.parse(body);
      state.calls.push(b);
      const n = state.calls.length;
      const mode = state.failOnCall === n ? 'http500' : state.mode;
      if (mode === 'http500') return send(500, { success: false, reason: 'boom' });
      if (mode === 'badjson') { res.writeHead(200); return res.end('not json'); }
      if (mode === 'refuse') return send(422, { success: false, reason: 'Unsupported file type' });
      const out = path.join(state.outDir, `${path.basename(b.file_path)}.${n}.stamped`);
      const src = fs.readFileSync(b.file_path, 'utf8');
      fs.writeFileSync(out, mode === 'identical' ? src : `${src}\n<!-- MOCK-FP:${n}:${b.buyer_wallet}:${b.transaction_id} -->\n`);
      if (mode === 'nofile') fs.unlinkSync(out);
      return send(200, { success: true, fingerprinted_file_path: out, fingerprint_id: `fp-mock-${n}`, hash: 'x' });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` });
  }));
}
