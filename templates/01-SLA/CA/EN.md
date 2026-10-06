# Service Level Agreement (SLA)
<!-- ACA:LexForge:01-SLA:CA:EN:v2 -->

**Document Type:** Service Level Agreement
**Jurisdiction:** Canada (Saskatchewan governing law)
**Language:** English
**Version:** 2.0
**Issued by:** Archer Chain Analytics — LexForge™

---

## SERVICE LEVEL AGREEMENT

This Service Level Agreement ("Agreement") is entered into as of {{EFFECTIVE_DATE}} by and between:

**Service Provider:** {{PROVIDER_NAME}}, {{PROVIDER_ADDRESS}} ("Provider")
**Client:** {{CLIENT_NAME}}, {{CLIENT_ADDRESS}} ("Client")

This Agreement supplements the {{UNDERLYING_AGREEMENT|Master Services Agreement}} dated {{UNDERLYING_AGREEMENT_DATE}} and defines the service levels Provider commits to deliver.

---

## 1. SERVICE DESCRIPTION

### 1.1 Covered Services
This Agreement covers the following services ("Services"): {{SERVICE_DESCRIPTION}}

### 1.2 Service Hours
Standard service hours are {{SERVICE_HOURS|9:00 AM – 5:00 PM CST, Monday through Friday, excluding Canadian statutory holidays}}.

### 1.3 Covered Systems
The following systems and environments are covered: {{COVERED_SYSTEMS}}

---

## 2. AVAILABILITY COMMITMENTS

### 2.1 Uptime Target
Provider commits to a monthly uptime of at least {{UPTIME_TARGET|99.5%}} for covered systems ("Uptime SLA"), measured as:

**Uptime % = ((Total Minutes – Downtime Minutes) / Total Minutes) × 100**

### 2.2 Scheduled Maintenance
Scheduled maintenance windows are excluded from downtime calculations. Provider shall provide {{MAINTENANCE_NOTICE|72}} hours' advance notice of scheduled maintenance. Maintenance shall be performed during {{MAINTENANCE_WINDOW|Sundays 2:00 AM – 6:00 AM CST}} where possible.

### 2.3 Exclusions from Downtime
The following are not counted as downtime:
(a) Scheduled maintenance windows with adequate notice;
(b) Outages caused by Client's actions or failures;
(c) Force majeure events;
(d) Third-party service failures outside Provider's control;
(e) Client-requested emergency changes.

---

## 3. INCIDENT RESPONSE

### 3.1 Severity Levels

| Severity | Definition | Initial Response | Resolution Target |
|---|---|---|---|
| P1 — Critical | Complete service outage; no workaround | {{P1_RESPONSE|15 minutes}} | {{P1_RESOLUTION|4 hours}} |
| P2 — High | Major feature unavailable; workaround exists | {{P2_RESPONSE|1 hour}} | {{P2_RESOLUTION|8 hours}} |
| P3 — Medium | Minor feature degraded; workaround available | {{P3_RESPONSE|4 hours}} | {{P3_RESOLUTION|3 business days}} |
| P4 — Low | Cosmetic issue or enhancement request | {{P4_RESPONSE|1 business day}} | {{P4_RESOLUTION|Next release}} |

### 3.2 Incident Reporting
Client shall report incidents via: {{INCIDENT_REPORTING_METHOD|email to support@{{PROVIDER_DOMAIN}} or the support portal at {{SUPPORT_PORTAL_URL}}}}.

### 3.3 Escalation Path
If an incident is not resolved within the target time, Client may escalate to: {{ESCALATION_CONTACT}}.

---

## 4. SERVICE CREDITS

### 4.1 Credit Schedule
If Provider fails to meet the Uptime SLA in any calendar month, Client is entitled to service credits as follows:

| Monthly Uptime Achieved | Service Credit |
|---|---|
| 99.0% – 99.49% | {{CREDIT_TIER_1|5%}} of monthly fee |
| 95.0% – 98.99% | {{CREDIT_TIER_2|10%}} of monthly fee |
| 90.0% – 94.99% | {{CREDIT_TIER_3|20%}} of monthly fee |
| Below 90.0% | {{CREDIT_TIER_4|30%}} of monthly fee |

