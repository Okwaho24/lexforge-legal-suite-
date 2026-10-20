import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DOCUMENTS, DOCUMENT_FOLDERS, JURISDICTIONS } from '../src/config/index.js';

// Languages that really exist: English everywhere, plus Quebec French (FR) for CA only.
const langsFor = (jur) => (jur === 'CA' ? ['EN', 'FR'] : ['EN']);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let missing = 0, empty = 0, populated = 0;

for (const doc of DOCUMENTS) {
  for (const jur of JURISDICTIONS) {
    for (const lang of langsFor(jur)) {
      const p = join(ROOT, 'templates', DOCUMENT_FOLDERS[doc], jur, `${lang}.md`);
      if (!existsSync(p)) {
        process.stderr.write(`MISSING: ${p}\n`);
        missing++;
      } else {
        const { readFileSync } = await import('fs');
        const content = readFileSync(p, 'utf8').trim();
        if (content.length < 50) { empty++; }
        else { populated++; }
      }
    }
  }
}

const total = DOCUMENTS.length * JURISDICTIONS.reduce((n, j) => n + langsFor(j).length, 0);
process.stdout.write(`Templates: ${total} expected | ${populated} populated | ${empty} stub | ${missing} missing\n`);
if (missing > 0) process.exit(1);
