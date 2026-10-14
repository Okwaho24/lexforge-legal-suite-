/**
 * LexForge™ → AcerbE™ client (mandatory fingerprint gate)
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Contract (AcerbE™ server.py, RaPaX contract):
 *   POST {ACERBE_BASE_URL}/fingerprint   header X-AcerbE-Key
 *   body  { file_path, buyer_wallet, transaction_id, product_id, product_name }
 *   200   { success:true, fingerprinted_file_path, fingerprint_id, hash }
 *
 * file_path / fingerprinted_file_path are paths on the AcerbE™ host's filesystem, so
 * LexForge™ and AcerbE™ MUST run co-located (same container or same machine).
 *
 * Fail-closed: every error path throws AcerbeError. There is no fallback that ships
 * an unstamped file.
 */

import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config/index.js';

export class AcerbeError extends Error {
  constructor(message, { retryable = false, cause } = {}) {
    super(message);
    this.name = 'AcerbeError';
    this.retryable = retryable;
    if (cause) this.cause = cause;
  }
}

export function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

async function post(pathname, body) {
  let res;
  try {
    res = await fetch(`${config.acerbe.baseUrl}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AcerbE-Key': config.acerbe.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.acerbe.timeoutMs),
    });
  } catch (err) {
    throw new AcerbeError(`AcerbE™ unreachable: ${err.message}`, { retryable: true, cause: err });
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new AcerbeError(`AcerbE™ returned non-JSON (HTTP ${res.status})`, { retryable: res.status >= 500, cause: err });
  }
  if (res.status === 401) throw new AcerbeError('AcerbE™ rejected the API key (HTTP 401)');
  if (res.status >= 500) throw new AcerbeError(`AcerbE™ server error (HTTP ${res.status})`, { retryable: true });
  return data;
}

/**
 * Fingerprint one file. Returns { fingerprintId, stampedPath, stampedHash, originalHash }.
 * Verifies that the stamped file exists and differs from the input.
 */
export async function stampFile({ filePath, productId, productName, buyerWallet, transactionId }) {
  const originalHash = sha256File(filePath);
  const body = {
    file_path: filePath,
    buyer_wallet: buyerWallet,
    transaction_id: transactionId,
    product_id: productId,
    product_name: productName,
  };

  let data;
  for (let attempt = 0; ; attempt++) {
    try {
      data = await post('/fingerprint', body);
      break;
    } catch (err) {
      if (!(err instanceof AcerbeError) || !err.retryable || attempt >= config.acerbe.retries) throw err;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
  }

  if (data?.success !== true) {
    throw new AcerbeError(`AcerbE™ refused: ${data?.reason ?? 'no reason given'}`);
  }
  if (typeof data.fingerprint_id !== 'string' || !data.fingerprint_id ||
      typeof data.fingerprinted_file_path !== 'string' || !data.fingerprinted_file_path) {
    throw new AcerbeError('AcerbE™ response missing fingerprint_id / fingerprinted_file_path');
  }
  if (!fs.existsSync(data.fingerprinted_file_path)) {
    throw new AcerbeError('AcerbE™ reported a stamped file that does not exist — LexForge™ and AcerbE™ must share a filesystem');
  }
  const stampedHash = sha256File(data.fingerprinted_file_path);
  if (stampedHash === originalHash) {
    throw new AcerbeError('AcerbE™ returned a file identical to the input — no fingerprint was applied');
  }
  return { fingerprintId: data.fingerprint_id, stampedPath: data.fingerprinted_file_path, stampedHash, originalHash };
}

/**
 * Readiness probe. AcerbE™ /health (added in the hardened server) reports whether it
 * is running with real keys. Returns { ok, reason? }.
 */
export async function acerbeHealth() {
  try {
    const res = await fetch(`${config.acerbe.baseUrl}/health`, {
      headers: { 'X-AcerbE-Key': config.acerbe.apiKey },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const d = await res.json();
    if (d.keys_configured !== true) return { ok: false, reason: 'AcerbE™ is running with default/placeholder keys' };
    return { ok: true, engine: d.engine_version };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}
