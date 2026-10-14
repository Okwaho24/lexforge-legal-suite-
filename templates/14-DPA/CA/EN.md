# DATA PROCESSING AGREEMENT

**Document:** LexForge™ DPA — Canada (Federal / PIPEDA + Saskatchewan)
**Transaction ID:** {{TRANSACTION_ID}}
**Effective Date:** {{EFFECTIVE_DATE}}
**Issued By:** {{ISSUED_BY}}
**Buyer Wallet:** {{BUYER_WALLET}}

---

## PARTIES

This Data Processing Agreement ("DPA") is entered into as of **{{EFFECTIVE_DATE}}** by and between:

**Controller:**
{{CONTROLLER_NAME}}
{{CONTROLLER_ADDRESS}}
Privacy Contact: {{CONTROLLER_PRIVACY_CONTACT}}
("Controller")

**Processor:**
{{PROCESSOR_NAME}}
{{PROCESSOR_ADDRESS}}
Privacy Contact: {{PROCESSOR_PRIVACY_CONTACT}}
("Processor")

This DPA supplements and is incorporated into the services agreement between the Parties (the "Principal Agreement"). In the event of conflict, this DPA prevails with respect to data protection.

---

## 1. DEFINITIONS

1.1 **"Personal Information"** has the meaning given under Canada's *Personal Information Protection and Electronic Documents Act* (PIPEDA) and applicable provincial privacy legislation.

1.2 **"Processing"** means any operation performed on Personal Information, including collection, use, storage, disclosure, transfer, and deletion.

1.3 **"Security Breach"** means a breach of security safeguards leading to the accidental or unlawful access, loss, or disclosure of Personal Information.

1.4 **"Sub-Processor"** means any third party engaged by the Processor to process Personal Information on behalf of the Controller.

---

## 2. SCOPE OF PROCESSING

2.1 **Subject Matter:** The Processor shall process Personal Information in connection with the services described in the Principal Agreement.

2.2 **Nature and Purpose:** {{PROCESSING_PURPOSE}}

2.3 **Categories of Data Subjects:** {{DATA_SUBJECT_CATEGORIES}}

2.4 **Categories of Personal Information:** {{PERSONAL_INFORMATION_CATEGORIES}}

2.5 **Duration:** The Processor shall process Personal Information for the duration of the Principal Agreement and as required to fulfill its obligations thereafter.

---

## 3. PROCESSOR OBLIGATIONS

The Processor shall:

3.1 Process Personal Information only on documented instructions from the Controller, unless required to do so by applicable law;

3.2 Ensure that personnel authorized to process Personal Information are bound by appropriate confidentiality obligations;

3.3 Implement and maintain appropriate technical and organizational security measures as described in Schedule A;

3.4 Not engage a Sub-Processor without prior written consent from the Controller;

3.5 Assist the Controller in responding to requests from individuals exercising their rights under applicable privacy legislation;

3.6 Assist the Controller in meeting its obligations regarding security, breach notification, and impact assessments;

3.7 At the Controller's choice, delete or return all Personal Information after the end of the services, and delete existing copies unless applicable law requires otherwise;

3.8 Make available to the Controller all information necessary to demonstrate compliance with this DPA, and allow for and contribute to audits as provided in Section 7.

---

## 4. CONTROLLER OBLIGATIONS

The Controller shall:

4.1 Have a lawful basis for processing Personal Information prior to instructing the Processor;

4.2 Comply with applicable privacy legislation with respect to Personal Information it provides to the Processor;

4.3 Provide the Processor with all information necessary to fulfill the obligations under this DPA.

---

## 5. SUB-PROCESSING

5.1 The Processor shall not engage Sub-Processors without prior written consent. General written consent is given for Sub-Processors listed in Schedule B.

5.2 The Processor shall impose equivalent data protection obligations on Sub-Processors.

5.3 The Processor remains fully liable to the Controller for the performance of Sub-Processors.

5.4 The Processor shall notify the Controller of any intended changes to Sub-Processors with at least **{{SUB_PROCESSOR_NOTICE_DAYS|30}} days**' notice, allowing the Controller to object.

