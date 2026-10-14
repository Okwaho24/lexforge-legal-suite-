/**
 * LexForge™ RaPaX™ Webhook Handler
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * POST /webhook/lexforge          (body parsed as RAW bytes — the HMAC is computed over them)
 *   header  x-rapax-signature: sha256=<hex HMAC-SHA256(secret, rawBody)>
 *   body    { transaction_id, buyer_wallet, jurisdiction, language,
 *             document_code | document_codes[], variables?, product_id? }
 *
 * Fail-closed: with no RAPAX_WEBHOOK_SECRET configured the endpoint refuses every request.
 */

import crypto from 'crypto';
import { config, DOCUMENTS, JURISDICTIONS, LANGUAGES } from '../config/index.js';
import { deliver, PipelineError } from '../delivery/deliveryService.js';
import { log, EventType } from '../utils/logger.js';

const TX_RE = /^[A-Za-z0-9._-]{1,64}$/;
const VAR_KEY_RE = /^[A-Z0-9_]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function signatureFor(secret, data) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time comparison that is safe for unequal lengths. */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Verify a signature header against arbitrary signed data. Returns null if OK, else an { http, error } object. */
export function checkSignature(headerValue, data) {
  if (!config.rapax.webhookSecret) {
    return { http: 503, error: 'Webhook secret not configured — refusing request' };
  }
  if (!headerValue || !safeEqual(headerValue, signatureFor(config.rapax.webhookSecret, data))) {
    return { http: 401, error: 'Unauthorized: invalid webhook signature' };
  }
  return null;
}

/** @returns {{ ok: true, value: object } | { ok: false, error: string }} */
export function parseRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Body must be a JSON object' };

  const txid = body.transaction_id;
  if (typeof txid !== 'string' || !TX_RE.test(txid)) return { ok: false, error: 'transaction_id must match [A-Za-z0-9._-]{1,64}' };

  const wallet = body.buyer_wallet;
  // eslint-disable-next-line no-control-regex
  if (typeof wallet !== 'string' || wallet.length < 1 || wallet.length > 128 || /[\x00-\x1f\x7f]/.test(wallet)) {
    return { ok: false, error: 'buyer_wallet must be a printable string (1-128 chars)' };
  }

  const jurisdiction = typeof body.jurisdiction === 'string' ? body.jurisdiction.toUpperCase() : '';
  if (!JURISDICTIONS.includes(jurisdiction)) return { ok: false, error: `jurisdiction must be one of ${JURISDICTIONS.join(', ')}` };

  const language = typeof body.language === 'string' ? body.language.toUpperCase() : '';
  if (!LANGUAGES.includes(language)) return { ok: false, error: `language must be one of ${LANGUAGES.join(', ')}` };

  let codes = body.document_codes ?? (body.document_code !== undefined ? [body.document_code] : null);
  if (!Array.isArray(codes) || codes.length < 1 || codes.length > Object.keys(DOCUMENTS).length) {
    return { ok: false, error: 'Provide document_code or document_codes[] (1-19 codes)' };
  }
  codes = codes.map((c) => (typeof c === 'string' ? c.toUpperCase() : ''));
  if (codes.some((c) => !Object.prototype.hasOwnProperty.call(DOCUMENTS, c))) {
    return { ok: false, error: `Unknown document code. Valid: ${Object.keys(DOCUMENTS).join(', ')}` };
  }
  if (new Set(codes).size !== codes.length) return { ok: false, error: 'Duplicate document codes' };

  const variables = {};
  if (body.variables !== undefined) {
    const v = body.variables;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, error: 'variables must be an object' };
    const keys = Object.keys(v);
    if (keys.length > 100) return { ok: false, error: 'variables: max 100 keys' };
    for (const k of keys) {
      if (!VAR_KEY_RE.test(k)) return { ok: false, error: `variables: bad key "${k.slice(0, 40)}" (use A-Z 0-9 _)` };
      const val = v[k];
      if (typeof val !== 'string' && typeof val !== 'number') return { ok: false, error: `variables.${k} must be a string or number` };
      if (String(val).length > 2000) return { ok: false, error: `variables.${k} exceeds 2000 chars` };
      variables[k] = val;
    }
    if ('EFFECTIVE_DATE' in variables && !DATE_RE.test(String(variables.EFFECTIVE_DATE))) {
      return { ok: false, error: 'variables.EFFECTIVE_DATE must be YYYY-MM-DD' };
    }
  }

  return { ok: true, value: { transactionId: txid, documentCodes: codes, jurisdiction, language, buyerWallet: wallet, variables } };
}

/**
 * Express route handler. Requires express.raw() upstream so req.body is a Buffer.
 */
export async function handleWebhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body : null;
  if (!raw) return res.status(415).json({ delivered: false, error: 'Content-Type must be application/json' });

  const bad = checkSignature(req.headers['x-rapax-signature'], raw);
  if (bad) {
    log({ eventType: EventType.WEBHOOK, payload: { action: 'WEBHOOK_REJECTED', status: bad.http } });
    return res.status(bad.http).json({ delivered: false, error: bad.error });
  }

  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ delivered: false, error: 'Invalid JSON' });
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) return res.status(400).json({ delivered: false, error: parsed.error });

  const r = parsed.value;
  log({ eventType: EventType.WEBHOOK, documentCode: r.documentCodes.join(','), jurisdiction: r.jurisdiction,
    language: r.language, transactionId: r.transactionId, actor: r.buyerWallet, payload: { action: 'WEBHOOK_RECEIVED' } });

  try {
    return res.status(200).json(await deliver(r));
  } catch (err) {
    const pe = err instanceof PipelineError ? err : new PipelineError('INTERNAL', 'Internal error', { http: 500 });
    return res.status(pe.http).json({
      delivered: false,
      code: pe.code,
      error: pe.code === 'INTERNAL' ? 'Internal error' : pe.message,
      ...(pe.details ? { details: pe.details } : {}),
    });
  }
}
