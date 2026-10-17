// LexForge™ — HTTP handlers for the per-sale bundle and the pre-payment availability check.
// Both require RaPaX's HMAC signature (x-rapax-signature: sha256=<hmac of the raw body>), same as /webhook/lexforge.
import { verifySignature } from '../webhook/webhookHandler.js';
import { BundleError } from './langmap.js';
import { buildBundle } from './bundleService.js';
import { log, logError } from '../utils/logger.js';

const ID = /^[A-Za-z0-9._:\-]{1,128}$/;

function parse(req, res) {
  if (!verifySignature(req.rawBody ?? '', req.headers['x-rapax-signature'] || '')) {
    logError({ eventType: 'SIGNATURE_INVALID', route: req.path });
    res.status(401).json({ error: 'Invalid signature' });
    return null;
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
}

export function bundleHandler(req, res) {
  const b = parse(req, res);
  if (!b) return;
  if (!ID.test(b.transaction_id ?? '') || !ID.test(b.product_id ?? '') || typeof b.product_name !== 'string' || !b.product_name.trim()
      || typeof b.buyer_ref !== 'string' || !b.buyer_ref.trim()) {
    return res.status(400).json({ code: 'invalid_request', error: 'transaction_id, product_id, product_name and buyer_ref are required' });
  }
  try {
    const out = buildBundle(b);
    log({ eventType: 'BUNDLE_BUILT', transaction_id: b.transaction_id, product_id: b.product_id, jurisdiction: out.jurisdiction_key, languages: out.languages_shipped, documents: out.documents.length });
    return res.status(200).json(out);
  } catch (err) {
    if (err instanceof BundleError) {
      logError({ eventType: 'BUNDLE_REFUSED', transaction_id: b.transaction_id, code: err.code, error: err.message });
      return res.status(err.code === 'invalid_request' ? 400 : 422).json({ code: err.code, error: err.message, details: err.details });
    }
    logError({ eventType: 'BUNDLE_ERROR', transaction_id: b.transaction_id, error: err.message });
    return res.status(500).json({ code: 'internal_error', error: 'bundle could not be built' });
  }
}

// Dry run of the same code path with throwaway values. RaPaX calls this BEFORE accepting payment so nobody pays for a
// product whose documents cannot be released for their jurisdiction/language.
export function availabilityHandler(req, res) {
  const b = parse(req, res);
  if (!b) return;
  if (!ID.test(b.product_id ?? '')) return res.status(400).json({ code: 'invalid_request', error: 'product_id is required' });
  try {
    const out = buildBundle({
      transaction_id: 'availability-check', product_id: b.product_id, product_name: b.product_name || 'Product',
      jurisdiction: b.jurisdiction, region: b.region, language_pref: b.language_pref, buyer_ref: 'availability-check',
    });
    return res.status(200).json({ available: true, languages_shipped: out.languages_shipped, languages_unavailable: out.languages_unavailable, jurisdiction_template: out.jurisdiction_template });
  } catch (err) {
    if (err instanceof BundleError) return res.status(200).json({ available: false, code: err.code, reason: err.message });
    logError({ eventType: 'AVAILABILITY_ERROR', error: err.message });
    return res.status(500).json({ code: 'internal_error', error: 'availability check failed' });
  }
}
