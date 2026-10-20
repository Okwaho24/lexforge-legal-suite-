// Run: node --test test/bundle.test.mjs
// Uses a throwaway template library with clearly-labelled TEST FIXTURE content. It does not touch ./templates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createHash } from 'node:crypto';

const root = mkdtempSync(join(tmpdir(), 'lexforge-fixture-'));
const SECRET = 'w'.repeat(40);
process.env.LEXFORGE_TEMPLATES_ROOT = root;
process.env.RAPAX_WEBHOOK_SECRET = SECRET;
process.env.LEXFORGE_VAR_OPERATOR_LEGAL_NAME = 'Test Operator Legal Name';
writeFileSync(join(root, 'product-docs.json'), JSON.stringify({ default: ['EUA', 'TOS', 'PP', 'WA'], products: {} }));
process.env.LEXFORGE_PRODUCT_DOCS = join(root, 'product-docs.json');

const { buildBundle } = await import('../src/bundle/bundleService.js');
const { BundleError } = await import('../src/bundle/langmap.js');
const { createApp } = await import('../src/index.js');
const { DOCUMENT_FOLDERS } = await import('../src/config/index.js');

const sha = b => createHash('sha256').update(b).digest('hex');
const filler = 'This clause text is long enough to count as a real template and is a TEST FIXTURE. '.repeat(4);
function tpl(code, jur, lang, text) {
  return `<!--\n  TEST FIXTURE\n  Document: ${code}\n  Jurisdiction: ${jur} | Language: ${lang}\n-->\n\n# ${code}\n**LexForge™ Document ID:** X | **Jurisdiction:** ${jur} | **Language:** ${lang}\n\n${text}\n${filler}\nProduct {{PRODUCT_NAME}} by {{OPERATOR_LEGAL_NAME}} on {{EFFECTIVE_DATE}} ref {{TRANSACTION_ID}} v{{VERSION|1.0}}.\n`;
}
const TEXT = { EN: 'English governing text.', FR: 'Texte juridique en français pour la loi applicable.', DE: 'Deutscher Rechtstext für das anwendbare Recht.' };
function write(code, jur, lang, text = TEXT[lang] ?? 'x', mutate = s => s) {
  const rel = `${DOCUMENT_FOLDERS[code]}/${jur}/${lang}.md`;
  mkdirSync(join(root, DOCUMENT_FOLDERS[code], jur), { recursive: true });
  writeFileSync(join(root, rel), mutate(tpl(code, jur, lang, `${text} (${jur}/${lang})`)));
  return rel;
}
let pins = {};
function verifyAll() {
  pins = {};
  for (const jur of ['US', 'CA', 'EU']) for (const lang of ['EN', 'FR', 'DE']) for (const code of ['EUA', 'TOS', 'PP', 'WA']) {
    try { const rel = `${DOCUMENT_FOLDERS[code]}/${jur}/${lang}.md`; pins[rel] = { sha256: sha(readFileSync(join(root, rel))) }; } catch { /* absent */ }
  }
  writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify({ verified: pins }));
}
function resetFixture() {
  for (const jur of ['US']) for (const code of ['EUA', 'TOS', 'PP', 'WA']) write(code, jur, 'EN');
  for (const code of ['EUA', 'TOS', 'PP', 'WA']) { write(code, 'CA', 'EN'); write(code, 'CA', 'FR'); write(code, 'EU', 'EN'); write(code, 'EU', 'DE'); }
  writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify({ verified: {} }));
}
const base = { transaction_id: 'tx-1', product_id: 'p1', product_name: 'Test Product', buyer_ref: 'rBuyer', jurisdiction: 'US' };
const code = fn => { try { fn(); } catch (e) { assert.ok(e instanceof BundleError, e.stack); return e.code; } return null; };

test('nothing ships until templates carry a human review pin', () => {
  resetFixture();
  assert.equal(code(() => buildBundle(base)), 'content_not_verified');
});

