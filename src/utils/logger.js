export const EventType = {
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  SIGNATURE_VALID: 'SIGNATURE_VALID',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  TEMPLATE_RENDERED: 'TEMPLATE_RENDERED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  FINGERPRINT_OK: 'FINGERPRINT_OK',
  FINGERPRINT_FAILED: 'FINGERPRINT_FAILED',
  XRPL_ANCHORED: 'XRPL_ANCHORED',
  XRPL_SKIPPED: 'XRPL_SKIPPED',
  XRPL_ERROR: 'XRPL_ERROR',
  DELIVERY_COMPLETE: 'DELIVERY_COMPLETE',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  SERVER_START: 'SERVER_START',
};

export function log(obj) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n');
}

export function logError(obj) {
  process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level: 'ERROR', ...obj }) + '\n');
}
