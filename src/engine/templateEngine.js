/**
 * LexForge™ Template Engine
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Loads a master template by (documentCode, jurisdiction, language), merges
 * buyer/transaction variables, and returns rendered Markdown plus the facts the
 * pipeline needs to decide whether it is safe to deliver (stub? fallback? unresolved?).
 */

import fs from 'fs';
import path from 'path';
import { config, DOCUMENT_FOLDERS, JURISDICTIONS, LANGUAGES } from '../config/index.js';
import { log, EventType } from '../utils/logger.js';

/** Sentinel on the first line of the disclaimer — used by validation (spec §2.2). */
export const DISCLAIMER_SENTINEL = 'LEGAL DISCLAIMER';

export const ACA_DISCLAIMER = `
---
**${DISCLAIMER_SENTINEL}**
This document is an AI-generated draft produced by LexForge™, a product of
Archer Chain Analytics (ISC: 102237785). It is provided for informational
purposes only and does not constitute legal advice. Laws vary by jurisdiction
and individual circumstances. Review by qualified legal counsel in the
applicable jurisdiction is strongly recommended before execution.

© 2026 Neil Scott Archer / Archer Chain Analytics
`;

export class TemplateError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'TemplateError';
    this.code = code;
    Object.assign(this, extra);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Render a LexForge™ template with buyer variables merged in.
 *
 * Throws TemplateError:
 *   INVALID_PARAMS        unknown code / jurisdiction / language
 *   TEMPLATE_NOT_FOUND    no file (and no usable EN fallback)
 *   TEMPLATE_NOT_POPULATED file exists but is an empty stub
 *   UNRESOLVED_PLACEHOLDERS (strict mode) required {{VARS}} have no value
 *
 * @returns {{ markdown: string, templatePath: string, languageUsed: string,
 *             languageFallback: boolean, unresolved: string[] }}
 */
export function renderTemplate({ documentCode, jurisdiction, language, transactionId, variables = {} }) {
  validateParams({ documentCode, jurisdiction, language });
  assertSellable(documentCode, jurisdiction, language);

  let languageUsed = language;
  let templatePath = resolveTemplatePath(documentCode, jurisdiction, language);
  let raw = readUsable(templatePath);

  if (raw === null && language !== 'EN' && config.templates.allowEnFallback) {
    const enPath = resolveTemplatePath(documentCode, jurisdiction, 'EN');
    const enRaw = readUsable(enPath);
    if (enRaw !== null) {
      log({
        eventType: EventType.RENDER, documentCode, jurisdiction, language, transactionId,
        payload: { action: 'LANGUAGE_FALLBACK_TO_EN', requested: language, templatePath: enPath },
      });
      raw = enRaw;
      templatePath = enPath;
      languageUsed = 'EN';
    }
  }

  if (raw === null) {
    const exists = fs.existsSync(templatePath);
    throw new TemplateError(
      exists ? 'TEMPLATE_NOT_POPULATED' : 'TEMPLATE_NOT_FOUND',
      `${exists ? 'Template is an empty stub' : 'Template not found'}: ${documentCode}/${jurisdiction}/${language}`,
      { documentCode, jurisdiction, language },
    );
  }

  const { text, unresolved } = mergeVariables(raw, variables, config.templates.placeholderMode === 'fill');

  if (unresolved.length && config.templates.placeholderMode === 'strict') {
    throw new TemplateError(
      'UNRESOLVED_PLACEHOLDERS',
      `Missing values for: ${unresolved.join(', ')}`,
      { documentCode, jurisdiction, language, unresolved },
    );
  }

  // Hand-written templates already carry the ⚠️ disclaimer block; generated ones do not. Never emit it twice.
  const markdown = text.includes(DISCLAIMER_SENTINEL) ? text : text + ACA_DISCLAIMER;

  log({
    eventType: EventType.RENDER, documentCode, jurisdiction, language, transactionId,
    payload: {
      action: 'TEMPLATE_RENDERED',
      templatePath: path.relative(config.templates.dir, templatePath),
      languageUsed,
      variableKeys: Object.keys(variables),
      unresolved,
    },
  });

  return { markdown, templatePath, languageUsed, languageFallback: languageUsed !== language, unresolved };
}

/**
 * Sell-gate: refuse combinations whose text is not what the buyer is paying for.
 * Throws TemplateError TEMPLATE_NOT_SELLABLE (HTTP 422, AcerbE never called).
 */
export function assertSellable(documentCode, jurisdiction, language) {
  const { sellableLanguages, restrictedDocuments } = config.templates;
  if (!sellableLanguages.includes(language)) {
    throw new TemplateError(
      'TEMPLATE_NOT_SELLABLE',
      `Language ${language} is not available for sale yet (available: ${sellableLanguages.join(', ')})`,
      { documentCode, jurisdiction, language },
    );
  }
  const allowed = restrictedDocuments[documentCode];
  if (allowed && !allowed.includes(jurisdiction)) {
    throw new TemplateError(
      'TEMPLATE_NOT_SELLABLE',
      `${documentCode} is only available for: ${allowed.join(', ')}`,
      { documentCode, jurisdiction, language },
    );
  }
}