test('verified US bundle: 4 documents, variables merged, operator facts from env, disclaimer present', () => {
  resetFixture(); verifyAll();
  const out = buildBundle(base);
  assert.deepEqual(out.documents.map(d => d.path).sort(), ['legal/EN/EUA.md', 'legal/EN/PP.md', 'legal/EN/TOS.md', 'legal/EN/WA.md']);
  const d = out.documents[0].content;
  assert.match(d, /Product Test Product by Test Operator Legal Name/);
  assert.match(d, /ref tx-1 v1\.0/);
  assert.doesNotMatch(d, /\{\{/);
  assert.match(d, /LEGAL DISCLAIMER/);
  assert.deepEqual(out.languages_shipped, ['EN']);
});

test('caller cannot override operator legal identity through variables', () => {
  resetFixture(); verifyAll();
  const out = buildBundle({ ...base, variables: { OPERATOR_LEGAL_NAME: 'Evil Corp' } });
  assert.match(out.documents[0].content, /Test Operator Legal Name/);
  assert.doesNotMatch(out.documents[0].content, /Evil/);
});

test('missing operator variable fails closed and names the variable', () => {
  resetFixture(); verifyAll();
  const e = (() => { try { buildBundle(base, { env: {} }); } catch (x) { return x; } })();
  assert.equal(e.code, 'unresolved_variables');
  assert.match(JSON.stringify(e.details), /OPERATOR_LEGAL_NAME/);
});

test('literal "undefined" in a template blocks release even when reviewed', () => {
  resetFixture();
  write('EUA', 'US', 'EN', 'may violate undefined and undefined');
  verifyAll();
  assert.equal(code(() => buildBundle(base)), 'content_not_verified');
});

test('editing a template after review voids the review', () => {
  resetFixture(); verifyAll();
  writeFileSync(join(root, DOCUMENT_FOLDERS.TOS, 'US', 'EN.md'), tpl('TOS', 'US', 'EN', 'changed after review'));
  assert.equal(code(() => buildBundle(base)), 'content_not_verified');
});

test('Quebec: French is mandatory — unreviewed French blocks the sale, reviewed French ships with English', () => {
  resetFixture();
  for (const c of ['EUA', 'TOS', 'PP', 'WA']) writeFileSync(join(root, 'VERIFIED.json'), '{"verified":{}}');
  verifyAll();
  // verify only EN for CA
  const pinsEn = Object.fromEntries(Object.entries(pins).filter(([k]) => k.includes('/CA/EN.md')));
  writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify({ verified: pinsEn }));
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'CA', region: 'CA-QC' })), 'content_not_verified');
  verifyAll();
  const out = buildBundle({ ...base, jurisdiction: 'CA', region: 'CA-QC' });
  assert.deepEqual(out.languages_shipped.sort(), ['EN', 'FR']);
  assert.equal(out.documents.length, 8);
});

test('Canada outside Quebec: French is also mandatory (owner decision) — unreviewed French blocks the sale', () => {
  resetFixture(); verifyAll();
  const pinsEn = Object.fromEntries(Object.entries(pins).filter(([k]) => !k.includes('/FR.md')));
  writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify({ verified: pinsEn }));
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'CA' })), 'content_not_verified');
  verifyAll();
  const out = buildBundle({ ...base, jurisdiction: 'CA' });
  assert.deepEqual(out.languages_shipped.sort(), ['EN', 'FR']);
});

test('a language ships complete or not at all: one unreviewed French document blocks the Canadian sale', () => {
  resetFixture(); verifyAll();
  delete pins[`${DOCUMENT_FOLDERS.TOS}/CA/FR.md`];
  writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify({ verified: pins }));
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'CA' })), 'content_not_verified');
});

test('untranslated template (same body as English) is rejected as a defect', () => {
  resetFixture();
  for (const c of ['EUA', 'TOS', 'PP', 'WA']) writeFileSync(join(root, DOCUMENT_FOLDERS[c], 'CA', 'FR.md'), readFileSync(join(root, DOCUMENT_FOLDERS[c], 'CA', 'EN.md'), 'utf8').replace('Language: EN', 'Language: FR'));
  verifyAll();
  try { buildBundle({ ...base, jurisdiction: 'CA' }); assert.fail('should refuse'); }
  catch (e) { assert.equal(e.code, 'content_not_verified'); assert.match(JSON.stringify(e.details), /identical to the English/); }
});

