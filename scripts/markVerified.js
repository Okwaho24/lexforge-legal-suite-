// Pins the current SHA-256 of reviewed templates into templates/VERIFIED.json.
// Running this ASSERTS that a qualified person has reviewed each file for its jurisdiction and language.
//   node scripts/markVerified.js --by "Reviewer Name" 05-EUA/US/EN.md 06-TOS/US/EN.md
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const args = process.argv.slice(2);
const i = args.indexOf('--by');
if (i < 0 || !args[i + 1]) { console.error('usage: node scripts/markVerified.js --by "<reviewer>" <template paths relative to templates/>'); process.exit(2); }
const by = args[i + 1];
const files = args.filter((_, k) => k !== i && k !== i + 1);
if (!files.length) { console.error('no template paths given'); process.exit(2); }
const reg = JSON.parse(readFileSync(join(root, 'VERIFIED.json'), 'utf8'));
for (const f of files) {
  if (f.includes('..') || f.startsWith('/')) { console.error(`refusing path: ${f}`); process.exit(2); }
  reg.verified[f] = { sha256: createHash('sha256').update(readFileSync(join(root, f))).digest('hex'), reviewed_by: by, reviewed_on: new Date().toISOString().slice(0, 10) };
}
writeFileSync(join(root, 'VERIFIED.json'), JSON.stringify(reg, null, 2) + '\n');
console.log(`pinned ${files.length} template(s) as reviewed by ${by}`);
