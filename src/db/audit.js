/**
 * LexForge™ Audit Store — append-only SQLite with SHA-256 hash chain
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Uses the built-in node:sqlite module (Node >= 22.13) — no native build step,
 * which matters on Termux/ARM64.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GENESIS = '0'.repeat(64);

let db = null;
let dbPath = null;

export function openAudit(file) {
  if (db && dbPath === file) return db;
  if (db) closeAudit();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  dbPath = file;
  return db;
}

export function closeAudit() {
  if (db) db.close();
  db = null;
  dbPath = null;
}

function handle() {
  if (!db) throw new Error('Audit store not opened');
  return db;
}

function canonical(obj) {
  return JSON.stringify(Object.keys(obj).sort().reduce((a, k) => { a[k] = obj[k]; return a; }, {}));
}

function chainHash(prev, obj) {
  return crypto.createHash('sha256').update(prev).update(canonical(obj)).digest('hex');
}

/** Run fn inside BEGIN IMMEDIATE so the chain head cannot move under us. */
function tx(fn) {
  const d = handle();
  d.exec('BEGIN IMMEDIATE');
  try {
    const out = fn(d);
    d.exec('COMMIT');
    return out;
  } catch (err) {
    try { d.exec('ROLLBACK'); } catch { /* already rolled back */ }
    throw err;
  }
}

// ── Generation log ─────────────────────────────────────────────────────────

const GEN_FIELDS = [
  'transaction_id', 'attempt', 'request_fingerprint', 'buyer_ref', 'jurisdiction',
  'language_requested', 'documents_generated', 'bundle_hash', 'acerbe_fingerprints',
  'generation_status', 'validation_passed', 'disclaimer_verified',
  'trigger_timestamp', 'generation_timestamp', 'error_log',
];

export function appendGeneration(rec) {
  return tx((d) => {
    const last = d.prepare('SELECT row_hash FROM lexforge_generation_log ORDER BY id DESC LIMIT 1').get();
    const prev = last ? last.row_hash : GENESIS;
    const attempt = (d.prepare('SELECT COALESCE(MAX(attempt),0) AS a FROM lexforge_generation_log WHERE transaction_id = ?')
      .get(rec.transaction_id).a) + 1;
    const row = { ...rec, attempt };
    for (const f of GEN_FIELDS) if (row[f] === undefined) row[f] = null;
    const rowHash = chainHash(prev, GEN_FIELDS.reduce((a, f) => { a[f] = row[f]; return a; }, {}));
    d.prepare(`INSERT INTO lexforge_generation_log (${GEN_FIELDS.join(',')},prev_hash,row_hash)
               VALUES (${GEN_FIELDS.map(() => '?').join(',')},?,?)`)
      .run(...GEN_FIELDS.map((f) => row[f]), prev, rowHash);
    return { attempt, rowHash };
  });
}

export function getSuccess(transactionId) {
  return handle().prepare(
    "SELECT * FROM lexforge_generation_log WHERE transaction_id = ? AND generation_status = 'SUCCESS' ORDER BY attempt DESC LIMIT 1",
  ).get(transactionId) ?? null;
}

export function getLatest(transactionId) {
  return handle().prepare(
    'SELECT * FROM lexforge_generation_log WHERE transaction_id = ? ORDER BY attempt DESC LIMIT 1',
  ).get(transactionId) ?? null;
}

// ── Delivery events ────────────────────────────────────────────────────────

export function appendEvent(transactionId, eventType, detail = {}) {
  return tx((d) => {
    const last = d.prepare('SELECT row_hash FROM lexforge_delivery_events ORDER BY id DESC LIMIT 1').get();
    const prev = last ? last.row_hash : GENESIS;
    const ts = new Date().toISOString();
    const json = JSON.stringify(detail);
    const rowHash = chainHash(prev, { transaction_id: transactionId, event_type: eventType, detail: json, event_timestamp: ts });
    d.prepare(`INSERT INTO lexforge_delivery_events (transaction_id,event_type,detail,prev_hash,row_hash,event_timestamp)
               VALUES (?,?,?,?,?,?)`).run(transactionId, eventType, json, prev, rowHash, ts);
    return rowHash;
  });
}

export function getEvents(transactionId, eventType) {
  const d = handle();
  return eventType
    ? d.prepare('SELECT * FROM lexforge_delivery_events WHERE transaction_id = ? AND event_type = ? ORDER BY id').all(transactionId, eventType)
    : d.prepare('SELECT * FROM lexforge_delivery_events WHERE transaction_id = ? ORDER BY id').all(transactionId);
}

/** Transactions with a SUCCESS row but no XRPL_ANCHORED event (for the retry worker). */
export function unanchoredTransactions(limit = 50) {
  return handle().prepare(`
    SELECT g.transaction_id, g.jurisdiction, g.buyer_ref, g.bundle_hash, g.documents_generated
    FROM lexforge_generation_log g
    WHERE g.generation_status = 'SUCCESS'
      AND NOT EXISTS (SELECT 1 FROM lexforge_delivery_events e
                      WHERE e.transaction_id = g.transaction_id
                        AND e.event_type IN ('XRPL_ANCHORED','XRPL_SKIPPED'))
    ORDER BY g.id LIMIT ?`).all(limit);
}

// ── Errors ─────────────────────────────────────────────────────────────────

export function appendError(transactionId, step, code, message) {
  handle().prepare(
    'INSERT INTO lexforge_pipeline_errors (transaction_id,pipeline_step,error_code,error_message) VALUES (?,?,?,?)',
  ).run(transactionId ?? null, step, code, String(message).slice(0, 2000));
}

// ── Integrity ──────────────────────────────────────────────────────────────

/** Recompute both hash chains. Returns { ok, generationRows, eventRows, brokenAt }. */
export function verifyChains() {
  const d = handle();
  let prev = GENESIS;
  let gen = 0;
  for (const r of d.prepare('SELECT * FROM lexforge_generation_log ORDER BY id').all()) {
    const body = GEN_FIELDS.reduce((a, f) => { a[f] = r[f]; return a; }, {});
    if (r.prev_hash !== prev || r.row_hash !== chainHash(prev, body)) {
      return { ok: false, generationRows: gen, eventRows: 0, brokenAt: { table: 'lexforge_generation_log', id: r.id } };
    }
    prev = r.row_hash;
    gen++;
  }
  prev = GENESIS;
  let evt = 0;
  for (const r of d.prepare('SELECT * FROM lexforge_delivery_events ORDER BY id').all()) {
    const body = { transaction_id: r.transaction_id, event_type: r.event_type, detail: r.detail, event_timestamp: r.event_timestamp };
    if (r.prev_hash !== prev || r.row_hash !== chainHash(prev, body)) {
      return { ok: false, generationRows: gen, eventRows: evt, brokenAt: { table: 'lexforge_delivery_events', id: r.id } };
    }
    prev = r.row_hash;
    evt++;
  }
  return { ok: true, generationRows: gen, eventRows: evt, brokenAt: null };
}

export function ping() {
  return handle().prepare('SELECT 1 AS ok').get().ok === 1;
}

export function auditPath() {
  return dbPath;
}
