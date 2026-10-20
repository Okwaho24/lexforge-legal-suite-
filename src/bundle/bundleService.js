// LexForge™ — per-sale document bundle (called by RaPaX at fulfilment time and, as a dry run, before payment).
// Deterministic: static templates + fixed {{VARIABLE}} substitution. No AI, no network access in this module.
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { DOCUMENT_FOLDERS, DOCUMENTS, LANGUAGES } from '../config/index.js';
import { TEMPLATES_ROOT, renderContent } from '../engine/templateEngine.js';
import { BundleError, resolveJurisdiction, selectLanguages } from './langmap.js';
import { bodyFingerprint, loadVerified, templateDefects, unresolvedPlaceholders } from './legalGate.js';

const PRODUCT_DOCS_FILE = process.env.LEXFORGE_PRODUCT_DOCS || new URL('../../config/product-docs.json', import.meta.url).pathname;

export function docsForProduct(productId) {
  const cfg = JSON.parse(readFileSync(PRODUCT_DOCS_FILE, 'utf8'));
  const docs = cfg.products?.[productId] ?? cfg.default;
  if (!Array.isArray(docs) || !docs.length || !docs.every(d => DOCUMENTS.includes(d))) {
    throw new BundleError('invalid_config', 'product-docs.json lists an unknown or empty document set');
  }
  return docs;
}

// Operator facts (legal name, privacy contact ...) live in the environment, never in code:
//   LEXFORGE_VAR_OPERATOR_LEGAL_NAME="..."  defines {{OPERATOR_LEGAL_NAME}}.
export function operatorVariables(env = process.env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) if (k.startsWith('LEXFORGE_VAR_') && v) out[k.slice('LEXFORGE_VAR_'.length)] = v;
  return out;
}

function templateLanguages(templatesRoot, template) {
  const langs = new Set();
  for (const doc of Object.values(DOCUMENT_FOLDERS)) {
    const dir = join(templatesRoot, doc, template);
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.md')) langs.add(f.slice(0, -3));
  }
  return [...langs].filter(l => LANGUAGES.includes(l));
}

/**
 * req: { transaction_id, product_id, product_name, product_version?, jurisdiction, region?, language_pref?, buyer_ref, variables? }
 * Returns { documents:[{path,content}], languages_shipped, languages_unavailable, jurisdiction_template, jurisdiction_key, docs }
 * Throws BundleError(code) when the sale cannot be fulfilled correctly. Never returns a partial bundle.
 */
export function buildBundle(req, { templatesRoot = TEMPLATES_ROOT, env = process.env } = {}) {
  const j = resolveJurisdiction(req.jurisdiction, req.region);
  const docs = docsForProduct(req.product_id);
  const { wanted, mandatory } = selectLanguages(j.key, req.language_pref, templateLanguages(templatesRoot, j.template));
  const { verified } = loadVerified(templatesRoot);

  const vars = {
    ...(req.variables && typeof req.variables === 'object' ? req.variables : {}),
    TRANSACTION_ID: req.transaction_id, EFFECTIVE_DATE: new Date().toISOString().slice(0, 10),
    BUYER_WALLET: req.buyer_ref ?? '', BENEFICIARY_LEGAL_NAME: req.buyer_ref ?? '',
    PRODUCT_NAME: req.product_name, PRODUCT_SERVICE_NAME: req.product_name, SERVICE_NAME: req.product_name,
    VERSION: req.product_version ?? '1.0.0',
    ...operatorVariables(env), // operator facts cannot be overridden by the caller
  };
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v !== 'string' || v.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) {
      throw new BundleError('invalid_request', `variable ${k} must be a string under 500 characters without control characters`);
    }
  }

  const documents = [], unavailable = {}, problems = [];
  for (const lang of wanted) {
    const isMandatory = mandatory.includes(lang);
    for (const code of docs) {
      const rel = `${DOCUMENT_FOLDERS[code]}/${j.template}/${lang}.md`;
      const file = join(templatesRoot, rel);
      const fail = (why) => isMandatory ? problems.push({ doc: code, lang, why }) : (unavailable[lang] ??= []).push({ doc: code, why });
      if (!existsSync(file)) { fail('template file does not exist'); continue; }
      const raw = readFileSync(file);
      const enFile = join(templatesRoot, DOCUMENT_FOLDERS[code], j.template, 'EN.md');
      const enBody = lang !== 'EN' && existsSync(enFile) ? bodyFingerprint(readFileSync(enFile, 'utf8')) : null;
      const defects = templateDefects({ rel, raw, lang, enBody, verified });
      if (defects.length) { fail(defects.join('; ')); continue; }
      const text = renderContent(raw.toString('utf8'), vars, lang);
      const open = unresolvedPlaceholders(text);
      if (open.length) { problems.push({ doc: code, lang, why: `unresolved variables: ${open.join(', ')}`, code: 'unresolved_variables' }); continue; }
      documents.push({ path: `legal/${lang}/${code}.md`, content: text });
    }
  }
  if (problems.length) {
    const only = new Set(problems.map(p => p.code ?? 'content_not_verified'));
    throw new BundleError(only.size === 1 ? [...only][0] : 'content_not_verified',
      `legal documents cannot be released for ${j.key}: ${problems.length} required document(s) failed the content gate`, problems.slice(0, 20));
  }
  // A non-mandatory language ships complete or not at all: never a half-translated bundle. Dropped languages are disclosed.
  const final = documents.filter(d => !unavailable[d.path.split('/')[1]]);
  const shipped = [...new Set(final.map(d => d.path.split('/')[1]))];
  return { documents: final, languages_shipped: shipped, languages_unavailable: unavailable,
           jurisdiction_template: j.template, jurisdiction_key: j.key, docs };
}
