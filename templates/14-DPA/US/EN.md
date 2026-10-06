---
doc_id: 14-DPA
title: Data Processing Agreement
jurisdiction: US
language: EN
version: 1.0.0
acerbe_fingerprint: MANDATORY
---

# DATA PROCESSING AGREEMENT

**Agreement Date:** {{AGREEMENT_DATE}}
**DPA Reference:** {{DPA_REFERENCE_NUMBER}}

**Controller:** {{CONTROLLER_LEGAL_NAME}}, a {{CONTROLLER_ENTITY_TYPE}} ("Controller")
**Processor:** {{PROCESSOR_LEGAL_NAME}}, a {{PROCESSOR_ENTITY_TYPE}} ("Processor")

This DPA forms part of, and is incorporated into, the {{UNDERLYING_AGREEMENT|Master Services Agreement / Software License Agreement}} dated {{UNDERLYING_AGREEMENT_DATE}} between the Parties ("Underlying Agreement").

---

## 1. DEFINITIONS

1.1 **"Personal Data"** means any information relating to an identified or identifiable natural person ("Data Subject").

1.2 **"Processing"** means any operation performed on Personal Data, including collection, storage, use, disclosure, or deletion.

1.3 **"Controller"** means the entity that determines the purposes and means of Processing.

1.4 **"Processor"** means the entity that Processes Personal Data on behalf of the Controller.

1.5 **"Sub-Processor"** means any third party engaged by Processor to Process Personal Data.

1.6 **"Data Breach"** means a breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data.

1.7 **"Applicable Data Protection Law"** means all privacy and data protection laws applicable to the Processing, including CCPA/CPRA, applicable state privacy laws, and, where applicable, GDPR/UK GDPR.

1.8 **"AcerbE™ Fingerprint"** means the cryptographic provenance marker embedded in digital assets processed under this Agreement.

---

## 2. PROCESSING INSTRUCTIONS

2.1 Processor shall Process Personal Data only on documented instructions from Controller, including as set forth in Annex 1.

2.2 Processor shall promptly notify Controller if it believes an instruction violates Applicable Data Protection Law.

2.3 Processor shall not Process Personal Data for its own purposes beyond what is necessary to perform the Underlying Agreement.

---

## 3. SCOPE OF PROCESSING

As set forth in Annex 1:

| Element | Description |
|---|---|
| Subject matter | {{PROCESSING_SUBJECT_MATTER}} |
| Duration | {{PROCESSING_DURATION}} |
| Nature of processing | {{PROCESSING_NATURE}} |
| Purpose | {{PROCESSING_PURPOSE}} |
| Categories of Personal Data | {{DATA_CATEGORIES}} |
| Categories of Data Subjects | {{DATA_SUBJECT_CATEGORIES}} |

---

## 4. PROCESSOR OBLIGATIONS

4.1 **Confidentiality.** Processor shall ensure that persons authorized to Process Personal Data are bound by confidentiality obligations.

4.2 **Security.** Processor shall implement appropriate technical and organizational measures to protect Personal Data, including:
(a) Pseudonymization and encryption where appropriate;
(b) Ensuring ongoing confidentiality, integrity, and availability;
(c) Ability to restore access following incidents;
(d) Regular testing and evaluation of security measures;
(e) AcerbE™ fingerprint integrity checks on all digital assets.

4.3 **Sub-Processors.** Processor shall not engage Sub-Processors without Controller's prior written consent. Processor shall impose the same data protection obligations on Sub-Processors. Current Sub-Processors are listed in Annex 2.

4.4 **Data Subject Rights.** Processor shall assist Controller in responding to Data Subject rights requests within {{DSR_RESPONSE_DAYS|10}} business days of receipt.

4.5 **DPIA Assistance.** Processor shall provide reasonable assistance with data protection impact assessments.

4.6 **Audits.** Processor shall allow Controller or its designated auditors to audit Processing activities upon {{AUDIT_NOTICE|30}} days' notice, no more than {{AUDIT_FREQUENCY|once per year}}.