export function isSellable(documentCode, jurisdiction, language) {
  try { assertSellable(documentCode, jurisdiction, language); return true; } catch { return false; }
}

export function resolveTemplatePath(documentCode, jurisdiction, language) {
  const folder = DOCUMENT_FOLDERS[documentCode];
  if (!folder) throw new TemplateError('INVALID_PARAMS', `Unknown document code: ${documentCode}`);
  return path.join(config.templates.dir, folder, jurisdiction, `${language}.md`);
}

export function templateExists(documentCode, jurisdiction, language) {
  try {
    return readUsable(resolveTemplatePath(documentCode, jurisdiction, language)) !== null;
  } catch {
    return false;
  }
}

/** Counts of populated vs stub templates — used by /ready and the validate script. */
export function templateCensus() {
  let populated = 0;
  let stub = 0;
  let missing = 0;
  let sellable = 0;
  for (const code of Object.keys(DOCUMENT_FOLDERS)) {
    for (const jur of JURISDICTIONS) {
      for (const lang of LANGUAGES) {
        const p = resolveTemplatePath(code, jur, lang);
        if (!fs.existsSync(p)) missing++;
        else if (readUsable(p) === null) stub++;
        else {
          populated++;
          if (isSellable(code, jur, lang)) sellable++;
        }
      }
    }
  }
  return { populated, stub, missing, sellable, total: populated + stub + missing };
}

// ── Internal ───────────────────────────────────────────────────────────────

/** Returns file text, or null if missing / an empty stub. */
function readUsable(p) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
  return Buffer.byteLength(raw.trim(), 'utf8') >= config.templates.minTemplateBytes ? raw : null;
}

function validateParams({ documentCode, jurisdiction, language }) {
  if (!Object.prototype.hasOwnProperty.call(DOCUMENT_FOLDERS, documentCode)) {
    throw new TemplateError('INVALID_PARAMS', `Invalid document code: ${documentCode}`);
  }
  if (!JURISDICTIONS.includes(jurisdiction)) {
    throw new TemplateError('INVALID_PARAMS', `Invalid jurisdiction: ${jurisdiction}`);
  }
  if (!LANGUAGES.includes(language)) {
    throw new TemplateError('INVALID_PARAMS', `Invalid language: ${language}`);
  }
}

const NAME_RE = /^[A-Z0-9_]+/;

/**
 * Parse `{{VAR}}` / `{{VAR|default}}` into nodes. Defaults may themselves contain placeholders
 * (e.g. `{{PAYMENT_TERMS|Net {{NET_DAYS|30}}}}`), so this is a small recursive parser, not a regex.
 * Anything that is not a well-formed placeholder is kept as literal text.
 */
function parse(src, i = 0, inDefault = false) {
  const nodes = [];
  let lit = '';
  const flush = () => { if (lit) { nodes.push({ t: 'lit', v: lit }); lit = ''; } };
  while (i < src.length) {
    if (inDefault && src.startsWith('}}', i)) { flush(); return { nodes, i }; }
    if (src.startsWith('{{', i)) {
      const m = NAME_RE.exec(src.slice(i + 2));
      if (m) {
        const key = m[0];
        let j = i + 2 + key.length;
        if (src.startsWith('}}', j)) { flush(); nodes.push({ t: 'ph', key, dflt: null, raw: src.slice(i, j + 2) }); i = j + 2; continue; }
        if (src[j] === '|') {
          const inner = parse(src, j + 1, true);
          if (src.startsWith('}}', inner.i)) {
            flush(); nodes.push({ t: 'ph', key, dflt: inner.nodes, raw: src.slice(i, inner.i + 2) }); i = inner.i + 2; continue;
          }
        }
      }
    }
    lit += src[i++];
  }
  flush();
  return { nodes, i };
}

/**
 * Replace {{VAR}} and {{VAR|default}} placeholders.
 * A supplied value wins over a default; a placeholder with neither is reported in
 * `unresolved` and either left in place (strict) or turned into a visible blank (fill).
 * Supplied values are inserted literally and never re-scanned, so a buyer value
 * containing "{{...}}" cannot inject or trigger anything.
 */
export function mergeVariables(template, variables, fillBlanks = false) {
  const unresolved = new Set();
  const has = (k) => Object.prototype.hasOwnProperty.call(variables, k) && variables[k] !== null && variables[k] !== '';
  const render = (nodes) => nodes.map((n) => {
    if (n.t === 'lit') return n.v;
    if (has(n.key)) return String(variables[n.key]);
    if (n.dflt !== null) return render(n.dflt);
    unresolved.add(n.key);
    return fillBlanks ? `[${n.key.replace(/_/g, ' ')}: ________]` : n.raw;
  }).join('');
  const text = render(parse(template).nodes);
  return { text, unresolved: [...unresolved] };
}
