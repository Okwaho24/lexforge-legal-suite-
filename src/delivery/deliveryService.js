import { createHash } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { renderTemplate } from '../engine/templateEngine.js';
import { anchorDelivery } from './xrplAnchorService.js';
import { log, logError, EventType } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../output');

async function fingerprintWithAcerbE({ transactionId, documentCode, contentHash, filename }) {
  const base = process.env.ACERBE_BASE_URL;
  const key = process.env.ACERBE_API_KEY;
  if (!base || !key) throw new Error('AcerbE™ not configured — ACERBE_BASE_URL and ACERBE_API_KEY required');
  const res = await fetch(`${base}/api/v1/fingerprint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-acerbe-key': key },
    body: JSON.stringify({ transactionId, documentCode, contentHash, filename }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AcerbE™ fingerprint failed [${res.status}]: ${text}`);
  }
  const data = await res.json();
  log({ eventType: EventType.FINGERPRINT_OK, transactionId, fingerprintId: data.fingerprint_id });
  return data.fingerprint_id;
}

export async function deliverDocument({ transactionId, documentCode, jurisdiction, language, buyerWallet, variables }) {
  const effectiveDate = variables.EFFECTIVE_DATE || new Date().toISOString().slice(0, 10);
  const issuedBy = 'Archer Chain Analytics (Sole Proprietor) | ISC: 102237785';
  const mergedVars = { TRANSACTION_ID: transactionId, EFFECTIVE_DATE: effectiveDate, ISSUED_BY: issuedBy, BUYER_WALLET: buyerWallet || '', ...variables };

  // 1. Render
  const content = renderTemplate(documentCode, jurisdiction, language, mergedVars);
  log({ eventType: EventType.TEMPLATE_RENDERED, transactionId, documentCode, jurisdiction, language });

  // 2. Write + hash
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${transactionId}_${documentCode}_${jurisdiction}_${language}.md`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, content, 'utf8');
  const contentHash = 'sha256:' + createHash('sha256').update(content).digest('hex');

  // 3. AcerbE™ fingerprint — HARD GATE
  let fingerprintId;
  try {
    fingerprintId = await fingerprintWithAcerbE({ transactionId, documentCode, contentHash, filename });
  } catch (err) {
    logError({ eventType: EventType.FINGERPRINT_FAILED, transactionId, error: err.message });
    throw err;
  }

  // 4. XRPL anchor — fire-and-forget
  const xrplHash = await anchorDelivery({ transactionId, documentCode, jurisdiction, language, contentHash, buyerWallet });

  log({ eventType: EventType.DELIVERY_COMPLETE, transactionId, filename, contentHash, fingerprintId, xrplHash });

  return { delivered: true, transactionId, documentCode, fingerprintId, xrpl_tx_hash: xrplHash, download_url: `/download/${filename}` };
}
