/**
 * LexForge™ — AcerbE™ Clause Library
 * Jurisdiction-specific legal enforcement language for all 7 jurisdictions.
 * Jurisdictions: US, CA, EU, UK, BR, AE, SG
 * © 2026 Neil Scott Archer / Archer Chain Analytics | ISC: 102237785
 */

'use strict';

const ACERBE_BASE = `
---
## AcerbE™ DIGITAL FINGERPRINT — ENFORCEMENT NOTICE

This document is protected by AcerbE™, the military-grade digital fingerprint
system operated by Archer Chain Analytics (ISC: 102237785 | CRA BN: 709110639).

Each copy of this document carries a unique cryptographic fingerprint anchored
to the originating license. The fingerprint is structurally embedded — removal
or tampering causes document collapse and constitutes a forensically detectable
event.

**WARRANTY NOTICE:** The Archer Chain Analytics™ replacement warranty is
conditioned on the AcerbE™ fingerprint remaining intact and unmodified. Any
document with a tampered, removed, or altered AcerbE™ fingerprint is ineligible
for warranty replacement and may be subject to enforcement action.

**FINGERPRINT ID:** {{ACERBE_FP_ID}}
**LICENSE REFERENCE:** {{LICENSE_REF}}
**GENERATION TIMESTAMP:** {{GEN_TIMESTAMP}}
---
`;

const ACERBE_BY_JURISDICTION = {
  US: {
    circumvention: '17 U.S.C. § 1201 (Digital Millennium Copyright Act — DMCA)',
    tradesecrets: '18 U.S.C. § 1836 (Defend Trade Secrets Act — DTSA); applicable state UTSA',
    privacy_notice: 'CCPA/CPRA (California Consumer Privacy Act / Privacy Rights Act)',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of 17 U.S.C. § 1201 (DMCA anti-circumvention
provisions) and 18 U.S.C. § 1836 (DTSA). Civil and criminal penalties apply. Archer Chain
Analytics reserves all rights of enforcement under applicable federal and state law.`,
  },
  CA: {
    circumvention: 'Copyright Act (R.S.C. 1985, c. C-42) s. 41.1 (technological protection measures)',
    tradesecrets: 'Uniform Trade Secrets Act (provincial) and common law breach of confidence',
    privacy_notice: 'PIPEDA (Personal Information Protection and Electronic Documents Act) / Bill C-27 (CPPA)',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of the Copyright Act (R.S.C. 1985, c. C-42) s. 41.1
and applicable provincial trade secrets law. Archer Chain Analytics reserves all rights of
enforcement under Canadian federal and provincial law.`,
  },
  EU: {
    circumvention: 'Directive 2001/29/EC Art. 6 (InfoSoc Directive — technological protection measures)',
    tradesecrets: 'Directive (EU) 2016/943 (Trade Secrets Directive)',
    privacy_notice: 'GDPR (EU) 2016/679 (General Data Protection Regulation)',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of Directive 2001/29/EC Art. 6 and Directive
(EU) 2016/943. Member state implementing legislation applies. Archer Chain Analytics reserves
all rights of enforcement under EU and applicable national law.`,
  },
  UK: {
    circumvention: 'Copyright, Designs and Patents Act 1988 s. 296ZA (technological protection measures)',
    tradesecrets: 'Trade Secrets (Enforcement, etc.) Regulations 2018',
    privacy_notice: 'UK GDPR / Data Protection Act 2018',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of the Copyright, Designs and Patents Act 1988
s. 296ZA and the Trade Secrets (Enforcement, etc.) Regulations 2018. Archer Chain Analytics
reserves all rights of enforcement under the law of England and Wales.`,
  },
  BR: {
    circumvention: 'Lei nº 9.610/1998 Art. 107 (medidas tecnológicas de proteção — Lei de Direitos Autorais)',
    tradesecrets: 'Lei nº 9.279/1996 Art. 195 (segredo industrial — Lei de Propriedade Industrial)',
    privacy_notice: 'LGPD — Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais)',
    enforcement_clause: `A remoção, neutralização ou alteração da impressão digital AcerbE™ incorporada
neste documento pode constituir violação da Lei nº 9.610/1998 Art. 107 e da Lei nº 9.279/1996
Art. 195. A Archer Chain Analytics reserva todos os direitos de execução nos termos da
legislação federal brasileira aplicável.`,
  },
  AE: {
    circumvention: 'UAE Federal Law No. 38 of 2021 on Copyrights and Related Rights, Art. 38 (technological protection measures)',
    tradesecrets: 'UAE Federal Law No. 15 of 1980 on Commercial Agencies / DIFC common law breach of confidence',
    privacy_notice: 'DIFC Data Protection Law No. 5 of 2020 / UAE Federal Data Protection Law',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of UAE Federal Law No. 38 of 2021 Art. 38
and applicable DIFC or UAE trade secrets law. Archer Chain Analytics reserves all rights of
enforcement under the law of the Dubai International Financial Centre (DIFC) and the UAE.`,
  },
  SG: {
    circumvention: 'Copyright Act 2021 (Singapore) s. 261 (technological protection measures — TPM circumvention)',
    tradesecrets: 'Common law breach of confidence (Singapore) / Personal Data Protection Act 2012 (PDPA)',
    privacy_notice: 'Personal Data Protection Act 2012 (PDPA) — Personal Data Protection Commission (PDPC)',
    enforcement_clause: `Circumvention, removal, or alteration of the AcerbE™ fingerprint embedded
in this document may constitute a violation of the Copyright Act 2021 (Singapore) s. 261
and Singapore common law on breach of confidence. Archer Chain Analytics reserves all rights
of enforcement under the law of Singapore.`,
  },
};

/**
 * Get the full AcerbE™ enforcement block for a jurisdiction.
 * @param {string} jur - e.g. 'US'
 * @returns {string} Markdown enforcement block
 */
function getAcerbeClause(jur) {
  const entry = ACERBE_BY_JURISDICTION[jur];
  if (!entry) {
    throw new Error(`No AcerbE™ clause for jurisdiction: ${jur}. Valid: ${Object.keys(ACERBE_BY_JURISDICTION).join(', ')}`);
  }
  return `
---
## AcerbE™ DIGITAL FINGERPRINT — ENFORCEMENT NOTICE

This document is protected by AcerbE™, the military-grade digital fingerprint
system operated by Archer Chain Analytics (ISC: 102237785 | CRA BN: 709110639).

### Jurisdiction-Specific Legal Basis (${jur})

| Protection | Statute / Authority |
|---|---|
| Anti-Circumvention | ${entry.circumvention} |
| Trade Secrets | ${entry.tradesecrets} |
| Data Privacy | ${entry.privacy_notice} |

### Enforcement Notice

${entry.enforcement_clause}

**FINGERPRINT ID:** \`{{ACERBE_FP_ID}}\`
**LICENSE REFERENCE:** \`{{LICENSE_REF}}\`
**GENERATION TIMESTAMP:** \`{{GEN_TIMESTAMP}}\`

*Tampering with, removing, or attempting to circumvent this AcerbE™ fingerprint
voids all warranties and licenses granted under this document and may result in
civil and/or criminal enforcement action under the laws stated above.*

**© 2026 Neil Scott Archer / Archer Chain Analytics | ISC: 102237785**
---
`;
}

module.exports = {
  getAcerbeClause,
  ACERBE_BY_JURISDICTION,
  ACERBE_BASE,
};