### 4.2 Credit Request
Client must submit a credit request within {{CREDIT_REQUEST_WINDOW|30}} days of the end of the affected month, with supporting uptime data.

### 4.3 Credit Application
Approved credits are applied to the next invoice. Credits are not redeemable for cash.

### 4.4 Sole Remedy
Service credits constitute Client's sole and exclusive remedy for Provider's failure to meet the Uptime SLA.

### 4.5 Credit Cap
Total service credits in any calendar month shall not exceed {{CREDIT_CAP|30%}} of the monthly fee for the affected service.

---

## 5. PERFORMANCE METRICS

### 5.1 Monitored Metrics
Provider shall monitor and report the following metrics {{REPORTING_FREQUENCY|monthly}}:

| Metric | Target | Measurement Method |
|---|---|---|
| Uptime | {{UPTIME_TARGET|99.5%}} | Synthetic monitoring |
| API Response Time (p95) | {{API_RESPONSE_TARGET|500ms}} | Application logs |
| Error Rate | < {{ERROR_RATE_TARGET|0.1%}} | Application logs |
| Support Ticket First Response | Per Section 3.1 | Ticketing system |

### 5.2 Reporting
Provider shall deliver a monthly SLA report to Client within {{REPORT_DEADLINE|10}} business days after month end, including: uptime achieved, incident summary, credit calculations (if any), and planned maintenance for the coming month.

---

## 6. SUPPORT

### 6.1 Support Channels
Provider offers support via: {{SUPPORT_CHANNELS|email and support portal}}

### 6.2 Support Scope
Support covers: (a) incident investigation and resolution; (b) configuration assistance; (c) usage questions. Support does not cover: custom development, training, or issues caused by Client modifications.

### 6.3 Support Contacts
**Client Primary Contact:** {{CLIENT_SUPPORT_CONTACT}}
**Provider Support Lead:** {{PROVIDER_SUPPORT_CONTACT}}

---

## 7. CHANGE MANAGEMENT

### 7.1 Change Notice
Provider shall provide {{CHANGE_NOTICE|5}} business days' advance notice of non-emergency changes that may affect service availability or Client integrations.

### 7.2 Emergency Changes
Emergency changes required to maintain security or service stability may be implemented with reduced notice, with a post-implementation report delivered within {{EMERGENCY_REPORT|24}} hours.

---

## 8. SECURITY

### 8.1 Security Standards
Provider shall maintain security practices consistent with industry standards, including: (a) encryption of data in transit and at rest; (b) access controls and authentication; (c) regular vulnerability assessments; (d) incident response procedures.

### 8.2 Security Incidents
Provider shall notify Client of confirmed security incidents affecting Client data within {{SECURITY_NOTICE|24}} hours of discovery.

---

## 9. TERM AND REVIEW

### 9.1 Term
This Agreement is effective from the Effective Date and remains in force for the duration of the underlying services agreement.

### 9.2 Review
The Parties shall review this Agreement annually and may amend service levels by mutual written agreement.

---

## 10. GOVERNING LAW

This Agreement is governed by the laws of the Province of Saskatchewan and federal laws of Canada applicable therein.

---

## SIGNATURES

**SERVICE PROVIDER**

Signature: _________________________ Date: _____________
Name: {{PROVIDER_SIGNATORY_NAME}}
Title: {{PROVIDER_SIGNATORY_TITLE}}
Organization: {{PROVIDER_NAME}}

**CLIENT**

Signature: _________________________ Date: _____________
Name: {{CLIENT_SIGNATORY_NAME}}
Title: {{CLIENT_SIGNATORY_TITLE}}
Organization: {{CLIENT_NAME}}

---

*This document was generated by LexForge™ v2 — an Archer Chain Analytics product.*
*AI-generated draft only. Not legal advice. Review by qualified legal counsel is strongly recommended before execution.*
*© 2026 Neil Scott Archer / Archer Chain Analytics | ISC: 102237785 | archerchainanalytics@gmail.com*
