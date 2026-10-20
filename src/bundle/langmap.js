// LexForge™ — jurisdiction and language selection for a per-sale bundle.
// Static lookup only (ARC-SYS-001-BUILDSPEC §7). No AI, no network, no dynamic content.
import { JURISDICTIONS, LANGUAGES } from '../config/index.js';

// Customer country -> the template jurisdiction whose law the documents are written for.
// A country with no entry here has NO matching template set and cannot be sold documents (checked BEFORE payment).
const EU_MEMBERS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
export const COUNTRY_TO_TEMPLATE = Object.freeze({
  US: 'US', CA: 'CA', GB: 'UK', BR: 'BR', AE: 'AE', SG: 'SG',
  ...Object.fromEntries(EU_MEMBERS.map(c => [c, 'EU'])),
});

// Spec §7 language list per country, in spec codes. Codes are folded to the template language codes below.
const SPEC = {
  'CA-QC': ['EN','FR_CA'], CA: ['EN','FR_CA'], FR: ['EN','FR_FR'], BE: ['EN','FR_FR','NL'], DE: ['EN','DE'], AT: ['EN','DE'],
  NL: ['EN','NL'], PL: ['EN','PL'], IT: ['EN','IT'], ES: ['EN','ES'], PT: ['EN','PT_PT'], BR: ['EN','PT_BR'],
  SG: ['EN','ZH'], AE: ['EN','AR_GULF'], US: ['EN'], GB: ['EN'],
};
const FOLD = { FR_CA: 'FR', FR_FR: 'FR', PT_PT: 'PT', PT_BR: 'PT', AR_GULF: 'AR', AR_MSA: 'AR' };
const fold = code => FOLD[code] ?? code;

// Languages the customer's law REQUIRES us to ship (spec: "Quebec — both required by law").
// Owner decision (2026-10-20): every Canadian sale ships English + Quebec French, not just Quebec.
const MANDATORY = { 'CA-QC': ['EN', 'FR'], CA: ['EN', 'FR'] };

export class BundleError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}

export function resolveJurisdiction(country, region) {
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) throw new BundleError('invalid_request', 'jurisdiction must be an ISO 3166-1 alpha-2 country code in upper case');
  if (region != null && region !== '' && !(typeof region === 'string' && /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(region) && region.startsWith(country + '-'))) {
    throw new BundleError('invalid_request', 'region must look like CA-QC and belong to the given country');
  }
  const template = COUNTRY_TO_TEMPLATE[country];
  if (!template || !JURISDICTIONS.includes(template)) {
    throw new BundleError('jurisdiction_unsupported', `No jurisdiction-specific legal template set exists for ${country}`);
  }
  const key = region && SPEC[region] ? region : country;
  return { country, region: region || null, template, key };
}

// Returns { wanted: [...template language codes in order], mandatory: [...] }.
export function selectLanguages(key, pref, availableForJurisdiction) {
  const base = (SPEC[key] ?? SPEC[key.split('-')[0]] ?? ['EN']).map(fold);
  const wanted = [...new Set(base)];
  const p = (pref ?? 'auto').toString().trim();
  if (!/^(auto|all|[A-Za-z]{2}([_-][A-Za-z]{2,5})?)$/.test(p)) throw new BundleError('invalid_request', "language_pref must be 'auto', 'all' or a language code");
  if (p.toLowerCase() === 'all') {
    for (const l of availableForJurisdiction) if (!wanted.includes(l)) wanted.push(l);
  } else if (p.toLowerCase() !== 'auto') {
    const l = fold(p.toUpperCase().replace('-', '_'));
    if (LANGUAGES.includes(l) && !wanted.includes(l)) wanted.push(l);
    else if (!LANGUAGES.includes(l)) wanted.push(l); // unsupported choice: reported as unavailable, EN still ships
  }
  return { wanted, mandatory: ['EN', ...(MANDATORY[key] ?? [])].filter((v, i, a) => a.indexOf(v) === i) };
}
