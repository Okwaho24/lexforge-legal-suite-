/**
 * LexForge™ Delivery Service
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Pipeline (spec §3.1, adapted to the document-per-code template model):
 *   3  validate request
 *   5-6 render every requested document (all-or-nothing)
 *   7  validate every render (non-empty, disclaimer present, no raw placeholders)
 *   8  AcerbE™ fingerprint every document — MANDATORY HARD GATE, fail-closed
 *   9  append SUCCESS row to the audit log   (delivery is blocked if this write fails)
 *   10 issue signed, expiring download tokens (only the STAMPED files are ever served)
 *   12 XRPL anchor — after commit, queued + retried (see xrplAnchorService)
 *
 * Any failure before step 9 removes every file produced in this attempt and appends a
 * FAILED row. No partial delivery.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config, DOCUMENTS, JURISDICTION_NAMES, LANGUAGE_NAMES } from '../config/index.js';
import { renderTemplate, TemplateError, DISCLAIMER_SENTINEL } from '../engine/templateEngine.js';
import { log, EventType } from '../utils/logger.js';
import * as audit from '../db/audit.js';
import { stampFile, AcerbeError, sha256File } from './acerbeClient.js';
import { issueToken } from './downloadTokens.js';
import { buildZip } from './zip.js';
import { anchorTransaction } from './xrplAnchorService.js';

export class PipelineError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ step?: number, http?: number, details?: object }} [opts]
   */
  constructor(code, message, { step = 0, http = 500, details } = {}) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
    this.step = step;
    this.http = http;
    this.details = details;
  }
}

// TRANSACTION_ID, BUYER_WALLET, DOCUMENT_TITLE, JURISDICTION, LANGUAGE and ISSUED_BY are applied
// AFTER caller variables, so a caller can never spoof issuer or transaction identity.

const locks = new Map(); // transactionId -> Promise (serialises concurrent requests per transaction)

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * @param {object} req
 * @param {string}   req.transactionId
 * @param {string[]} req.documentCodes   e.g. ["NDA","TOS"]
 * @param {string}   req.jurisdiction
 * @param {string}   req.language
 * @param {string}   req.buyerWallet
 * @param {object}   [req.variables]
 * @returns {Promise<DeliveryResult>}
 */
export async function deliver(req) {
  const txid = req.transactionId;
  const next = (locks.get(txid) ?? Promise.resolve()).catch(() => {}).then(() => run(req));
  locks.set(txid, next);
  try {
    return await next;
  } finally {
    if (locks.get(txid) === next) locks.delete(txid);
  }
}

export function requestFingerprint(req) {
  const canon = JSON.stringify({
    d: [...req.documentCodes].sort(),
    j: req.jurisdiction,
    l: req.language,
    b: req.buyerWallet,
    v: Object.keys(req.variables ?? {}).sort().map((k) => [k, String(req.variables[k])]),
  });
  return crypto.createHash('sha256').update(canon).digest('hex');
}

// ── Core ───────────────────────────────────────────────────────────────────

