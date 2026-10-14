/**
 * LexForge™ Template Validator
 * Counts populated vs stub vs missing templates using the SAME rule the pipeline uses
 * (a template under MIN_TEMPLATE_BYTES is a stub and will be refused at delivery time).
 * Run: node scripts/validateTemplates.js [--by-jurisdiction]
 * Exit 1 only when files are missing; stubs are reported, not fatal (they are refused at runtime).
 */
import fs from 'fs';
import { config, DOCUMENT_FOLDERS, JURISDICTIONS, LANGUAGES } from '../src/config/index.js';
import { templateCensus, resolveTemplatePath, templateExists } from '../src/engine/templateEngine.js';

const c = templateCensus();
process.stdout.write('\nLexForge™ Template Validation\n──────────────────────────────\n');
process.stdout.write(`Total expected : ${c.total}\nMissing        : ${c.missing}\nStub (refused) : ${c.stub}\nPopulated      : ${c.populated}\nSellable now   : ${c.sellable}  (languages: ${config.templates.sellableLanguages.join(',')}; restricted: ${JSON.stringify(config.templates.restrictedDocuments)})\n`);

if (process.argv.includes('--by-jurisdiction')) {
  process.stdout.write('\nPopulated per jurisdiction/language (of 19 documents):\n');
  for (const j of JURISDICTIONS) {
    const row = LANGUAGES.map((l) => {
      const n = Object.keys(DOCUMENT_FOLDERS).filter((code) => templateExists(code, j, l)).length;
      return `${l}:${String(n).padStart(2)}`;
    });
    process.stdout.write(`  ${j}  ${row.join('  ')}\n`);
  }
}
if (c.missing > 0) {
  for (const [code] of Object.entries(DOCUMENT_FOLDERS)) {
    for (const j of JURISDICTIONS) for (const l of LANGUAGES) {
      const p = resolveTemplatePath(code, j, l);
      if (!fs.existsSync(p)) process.stderr.write(`MISSING  ${p}\n`);
    }
  }
  process.exit(1);
}