---

## 6. SECURITY BREACH NOTIFICATION

6.1 The Processor shall notify the Controller of a Security Breach without undue delay, and in any event within **{{BREACH_NOTIFICATION_HOURS|72}} hours** of becoming aware.

6.2 Notice shall include, to the extent available: nature of the breach; categories and approximate number of individuals affected; categories and approximate number of records; likely consequences; and measures taken or proposed.

6.3 The Controller is responsible for notifying affected individuals and the Office of the Privacy Commissioner of Canada as required by law.

---

## 7. AUDIT RIGHTS

The Controller may, on **{{AUDIT_NOTICE|30}} days**' notice and no more than once per year, audit the Processor's compliance with this DPA. Costs are borne by the Controller unless audit reveals material non-compliance.

---

## 8. CROSS-BORDER TRANSFERS

The Processor shall not transfer Personal Information outside Canada without the Controller's prior written consent, and only where an adequate level of protection is ensured (contractual safeguards, binding corporate rules, or regulatory approval).

---

## 9. TERM AND TERMINATION

This DPA continues for the duration of the Principal Agreement. Upon termination, the Processor shall delete or return all Personal Information in accordance with Section 3.7.

---

## 10. LIABILITY

Each Party's liability under this DPA is subject to the limitations set out in the Principal Agreement, except to the extent that applicable privacy law imposes greater liability.

---

## 11. GOVERNING LAW

This DPA is governed by the laws of Saskatchewan and the federal laws of Canada, including PIPEDA and the *Privacy Act*.

---

## SCHEDULE A — TECHNICAL AND ORGANIZATIONAL SECURITY MEASURES

| Measure | Description |
|---------|-------------|
| Encryption | TLS 1.2+ in transit; AES-256 at rest |
| Access Controls | Role-based access; least privilege; MFA for admin |
| Monitoring | System and access logging; intrusion detection |
| Vulnerability Management | Regular patching; penetration testing {{PENTEST_FREQUENCY|annually}} |
| Business Continuity | Backup schedule: {{BACKUP_SCHEDULE|daily}}; RTO: {{RTO}}; RPO: {{RPO}} |
| Incident Response | Documented incident response plan; Security team contacts |
| Employee Training | Privacy and security training {{TRAINING_FREQUENCY|annually}} |

---

## SCHEDULE B — APPROVED SUB-PROCESSORS

| Sub-Processor | Location | Purpose | Data Categories |
|--------------|----------|---------|----------------|
| {{SUB_PROC_1}} | {{LOCATION_1}} | {{PURPOSE_1}} | {{DATA_1}} |
| {{SUB_PROC_2}} | {{LOCATION_2}} | {{PURPOSE_2}} | {{DATA_2}} |

---

## SIGNATURES

**CONTROLLER**

Signature: ___________________________
Name: {{CONTROLLER_SIGNATORY}}
Title: {{CONTROLLER_TITLE}}
Date: {{EFFECTIVE_DATE}}

**PROCESSOR**

Signature: ___________________________
Name: {{PROCESSOR_SIGNATORY}}
Title: {{PROCESSOR_TITLE}}
Date: {{EFFECTIVE_DATE}}

---

*LexForge™ Document ID: {{TRANSACTION_ID}} | {{JURISDICTION}} | {{LANGUAGE}}*

---

> **⚠️ LEGAL DISCLAIMER — PLEASE READ**
>
> This document was generated by **LexForge™**, an automated legal document generation service operated by Archer Chain Analytics (ISC: 102237785). It is provided as a **draft template only** and does **not** constitute legal advice.
>
> This document has not been reviewed by a licensed legal professional. Laws and regulations vary by jurisdiction and change over time. Before signing or relying on this document, you should obtain independent legal advice from a qualified lawyer licensed in the applicable jurisdiction.
>
> Archer Chain Analytics expressly disclaims all liability arising from the use of this document without independent legal review.
>
> *Sovereignty // Integrity // Inexorabilis*
