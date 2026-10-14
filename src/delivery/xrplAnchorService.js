/**
 * LexForge™ — XRPL anchor service (queue + retry worker)
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Anchoring runs AFTER the delivery commit. A failed anchor never un-delivers a document;
 * it stays "pending" (visible via /ready and GET /status/:txid) and is retried with backoff
 * by the sweep worker until it succeeds.
 */

import crypto from 'crypto';
import { config } from '../config/index.js';
import { log, EventType } from '../utils/logger.js';
import * as audit from '../db/audit.js';
import { XRPLAnchor } from './xrplAnchor.js';

let _anchor; // undefined = not initialised, null = disabled
let _timer = null;
const _inflight = new Set();
const _failures = new Map(); // txid -> { n, nextAt }

export function getXRPLAnchor() {
  if (_anchor !== undefined) return _anchor;
  if (!config.xrpl.enabled || !config.xrpl.seed) {
    _anchor = null;
    log({ eventType: EventType.XRPL, payload: { action: 'XRPL_ANCHOR_DISABLED', enabled: config.xrpl.enabled, seedSet: Boolean(config.xrpl.seed) } });
    return _anchor;
  }
  try {
    _anchor = new XRPLAnchor();
    log({ eventType: EventType.XRPL, payload: { action: 'XRPL_ANCHOR_INIT', network: config.xrpl.network } });
  } catch (err) {
    _anchor = null;
    log({ eventType: EventType.XRPL, payload: { action: 'XRPL_ANCHOR_DISABLED', reason: err.message } });
  }
  return _anchor;
}

/** Test hook: inject a fake anchor (or null to disable). */
export function setXRPLAnchor(a) {
  _anchor = a;
}

/** Anchor one delivered transaction. Returns { status: 'ANCHORED'|'FAILED'|'DISABLED'|'BUSY', txHash? }. */
export async function anchorTransaction(transactionId) {
  const anchor = getXRPLAnchor();
  if (!anchor) return { status: 'DISABLED' };
  if (_inflight.has(transactionId)) return { status: 'BUSY' };
  const row = audit.getSuccess(transactionId);
  if (!row) return { status: 'FAILED', error: 'no successful delivery on record' };
  if (audit.getEvents(transactionId, 'XRPL_ANCHORED').length) {
    const prior = JSON.parse(audit.getEvents(transactionId, 'XRPL_ANCHORED')[0].detail);
    return { status: 'ANCHORED', txHash: prior.txHash };
  }

  _inflight.add(transactionId);
  try {
    const docs = JSON.parse(row.documents_generated);
    const result = await anchor.anchorDelivery({
      productId: 'ARC-LXF-001',
      documentTypes: docs.map((d) => d.code),
      jurisdiction: row.jurisdiction,
      contentHash: row.bundle_hash,
      // Hash, not the raw wallet: the ledger is public and permanent.
      buyerRefHash: crypto.createHash('sha256').update(row.buyer_ref).digest('hex'),
      transactionId,
    });
    if (result.success) {
      audit.appendEvent(transactionId, 'XRPL_ANCHORED', { txHash: result.txHash, ledgerIndex: result.ledgerIndex });
      log({ eventType: EventType.XRPL, transactionId, payload: { action: 'XRPL_ANCHOR_DELIVERY', txHash: result.txHash, ledgerIndex: result.ledgerIndex } });
      _failures.delete(transactionId);
      return { status: 'ANCHORED', txHash: result.txHash, ledgerIndex: result.ledgerIndex };
    }
    audit.appendEvent(transactionId, 'XRPL_FAILED', { error: result.error });
    audit.appendError(transactionId, 12, 'XRPL_ANCHOR_FAILED', result.error);
    const n = (_failures.get(transactionId)?.n ?? 0) + 1;
    _failures.set(transactionId, { n, nextAt: Date.now() + Math.min(3_600_000, 30_000 * 2 ** n) });
    log({ eventType: EventType.XRPL, transactionId, payload: { action: 'XRPL_ANCHOR_DELIVERY_FAILED', error: result.error, attempt: n } });
    return { status: 'FAILED', error: result.error };
  } finally {
    _inflight.delete(transactionId);
  }
}

/** One sweep over delivered-but-unanchored transactions. Returns number attempted. */
export async function sweepAnchors() {
  if (!getXRPLAnchor()) return 0;
  let attempted = 0;
  for (const r of audit.unanchoredTransactions(20)) {
    const f = _failures.get(r.transaction_id);
    if (f && f.nextAt > Date.now()) continue;
    attempted++;
    await anchorTransaction(r.transaction_id);
  }
  return attempted;
}

export function startAnchorWorker(intervalMs = 60_000) {
  if (_timer) return;
  _timer = setInterval(() => { sweepAnchors().catch((e) => log({ eventType: EventType.ERROR, payload: { action: 'ANCHOR_SWEEP_ERROR', error: e.message } })); }, intervalMs);
  _timer.unref();
}

export function stopAnchorWorker() {
  if (_timer) clearInterval(_timer);
  _timer = null;
}

export function pendingAnchorCount() {
  return audit.unanchoredTransactions(1000).length;
}