async function run(req) {
  const triggerTs = new Date().toISOString();
  const t0 = Date.now();
  const fp = requestFingerprint(req);
  const txid = req.transactionId;

  // Idempotency: same transaction + same request -> re-issue links, never re-stamp.
  const done = audit.getSuccess(txid);
  if (done) {
    if (done.request_fingerprint !== fp) {
      throw new PipelineError('TRANSACTION_CONFLICT',
        'This transaction_id was already delivered with different parameters', { step: 3, http: 409 });
    }
    return replay(done);
  }

  const workDir = path.join(config.storage.workDir, txid);
  const outDir  = path.join(config.storage.deliveredDir, txid);
  let step = 3;
  const renders = [];
  const docRecords = [];
  let committed = false;

  try {
    // ── 5/6. Render everything first (all-or-nothing) ────────────────────
    step = 5;
    const vars = {
      EFFECTIVE_DATE: new Date().toISOString().slice(0, 10),
      ...req.variables,
      TRANSACTION_ID: txid,
      BUYER_WALLET:   req.buyerWallet,
      JURISDICTION:   JURISDICTION_NAMES[req.jurisdiction] ?? req.jurisdiction,
      LANGUAGE:       LANGUAGE_NAMES[req.language] ?? req.language,
      ISSUED_BY:      config.issuer.issuedBy,
    };
    for (const code of req.documentCodes) {
      const r = renderTemplate({
        documentCode: code,
        jurisdiction: req.jurisdiction,
        language: req.language,
        transactionId: txid,
        variables: { ...vars, DOCUMENT_TITLE: DOCUMENTS[code] ?? code },
      });
      renders.push({ code, ...r });
    }

    // ── 7. Validation ────────────────────────────────────────────────────
    step = 7;
    for (const r of renders) validateRender(r);

    // ── 8. AcerbE™ hard gate ─────────────────────────────────────────────
    step = 8;
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

    for (const r of renders) {
      const base = `${txid}_${r.code}_${req.jurisdiction}_${r.languageUsed}.md`;
      const rawPath = path.join(workDir, base);
      fs.writeFileSync(rawPath, r.markdown, { encoding: 'utf8', mode: 0o600 });
      const preHash = 'sha256:' + sha256File(rawPath);

      const stamp = await stampFile({
        filePath: rawPath,
        productId: 'ARC-LXF-001',
        productName: `LexForge™ ${r.code}`,
        buyerWallet: req.buyerWallet,
        transactionId: txid,
      });

      const finalPath = path.join(outDir, base);
      fs.copyFileSync(stamp.stampedPath, finalPath);
      fs.chmodSync(finalPath, 0o600);
      // The stamped copy now lives in outDir; drop AcerbE's output copy and its sidecar manifest.
      for (const f of [stamp.stampedPath, `${stamp.stampedPath}.manifest.json`]) {
        try { fs.unlinkSync(f); } catch { /* already gone */ }
      }
      fs.unlinkSync(rawPath);

      docRecords.push({
        code: r.code,
        file: `${txid}/${base}`,
        name: base,
        template: path.relative(config.templates.dir, r.templatePath),
        language_used: r.languageUsed,
        language_fallback: r.languageFallback,
        unresolved: r.unresolved,
        pre_stamp_hash: preHash,
        stamped_hash: 'sha256:' + stamp.stampedHash,
        fingerprint_id: stamp.fingerprintId,
      });
      log({ eventType: EventType.FINGERPRINT, documentCode: r.code, transactionId: txid,
        payload: { action: 'FINGERPRINT_COMPLETE', fingerprintId: stamp.fingerprintId } });
    }
    fs.rmSync(workDir, { recursive: true, force: true });

    // ── bundle (a convenience container; the files inside are the stamped ones) ──
    const manifest = {
      product: 'ARC-LXF-001',
      transaction_id: txid,
      issued_at: triggerTs,
      jurisdiction: req.jurisdiction,
      documents: docRecords.map((d) => ({
        code: d.code, file: d.name, sha256: d.stamped_hash, fingerprint_id: d.fingerprint_id,
        language: d.language_used, unresolved_fields: d.unresolved,
      })),
    };
    const bundleBuf = buildZip([
      ...docRecords.map((d) => ({ name: d.name, data: fs.readFileSync(path.join(outDir, d.name)) })),
      { name: 'MANIFEST.json', data: JSON.stringify(manifest, null, 2) },
    ], new Date(triggerTs));
    const bundleName = `${txid}_LexForge_bundle.zip`;
    fs.writeFileSync(path.join(outDir, bundleName), bundleBuf, { mode: 0o600 });
    const bundleHash = 'sha256:' + crypto.createHash('sha256').update(bundleBuf).digest('hex');

    // ── 10. Tokens are computed in memory; nothing is released until the audit row exists ──
    step = 10;
    const result = buildResult(txid, docRecords, bundleName, bundleHash, false);

    // ── 9. Audit write BEFORE the links leave this function ──────────────
    step = 9;
    audit.appendGeneration({
      transaction_id: txid,
      request_fingerprint: fp,
      buyer_ref: req.buyerWallet,
      jurisdiction: req.jurisdiction,
      language_requested: req.language,
      documents_generated: JSON.stringify(docRecords),
      bundle_hash: bundleHash,
      acerbe_fingerprints: JSON.stringify(docRecords.map((d) => d.fingerprint_id)),
      generation_status: 'SUCCESS',
      validation_passed: 1,
      disclaimer_verified: 1,
      trigger_timestamp: triggerTs,
      generation_timestamp: new Date().toISOString(),
      error_log: null,
    });
    committed = true;

    // ── post-commit: nothing below may un-deliver ────────────────────────
    try {
      audit.appendEvent(txid, 'TOKEN_ISSUED', { files: docRecords.map((d) => d.name).concat(bundleName), ttl: config.download.ttlSeconds });
    } catch (e) {
      log({ eventType: EventType.ERROR, transactionId: txid, payload: { action: 'TOKEN_EVENT_WRITE_FAILED', error: e.message } });
    }
    log({ eventType: EventType.DELIVER, transactionId: txid, jurisdiction: req.jurisdiction, language: req.language,
      actor: req.buyerWallet,
      payload: { action: 'DELIVERY_COMPLETE', documents: docRecords.map((d) => d.code), bundleHash, ms: Date.now() - t0 } });

    // ── 12. XRPL ─────────────────────────────────────────────────────────
    const anchorEnabled = config.xrpl.enabled && Boolean(config.xrpl.seed);
    result.xrpl_anchor = anchorEnabled ? 'PENDING' : 'DISABLED';
    if (anchorEnabled && config.xrpl.mode === 'sync') {
      try {
        const a = await anchorTransaction(txid);
        if (a.status === 'ANCHORED') { result.xrpl_tx_hash = a.txHash; result.xrpl_anchor = 'ANCHORED'; }
      } catch (e) {
        log({ eventType: EventType.ERROR, transactionId: txid, payload: { action: 'ANCHOR_ERROR', error: e.message } });
      }
    } else if (anchorEnabled) {
      anchorTransaction(txid).catch((e) => log({ eventType: EventType.ERROR, transactionId: txid,
        payload: { action: 'ANCHOR_ERROR', error: e.message } }));
    }
    return result;

  } catch (err) {
    if (committed) throw err; // cannot happen: post-commit code is guarded; never delete committed files
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
    const pe = toPipelineError(err, step);
    recordFailure({ req, fp, triggerTs, pe, step });
    throw pe;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function validateRender(r) {
  const fail = (m) => { throw new PipelineError('VALIDATION_FAILED', `${r.code}: ${m}`, { step: 7, http: 422 }); };
  if (!r.markdown || r.markdown.trim().length < config.templates.minTemplateBytes) fail('rendered document is empty');
  if (!r.markdown.includes(DISCLAIMER_SENTINEL)) fail('mandatory disclaimer block missing');
  if (/\{\{[A-Z0-9_]+(\|[^}]*)?\}\}/.test(r.markdown)) fail('unresolved {{placeholder}} left in output');
}

function toPipelineError(err, step) {
  if (err instanceof PipelineError) return err;
  if (err instanceof TemplateError) {
    const http = err.code === 'INVALID_PARAMS' ? 400 : 422;
    return new PipelineError(err.code, err.message, { step: 5, http, details: err.unresolved ? { unresolved: err.unresolved } : undefined });
  }
  if (err instanceof AcerbeError) {
    return new PipelineError('ACERBE_FAILED', `AcerbE™ fingerprinting FAILED — delivery blocked: ${err.message}`, { step: 8, http: 502 });
  }
  return new PipelineError('INTERNAL', err.message, { step, http: 500 });
}

function recordFailure({ req, fp, triggerTs, pe, step }) {
  try {
    audit.appendError(req.transactionId, pe.step || step, pe.code, pe.message);
    audit.appendGeneration({
      transaction_id: req.transactionId,
      request_fingerprint: fp,
      buyer_ref: req.buyerWallet,
      jurisdiction: req.jurisdiction,
      language_requested: req.language,
      documents_generated: JSON.stringify(req.documentCodes),
      bundle_hash: null,
      acerbe_fingerprints: null,
      generation_status: 'FAILED',
      validation_passed: 0,
      disclaimer_verified: 0,
      trigger_timestamp: triggerTs,
      generation_timestamp: new Date().toISOString(),
      error_log: JSON.stringify({ code: pe.code, step: pe.step, message: pe.message }),
    });
  } catch (e) {
    log({ eventType: EventType.ERROR, transactionId: req.transactionId, payload: { action: 'AUDIT_FAILURE_WRITE_FAILED', error: e.message } });
  }
  log({ eventType: EventType.ERROR, transactionId: req.transactionId, jurisdiction: req.jurisdiction, language: req.language,
    payload: { action: 'DELIVERY_FAILED', code: pe.code, step: pe.step, error: pe.message } });
}

function url(token) {
  return `${config.download.baseUrl}/download/${token}`;
}

function buildResult(txid, docRecords, bundleName, bundleHash, replayed) {
  const docs = docRecords.map((d) => ({
    document_code: d.code,
    filename: d.name,
    sha256: d.stamped_hash,
    fingerprint_id: d.fingerprint_id,
    language_used: d.language_used,
    language_fallback: d.language_fallback,
    unresolved_fields: d.unresolved,
    download_url: url(issueToken(d.file)),
  }));
  const bundle = { filename: bundleName, sha256: bundleHash, download_url: url(issueToken(`${txid}/${bundleName}`)) };
  return {
    delivered: true,
    replayed,
    transaction_id: txid,
    fingerprint_id: docs[0].fingerprint_id,
    download_url: docs.length === 1 ? docs[0].download_url : bundle.download_url,
    documents: docs,
    bundle,
    expires_in: config.download.ttlSeconds,
    xrpl_tx_hash: null,
    xrpl_anchor: 'PENDING',
  };
}

function replay(row) {
  const docRecords = JSON.parse(row.documents_generated);
  const bundleName = `${row.transaction_id}_LexForge_bundle.zip`;
  for (const f of [...docRecords.map((d) => d.file), `${row.transaction_id}/${bundleName}`]) {
    if (!fs.existsSync(path.join(config.storage.deliveredDir, f))) {
      throw new PipelineError('DELIVERED_FILES_MISSING',
        'Delivery is recorded but its files are no longer on disk (storage volume lost?)', { step: 10, http: 500 });
    }
  }
  const result = buildResult(row.transaction_id, docRecords, bundleName, row.bundle_hash, true);
  const anchored = audit.getEvents(row.transaction_id, 'XRPL_ANCHORED')[0];
  if (anchored) {
    result.xrpl_tx_hash = JSON.parse(anchored.detail).txHash;
    result.xrpl_anchor = 'ANCHORED';
  } else {
    result.xrpl_anchor = config.xrpl.enabled && config.xrpl.seed ? 'PENDING' : 'DISABLED';
  }
  audit.appendEvent(row.transaction_id, 'TOKEN_ISSUED', { replay: true, ttl: config.download.ttlSeconds });
  return result;
}

/**
 * @typedef {object} DeliveryResult
 * @property {boolean} delivered
 * @property {boolean} replayed
 * @property {string}  transaction_id
 * @property {string}  fingerprint_id
 * @property {string}  download_url
 * @property {object[]} documents
 * @property {{filename:string, sha256:string, download_url:string}} bundle
 * @property {number}  expires_in
 * @property {string|null} xrpl_tx_hash
 * @property {'ANCHORED'|'PENDING'|'DISABLED'} xrpl_anchor
 */
