# Service Level Agreement (SLA)

**Document Code:** SLA
**Jurisdiction:** US
**Language:** EN
**Template Version:** 2.0.0
**Issued By:** {{ISSUED_BY|Archer Chain Analytics (Sole Proprietor) | ISC: 102237785}}
**Transaction ID:** {{TRANSACTION_ID}}
**Effective Date:** {{EFFECTIVE_DATE}}

---

## Parties

**Service Provider:**
{{PROVIDER_NAME|Archer Chain Analytics}}
{{PROVIDER_ADDRESS|417 Avenue G S, Saskatoon, SK S7M 1V5}}
Email: {{PROVIDER_EMAIL|archerchainanalytics@gmail.com}}

**Client:**
{{CLIENT_NAME}}
{{CLIENT_ADDRESS}}
Email: {{CLIENT_EMAIL}}

---

## 1. Service Description

### 1.1 Scope of Services

Service Provider agrees to deliver the following services ("Services") to Client:

{{SERVICE_DESCRIPTION|Software-as-a-Service platform access, API endpoints, and associated technical support as described in the applicable Order Form or Statement of Work.}}

### 1.2 Service Tier

| Tier | Monthly Fee (USD) | Uptime SLA | Support Response |
|------|-------------------|------------|-----------------|
| Basic | {{TIER_BASIC_FEE|$99}} | 99.0% | 48 hours |
| Professional | {{TIER_PRO_FEE|$299}} | 99.5% | 24 hours |
| Enterprise | {{TIER_ENT_FEE|$999}} | 99.9% | 4 hours |

Client has selected: **{{SERVICE_TIER|Professional}}**

---

## 2. Uptime Commitment

### 2.1 Uptime Guarantee

Service Provider guarantees the Services will be available **{{UPTIME_PERCENT|99.5%}}** of the time in any given calendar month, excluding Scheduled Maintenance and Force Majeure Events ("Uptime Commitment").

### 2.2 Uptime Calculation
Downtime means continuous unavailability exceeding **five (5) minutes**. Partial minutes are rounded up.

### 2.3 Exclusions

The following do not count toward Downtime:

- Scheduled Maintenance communicated at least **72 hours** in advance
- Client-caused outages or misuse of APIs
- Force Majeure Events (acts of God, government action, internet backbone failures)
- Third-party service outages outside Service Provider's control
- Beta or preview features explicitly labeled as such

---

## 3. Incident Severity & Response

| Priority | Definition | Initial Response | Resolution Target |
|----------|-----------|-----------------|-------------------|
| P1 — Critical | Complete service unavailability | 30 minutes | 4 hours |
| P2 — High | Major feature unavailable, no workaround | 2 hours | 8 hours |
| P3 — Medium | Degraded performance, workaround exists | 8 hours | 48 hours |
| P4 — Low | Minor issue, cosmetic defect | 24 hours | Next release |

Response times apply during **business hours (9:00 AM – 6:00 PM Central Time, Monday–Friday)** unless Client is on Enterprise tier, which receives 24/7 P1/P2 coverage.

---

## 4. Service Credits

### 4.1 Credit Schedule

| Monthly Uptime Achieved | Service Credit |
|------------------------|----------------|
| 99.0% – {{UPTIME_PERCENT|99.5%}} | 5% of monthly fee |
| 95.0% – 98.9% | 15% of monthly fee |
| 90.0% – 94.9% | 25% of monthly fee |
| Below 90.0% | 50% of monthly fee |

### 4.2 Credit Conditions

- Credits must be requested within **30 days** of the incident via written notice to {{PROVIDER_EMAIL|archerchainanalytics@gmail.com}}
- Credits apply to future invoices only; no cash refunds
- Credits are Client's sole and exclusive remedy for SLA failures
- Maximum aggregate credits per calendar month shall not exceed **50%** of monthly fees paid

### 4.3 Credit Request Process

Client must submit a credit request including: (a) dates and times of claimed Downtime; (b) affected services; and (c) supporting logs or screenshots. Service Provider will respond within **10 business days**.

---

