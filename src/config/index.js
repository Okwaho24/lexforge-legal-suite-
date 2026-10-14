/**
 * LexForge™ Configuration
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../..');

const env  = process.env.NODE_ENV ?? 'development';
const bool = (v, d) => (v === undefined || v === '' ? d : v === 'true' || v === '1');
const int  = (v, d) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : d;
};

const list = (v, d) => (v === undefined ? d : v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean));
// "PSA:CA;CES:CA,US" -> { PSA:['CA'], CES:['CA','US'] }; empty string -> no restrictions
const restricted = (v, d) => {
  if (v === undefined) return d;
  const out = {};
  for (const part of v.split(';').map((x) => x.trim()).filter(Boolean)) {
    const [code, jurs = ''] = part.split(':');
    out[code.trim().toUpperCase()] = jurs.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  }
  return out;
};

const dataDir = process.env.DATA_DIR ?? path.join(ROOT, 'storage');

export const config = {
  server: {
    port: int(process.env.PORT, 5200),
    env,
    isProduction: env === 'production',
  },
  templates: {
    dir:            process.env.TEMPLATES_DIR ?? path.join(ROOT, 'templates'),
    // Spec §3.1 step 5: fall back to EN when a locale is missing (gap is logged and flagged).
    allowEnFallback: bool(process.env.ALLOW_EN_FALLBACK, false),
    // What to do with a {{PLACEHOLDER}} that has no value and no |default:
    //   'fill'   -> deliver with a visible fill-in blank  [NAME: ________]  (default; unresolved list is audited)
    //   'strict' -> reject the delivery (422) so the caller must supply every variable
    placeholderMode: ['fill', 'strict'].includes(process.env.PLACEHOLDER_MODE) ? process.env.PLACEHOLDER_MODE : 'fill',
    // A template shorter than this (bytes, trimmed) is treated as an empty stub.
    minTemplateBytes: int(process.env.MIN_TEMPLATE_BYTES, 400),
    // Sell-gate. Only these languages have real (translated) text. The FR/DE/PT/ES/AR/ZH files in the repo
    // are English copies with a changed label, so selling them would deliver English as "Arabic".
    sellableLanguages: list(process.env.SELLABLE_LANGUAGES, ['EN']),
    // Document -> jurisdictions whose text actually matches the product name. PSA/CES/INV are generated as
    // Professional Services / Consulting / Investment agreements outside CA, not the registry's
    // Product Sale / Cease & Desist / Invoice. Only the hand-written CA/EN versions are correct.
    // Env override: RESTRICTED_DOCUMENTS="PSA:CA;CES:CA;INV:CA"   (empty string = no restriction)
    restrictedDocuments: restricted(process.env.RESTRICTED_DOCUMENTS, { PSA: ['CA'], CES: ['CA'], INV: ['CA'] }),
  },
  storage: {
    dataDir,
    // Raw renders handed to AcerbE™. Must be readable by the AcerbE™ process (co-located).
    workDir:      process.env.WORK_DIR      ?? path.join(dataDir, 'work'),
    // Stamped documents + bundles. Never served directly — only via signed download tokens.
    deliveredDir: process.env.DELIVERED_DIR ?? path.join(dataDir, 'delivered'),
    dbPath:       process.env.LEXFORGE_DB_PATH ?? path.join(dataDir, 'lexforge.db'),
  },
  logs: {
    dir: process.env.LOGS_DIR ?? path.join(ROOT, 'logs'),
  },
  download: {
    secret: process.env.DOWNLOAD_SIGNING_SECRET ?? process.env.JWT_SECRET ?? '',
    ttlSeconds: int(process.env.DOWNLOAD_LINK_TTL, 3600),
    baseUrl: (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, ''),
  },
  acerbe: {
    baseUrl:   (process.env.ACERBE_BASE_URL ?? 'http://127.0.0.1:7749').replace(/\/$/, ''),
    apiKey:    process.env.ACERBE_API_KEY ?? '',
    timeoutMs: int(process.env.ACERBE_TIMEOUT_MS, 20_000),
    retries:   int(process.env.ACERBE_RETRIES, 2),
  },
  rapax: {
    webhookSecret: process.env.RAPAX_WEBHOOK_SECRET ?? '',
  },
  xrpl: {
    seed:        process.env.XRPL_SEED         ?? '',
    network:     process.env.XRPL_NETWORK      ?? 'testnet',
    enabled:     bool(process.env.XRPL_ENABLED, true),
    destAddress: process.env.XRPL_DEST_ADDRESS ?? '',
    // 'async' = anchor after the response (queued, retried); 'sync' = wait inside the request.
    mode:        process.env.XRPL_ANCHOR_MODE  ?? 'async',
    endpoint:    process.env.XRPL_ENDPOINT     ?? '',
  },
  issuer: {
    // Identity strings come from the environment so the BN conflict (709110639 vs 754975035)
    // is resolved in ONE place, not baked into templates.
    issuedBy: process.env.ISSUED_BY ?? 'Archer Chain Analytics | ISC: 102237785',
  },
};

/**
 * Fail-closed startup validation. Throws with a list of every problem.
 * In production a missing secret is fatal; in development it is only a warning
 * (returned as `warnings`).
 */