---

## 5. DATA BREACH NOTIFICATION

5.1 Processor shall notify Controller without undue delay, and in any event within {{BREACH_NOTICE_HOURS|48}} hours, upon becoming aware of a Data Breach.

5.2 Notification shall include: (a) nature of the breach; (b) categories and approximate number of Data Subjects affected; (c) categories and approximate number of records affected; (d) likely consequences; (e) measures taken or proposed.

5.3 **AcerbE™ Tamper Events.** Detection of AcerbE™ fingerprint tampering on data-bearing assets constitutes a security event requiring notification under this Section.

---

## 6. DATA TRANSFERS

6.1 Processor shall not transfer Personal Data outside of {{PERMITTED_JURISDICTIONS|the United States}} without Controller's written consent.

6.2 International transfers shall be subject to appropriate safeguards (Standard Contractual Clauses, adequacy decisions, binding corporate rules, or other mechanisms under Applicable Data Protection Law).

---

## 7. DELETION AND RETURN

7.1 Upon termination of the Underlying Agreement, Processor shall, at Controller's election: (a) return all Personal Data to Controller; or (b) securely delete all Personal Data.

7.2 Processor shall confirm deletion in writing within {{DELETION_CONFIRMATION_DAYS|30}} days.

7.3 Processor may retain Personal Data to the extent required by applicable law, subject to continued confidentiality obligations.

---

## 8. CONTROLLER OBLIGATIONS

Controller represents and warrants that:
(a) It has a lawful basis for Processing Personal Data and for directing Processor to do so;
(b) It has provided appropriate privacy notices to Data Subjects;
(c) It has authority to execute this DPA.

---

## 9. LIMITATION OF LIABILITY

Liability of each Party under this DPA is subject to the liability limitations in the Underlying Agreement, except that limitations shall not apply to: (a) fines or penalties imposed by regulators; (b) breaches resulting in unauthorized disclosure of sensitive Personal Data.

---

## 10. GOVERNING LAW

This DPA is governed by the laws of {{GOVERNING_LAW_STATE|[STATE]}} and shall be interpreted in accordance with the Underlying Agreement's dispute resolution provisions.

---

## 11. SIGNATURES

**CONTROLLER:**

Signature: ___________________________
Name: {{CONTROLLER_SIGNATORY_NAME}}
Title: {{CONTROLLER_SIGNATORY_TITLE}}
Date: ___________________________

**PROCESSOR:**

Signature: ___________________________
Name: {{PROCESSOR_SIGNATORY_NAME}}
Title: {{PROCESSOR_SIGNATORY_TITLE}}
Date: ___________________________

---

## ANNEX 1 — DETAILS OF PROCESSING

**Subject matter:** {{ANNEX_SUBJECT_MATTER}}
**Duration:** {{ANNEX_DURATION}}
**Nature and purpose:** {{ANNEX_NATURE_PURPOSE}}
**Type of Personal Data:** {{ANNEX_DATA_TYPES}}
**Categories of Data Subjects:** {{ANNEX_DATA_SUBJECTS}}
**Special categories (if any):** {{ANNEX_SPECIAL_CATEGORIES|None}}

---

## ANNEX 2 — APPROVED SUB-PROCESSORS

| Sub-Processor | Location | Services | AcerbE™ Compliant |
|---|---|---|---|
| {{SUB_PROCESSOR_1}} | {{SP1_LOCATION}} | {{SP1_SERVICES}} | {{SP1_ACERBE|Yes/No}} |
| {{SUB_PROCESSOR_2}} | {{SP2_LOCATION}} | {{SP2_SERVICES}} | {{SP2_ACERBE|Yes/No}} |

---

*This document is protected by AcerbE™ cryptographic fingerprint. Fingerprint integrity is a condition of all warranty coverage.*
*© {{YEAR}} {{BUSINESS_LEGAL_NAME}} | Generated by LexForge™ | Archer Chain Analytics ISC: 102237785*