## 5. Performance Metrics

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| API Response Time (p95) | < {{API_RESPONSE_MS|500ms}} | Rolling 30 days |
| API Response Time (p99) | < {{API_RESPONSE_P99|2000ms}} | Rolling 30 days |
| Error Rate | < {{ERROR_RATE|0.1%}} | Rolling 7 days |
| Data Processing Latency | < {{PROCESSING_LATENCY|60s}} | Per transaction |

Performance metrics are monitored via Service Provider's internal observability stack. Client may request monthly performance reports.

---

## 6. Scheduled Maintenance

### 6.1 Notice Requirements

Service Provider will provide **72 hours** advance notice of Scheduled Maintenance via email to Client's designated technical contact.

### 6.2 Maintenance Windows

Preferred maintenance window: **Sundays, 2:00 AM – 6:00 AM Central Time.**

Emergency maintenance may be performed with **4 hours** notice when necessary to address critical security vulnerabilities.

---

## 7. Support

### 7.1 Support Channels

| Channel | Availability | Tier |
|---------|-------------|------|
| Email | Business hours | All |
| Ticket portal | 24/7 submission | All |
| Phone | Business hours | Enterprise |
| Dedicated Slack | Business hours | Enterprise |

### 7.2 Support Scope

Support covers: (a) service availability issues; (b) documented feature defects; (c) configuration assistance. Support does not cover: custom development, third-party integrations not provided by Service Provider, or Client-side infrastructure.

---

## 8. Data & Security

### 8.1 Data Processing

To the extent Service Provider processes Client's personal data, the parties shall execute a Data Processing Agreement ("DPA") incorporating applicable requirements under the **California Consumer Privacy Act (CCPA/CPRA)**, applicable state privacy laws, and any other applicable U.S. privacy regulations.

### 8.2 Security Incident Notification

Service Provider will notify Client of any confirmed Security Incident affecting Client data within **72 hours** of discovery via email to Client's designated security contact. Notification will include: (a) nature of the incident; (b) data categories affected; (c) remediation steps taken.

### 8.3 Security Standards

Service Provider maintains security controls including: encryption in transit (TLS 1.2+), encryption at rest (AES-256), access controls, and annual security reviews.

---

## 9. Change Management

### 9.1 API Versioning

Service Provider will maintain current API versions for a minimum of **12 months** following announcement of deprecation. Deprecated endpoints will return appropriate warning headers.

### 9.2 Breaking Changes

Material breaking changes require **30 days** written notice. Non-breaking additive changes may be deployed without notice.

---

## 10. Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SERVICE PROVIDER'S TOTAL CUMULATIVE LIABILITY FOR SLA FAILURES SHALL NOT EXCEED THE TOTAL FEES PAID BY CLIENT IN THE THREE (3) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.**

---

## 11. Governing Law & Dispute Resolution

This Agreement is governed by the laws of the **State of Delaware**, without regard to conflict of law principles.

Any dispute arising under this Agreement shall first be submitted to good-faith negotiation. If unresolved within **30 days**, disputes shall be resolved by binding arbitration under the **American Arbitration Association Commercial Arbitration Rules**, with proceedings in **{{ARBITRATION_VENUE|Wilmington, Delaware}}**. The prevailing party shall be entitled to reasonable attorneys' fees.

**CLASS ACTION WAIVER:** Each party waives any right to bring claims as a class action or representative proceeding.

---

## 12. General Provisions

- **Entire Agreement:** This SLA, together with any applicable Order Form and DPA, constitutes the entire agreement regarding service levels.
- **Amendment:** Modifications require written consent of both parties.
- **Severability:** If any provision is unenforceable, the remainder continues in full force.
- **Waiver:** Failure to enforce any provision does not constitute waiver.
- **Notices:** Notices must be in writing and delivered by email with read receipt or certified mail.

---

## Signatures

| Party | Name | Title | Signature | Date |
|-------|------|-------|-----------|------|
| Service Provider | {{PROVIDER_SIGNER|Neil Scott Archer}} | {{PROVIDER_TITLE|Owner}} | _________________ | {{EFFECTIVE_DATE}} |
| Client | {{CLIENT_SIGNER}} | {{CLIENT_TITLE}} | _________________ | {{EFFECTIVE_DATE}} |

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
