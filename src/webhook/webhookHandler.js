import { createHmac, timingSafeEqual } from 'crypto';
import { deliverDocument } from '../delivery/deliveryService.js';
import { log, logError, EventType } from '../utils/logger.js';
import { DOCUMENTS, JURISDICTIONS, LANGUAGES } from '../config/index.js';

function verifySignature(rawBody, signature) {
  const secret = process.env.RAPAX_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function handleWebhook(req, res) {
  const signature = req.headers['x-rapax-signature'] || '';
  const rawBody = req.rawBody;

  log({ eventType: EventType.WEBHOOK_RECEIVED, ip: req.ip });

  if (!verifySignature(rawBody, signature)) {
    logError({ eventType: EventType.SIGNATURE_INVALID });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  log({ eventType: EventType.SIGNATURE_VALID });

  const { transaction_id, document_code, jurisdiction, language, buyer_wallet, variables } = req.body;

  if (!transaction_id || !document_code || !jurisdiction || !language) {
    return res.status(400).json({ error: 'Missing required fields: transaction_id, document_code, jurisdiction, language' });
  }
  if (!DOCUMENTS.includes(document_code)) return res.status(400).json({ error: `Unknown document_code: ${document_code}` });
  if (!JURISDICTIONS.includes(jurisdiction)) return res.status(400).json({ error: `Unknown jurisdiction: ${jurisdiction}` });
  if (!LANGUAGES.includes(language)) return res.status(400).json({ error: `Unknown language: ${language}` });

  try {
    const result = await deliverDocument({ transactionId: transaction_id, documentCode: document_code, jurisdiction, language, buyerWallet: buyer_wallet, variables: variables || {} });
    return res.status(200).json(result);
  } catch (err) {
    logError({ eventType: EventType.DELIVERY_FAILED, transaction_id, error: err.message });
    return res.status(500).json({ error: err.message });
  }
}
