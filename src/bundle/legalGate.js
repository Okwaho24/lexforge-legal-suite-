// LexForge™ — legal content release gate.
// A template ships only if ALL of these hold. This is the code form of "zero compromise on jurisdiction- and
// language-specific legal accuracy": nothing reaches a customer on the strength of being present in the repo.
//
//   1. Human sign-off: templates/VERIFIED.json pins the SHA-256 of every reviewed file. Any later edit voids it.
//   2. No literal "undefined" (a generator defect seen in v2.0 output).
//   3. A non-English template must differ from the English body (catches untranslated copies under a translated label).
//   4. After variable merge, no unresolved {{PLACEHOLDER}} may remain.
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

export function loadVerified(templatesRoot) {
  const p = join(templatesRoot, 'VERIFIED.json');
  if (!existsSync(p)) return { verified: {} };
  const data = JSON.parse(readFileSync(p, 'utf8'));
  return { verified: data.verified || {} };
}

const HEADER_NOISE = /^(?:\s*(?:Jurisdiction|Governing Law|Document|Generated|Owner)\b.*|\*\*LexForge.*)$/i;
export function bodyFingerprint(text) {
  return text.replace(/<!--[\s\S]*?-->/, '').split('\n').filter(l => !HEADER_NOISE.test(l) && l.trim()).join('\n');
}

// rel: path under templates/ e.g. "05-EUA/US/FR.md"; raw: file bytes; enBody: bodyFingerprint of the same doc/jurisdiction in EN (or null)
export function templateDefects({ rel, raw, lang, enBody, verified }) {
  const defects = [];
  const text = raw.toString('utf8');
  if (text.trim().length < 200) defects.push('template is empty or a stub');
  if (/\bundefined\b/.test(text)) defects.push('contains the literal text "undefined" (generator defect)');
  if (lang !== 'EN' && enBody !== null && bodyFingerprint(text) === enBody) defects.push('body is identical to the English template (untranslated)');
  const pin = verified[rel];
  if (!pin) defects.push('no human review sign-off in VERIFIED.json');
  else if (pin.sha256 !== sha256(raw)) defects.push('file changed since it was reviewed (VERIFIED.json hash mismatch)');
  return defects;
}

export function unresolvedPlaceholders(rendered) {
  // The disclaimer block legitimately contains no placeholders; any {{...}} left after merging is a failure.
  return [...new Set([...rendered.matchAll(/\{\{([^}|]+)(?:\|[^}]*)?\}\}/g)].map(m => m[1].trim()))];
}
