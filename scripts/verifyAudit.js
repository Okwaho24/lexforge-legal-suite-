/**
 * LexForge™ audit verifier — recomputes both SHA-256 hash chains.
 * Run: npm run audit:verify   (exit 1 if the audit log has been altered)
 */
import { config } from '../src/config/index.js';
import { openAudit, verifyChains, closeAudit } from '../src/db/audit.js';

openAudit(config.storage.dbPath);
const v = verifyChains();
closeAudit();
process.stdout.write(`${JSON.stringify(v)}\n`);
process.exit(v.ok ? 0 : 1);