test('language_pref: German buyer in the EU gets EN+DE; unsupported choice is disclosed, English ships', () => {
  resetFixture(); verifyAll();
  const de = buildBundle({ ...base, jurisdiction: 'DE', language_pref: 'de' });
  assert.deepEqual(de.languages_shipped.sort(), ['DE', 'EN']);
  const zh = buildBundle({ ...base, jurisdiction: 'US', language_pref: 'zh' });
  assert.deepEqual(zh.languages_shipped, ['EN']);
  assert.ok(zh.languages_unavailable.ZH);
});

test('jurisdiction with no template set is refused (and can be detected before payment)', () => {
  resetFixture(); verifyAll();
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'JP' })), 'jurisdiction_unsupported');
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'us' })), 'invalid_request');
  assert.equal(code(() => buildBundle({ ...base, jurisdiction: 'CA', region: 'US-NY' })), 'invalid_request');
});

// ---------------- HTTP ----------------
const server = createApp().listen(0);
test.after(() => server.close());
const url = p => `http://127.0.0.1:${server.address().port}${p}`;
const sign = body => 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
async function call(path, obj, { signature, raw } = {}) {
  const body = raw ?? JSON.stringify(obj);
  return fetch(url(path), { method: 'POST', headers: { 'content-type': 'application/json', 'x-rapax-signature': signature ?? sign(body) }, body });
}

test('HTTP: bundle requires a valid signature', async () => {
  resetFixture(); verifyAll();
  assert.equal((await call('/webhook/lexforge/bundle', base, { signature: 'sha256=00' })).status, 401);
  assert.equal((await fetch(url('/webhook/lexforge/bundle'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
  const ok = await call('/webhook/lexforge/bundle', base);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).documents.length, 4);
});

test('HTTP: refusals are 422 with a machine-readable code; bad input is 400; malformed JSON is 400', async () => {
  resetFixture(); verifyAll();
  const jp = await call('/webhook/lexforge/bundle', { ...base, jurisdiction: 'JP' });
  assert.equal(jp.status, 422);
  assert.equal((await jp.json()).code, 'jurisdiction_unsupported');
  assert.equal((await call('/webhook/lexforge/bundle', { transaction_id: 'x' })).status, 400);
  assert.equal((await call('/webhook/lexforge/bundle', null, { raw: '{nope' })).status, 400);
});

test('HTTP: availability is a dry run that answers before payment', async () => {
  resetFixture(); verifyAll();
  const yes = await (await call('/webhook/lexforge/availability', { product_id: 'p1', jurisdiction: 'US' })).json();
  assert.equal(yes.available, true);
  const no = await (await call('/webhook/lexforge/availability', { product_id: 'p1', jurisdiction: 'JP' })).json();
  assert.equal(no.available, false); assert.equal(no.code, 'jurisdiction_unsupported');
  writeFileSync(join(root, 'VERIFIED.json'), '{"verified":{}}');
  const blocked = await (await call('/webhook/lexforge/availability', { product_id: 'p1', jurisdiction: 'US' })).json();
  assert.equal(blocked.available, false); assert.equal(blocked.code, 'content_not_verified');
});

test('HTTP regression: the legacy webhook no longer dies with "stream is not readable"', async () => {
  const r = await call('/webhook/lexforge', { transaction_id: 't', document_code: 'EUA', jurisdiction: 'US', language: 'EN', variables: {} });
  const t = await r.text();
  assert.doesNotMatch(t, /stream is not readable/);
});

test('bundle module imports no network or AI libraries', () => {
  for (const f of ['bundleService.js', 'langmap.js', 'legalGate.js']) {
    const src = readFileSync(new URL(`../src/bundle/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from ['"](axios|node-fetch|undici|http|https|net|openai|@anthropic-ai\/sdk)['"]|\bfetch\(/);
  }
});