export function validateConfig() {
  const errors = [];
  const warnings = [];
  const need = (cond, msg) => (cond ? null : (config.server.isProduction ? errors : warnings).push(msg));

  need(config.rapax.webhookSecret.length >= 16, 'RAPAX_WEBHOOK_SECRET must be set (>=16 chars) — webhook would be unauthenticated');
  need(config.download.secret.length >= 32, 'DOWNLOAD_SIGNING_SECRET (or JWT_SECRET) must be set (>=32 chars)');
  need(config.acerbe.apiKey.length >= 16, 'ACERBE_API_KEY must be set (>=16 chars) and match the AcerbE™ server');
  if (config.xrpl.enabled && !config.xrpl.seed) {
    warnings.push('XRPL_ENABLED=true but XRPL_SEED is empty — XRPL anchoring is DISABLED (CLAUDE.md constraint 9 not met)');
  }
  return { errors, warnings };
}

// ── Document registry ──────────────────────────────────────────────────────

export const DOCUMENTS = {
  'SLA': 'Service Level Agreement',
  'MSA': 'Master Service Agreement',
  'NDA': 'Non-Disclosure Agreement',
  'ICA': 'Independent Contractor Agreement',
  'EUA': 'End User License Agreement',
  'TOS': 'Terms of Service',
  'PP':  'Privacy Policy',
  'RPA': 'Revenue / Profit Share Agreement',
  'LOI': 'Letter of Intent',
  'MOU': 'Memorandum of Understanding',
  'IP':  'IP Assignment Agreement',
  'ESA': 'Employment / Services Agreement',
  'PSA': 'Product / Software Sale Agreement',
  'DPA': 'Data Processing Agreement',
  'WA':  'Warranty Agreement',
  'LIC': 'Software License Agreement',
  'PAR': 'Partnership Agreement',
  'CES': 'Cease & Desist Letter',
  'INV': 'Invoice / Payment Terms',
};

export const DOCUMENT_FOLDERS = {
  'SLA': '01-SLA', 'MSA': '02-MSA', 'NDA': '03-NDA',
  'ICA': '04-ICA', 'EUA': '05-EUA', 'TOS': '06-TOS',
  'PP':  '07-PP',  'RPA': '08-RPA', 'LOI': '09-LOI',
  'MOU': '10-MOU', 'IP':  '11-IP',  'ESA': '12-ESA',
  'PSA': '13-PSA', 'DPA': '14-DPA', 'WA':  '15-WA',
  'LIC': '16-LIC', 'PAR': '17-PAR', 'CES': '18-CES',
  'INV': '19-INV',
};

export const JURISDICTIONS = ['CA', 'US', 'EU', 'UK', 'BR', 'AE', 'SG'];

export const LANGUAGES = ['EN', 'FR', 'DE', 'PT', 'ES', 'AR', 'ZH'];

export const JURISDICTION_NAMES = {
  CA: 'Canada',
  US: 'United States',
  EU: 'European Union',
  UK: 'United Kingdom',
  BR: 'Brazil',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
};

export const LANGUAGE_NAMES = {
  EN: 'English', FR: 'French',   DE: 'German',
  PT: 'Portuguese', ES: 'Spanish', AR: 'Arabic',
  ZH: 'Mandarin Chinese',
};
