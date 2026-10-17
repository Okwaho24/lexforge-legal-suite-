// TEST ONLY. Builds a throwaway template library (US/EN, 4 docs) plus a VERIFIED.json that pins it.
// The text is placeholder fixture content, NOT legal text. Never point a production LexForge at this directory.
// usage: node makeFixture.mjs <outDir> [--unverified]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DOCUMENT_FOLDERS } from '../../src/config/index.js';

const [out, flag] = process.argv.slice(2);
if (!out) { console.error('outDir required'); process.exit(2); }
const pins = {};
for (const code of ['EUA', 'TOS', 'PP', 'WA']) {
  const rel = `${DOCUMENT_FOLDERS[code]}/US/EN.md`;
  mkdirSync(join(out, DOCUMENT_FOLDERS[code], 'US'), { recursive: true });
  writeFileSync(join(out, rel), `<!-- TEST FIXTURE ONLY — NOT LEGAL TEXT -->\n# ${code} (TEST FIXTURE)\n\nThis is fixture content for an automated test of the fulfilment pipeline. ${'It is not a legal document. '.repeat(8)}\nProduct: {{PRODUCT_NAME}} | Operator: {{OPERATOR_LEGAL_NAME}} | Date: {{EFFECTIVE_DATE}} | Ref: {{TRANSACTION_ID}}\n`);
  pins[rel] = { sha256: createHash('sha256').update(readFileSync(join(out, rel))).digest('hex'), reviewed_by: 'TEST-FIXTURE' };
}
writeFileSync(join(out, 'VERIFIED.json'), JSON.stringify({ verified: flag === '--unverified' ? {} : pins }));
